import { identity, isOption, isResult } from "./utils";
import { Option } from "./option";
import { Err, Result, SettledResult } from "./result";

export class Task<E, A> {
  // @ts-expect-error
  private readonly _tag = "Task" as const;

  /**
   * Task constructor.
   * @constructor
   * @param {() => PromiseLike<Result<E, A>>} _run
   */
  constructor(private readonly _run: () => PromiseLike<Result<E, A>>) {}

  /**
   * Creates a Task from a value, Result, Option.
   * If the value is a function, it will be called, using the return value.
   * If the function returns a Promise, it will be awaited.
   * @static
   * @param {A | Result<E, A> | Option<A> | (() => PromiseLike<A> | A | Result<E, A> | Option<A>)} valueOrGetter
   * @param {(e: unknown) => E} [onErr]
   * @returns {Task<E, A>}
   */
  static from<E, A>(
    valueOrGetter:
      | A
      | Result<E, A>
      | Option<A>
      | (() => PromiseLike<A> | A | Result<E, A> | Option<A>),
    onErr: (e: unknown) => E = identity as any
  ): Task<E, A> {
    return new Task(async () => {
      try {
        const maybePromise =
          valueOrGetter instanceof Function ? valueOrGetter() : valueOrGetter;
        const maybeResult = isPromiseLike(maybePromise)
          ? await maybePromise
          : maybePromise;
        if (isResult(maybeResult)) {
          return Promise.resolve(maybeResult);
        }

        if (isOption(maybeResult)) {
          if (maybeResult.isNone()) {
            throw maybeResult;
          }
          return Promise.resolve(Result.Ok(maybeResult.unwrap()));
        }

        return Promise.resolve(Result.Ok(maybeResult));
      } catch (e) {
        return Promise.resolve(Result.Err(onErr(e)));
      }
    }) as Task<E, NonNullable<A>>;
  }

  /**
   * Creates a Task with an Ok Result.
   * @static
   * @param {A} value
   * @returns {Task<E, A>}
   */
  static Ok<E, A>(value: A): Task<E, A> {
    return Task.from(Result.Ok(value));
  }

  /**
   * Creates a Task with an Err Result.
   * @static
   * @param {E} error
   * @returns {Task<E, A>}
   */
  static Err<E, A>(error: E): Task<E, A> {
    return Task.from(Result.Err<E, A>(error));
  }

