import { type AsyncTask, type SyncTask, Task } from "./task";
import { isMonad, isTask } from "./utils";
import type { UnwrapError, UnwrapValue } from "./internals";

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

export type Unwrapper = <A>(a: A) => UnwrapGen<A>;

export function Do<T, Gen extends UnwrapGen<unknown>>(
  f: ($: Unwrapper) => Generator<Gen, T, any>
): SyncOrAsyncTask<Gen[], T> {
  const iterator = f((x) => new UnwrapGen(x));

  const run = (state: IteratorResult<UnwrapGen<unknown>>): any => {
    if (state.done) {
      return toTask(getGenValue(state.value));
    }

    return toTask(state.value.value).flatMap((x) => run(iterator.next(x)));
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

type SyncOrAsyncTask<Gen, ReturnValue> = Gen extends Array<UnwrapGen<infer T>>
  ? [Extract<T, AsyncTask<unknown, unknown> | Promise<unknown>>] extends [never]
    ? [
        Extract<
          EnsureGenUnwrapped<ReturnValue>,
          AsyncTask<unknown, unknown> | Promise<unknown>
        >
      ] extends [never]
      ? SyncTask<UnwrapError<T>, UnwrapGenValue<ReturnValue>>
      : AsyncTask<UnwrapError<T>, UnwrapGenValue<ReturnValue>>
    : AsyncTask<UnwrapError<T>, UnwrapGenValue<ReturnValue>>
  : never;

type UnwrapGenValue<Gen> = Gen extends UnwrapGen<infer T>
  ? UnwrapValue<T>
  : UnwrapValue<Gen>;
type EnsureGenUnwrapped<Gen> = Gen extends UnwrapGen<infer T> ? T : Gen;
