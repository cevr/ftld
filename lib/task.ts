import { identity, isOption, isResult } from "./utils";
import { Result } from "./result";
import type { Err, SettledResult } from "./result";
import type { Option } from "./option";

export type TaskSchedulingOptions<E, A> = {
  delay?:
    | number
    | ((
        retryAttempts: number,
        repeatAttempts: number
      ) =>
        | number
        | Result<unknown, number>
        | Task<unknown, number>
        | PromiseLike<number>);
  retry?:
    | number
    | ((
        attempt: number,
        err: E
      ) =>
        | number
        | boolean
        | Result<unknown, number | boolean>
        | Task<unknown, number | boolean>
        | PromiseLike<number | boolean>);
  repeat?:
    | number
    | ((
        attempt: number,
        value: A
      ) =>
        | number
        | boolean
        | Result<unknown, number | boolean>
        | Task<unknown, number | boolean>
        | PromiseLike<number | boolean>);
  timeout?: number;
};

export class TaskTimeoutError extends Error {
  constructor() {
    super("Task timed out");
  }
}

export class TaskSchedulingError extends Error {
  constructor() {
    super("Unknown Task scheduling error");
  }
}

export class Task<E, A> {
  readonly _tag = "Task" as const;

  private attempts = {
    retry: 0,
    repeat: 0,
  };

  private constructor(private readonly _run: () => Promise<Result<E, A>>) {}

