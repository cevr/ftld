import { identity, isOption, isResult } from "./utils";
import { Option } from "./option";
import { Err, Result, SettledResult } from "./result";

export type TaskScheduler<E, A> = {
  delay?: number | ((retryAttempts: number, repeatAttempts: number) => number);
  retry?: number | ((attempt: number, err: E) => number);
  repeat?: number | ((attempt: number, value: A) => number);
  timeout?: number;
};

export class TaskTimeoutError extends Error {
  constructor() {
    super("Task timed out");
  }
}

class _Task<E, A> {
  // @ts-expect-error
  private readonly _tag = "Task" as const;
  private attempts = {
    retry: 0,
    repeat: 0,
  };
  constructor(private readonly _run: () => Promise<Result<E, A>>) {}

  /**
   * Maps a function over a Task's successful value.
   */
  map<B>(f: (a: A) => B | PromiseLike<B>): Task<E, B> {
    return new _Task<E, B>(() =>
      this.run().then(async (result) => {
        if (result.isErr()) {
          return result as unknown as Result<E, B>;
        }
        const value = result.unwrap();
        const next = f(value);
        return (
          isPromiseLike(next) ? Result.Ok(await next) : Result.Ok(next)
        ) as Result<E, B>;
      })
    );
  }

  /**
   * Maps a function over a Task's error value.
   */
  mapErr<F>(f: (e: E) => F | PromiseLike<F>): Task<F, A> {
    return new _Task<F, A>(() =>
      this.run().then(async (result) => {
        if (result.isErr()) {
          const value = result.unwrapErr();
          const next = f(value);
          return (
            isPromiseLike(next) ? Result.Err(await next) : Result.Err(next)
          ) as Result<F, A>;
        }
        return result as unknown as Result<F, A>;
      })
    );
  }

  /**
   * Flat maps a function over a Task's successful value. Combines the result of the function into a single Task.
   */
  flatMap<F, B>(
    f: (
      a: A
    ) =>
      | Task<F, B>
      | Result<F, B>
      | PromiseLike<Task<F, B>>
      | PromiseLike<Result<F, B>>
  ): Task<E | F, B> {
    return new _Task(() =>
      this.run().then(async (result) => {
        if (result.isErr()) {
          return result as unknown as Result<F, B>;
        }

        const next = f(result.unwrap());
        const value = isPromiseLike(next) ? await next : next;
        return value;
      })
    );
  }

  /**
   * Maps a function over a Task's underlying Result value. Combines the return value of the function into a single Task.
   */
  mapResult<F, B>(
    f: (
      a: Result<E, A>
    ) =>
      | Task<F, B>
      | Result<F, B>
      | B
      | PromiseLike<Result<F, B>>
      | PromiseLike<Task<F, B>>
      | PromiseLike<B>
  ): Task<E | F, B> {
    return new _Task(() =>
      this.run().then(async (result) => {
        const next = f(result);
        const value = isPromiseLike(next) ? await next : next;
        if (isResult(value)) {
          return value;
        }
        return Result.Ok(value);
      })
    );
  }

  /**
   * Runs the Task and returns a Promise with the Result.
   */
  async run(): Promise<Result<E, A>> {
    return this._run();
  }

  then<B>(
    onfulfilled?:
      | ((value: Result<E, A>) => B | PromiseLike<B>)
      | undefined
      | null,
    onrejected?: never
  ): Promise<B> {
    return this.run().then(onfulfilled, onrejected);
  }

  /**
   * Executes a side-effecting function with the Task's successful value.
   */
  tap(f: (a: A) => PromiseLike<void> | void): Task<E, A> {
    return new _Task(() =>
      this.run().then(async (result) => {
        if (result.isOk()) {
          const res = f(result.unwrap());
          if (isPromiseLike(res)) {
            await res;
          }
        }
        return result;
      })
    );
  }

  /**
   * Executes a side-effecting function with the Task's error value.
   */
  tapErr(f: (e: E) => PromiseLike<void> | void): Task<E, A> {
    return new _Task(() =>
      this.run().then(async (result) => {
        if (result.isErr()) {
          const res = f(result.unwrapErr());
          if (isPromiseLike(res)) {
            await res;
          }
        }
        return result;
      })
    );
  }
  /**
   * Executes a side-effecting function with the Task's Result.
   */
  tapResult(f: (result: Result<E, A>) => PromiseLike<void> | void): Task<E, A> {
    return new _Task(() =>
      this.run().then(async (result) => {
        const res = f(result);
        if (isPromiseLike(res)) {
          await res;
        }
        return result;
      })
    );
  }

