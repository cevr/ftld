import type { Option, UnwrapNoneError } from "./option";
import { Task } from "./task";
import { Result } from "./result";
import { isMonad, isTask, type Monad } from "./utils";

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
  ? B extends PromiseLike<infer C>
    ? C
    : B
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
): SyncOrAsyncTask<Gen[], T> {
  const iterator = f((x) => new UnwrapGen(x));

  const run = (state: IteratorResult<UnwrapGen<unknown>>): any => {
    if (state.done) {
      return toTask(getGenValue(state.value));
    }
    let task = toTask(state.value.value);

    return task.flatMap((x) => run(iterator.next(x)));
  };

  return Task.from(() => run(iterator.next())) as any;
}

const getGenValue = (a: unknown): unknown =>
  a instanceof UnwrapGen ? a.value : a;

const toTask = (value: unknown): Task<unknown, unknown> =>
  isMonad(value)
    ? isTask(value)
      ? value
      : value.task()
    : Task.from(() => value);

type SyncOrAsyncTask<E, V> = E extends Array<UnwrapGen<infer T>>
  ? Task<
      UnwrapError<T>,
      [Extract<T, Task<unknown, unknown> | PromiseLike<unknown>>] extends [
        never
      ]
        ? UnwrapValue<V>
        : Promise<UnwrapValue<V>>
    >
  : never;