  /**
   * Traverses a collection and applies a function to each element, returning a Task with the results or the first Err.
   * @static
   * @param {Collection} collection
   * @param {(a: A) => ValidTask<E, B>} f
   * @returns {Task<E, Collection extends Record<string, any> ? Record<string, B> : B[]>}
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
    }
  > {
    return new Task(async () => {
      let results: any = Array.isArray(collection) ? [] : {};
      const keys = Array.isArray(collection)
        ? collection
        : Object.keys(collection);
      for (let i = 0; i < keys.length; i++) {
        const key = Array.isArray(collection) ? i : keys[i];
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
   * Traverses a list in parallel and applies a function to each element, returning a Task with the results or the first Err.
   * Limited by the concurrency parameter.
   * @static
   * @param {Collection} collection
   * @param {(a: A) => ValidTask<E, B>} f
   * @param {number} [concurrency=list.length]
   * @returns {Task<E, B[]>}
   */
  static traversePar<
    E,
    A,
    B,
    Collection extends A[] | [A, ...A[]] | Record<string, A>
  >(
    collection: Collection,
    f: (a: A) => ValidTask<E, B>,
    concurrency = Array.isArray(collection)
      ? collection.length
      : Object.keys(collection).length
  ): Task<E, B[]> {
    return new Task(async () => {
      const results: any = Array.isArray(collection) ? [] : {};
      let error: Err<any, any> | undefined;
      let currentIndex = 0;
      const keys = Array.isArray(collection)
        ? collection
        : Object.keys(collection);

      const executeTask = async () => {
        while (currentIndex < keys.length) {
          const taskIndex = currentIndex;
          currentIndex++;
          const key = Array.isArray(collection) ? taskIndex : keys[taskIndex];
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
   * Returns a Task that resolves with the first successful result.
   * @static
   * @param {TTasks} tasks
   * @returns {Task<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>>}
   */
  static any<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks
  ): Task<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>> {
    // @ts-expect-error
    return new Task<unknown, unknown>(async () => {
      let first: Result<any, any> | undefined;

      const values = Array.isArray(tasks) ? tasks : Object.values(tasks);

      for (const task of values) {
        const result = await (task instanceof Function ? task() : task.run());
        if (result.isOk()) {
          return result;
        }
        if (!first) {
          first = result;
        }
      }
      return first!;
    });
  }

  /**
   * Runs tasks sequentially and returns a Task with the results.
   * @static
   * @param {TTasks} tasks
   * @returns {Task<CollectErrorsToUnion<TTasks>, CollectValues<TTasks>>}
   */
  static sequential<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(tasks: TTasks): Task<CollectErrorsToUnion<TTasks>, CollectValues<TTasks>> {
    // sequentially run the promises
    // @ts-expect-error
    return new Task(async () => {
      let result: any = Array.isArray(tasks) ? [] : {};
      const keys = Array.isArray(tasks) ? tasks : Object.keys(tasks);
      for (let i = 0; i < keys.length; i++) {
        const key = Array.isArray(tasks) ? i : keys[i];
        const task = Array.isArray(tasks) ? tasks[i] : tasks[key];
        const next = await (task instanceof Function ? task() : task.run());
        if (next.isErr()) {
          return next;
        }
        result[key] = next.unwrap();
      }
      return Result.Ok(result);
    });
  }

  /**
   * Runs tasks in parallel, limited by the given concurrency, and returns a Task with the results.
   * @static
   * @param {TTasks} tasks
   * @param {number} [concurrency=tasks.length]
   * @returns {Task<CollectErrorsToUnion<TTasks>, CollectValues<TTasks>> }
   */
  static parallel<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks,
    concurrency: number = Array.isArray(tasks)
      ? tasks.length
      : Object.keys(tasks).length
  ): Task<CollectErrorsToUnion<TTasks>, CollectValues<TTasks>> {
    if (concurrency <= 0) {
      throw new Error("Concurrency must be greater than 0.");
    }
    return new Task(async () => {
      const results: any = Array.isArray(tasks) ? [] : {};
      let error: Err<any, any> | undefined;
      let currentIndex = 0;
      const keys = Array.isArray(tasks) ? tasks : Object.keys(tasks);

      const executeTask = async () => {
        while (currentIndex < keys.length) {
          const taskIndex = currentIndex;
          currentIndex++;

          const key = Array.isArray(tasks) ? taskIndex : keys[taskIndex];
          const task = Array.isArray(tasks) ? tasks[taskIndex] : tasks[key];
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
   * Returns a Task that resolves with the first completed result.
   * @static
   * @param {TTasks} tasks
   * @returns {Task<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>>}
   */
  static race<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks
  ): Task<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>> {
    // @ts-expect-error
    return new Task(() => {
      const tasksArray = (
        Array.isArray(tasks) ? tasks : Object.values(tasks)
      ) as ValidTask<unknown, unknown>[];
      return Promise.race(
        tasksArray.map(async (task) => {
          const next = await (task instanceof Function ? task() : task.run());
          return next;
        })
      );
    });
  }

  /**
   * Returns a Task with the successful results or an array of errors for each failed task.
   * @static
   * @param {TTasks} tasks
   * @returns {Task<CollectErrorsToUnion<TTasks>[], CollectValues<TTasks>>}
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
      const results: any = Array.isArray(tasks) ? [] : {};
      const errors: any = Array.isArray(tasks) ? [] : {};
      const keys = Array.isArray(tasks) ? tasks : Object.keys(tasks);
      for (let i = 0; i < keys.length; i++) {
        const key = Array.isArray(tasks) ? i : keys[i];
        const task = Array.isArray(tasks) ? tasks[i] : tasks[key];
        const result = await (task instanceof Function ? task() : task.run());

        if (result.isErr()) {
          if (Array.isArray(tasks)) {
            errors.push(result.unwrapErr());
          } else {
            errors[key] = result.unwrapErr();
          }
        } else {
          if (Array.isArray(tasks)) {
            results.push(result.unwrap());
          } else {
            results[key] = result.unwrap();
          }
        }
      }
      if (
        Array.isArray(tasks)
          ? errors.length > 0
          : Object.keys(errors).length > 0
      ) {
        return Result.Err(errors);
      }
      return Result.Ok(results);
    });
  }

  /**
   * Runs tasks in parallel, limited by the given concurrency, and returns a Task with the successful results or an array of errors for each failed task.
   * @static
   * @param {TTasks} tasks
   * @param {number} [concurrency=tasks.length]
   * @returns {Task<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      ? CollectErrorsToUnion<TTasks>[]
      : Partial<CollectErrors<TTasks>>,
    CollectValues<TTasks>
  >}
   */
  static coalescePar<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks,
    concurrency = Array.isArray(tasks)
      ? tasks.length
      : Object.keys(tasks).length
  ): Task<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      ? CollectErrorsToUnion<TTasks>[]
      : Partial<CollectErrors<TTasks>>,
    CollectValues<TTasks>
  > {
    if (concurrency <= 0) {
      throw new Error("Concurrency limit must be greater than 0");
    }

    return new Task(async () => {
      const results: any = Array.isArray(tasks) ? [] : {};
      let errors: any = Array.isArray(tasks) ? [] : {};
      let currentIndex = 0;
      const keys = Array.isArray(tasks) ? tasks : Object.keys(tasks);

      const executeTask = async () => {
        while (currentIndex < keys.length) {
          const taskIndex = currentIndex;
          currentIndex++;

          const key = Array.isArray(tasks) ? taskIndex : keys[taskIndex];
          const task = Array.isArray(tasks) ? tasks[taskIndex] : tasks[key];
          const result = await (task instanceof Function ? task() : task.run());

          if (result.isErr()) {
            if (Array.isArray(tasks)) {
              errors.push(result.unwrapErr());
            } else {
              errors[key] = result.unwrapErr();
            }
          } else {
            if (Array.isArray(tasks)) {
              results.push(result.unwrap());
            } else {
              results[key] = result.unwrap();
            }
          }
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency, keys.length) },
        () => executeTask()
      );
      await Promise.all(workers);

      if (
        Array.isArray(tasks)
          ? errors.length > 0
          : Object.keys(errors).length > 0
      ) {
        return Result.Err(errors);
      }
      return Result.Ok(results);
    });
  }

  static async settle<
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
  }> {
    const results: any = Array.isArray(tasks) ? [] : {};
    const keys = Array.isArray(tasks) ? tasks : Object.keys(tasks);
    for (let i = 0; i < keys.length; i++) {
      const key = Array.isArray(tasks) ? i : keys[i];
      const task = Array.isArray(tasks) ? tasks[i] : tasks[key];
      const result = await (task instanceof Function ? task() : task.run());
      results[key] = result.isOk()
        ? {
            type: "Ok",
            value: result.unwrap(),
          }
        : {
            type: "Err",
            error: result.unwrapErr(),
          };
    }
    return results;
  }

  static async settlePar<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks,
    concurrency = Array.isArray(tasks)
      ? tasks.length
      : Object.keys(tasks).length
  ): Promise<{
    [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
      ? SettledResult<E, A>
      : never;
  }> {
    if (concurrency <= 0) {
      throw new Error("Concurrency limit must be greater than 0");
    }

    const results: any = Array.isArray(tasks) ? [] : {};
    let currentIndex = 0;
    const keys = Array.isArray(tasks) ? tasks : Object.keys(tasks);

    const executeTask = async () => {
      while (currentIndex < keys.length) {
        const taskIndex = currentIndex;
        currentIndex++;

        const key = Array.isArray(tasks) ? taskIndex : keys[taskIndex];
        const task = Array.isArray(tasks) ? tasks[taskIndex] : tasks[key];
        const result = await (task instanceof Function ? task() : task.run());

        results[key] = result.isOk()
          ? {
              type: "Ok",
              value: result.unwrap(),
            }
          : {
              type: "Err",
              error: result.unwrapErr(),
            };
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
   * @static
   * @param {() => Promise<A> | A} f
   * @param {(e: unknown) => E} onErr
   * @returns {Task<E, A>}
   */
  static tryCatch<E, A>(
    f: () => Promise<A> | A,
    onErr: (e: unknown) => E
  ): Task<E, A> {
    return Task.from(f, onErr);
  }

  /**
   * Maps a function over a Task's successful value.
   * @param {(a: A) => B | PromiseLike<B>} f
   * @returns {Task<E, B>}
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
   * @param {(e: E) => F | PromiseLike<F>} f
   * @returns {Task<F, A>}
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
   * @param {(a: A) => Task<F, B> | Result<F, B> | PromiseLike<Task<F, B | PromiseLike<Result<F, B>>} f
   * @returns {Task<E | F, B>}
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
          return Promise.resolve(result as unknown as Result<E, B>);
        }

        const next = f(result.unwrap());
        const value = isPromiseLike(next) ? await next : next;
        return value;
      })
    );
  }

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
   * @returns {Promise<Result<E, A>>}
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
   * @param {(a: A) => PromiseLike<void> | void} f
   * @returns {Task<E, A>}
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
   * @param {(e: E) => PromiseLike<void> | void} f
   * @returns {Task<E, A>}
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
   * @param {{Ok: (a: A) => B | PromiseLike<B>; Err: (e: E) => B | PromiseLike<B>;}} cases
   * @returns {Promise<B>}
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