  /**
   * Matches the Task's Result and executes a function based on its variant (Ok or Err).
   */
  async match<B>(cases: {
    Ok: (a: A) => B | PromiseLike<B>;
    Err: (e: E) => B | PromiseLike<B>;
  }): Promise<B> {
    return this.run().then((result) => {
      if (result.isErr()) {
        return cases.Err(result.unwrapErr());
      }
      return cases.Ok(result.unwrap());
    });
  }

  /**
   * Manages the execution of the Task. You can specify a delay and a timeout, and a retry policy. Returns a new Task.
   * If a timeout is specified, the Task may fail with a TaskTimeoutError.
   * You can pass a function to each scheduler option to make it dynamic. It will pass the number of attempts as an argument, starting from 1.
   */
  schedule<S extends TaskScheduler<E, A>>(
    scheduler: S
  ): S extends {
    timeout: number;
  }
    ? Task<E | TaskTimeoutError, A>
    : Task<E, A> {
    // @ts-expect-error
    return new _Task(async () => {
      const run = async () => {
        let promise: () => Promise<Result<E | TaskTimeoutError, A>> = () =>
          this.run();
        if (scheduler.delay) {
          const delay =
            scheduler.delay instanceof Function
              ? scheduler.delay(this.attempts.retry, this.attempts.repeat)
              : scheduler.delay;
          let oldPromise = promise;
          promise = () => sleep(delay).then(() => oldPromise());
        }

        if (scheduler.timeout !== undefined) {
          let oldPromise = promise;
          promise = () =>
            Promise.race([
              oldPromise(),
              sleep(scheduler.timeout!).then(
                () => Result.Err(new TaskTimeoutError()) as any
              ),
            ]);
        }
        if (scheduler.retry !== undefined) {
          let oldPromise = promise;
          promise = () =>
            oldPromise().then((result) => {
              if (result.isErr()) {
                const retry =
                  scheduler.retry instanceof Function
                    ? scheduler.retry(
                        this.attempts.retry,
                        result.unwrapErr() as any
                      )
                    : scheduler.retry!;
                if (++this.attempts.retry < retry) {
                  return run();
                }
              }

              this.attempts.retry = 0;
              return result;
            });
        }

        if (scheduler.repeat !== undefined && this.attempts.retry === 0) {
          let oldPromise = promise;
          promise = () =>
            oldPromise().then((result) => {
              if (result.isOk()) {
                const repeat =
                  scheduler.repeat instanceof Function
                    ? scheduler.repeat(this.attempts.repeat, result.unwrap())
                    : scheduler.repeat!;
                if (++this.attempts.repeat <= repeat) {
                  return run();
                }
              }
              this.attempts.repeat = 0;
              return result;
            });
        }
        return promise();
      };
      return run();
    });
  }
}

export type Task<E, A> = _Task<E, A>;

