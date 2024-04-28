import type { AsyncTask, SyncTask } from "./task.js";
import type { Option } from "./option.js";
import type { Result } from "./result.js";
import { UnwrapNoneError, isMonad } from "./utils.js";
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

const unwrap = (value: unknown): unknown => {
  return isMonad(value) ? unwrap(value.unwrap()) : value;
};
const toTask = (value: unknown): Task<unknown, unknown> => {
  return Task.from(() => unwrap(value));
};

export function Do<Gen, Return>(
  f: () => Generator<Gen, Return, any>
): ComputeTask<Gen, Return> {
  return Task.from(() => {
    const iterator = f();
    return run(iterator, iterator.next());
  }) as ComputeTask<Gen, Return>;
}

type ComputeTask<Gen, FinalReturnValue> = [
  Extract<Gen | FinalReturnValue, AsyncTask<any, any>>
] extends [never]
  ? SyncTask<
      UnwrapValue<FinalReturnValue>,
      UnwrapError<FinalReturnValue> | UnwrapError<Gen>
    >
  : AsyncTask<
      UnwrapValue<FinalReturnValue>,
      UnwrapError<Gen> | UnwrapError<FinalReturnValue>
    >;

type UnwrapError<A> = A extends Option<unknown>
  ? UnwrapNoneError
  : A extends Result<unknown, infer E>
  ? E
  : A extends Task<unknown, infer E>
  ? E
  : never;

type UnwrapValue<T> = [T] extends [never]
  ? never
  : T extends Task<infer Value, unknown>
  ? Value
  : T extends Result<infer Value, unknown>
  ? Value
  : T;
