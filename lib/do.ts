import type { Option, UnwrapNoneError } from "./option";
import { isPromiseLike, type Monad } from "./internals";
import { Task } from "./task";
import { Result } from "./result";
import { isMonad, isOption } from "./utils";

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

export type Unwrapper = <A>(a: A) => UnwrapGen<A>;

export function Do<T, Gen extends UnwrapGen<unknown>>(
  f: ($: Unwrapper) => Generator<Gen, T, any>
): EitherTaskOrResult<Tuple<Gen>, UnwrapValue<T>> {
  const iterator = f((x) => new UnwrapGen(x));

  const run = (
    state:
      | IteratorResult<UnwrapGen<Monad<unknown, unknown>>>
      | IteratorReturnResult<UnwrapGen<Monad<unknown, unknown>>>
      | IteratorYieldResult<UnwrapGen<Monad<unknown, unknown>>>
  ): any => {
    if (state.done) {
      return toResultLike(
        state.value instanceof UnwrapGen ? state.value.value : state.value
      );
    }
    return toResultLike(state.value.value).flatMap((x) =>
      // @ts-expect-error
      run(iterator.next(x))
    );
  };

  return run(iterator.next() as any);
}

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

// if the generator includes any Tasks, the return type will be a Task
// otherwise it will be a Result
type EitherTaskOrResult<E, V> = E extends Array<UnwrapGen<infer T>>
  ? [Extract<T, Task<unknown, unknown> | PromiseLike<unknown>>] extends [never]
    ? Result<UnwrapError<T>, V>
    : Task<UnwrapError<T>, V>
  : never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type LastOf<T> = UnionToIntersection<
  T extends any ? () => T : never
> extends () => infer R
  ? R
  : never;

type Push<T extends any[], V> = [...T, V];

type TuplifyUnion<
  T,
  L = LastOf<T>,
  N = [T] extends [never] ? true : false
> = true extends N ? [] : Push<TuplifyUnion<Exclude<T, L>>, L>;

// https://stackoverflow.com/a/73641837
type Tuple<
  T,
  A extends T[] = []
> = TuplifyUnion<T>["length"] extends A["length"]
  ? [...A]
  : Tuple<T, [T, ...A]>;