export const Task: {
  /**
   * Creates a Task from a value, Result, Option.
   * If the value is a function, it will be called, using the return value.
   * If the function returns a Promise, it will be awaited.
   */
  from<E, A>(
    valueOrGetter:
      | A
      | Result<E, A>
      | Option<A>
      | (() => PromiseLike<A> | A | Result<E, A> | Option<A>),
    onErr?: (e: unknown) => E
  ): Task<E, A>;

  /**
   * Creates a Task with an Ok Result.
   */
  Ok<A, E = never>(value: A): Task<E, A>;

  /**
   * Creates a Task with an Err Result.
   */
  Err<E, A = never>(error: E): Task<E, A>;

  /**
   * Traverses a collection and applies a function to each element, returning a Task with the results or the first Err.
   */
  traverse<E, A, B, Collection extends A[] | [A, ...A[]] | Record<string, A>>(
    collection: Collection,
    f: (a: A) => ValidTask<E, B>
  ): Task<
    E,
    {
      [K in keyof Collection]: B;
    }
  >;

  /**
   * Traverses a collection in parallel and applies a function to each element, returning a Task with the results or the first Err.
   * Limited by the concurrency parameter.
   */
  traversePar<
    E,
    A,
    B,
    Collection extends A[] | [A, ...A[]] | Record<string, A>
  >(
    collection: Collection,
    f: (a: A) => ValidTask<E, B>,
    concurrency?: number
  ): Task<
    E,
    {
      [K in keyof Collection]: B;
    }
  >;

  /**
   * Returns a Task that resolves with the first successful result or rejects with the first Err.
   */
  any<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks
  ): Task<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>>;

  /**
   * Runs tasks sequentially and returns a Task with the results.
   */
  sequential<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks
  ): Task<CollectErrorsToUnion<TTasks>, CollectValues<TTasks>>;

  /**
   * Runs tasks in parallel, limited by the given concurrency, and returns a Task with the results.
   */
  parallel<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks,
    concurrency?: number
  ): Task<CollectErrorsToUnion<TTasks>, CollectValues<TTasks>>;

  /**
   * Returns a Task that resolves with the first completed result.
   */
  race<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks
  ): Task<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>>;

  /**
   * Returns a Task with the successful results or an array of errors for each failed task.
   */
  coalesce<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks
  ): Task<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      ? CollectErrorsToUnion<TTasks>[]
      : Partial<CollectErrors<TTasks>>,
    CollectValues<TTasks>
  >;

  /**
   * Runs tasks in parallel, limited by the given concurrency, and returns a Task with the successful results or an array of errors for each failed task.
   */
  coalescePar<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks,
    concurrency?: number
  ): Task<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      ? CollectErrorsToUnion<TTasks>[]
      : Partial<CollectErrors<TTasks>>,
    CollectValues<TTasks>
  >;

  /**
   * Settles a collection tasks and returns a promise with the SettledResult collection.
   */
  settle<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks
  ): Promise<{
    [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
      ? SettledResult<E, A>
      : never;
  }>;

  /**
   * Settles a collection tasks in parallel, limited by the given concurrency, and returns a promise with the SettledResult collection.
   */
  settlePar<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks,
    concurrency?: number
  ): Promise<{
    [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
      ? SettledResult<E, A>
      : never;
  }>;

  /**
   * Creates a Task by trying a function and catching any errors.
   */
  tryCatch<E, A>(f: () => Promise<A> | A, onErr: (e: unknown) => E): Task<E, A>;
} = {
  from(valueOrGetter, onErr = identity as any) {
    return new _Task(async () => {
      try {
        const maybePromise =
          valueOrGetter instanceof Function ? valueOrGetter() : valueOrGetter;
        const maybeResult = isPromiseLike(maybePromise)
          ? await maybePromise
          : maybePromise;
        if (isResult(maybeResult)) {
          return maybeResult;
        }

        if (isOption(maybeResult)) {
          if (maybeResult.isNone()) {
            return Result.Err(onErr(maybeResult));
          }
          return Result.Ok(maybeResult.unwrap());
        }

        return Result.Ok(maybeResult);
      } catch (e) {
        return Result.Err(onErr(e));
      }
    }) as any;
  },

  Ok(value) {
    return new _Task(() => Promise.resolve(Result.Ok(value)));
  },

  Err(error) {
    return new _Task(() => Promise.resolve(Result.Err(error)));
  },

  traverse(collection, f) {
    return new _Task(async () => {
      const isArray = Array.isArray(collection);
      let results: any = isArray ? [] : {};
      const keys = isArray ? collection : Object.keys(collection);
      for (let i = 0; i < keys.length; i++) {
        const key = isArray ? i : keys[i];
        const item = (collection as any)[key];
        const task = f(item);
        const result = await (task instanceof Function ? task() : task.run());
        if (result.isErr()) {
          return result;
        }
        results[key] = result.unwrap();
      }
      return Result.Ok(results);
    });
  },

  traversePar(collection, f, concurrency) {
    return new _Task(async () => {
      const isArray = Array.isArray(collection);
      const results: any = isArray ? [] : {};
      let error: Err<any, any> | undefined;
      let currentIndex = 0;
      const keys = isArray ? collection : Object.keys(collection);
      concurrency = concurrency ?? keys.length;

      const executeTask = async () => {
        while (currentIndex < keys.length) {
          const taskIndex = currentIndex;
          currentIndex++;
          const key = isArray ? taskIndex : keys[taskIndex];
          const item = (collection as any)[key];
          const task = f(item);
          const result = await (task instanceof Function ? task() : task.run());

          if (result.isErr()) {
            error = result;
            return;
          }
          results[key] = result.unwrap();
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency, keys.length) },
        () => executeTask()
      );
      await Promise.all(workers);
      if (error) {
        return error;
      }
      return Result.Ok(results);
    });
  },

  any(tasks) {
    return new _Task(async () => {
      let first: Result<any, any> | undefined;

      const values = Array.isArray(tasks) ? tasks : Object.values(tasks);

      for (let i = 0; i < values.length; i++) {
        const task = values[i] as ValidTask<unknown, unknown>;
        const result = await (task instanceof Function ? task() : task.run());
        if (result.isOk()) {
          return result as any;
        }
        if (!first) {
          first = result;
        }
      }
      return first as any;
    });
  },

  sequential(tasks) {
    return new _Task(async () => {
      const isArray = Array.isArray(tasks);
      let result: any = isArray ? [] : {};
      const keys = isArray ? tasks : Object.keys(tasks);
      for (let i = 0; i < keys.length; i++) {
        const key = isArray ? i : keys[i];
        const task = (isArray ? tasks[i] : tasks[key]) as ValidTask<
          unknown,
          unknown
        >;
        const next = await (task instanceof Function ? task() : task.run());
        if (next.isErr()) {
          return next;
        }
        result[key] = next.unwrap();
      }
      return Result.Ok(result) as any;
    });
  },

  parallel(tasks, concurrency) {
    const isArray = Array.isArray(tasks);
    const keys = isArray ? tasks : Object.keys(tasks);
    concurrency = concurrency ?? keys.length;
    if (concurrency <= 0) {
      throw new Error("Concurrency must be greater than 0.");
    }
    return new _Task(async () => {
      const results: any = isArray ? [] : {};
      let error: Err<any, any> | undefined;
      let currentIndex = 0;

      const executeTask = async () => {
        while (currentIndex < keys.length) {
          const taskIndex = currentIndex;
          currentIndex++;

          const key = isArray ? taskIndex : keys[taskIndex];
          const task = isArray ? tasks[taskIndex] : tasks[key];
          const result = await (task instanceof Function ? task() : task.run());

          if (result.isErr()) {
            error = result;
            return;
          }
          results[key] = result.unwrap();
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency!, keys.length) },
        () => executeTask()
      );
      await Promise.all(workers);
      if (error) {
        return error;
      }
      return Result.Ok(results);
    });
  },

  race(tasks) {
    return new _Task(() => {
      const tasksArray = (
        Array.isArray(tasks) ? tasks : Object.values(tasks)
      ) as ValidTask<unknown, unknown>[];
      return Promise.race(
        tasksArray.map(async (task) => {
          const next = await (task instanceof Function ? task() : task.run());
          return next as Result<any, any>;
        })
      );
    });
  },

  coalesce(tasks) {
    return new _Task(async () => {
      const isArray = Array.isArray(tasks);
      const results: any = isArray ? [] : {};
      const errors: any = isArray ? [] : {};
      const keys = isArray ? tasks : Object.keys(tasks);
      let hasErrors = false;
      for (let i = 0; i < keys.length; i++) {
        const key = isArray ? i : keys[i];
        const task = isArray ? tasks[i] : tasks[key];
        const result = await (task instanceof Function ? task() : task.run());

        if (result.isErr()) {
          hasErrors = true;
          if (isArray) {
            errors.push(result.unwrapErr());
          } else {
            errors[key] = result.unwrapErr();
          }
        } else {
          if (isArray) {
            results.push(result.unwrap());
          } else {
            results[key] = result.unwrap();
          }
        }
      }
      if (hasErrors) {
        return Result.Err(errors);
      }
      return Result.Ok(results);
    });
  },

  coalescePar(tasks, concurrency) {
    const isArray = Array.isArray(tasks);
    const keys = isArray ? tasks : Object.keys(tasks);
    concurrency = concurrency ?? keys.length;
    if (concurrency <= 0) {
      throw new Error("Concurrency limit must be greater than 0");
    }

    return new _Task(async () => {
      const results: any = isArray ? [] : {};
      let errors: any = isArray ? [] : {};
      let hasErrors = false;
      let currentIndex = 0;

      const executeTask = async () => {
        while (currentIndex < keys.length) {
          const taskIndex = currentIndex;
          currentIndex++;

          const key = isArray ? taskIndex : keys[taskIndex];
          const task = isArray ? tasks[taskIndex] : tasks[key];
          const result = await (task instanceof Function ? task() : task.run());

          if (result.isErr()) {
            hasErrors = true;
            if (isArray) {
              errors.push(result.unwrapErr());
            } else {
              errors[key] = result.unwrapErr();
            }
          } else {
            if (isArray) {
              results.push(result.unwrap());
            } else {
              results[key] = result.unwrap();
            }
          }
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency!, keys.length) },
        () => executeTask()
      );
      await Promise.all(workers);

      if (hasErrors) {
        return Result.Err(errors);
      }
      return Result.Ok(results);
    });
  },

  async settle(tasks) {
    const isArray = Array.isArray(tasks);
    const results: any = isArray ? [] : {};
    const keys = isArray ? tasks : Object.keys(tasks);
    for (let i = 0; i < keys.length; i++) {
      const key = isArray ? i : keys[i];
      const task = isArray ? tasks[i] : tasks[key];
      const result = await (task instanceof Function ? task() : task.run());
      results[key] = result.settle();
    }
    return results;
  },

  async settlePar(tasks, concurrency) {
    const isArray = Array.isArray(tasks);
    const keys = isArray ? tasks : Object.keys(tasks);
    concurrency = concurrency ?? keys.length;
    if (concurrency <= 0) {
      throw new Error("Concurrency limit must be greater than 0");
    }

    const results: any = isArray ? [] : {};
    let currentIndex = 0;

    const executeTask = async () => {
      while (currentIndex < keys.length) {
        const taskIndex = currentIndex;
        currentIndex++;

        const key = isArray ? taskIndex : keys[taskIndex];
        const task = isArray ? tasks[taskIndex] : tasks[key];
        const result = await (task instanceof Function ? task() : task.run());

        results[key] = result.settle();
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, keys.length) },
      () => executeTask()
    );
    await Promise.all(workers);

    return results;
  },

  tryCatch(f, onErr) {
    return Task.from(f, onErr);
  },
};

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return typeof value === "object" && value !== null && "then" in value;
}