  /**
   * Creates a Task from a value, Result, Option.
   * If the value is a function, it will be called, using the return value.
   * If the function returns a Promise, it will be awaited.
   */
  static from<E, A>(
    valueOrGetter:
      | Result<E, A>
      | Task<E, A>
      | Option<A>
      | (() =>
          | Result<E, A>
          | Task<E, A>
          | Option<A>
          | PromiseLike<Result<E, A>>
          | PromiseLike<Option<A>>
          | PromiseLike<A>
          | A)
      | A,
    onErr = identity as (e: unknown) => E
  ): Task<E, A> {
    return new Task(async () => {
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
  }

  /**
   * Creates a Task based on a predicate function.
   */
  static fromPredicate<E, A, B extends A>(
    valueOrGetter:
      | Result<E, A>
      | Task<E, A>
      | Option<A>
      | (() =>
          | Result<E, A>
          | Task<E, A>
          | Option<A>
          | PromiseLike<Result<E, A>>
          | PromiseLike<Option<A>>
          | PromiseLike<A>
          | A)
      | A,
    onErr: (a: A) => E,
    predicate: (a: A) => a is B
  ): Task<E, B>;
  static fromPredicate<E, A>(
    valueOrGetter:
      | Result<E, A>
      | Task<E, A>
      | Option<A>
      | (() =>
          | Result<E, A>
          | Task<E, A>
          | Option<A>
          | PromiseLike<Result<E, A>>
          | PromiseLike<Option<A>>
          | PromiseLike<A>
          | A)
      | A,
    onErr: (a: unknown) => E,
    predicate: (a: A) => boolean
  ): Task<E, A>;
  static fromPredicate<E, A>(
    valueOrGetter:
      | Result<E, A>
      | Task<E, A>
      | Option<A>
      | (() =>
          | Result<E, A>
          | Task<E, A>
          | Option<A>
          | PromiseLike<Result<E, A>>
          | PromiseLike<Option<A>>
          | PromiseLike<A>
          | A)
      | A,
    onErr: (a: unknown) => E = identity as (a: unknown) => E,
    predicate: (a: A) => boolean
  ): Task<E, A> {
    return new Task(async () => {
      try {
        const maybePromise =
          valueOrGetter instanceof Function ? valueOrGetter() : valueOrGetter;
        const maybeResult = isPromiseLike(maybePromise)
          ? await maybePromise
          : maybePromise;

        if (isResult(maybeResult)) {
          if (maybeResult.isErr()) {
            return maybeResult;
          }
          if (predicate(maybeResult.unwrap())) {
            return maybeResult;
          }
          return Result.Err(onErr(maybeResult.unwrap()));
        }

        if (isOption(maybeResult)) {
          if (maybeResult.isNone()) {
            return Result.Err(onErr(maybeResult));
          }
          const value = maybeResult.unwrap();
          if (predicate(value)) {
            return Result.Ok(value);
          }
          return Result.Err(onErr(value));
        }
        if (predicate(maybeResult)) {
          return Result.Ok(maybeResult);
        }
        return Result.Err(onErr(maybeResult));
      } catch (e) {
        return Result.Err(onErr(e));
      }
    });
  }

  /**
   * Creates a Task with an Ok Result.
   */
  static Ok<A>(value: A): Task<never, A> {
    return new Task(() => Promise.resolve(Result.Ok(value)));
  }

  /**
   * Creates a Task with an Err Result.
   */
  static Err<E>(error: E): Task<E, never> {
    return new Task(() => Promise.resolve(Result.Err(error)));
  }

  /**
   * Creates a Task that will resolve with `void` after a given amount of time.
   */
  static sleep(ms: number): Task<never, void> {
    return new Task(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve(Result.Ok(undefined));
          }, ms)
        )
    );
  }

  /**
   * Traverses a collection and applies a function to each element, returning a Task with the results or the first Err.
   */
  static traverse<
    E,
    A,
    B,
    Collection extends A[] | [A, ...A[]] | Record<string, A>
  >(
    collection: Collection,
    f: (a: A) => ValidTask<E, B>
  ): Task<
    E,
    {
      [K in keyof Collection]: B;
    } & {}
  > {
    return new Task(async () => {
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
  }

  /**
   * Traverses a collection in parallel and applies a function to each element, returning a Task with the results or the first Err.
   * Limited by the concurrency parameter.
   */
  static traversePar<
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
    } & {}
  > {
    return new Task(async () => {
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
  }

  /**
   * Returns a Task that resolves with the first successful result or rejects with the first Err.
   */
  static any<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks
  ): Task<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>> {
    return new Task(async () => {
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
  }

  /**
   * Runs tasks sequentially and returns a Task with the results.
   */
  static sequential<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(tasks: TTasks): Task<CollectErrorsToUnion<TTasks>, CollectValues<TTasks>> {
    return new Task(async () => {
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
  }

  /**
   * Runs tasks in parallel, limited by the given concurrency, and returns a Task with the results.
   */
  static parallel<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks,
    concurrency?: number
  ): Task<CollectErrorsToUnion<TTasks>, CollectValues<TTasks>> {
    const isArray = Array.isArray(tasks);
    const keys = isArray ? tasks : Object.keys(tasks);
    concurrency = concurrency ?? keys.length;
    if (concurrency <= 0) {
      throw new Error("Concurrency must be greater than 0.");
    }
    return new Task(async () => {
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
  }

  /**
   * Returns a Task that resolves with the first completed result.
   */
  static race<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks
  ): Task<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>> {
    return new Task(() => {
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
  }

  /**
   * Returns a Task with the successful results or an array of errors for each failed task.
   */
  static coalesce<
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
  > {
    return new Task(async () => {
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
  }

  /**
   * Runs tasks in parallel, limited by the given concurrency, and returns a Task with the successful results or an array of errors for each failed task.
   */
  static coalescePar<
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
  > {
    const isArray = Array.isArray(tasks);
    const keys = isArray ? tasks : Object.keys(tasks);
    concurrency = concurrency ?? keys.length;
    if (concurrency <= 0) {
      throw new Error("Concurrency limit must be greater than 0");
    }

    return new Task(async () => {
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
  }

  /**
   * Settles a collection tasks and returns a promise with the SettledResult collection.
   */
  static async settle<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks
  ): Promise<
    {
      [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
        ? SettledResult<E, A>
        : never;
    } & {}
  > {
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
  }

  /**
   * Settles a collection tasks in parallel, limited by the given concurrency, and returns a promise with the SettledResult collection.
   */
  static async settlePar<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks,
    concurrency?: number
  ): Promise<
    {
      [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
        ? SettledResult<E, A>
        : never;
    } & {}
  > {
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
  }

  /**
   * Creates a Task by trying a function and catching any errors.
   */
  static tryCatch<E, A>(
    f: () =>
      | Result<E, A>
      | Task<E, A>
      | Option<A>
      | PromiseLike<Result<E, A>>
      | PromiseLike<Option<A>>
      | PromiseLike<A>
      | A,
    onErr: (e: unknown) => E
  ): Task<E, A> {
    return Task.from(f, onErr);
  }

  /**
   * Maps a function over a Task's successful value.
   */
  map<B>(f: (a: A) => B | PromiseLike<B>): Task<E, B> {
    return new Task<E, B>(() =>
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
    return new Task<F, A>(() =>
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
    return new Task(() =>
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
   * Flat maps a function over a Task's error value. Combines the result of the function into a single Task.
   */
  flatMapErr<F, B>(
    f: (
      e: E
    ) =>
      | Task<F, B>
      | Result<F, B>
      | PromiseLike<Task<F, B>>
      | PromiseLike<Result<F, B>>
  ): Task<F, A | B> {
    return new Task(() =>
      this.run().then(async (result) => {
        if (result.isOk()) {
          return result as unknown as Result<F, B>;
        }

        const next = f(result.unwrapErr());
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
    return new Task(() =>
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
    return new Task(() =>
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
    return new Task(() =>
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
    return new Task(() =>
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

  async unwrap(): Promise<A> {
    return this.run().then((result) => result.unwrap());
  }

  async unwrapErr(): Promise<E> {
    return this.run().then((result) => result.unwrapErr());
  }

  async unwrapOr<B>(fallback: B | (() => PromiseLike<B> | B)): Promise<A | B> {
    return this.run().then(async (result) => result.unwrapOr(fallback));
  }

  /**
   * Manages the execution of the Task. You can specify a delay and a timeout, and a retry policy. Returns a new Task.
   * If a timeout is specified, the Task may fail with a TaskTimeoutError.
   * You can pass a function to each scheduler option to make it dynamic. It will pass the number of attempts as an argument, starting from 1.
   */
  schedule<S extends TaskSchedulingOptions<E, A>>(
    scheduler: S
  ): Task<
    | E
    | {
        [K in keyof S]: S[K] extends (...args: any[]) => any
          ? TaskSchedulingError
          : K extends "timeout"
          ? S[K] extends number
            ? TaskTimeoutError
            : never
          : never;
      }[keyof S],
    A
  > {
    // @ts-expect-error
    return new Task(async () => {
      const run = async () => {
        let promise: () => Promise<Result<E | TaskTimeoutError, A>> = () =>
          this.run();
        if (scheduler.delay) {
          const task = await Task.from(() =>
            scheduler.delay instanceof Function
              ? scheduler.delay(this.attempts.retry, this.attempts.repeat)
              : scheduler.delay!
          ).mapErr(() => new TaskSchedulingError());

          if (task.isErr()) {
            return task;
          }
          const delay = task.unwrap();
          let oldPromise = promise;
          promise = () => Task.sleep(delay).then(() => oldPromise());
        }

        if (scheduler.timeout !== undefined) {
          let oldPromise = promise;
          promise = () =>
            Promise.race([
              oldPromise(),
              Task.sleep(scheduler.timeout!).then(
                () => Result.Err(new TaskTimeoutError()) as any
              ),
            ]);
        }
        if (scheduler.retry !== undefined) {
          let oldPromise = promise;
          promise = () =>
            oldPromise().then(async (result) => {
              if (result.isErr()) {
                const task = await Task.from(() =>
                  scheduler.retry instanceof Function
                    ? scheduler.retry(
                        this.attempts.retry,
                        result.unwrapErr() as any
                      )
                    : scheduler.retry!
                ).mapErr(() => new TaskSchedulingError());
                if (task.isErr()) {
                  return task as any;
                }
                const retry = maybeBoolToInt(task.unwrap());
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
            oldPromise().then(async (result) => {
              if (result.isOk()) {
                const task = await Task.from(() =>
                  scheduler.repeat instanceof Function
                    ? scheduler.repeat(this.attempts.repeat, result.unwrap())
                    : scheduler.repeat!
                ).mapErr(() => new TaskSchedulingError());

                if (task.isErr()) {
                  return task as any;
                }
                const repeat = maybeBoolToInt(task.unwrap());
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
      return run().catch(() => Result.Err(new TaskSchedulingError()));
    });
  }

  /**
   * Inverts the Task's Result. Err becomes Ok, and Ok becomes Err.
   */
  inverse(): Task<A, E> {
    return new Task(() => this.run().then((result) => result.inverse()));
  }
}

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
} & {};

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
} & {};

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

const maybeBoolToInt = (value: boolean | number) => {
  if (typeof value === "boolean") {
    return value ? Infinity : 0;
  }
  return value;
};
