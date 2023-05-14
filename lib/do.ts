import type { Option, UnwrapNoneError } from "./option";
import { isPromiseLike, type Monad } from "./internals";
import { Task } from "./task";
import { Result } from "./result";
import { isMonad, isOption, isResult } from "./utils";

class Gen<T, A> implements Generator<T, A> {
  called = false;

  constructor(readonly self: T) {}

  next(a: [A] extends [never] ? any : A): IteratorResult<T, A> {
    return this.called
      ? {
          value: a,
          done: true,
        }
      : ((this.called = true),
        {
          value: this.self,
          done: false,
        });
  }

  return(a: A): IteratorResult<T, A> {
    return {
      value: a,
      done: true,
    };
  }

  throw(e: unknown): IteratorResult<T, A> {
    throw e;
  }

  [Symbol.iterator](): Generator<T, A> {
    return new Gen<T, A>(this.self);
  }
}

class UnwrapGen<A> {
  declare _E: UnwrapError<A>;
  constructor(readonly value: A) {}
  [Symbol.iterator]() {
    return new Gen<this, UnwrapValue<A>>(this);
  }
}

type UnwrapValue<A> = [A] extends [never]
  ? never
  : A extends Monad<unknown, infer B>
  ? B
  : A extends PromiseLike<infer C>
  ? UnwrapValue<C>
  : A;

type UnwrapError<A> = [A] extends [never]
  ? never
  : A extends Option<unknown>
  ? UnwrapNoneError
  : A extends Result<infer A, unknown>
  ? A
  : A extends Task<infer A, unknown>
  ? A
  : A extends PromiseLike<infer A>
  ? unknown
  : never;

export type Unwrapper = <A>(
  a: [Exclude<A, Promise<unknown>>] extends [never] ? never : A
) => UnwrapGen<A>;

export function Do<T, Gen extends UnwrapGen<unknown>>(
  f: ($: Unwrapper) => Generator<Gen, T, any>
): EitherTaskOrResult<Gen[], T> {
  const iterator = f((x) => new UnwrapGen(x));

  const run = (state: IteratorResult<UnwrapGen<unknown>>): any => {
    if (state.done) {
      return toResultLike(getGenValue(state.value));
    }
    let resultLike = toResultLike(state.value.value);
    if (isResult(resultLike)) {
      // if the result is an error, we need to check if the next value is a Task (incidently, also Promises)
      // so that the end result is lifted into a Task, even though the next computations aren't evaluated
      // we can do this because Tasks are lazy
      // this wouldnt work with Promises because they are eager
      if (resultLike.isErr()) {
        const evaluate = (computations: unknown[] = []): typeof resultLike => {
          const next = iterator.next();
          const value = getGenValue(next.value);
          computations.push(value);
          if (computations.some(isPromiseLike)) {
            // @ts-expect-error
            return resultLike.task();
          }
          if (next.done) {
            return resultLike;
          } else {
            return evaluate(computations);
          }
        };
        return evaluate();
      }
    }
    return resultLike.flatMap((x) => run(iterator.next(x)));
  };

  return run(iterator.next());
}

const getGenValue = (a: unknown): unknown =>
  a instanceof UnwrapGen ? a.value : a;

const toResultLike = (
  value: unknown
): Result<unknown, unknown> | Task<unknown, unknown> =>
  isMonad(value)
    ? isOption(value)
      ? value.result()
      : value
    : isPromiseLike(value)
    ? Task.from(value)
    : Result.Ok(value);

// if the generator includes any Tasks/Promises, the return type will be a Task
// otherwise it will be a Result
type EitherTaskOrResult<E, V> = E extends Array<UnwrapGen<infer T>>
  ? [Extract<T, Task<unknown, unknown> | PromiseLike<unknown>>] extends [never]
    ? Result<
        UnwrapError<T>,
        V extends UnwrapGen<infer InnerV> ? UnwrapValue<InnerV> : UnwrapValue<V>
      >
    : Task<
        UnwrapError<T>,
        V extends UnwrapGen<infer InnerV> ? UnwrapValue<InnerV> : UnwrapValue<V>
      >
  : never;