type ValidTask<E, A> = Task<E, A> | PseudoTask<E, A>;

type CollectErrors<
  T extends
    | ValidTask<unknown, unknown>[]
    | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
    | Record<string, ValidTask<unknown, unknown>>
> = {
  [K in keyof T]: T[K] extends Task<infer E, any>
    ? E
    : T[K] extends () => PromiseLike<Result<infer E, any>>
    ? E
    : never;
};

type CollectValues<
  T extends
    | ValidTask<unknown, unknown>[]
    | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
    | Record<string, ValidTask<unknown, unknown>>
> = {
  [K in keyof T]: T[K] extends Task<any, infer A>
    ? A
    : T[K] extends () => PromiseLike<Result<any, infer A>>
    ? A
    : never;
};

type CollectErrorsToUnion<
  T extends
    | ValidTask<unknown, unknown>[]
    | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
    | Record<string, ValidTask<unknown, unknown>>
> = T extends
  | ValidTask<unknown, unknown>[]
  | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  ? CollectErrors<T>[number]
  : T extends Record<string, ValidTask<unknown, unknown>>
  ? CollectErrors<T>[keyof T]
  : never;

type CollectValuesToUnion<
  T extends
    | ValidTask<unknown, unknown>[]
    | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
    | Record<string, ValidTask<unknown, unknown>>
> = T extends
  | ValidTask<unknown, unknown>[]
  | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  ? CollectValues<T>[number]
  : T extends Record<string, ValidTask<unknown, unknown>>
  ? CollectValues<T>[keyof T]
  : never;

type PseudoTask<E, A> = () => PromiseLike<Result<E, A>>;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
