import type { AsyncTask, SyncTask } from "./task.js";
import type { Option } from "./option.js";
import { Result } from "./result.js";
import { UnwrapNoneError, isMonad } from "./utils.js";
import { Task } from "./task.js";
import { isPromise } from "./internals.js";

const unwrap = (value: unknown): unknown => {
  return isMonad(value) ? unwrap(value.unwrap()) : value;
};

export function Do<Gen, Return>(
  f: () => Generator<Gen, Return, any>
): ComputeTask<Gen, Return> {
  return Task.from(() => {
    const iterator = f();
    let state = iterator.next();
    if (state.done) {
      return state.value;
    }
    let current = unwrap(state.value);
    let next: () => any = () => {
      if (isPromise(current)) {
        return current.then((x) => {
          current = unwrap(x);
          return next();
        });
      }
      while (!state.done) {
        state = iterator.next(current);
        current = unwrap(state.value);
        if (isPromise(current)) {
          return current.then((x) => {
            current = unwrap(x);
            return next();
          });
        }
        if (state.done) return current;
      }
      return current;
    };

    return next();
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
