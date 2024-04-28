import type { AsyncTask, SyncTask } from "./task.js";
import type { Option } from "./option.js";
import type { Result } from "./result.js";
import { identity, type Monad, UnwrapNoneError, isMonad } from "./utils.js";
import { Task } from "./task.js";

const run = (
  iterator: Generator<any, any, any>,
  state: IteratorResult<unknown>
): any => {
  if (state.done) {
    return state.value;
  }

  return toTask(state.value).flatMap((x) => run(iterator, iterator.next(x)));
};

const toTask = (value: unknown): Task<unknown, unknown> => {
  const unwrap = (value: unknown): unknown => {
    return isMonad(value) ? unwrap(value.unwrap()) : value;
  };
  return Task.from(() => unwrap(value), identity);
};

export function Do<Gen, Return>(
  f: () => Generator<Gen, Return, any>
): ComputeTask<Gen, Return> {
  return Task.from(() => {
    const iterator = f();
    return run(iterator, iterator.next());
  }) as ComputeTask<Gen, Return>;
}

type ComputeTask<Gen, FinalReturnValue> = [Gen] extends [never]
  ? [Extract<FinalReturnValue, AsyncTask<any, any>>] extends [never]
    ? SyncTask<UnwrapValue<FinalReturnValue>, UnwrapError<FinalReturnValue>>
    : AsyncTask<UnwrapValue<FinalReturnValue>, UnwrapError<FinalReturnValue>>
  : [Gen] extends [Monad<any>]
  ? [Extract<Gen | FinalReturnValue, AsyncTask<any, any>>] extends [never]
    ? SyncTask<
        [FinalReturnValue] extends [never]
          ? never
          : FinalReturnValue extends Task<infer T>
          ? T
          : FinalReturnValue extends Result<infer T>
          ? T
          : FinalReturnValue,
        UnwrapError<FinalReturnValue> | UnwrapError<Gen>
      >
    : AsyncTask<
        [FinalReturnValue] extends [never]
          ? never
          : FinalReturnValue extends Task<infer T, any>
          ? T
          : FinalReturnValue extends Result<infer T, any>
          ? T
          : FinalReturnValue,
        UnwrapError<Gen> | UnwrapError<FinalReturnValue>
      >
  : never;

type UnwrapError<A> = A extends Option<unknown>
  ? UnwrapNoneError
  : A extends Result<unknown, infer E>
  ? E
  : A extends Task<unknown, infer E>
  ? E
  : never;

type UnwrapValue<A> = A extends Result<infer T, unknown>
  ? T
  : A extends Task<infer T, unknown>
  ? T
  : never;
