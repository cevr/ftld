import type { AsyncTask, SyncTask } from "./task.js";
import type { Option } from "./option.js";
import type { Result } from "./result.js";
import {
  identity,
  UnknownError,
  type Monad,
  UnwrapNoneError,
  isMonad,
} from "./utils.js";
import { Task } from "./task.js";

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
  constructor(readonly value: A, readonly onErr?: (e: KnownError<A>) => E) {}
  [Symbol.iterator]() {
    return new Gen<this, UnwrapValue<A>>(this);
  }
}

export type Unwrapper = <A, E = UnwrapError<A>>(
  value: A,
  onErr?: (e: KnownError<A>) => E
) => UnwrapGen<A, E>;

const run = (
  iterator: Generator<any, any, any>,
  state: IteratorResult<UnwrapGen<unknown>>
): any => {
  if (state.done) {
    return toTask(state.value);
  }

  return toTask(state.value).flatMap((x) => run(iterator, iterator.next(x)));
};

export function Do<T, Gen extends UnwrapGen<unknown, unknown>>(
  f: ($: Unwrapper) => Generator<Gen, T, any>
): ComputeTask<Gen[], T> {
  // @ts-expect-error
  return Task.from(() => {
    const iterator = f((x, e) => new UnwrapGen(x, e));

    // @ts-expect-error
    return run(iterator, iterator.next());
  });
}

const toTask = (maybeGen: unknown): Task<unknown, unknown> => {
  const value = maybeGen instanceof UnwrapGen ? maybeGen.value : maybeGen;
  const onErr =
    maybeGen instanceof UnwrapGen ? maybeGen.onErr ?? identity : identity;
  return (
    value instanceof Task
      ? value
      : Task.from(() => (isMonad(value) ? value.unwrap() : value), identity)
  ).mapErr(onErr);
};

type ComputeTask<Gen, ReturnValue> = Gen extends Array<
  UnwrapGen<infer GenValue, infer GenError>
>
  ? [
      Extract<
        GenValue | EnsureGenUnwrapped<ReturnValue>,
        AsyncTask<unknown, unknown> | Promise<unknown>
      >
    ] extends [never]
    ? SyncTask<GenError | GetGenError<ReturnValue>, UnwrapGenValue<ReturnValue>>
    : AsyncTask<
        GenError | GetGenError<ReturnValue>,
        UnwrapGenValue<ReturnValue>
      >
  : never;

type KnownError<A> = A extends Option<unknown>
  ? UnwrapNoneError
  : A extends Result<infer E, unknown>
  ? E
  : A extends Task<infer E, unknown>
  ? E
  : unknown;

type GetGenError<Gen> = Gen extends UnwrapGen<unknown, infer E>
  ? E
  : Gen extends Option<unknown>
  ? UnwrapNoneError
  : Gen extends Result<infer E, unknown>
  ? E
  : Gen extends Task<infer E, unknown>
  ? E
  : never;
type UnwrapGenValue<Gen> = Gen extends UnwrapGen<infer T>
  ? UnwrapValue<T>
  : UnwrapValue<Gen>;
type EnsureGenUnwrapped<Gen> = Gen extends UnwrapGen<infer T> ? T : Gen;

export type UnwrapValue<A> = [A] extends [never]
  ? never
  : A extends Monad<unknown, infer B>
  ? B
  : A extends Promise<infer C>
  ? UnwrapValue<C>
  : A extends (...args: any) => infer B
  ? UnwrapValue<B>
  : A;

export type UnwrapError<E> = [E] extends [never]
  ? UnknownError
  : E extends (...any: any) => infer R
  ? UnwrapError<R>
  : E extends Option<unknown>
  ? UnwrapNoneError
  : E extends Result<infer E, unknown>
  ? E
  : E extends Task<infer E, unknown>
  ? E
  : E extends Promise<infer E>
  ? UnwrapError<E>
  : UnknownError;
