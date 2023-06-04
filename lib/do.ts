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

class UnwrapGen<A, E = UnwrapError<A>> {
  constructor(readonly value: A, readonly onErr?: () => E) {}
  [Symbol.iterator]() {
    return new Gen<this, UnwrapValue<A>>(this);
  }
}

export type Unwrapper = <A, E = UnwrapError<A>>(
  a: A,
  e?: () => E
) => UnwrapGen<A, E>;

export function Do<T, Gen extends UnwrapGen<unknown, unknown>>(
  f: ($: Unwrapper) => Generator<Gen, T, any>
): ComputeTask<Gen[], T> {
  const iterator = f((x, e) => new UnwrapGen(x, e));

  const run = (state: IteratorResult<UnwrapGen<unknown>>): any => {
    if (state.done) {
      return toTask(state.value);
    }

    // @ts-expect-error
    return toTask(state.value).flatMap((x) => run(iterator.next(x)));
  };

  // @ts-expect-error
  return Task.from(() => run(iterator.next()));
}

const toTask = (maybeGen: unknown): Task<unknown, unknown> => {
  const value = maybeGen instanceof UnwrapGen ? maybeGen.value : maybeGen;
  const onErr = maybeGen instanceof UnwrapGen ? maybeGen.onErr : undefined;
  return isMonad(value)
    ? isTask(value)
      ? value.mapErr((e) => onErr?.() ?? e)
      : value.task().mapErr((e) => onErr?.() ?? e)
    : Task.from(
        () => value,
        (e) => onErr?.() ?? e
      );
};

type ComputeTask<Gen, ReturnValue> = Gen extends Array<
  UnwrapGen<infer GenValue, infer GenError>
>
  ? [
      Extract<GenValue, AsyncTask<unknown, unknown> | Promise<unknown>>
    ] extends [never]
    ? [
        Extract<
          EnsureGenUnwrapped<ReturnValue>,
          AsyncTask<unknown, unknown> | Promise<unknown>
        >
      ] extends [never]
      ? SyncTask<
          GenError | GetGenError<ReturnValue>,
          UnwrapGenValue<ReturnValue>
        >
      : AsyncTask<
          GenError | GetGenError<ReturnValue>,
          UnwrapGenValue<ReturnValue>
        >
    : AsyncTask<
        GenError | GetGenError<ReturnValue>,
        UnwrapGenValue<ReturnValue>
      >
  : never;

type GetGenError<Gen> = Gen extends UnwrapGen<unknown, infer E> ? E : never;
type UnwrapGenValue<Gen> = Gen extends UnwrapGen<infer T>
  ? UnwrapValue<T>
  : UnwrapValue<Gen>;
type EnsureGenUnwrapped<Gen> = Gen extends UnwrapGen<infer T> ? T : Gen;
