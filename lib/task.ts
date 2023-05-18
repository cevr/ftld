import type { _tag, Compute } from "./internals";
import { isPromise } from "./internals";
import { identity, isOption, isResult, isTask, type Monad } from "./utils";
import { Result } from "./result";
import type { Err, SettledResult } from "./result";
import { UnwrapNoneError, type Option } from "./option";

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
        | Promise<number>);
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
        | Promise<number | boolean>);
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
        | Promise<number | boolean>);
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
  declare readonly [_tag]: "Task";

  private attempts = {
    retry: 0,
    repeat: 0,
  };

  private constructor(
    private readonly _run: () => [A] extends [never]
      ? Result<E, never>
      : A extends Promise<infer B>
      ? Promise<Result<E, B>>
      : Result<E, A>
  ) {}

  /**
   * Creates a Task from a value, Result, Option.
   * If the value is a function, it will be called, using the return value.
   * If the function returns a Promise, it will be awaited.
   */
  static from<
    A extends () => unknown,
    E = UnwrapError<A>,
    onErr extends ((a: unknown) => E) | undefined = (a: unknown) => E
  >(
    valueOrGetter: A,
    onErr?: onErr
  ): Task<
    onErr extends (...args: any[]) => infer E ? E : UnwrapError<A>,
    UnwrapValue<A>
  > {
    const onE = onErr ?? (identity as (a: unknown) => E);
    return new Task(() => {
      return unwrap(valueOrGetter, onE) as any;
    });
  }

  /**
   * Creates a Task based on a predicate function.
   */
  static fromPredicate<
    A extends () => unknown,
    E = UnwrapError<A>,
    B extends UnwrapValueWithPromise<A> = UnwrapValueWithPromise<A>
  >(
    valueOrGetter: A,
    predicate: (a: UnwrapValueWithPromise<A>) => a is B,
    onErr: (a: UnwrapValueWithPromise<A>) => E
  ): Task<E, UnwrapValue<A> extends Promise<unknown> ? Promise<B> : B>;
  static fromPredicate<A extends (() => unknown) | unknown, E = UnwrapError<A>>(
    valueOrGetter: A,
    predicate: (a: UnwrapValueWithPromise<A>) => boolean,
    onErr: (a: UnwrapValueWithPromise<A>) => E
  ): Task<E, UnwrapValue<A>>;
  static fromPredicate<A extends (() => unknown) | unknown, E = UnwrapError<A>>(
    valueOrGetter: A,
    predicate: (a: UnwrapValueWithPromise<A>) => boolean,
    onErr: (a: UnwrapValueWithPromise<A>) => E
  ): Task<E, A> {
    // @ts-expect-error
    return new Task(() => {
      const maybePromise = unwrap(valueOrGetter, onErr as any);
      if (isPromise(maybePromise)) {
        return maybePromise.then((res) => {
          if (res.isErr()) {
            return res;
          }
          if (predicate(res.unwrap() as any)) {
            return res;
          }
          return Result.Err(onErr(res.unwrap() as any));
        });
      }
      if (maybePromise.isErr()) {
        return maybePromise;
      }
      if (predicate(maybePromise.unwrap() as any)) {
        return maybePromise;
      }
      return Result.Err(onErr(maybePromise.unwrap() as any));
    });
  }

  /**
   * Creates a Task with an Ok Result.
   */
  static Ok<A>(value: A): Task<never, UnwrapValue<A>> {
    // @ts-expect-error
    return new Task(() =>
      // @ts-expect-error
      isPromise(value) ? value.then((v) => Result.Ok(v)) : Result.Ok(value)
    );
  }

  /**
   * Creates a Task with an Err Result.
   */
  static Err<E>(
    error: E
  ): Task<E, E extends Promise<unknown> ? Promise<never> : never> {
    // @ts-expect-error
    return new Task(() => {
      return isPromise(error)
        ? error.then(() => Result.Err(error))
        : Result.Err(error);
    });
  }

  /**
   * Creates a Task that will resolve with `void` after a given amount of time.
   */
  static sleep(ms: number): Task<never, Promise<void>> {
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
    B extends Promise<infer V>
      ? Promise<
          {
            [K in keyof Collection]: V;
          } & {}
        >
      : {
          [K in keyof Collection]: B;
        } & {}
  > {
    return new Task(() => {
      const isArray = Array.isArray(collection);
      let hasPromise: [number, Promise<Result<unknown, unknown>>] | null = null;
      let maybePromises: any = isArray ? [] : {};
      const keys = isArray ? collection : Object.keys(collection);
      for (let i = 0; i < keys.length; i++) {
        const key = isArray ? i : keys[i];
        const item = (collection as any)[key];
        const task = f(item);
        const result = (isTask(task) ? task.run() : task()) as
          | Promise<Result<E, B>>
          | Result<E, B>;
        if (isPromise(result)) {
          hasPromise = [i, result];
          break;
        }
        if (result.isErr()) {
          return result;
        }
        maybePromises[key] = result.unwrap();
      }

      if (hasPromise) {
        return new Promise(async (resolve) => {
          const [index, task] = hasPromise!;
          const result = await task;
          if (result.isErr()) {
            resolve(result as any);
          }
          const key = isArray ? index : keys[index];
          maybePromises[key] = result.unwrap();

          for (let i = index + 1; i < keys.length; i++) {
            const key = isArray ? i : keys[i];
            const item = (collection as any)[key];
            const task = f(item);
            const result = await (isTask(task) ? task.run() : task());
            if (result.isErr()) {
              resolve(result);
            }
            maybePromises[key] = result.unwrap();
          }
          resolve(Result.Ok(maybePromises));
        });
      }

      return Result.Ok(maybePromises);
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
    Promise<
      {
        [K in keyof Collection]: B extends Promise<infer C> ? C : B;
      } & {}
    >
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
          const result = await (isTask(task) ? task.run() : task());

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
  ): Task<
    CollectErrorsToUnion<TTasks>,
    CollectionHasPromise<TTasks> extends true
      ? Promise<CollectValuesToUnion<TTasks>>
      : CollectValuesToUnion<TTasks>
  > {
    return new Task(() => {
      let hasPromise: [number, Promise<Result<unknown, unknown>>] | null = null;
      let first: Result<any, any> | undefined;

      const values = Array.isArray(tasks) ? tasks : Object.values(tasks);

      for (let i = 0; i < values.length; i++) {
        const task = values[i] as ValidTask<unknown, unknown>;
        const result = (isTask(task) ? task.run() : task()) as
          | Promise<Result<any, any>>
          | Result<any, any>;
        if (isPromise(result)) {
          hasPromise = [i, result];
          break;
        }
        if (result.isOk()) {
          return result as any;
        }
        if (!first) {
          first = result;
        }
      }
      if (hasPromise) {
        return new Promise(async (resolve) => {
          const [index, task] = hasPromise!;
          const result = await task;
          if (result.isOk()) {
            resolve(result as any);
          }
          if (!first) {
            first = result;
          }

          for (let i = index + 1; i < values.length; i++) {
            const task = values[i] as ValidTask<unknown, unknown>;
            const result = await (isTask(task) ? task.run() : task());
            if (result.isOk()) {
              resolve(result as any);
            }
            if (!first) {
              first = result;
            }
          }
          resolve(first as any);
        });
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
  >(
    tasks: TTasks
  ): Task<
    CollectErrorsToUnion<TTasks>,
    CollectionHasPromise<TTasks> extends true
      ? Promise<CollectValues<TTasks>>
      : CollectValues<TTasks>
  > {
    return new Task(() => {
      const isArray = Array.isArray(tasks);
      let hasPromise: [number, Promise<Result<unknown, unknown>>] | null = null;
      let result: any = isArray ? [] : {};
      const keys = isArray ? tasks : Object.keys(tasks);
      for (let i = 0; i < keys.length; i++) {
        const key = isArray ? i : keys[i];
        const task = (isArray ? tasks[i] : tasks[key]) as ValidTask<
          unknown,
          unknown
        >;
        const next = (isTask(task) ? task.run() : task()) as
          | Promise<Result<any, any>>
          | Result<any, any>;

        if (isPromise(next)) {
          hasPromise = [i, next];
          break;
        }

        if (next.isErr()) {
          return next;
        }
        result[key] = next.unwrap();
      }
      if (hasPromise) {
        return new Promise(async (resolve) => {
          let [index, task] = hasPromise!;
          const next = await task;
          if (next.isErr()) {
            resolve(next as any);
          }
          const key = isArray ? index : keys[index];
          result[key] = next.unwrap();

          for (let i = index + 1; i < keys.length; i++) {
            const key = isArray ? i : keys[i];
            const task = (isArray ? tasks[i] : tasks[key]) as ValidTask<
              unknown,
              unknown
            >;
            const val = isTask(task) ? task.run() : task();
            const next = await val;

            if (next.isErr()) {
              resolve(next as any);
            }
            result[key] = next.unwrap();
          }
          resolve(Result.Ok(result));
        });
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
  ): Task<CollectErrorsToUnion<TTasks>, Promise<CollectValues<TTasks>>> {
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
          const result = await (isTask(task) ? task.run() : task());

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
  ): Task<CollectErrorsToUnion<TTasks>, Promise<CollectValuesToUnion<TTasks>>> {
    return new Task(() => {
      const tasksArray = (
        Array.isArray(tasks) ? tasks : Object.values(tasks)
      ) as ValidTask<unknown, unknown>[];
      return Promise.race(
        tasksArray.map(async (task) => {
          const next = await (isTask(task) ? task.run() : task());
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
      ? [CollectErrorsToUnion<TTasks>] extends [never]
        ? never
        : CollectErrorsToUnion<TTasks>[]
      : Compute<Partial<CollectErrors<TTasks>>>,
    CollectionHasPromise<TTasks> extends true
      ? Promise<CollectValues<TTasks>>
      : CollectValues<TTasks>
  > {
    return new Task(() => {
      const isArray = Array.isArray(tasks);
      let hasPromise: [number, Promise<Result<unknown, unknown>>] | null = null;
      const results: any = isArray ? [] : {};
      const errors: any = isArray ? [] : {};
      const keys = isArray ? tasks : Object.keys(tasks);
      let hasErrors = false;
      for (let i = 0; i < keys.length; i++) {
        const key = isArray ? i : keys[i];
        const task = isArray ? tasks[i] : tasks[key];
        const result = (isTask(task) ? task.run() : task()) as
          | Promise<Result<unknown, unknown>>
          | Result<unknown, unknown>;

        if (isPromise(result)) {
          hasPromise = [i, result];
          break;
        }

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
      if (hasPromise) {
        return new Promise(async (resolve) => {
          let [index, task] = hasPromise!;
          const result = await task;
          if (result.isErr()) {
            hasErrors = true;
            if (isArray) {
              errors.push(result.unwrapErr());
            } else {
              errors[index] = result.unwrapErr();
            }
          } else {
            if (isArray) {
              results.push(result.unwrap());
            } else {
              results[index] = result.unwrap();
            }
          }

          for (let i = index + 1; i < keys.length; i++) {
            const key = isArray ? i : keys[i];
            const task = isArray ? tasks[i] : tasks[key];
            const result = await (isTask(task) ? task.run() : task());

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
            resolve(Result.Err(errors));
          }
          resolve(Result.Ok(results));
        });
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
      ? [CollectErrorsToUnion<TTasks>] extends [never]
        ? never
        : CollectErrorsToUnion<TTasks>[]
      : Compute<Partial<CollectErrors<TTasks>>>,
    Promise<CollectValues<TTasks>>
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
          const result = await (isTask(task) ? task.run() : task());

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
  static settle<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks
  ): CollectionHasPromise<TTasks> extends true
    ? Promise<
        {
          [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
            ? A extends Promise<infer A>
              ? SettledResult<E, A>
              : SettledResult<E, A>
            : never;
        } & {}
      >
    : {
        [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
          ? SettledResult<E, A>
          : never;
      } & {} {
    const isArray = Array.isArray(tasks);
    const results: any = isArray ? [] : {};
    const keys = isArray ? tasks : Object.keys(tasks);
    let hasPromise: [number, Promise<Result<unknown, unknown>>] | null = null;
    for (let i = 0; i < keys.length; i++) {
      const key = isArray ? i : keys[i];
      const task = isArray ? tasks[i] : tasks[key];
      const result = isTask(task) ? task.run() : task();
      if (isPromise(result)) {
        hasPromise = [i, result];
        break;
      }
      results[key] = result.settle();
    }
    if (hasPromise) {
      return new Promise(async (resolve) => {
        let [index, task] = hasPromise!;
        const result = await task;
        const key = isArray ? index : keys[index];
        results[key] = result.settle();
        for (let i = index + 1; i < keys.length; i++) {
          const key = isArray ? i : keys[i];
          const task = isArray ? tasks[i] : tasks[key];
          const result = await (isTask(task) ? task.run() : task());
          results[key] = result.settle();
        }
        resolve(results);
      }) as any;
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
        const result = await (isTask(task) ? task.run() : task());

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
    f: () => A,
    onErr: (e: unknown) => E
  ): Task<E, UnwrapValue<A>> {
    // @ts-expect-error
    return Task.from(f, onErr);
  }

  /**
   * Maps a function over a Task's successful value.
   */
  map<F extends (a: UnwrapValueWithPromise<A>) => unknown>(
    f: ReturnType<F> extends Promise<unknown> ? never : F
  ): Task<
    E,
    A extends Promise<unknown> ? Promise<ReturnType<F>> : ReturnType<F>
  > {
    // @ts-expect-error
    return new Task<E, B>(() => {
      const res = this.run();
      if (isPromise(res)) {
        return res.then(async (result) => {
          if (result.isErr()) {
            return result as any;
          }
          const value = result.unwrap();
          const next = f(value as any);
          return Result.Ok(next) as any;
        });
      }

      if (res.isErr()) {
        return res as any;
      }
      const value = res.unwrap();
      const next = f(value as any);
      return Result.Ok(next) as any;
    });
  }

  /**
   * Maps a function over a Task's error value.
   */
  mapErr<F extends (e: E) => unknown>(
    f: F extends (...args: any[]) => Promise<unknown> ? never : F
  ): Task<ReturnType<F> extends Promise<infer F> ? F : ReturnType<F>, A> {
    return new Task(() => {
      const res = this.run();
      if (isPromise(res)) {
        return res.then(async (result) => {
          if (result.isOk()) {
            return result as unknown as Result<F, A>;
          }
          const value = result.unwrapErr();
          const next = f(value as E);
          return Result.Err(next) as any;
        });
      }

      if (res.isOk()) {
        return res as any;
      }
      const value = res.unwrapErr();
      const next = f(value);
      return (
        isPromise(next) ? next.then(Result.Err) : Result.Err(next)
      ) as any;
    });
  }

  /**
   * Flat maps a function over a Task's successful value. Combines the result of the function into a single Task.
   */
  flatMap<
    B extends
      | Task<unknown, unknown>
      | Result<unknown, unknown>
      | Promise<Result<unknown, unknown>>
      | Promise<Task<unknown, unknown>>
  >(
    f: (a: UnwrapValueWithPromise<A>) => B
  ): Task<E | UnwrapError<B>, UnwrapValue<B>> {
    return new Task(() => {
      const res = this.run();
      if (isPromise(res)) {
        return res.then(async (result) => {
          if (result.isErr()) {
            return result as any;
          }

          const next = f(result.unwrap() as any);
          const maybeTask = isPromise(next) ? await next : next;
          const value = isTask(next) ? await next.run() : maybeTask;
          return value;
        });
      }

      if (res.isErr()) {
        return res as any;
      }

      const next = f(res.unwrap() as any);
      if (isTask(next)) {
        return next.run();
      }

      return next;
    });
  }

  /**
   * Flat maps a function over a Task's error value. Combines the result of the function into a single Task.
   */
  recover<
    B extends
      | Task<unknown, unknown>
      | Result<unknown, unknown>
      | Promise<Result<unknown, unknown>>
      | Promise<Task<unknown, unknown>>
  >(f: (e: E) => B): Task<UnwrapError<B>, A | UnwrapValue<B>> {
    return new Task(() => {
      const res = this.run();
      if (isPromise(res)) {
        return res.then(async (result) => {
          if (result.isOk()) {
            return result as any;
          }

          const next = f(result.unwrapErr() as E);
          const maybeTask = isPromise(next) ? await next : next;
          const value = isTask(next) ? await next.run() : maybeTask;
          return value;
        });
      }

      if (res.isOk()) {
        return res as any;
      }

      const next = f(res.unwrapErr() as E);
      return isTask(next) ? next.run() : next;
    });
  }

  /**
   * Runs the Task and returns a Promise with the Result.
   */
  run() {
    return this._run();
  }

  /**
   * Executes a side-effecting function with the Task's successful value.
   */
  tap<B extends void | Promise<void>>(
    f: (a: A) => B
  ): Task<
    E,
    B extends Promise<unknown>
      ? [A] extends [never]
        ? Promise<A>
        : A extends Promise<unknown>
        ? A
        : Promise<A>
      : A
  > {
    // @ts-expect-error
    return new Task(() => {
      const res = this.run();
      if (isPromise(res)) {
        return res.then(async (result) => {
          if (result.isOk()) {
            const res = f(result.unwrap() as any);
            if (isPromise(res)) {
              await res;
            }
          }
          return result;
        });
      }

      if (res.isOk()) {
        const tap = f(res.unwrap() as any);
        if (isPromise(tap)) {
          return tap.then(() => res);
        }
      }
      return res;
    });
  }

  /**
   * Executes a side-effecting function with the Task's error value.
   */
  tapErr<B extends void | Promise<void>>(
    f: (e: E) => B
  ): Task<
    E,
    B extends Promise<unknown>
      ? [A] extends [never]
        ? Promise<A>
        : A extends Promise<unknown>
        ? A
        : Promise<A>
      : A
  > {
    // @ts-expect-error
    return new Task(() => {
      const res = this.run();
      if (isPromise(res)) {
        return res.then(async (result) => {
          if (result.isErr()) {
            const res = f(result.unwrapErr());
            if (isPromise(res)) {
              await res;
            }
          }
          return result;
        });
      }
      if (res.isErr()) {
        const tap = f(res.unwrapErr());
        if (isPromise(tap)) {
          return tap.then(() => res);
        }
      }
      return res;
    });
  }

  /**
   * Matches the Task's Result and executes a function based on its variant (Ok or Err).
   */
  match<B extends Promise<unknown> | unknown>(cases: {
    Ok: (a: A) => B;
    Err: (e: E) => B;
  }): B extends Promise<unknown> ? Promise<B> : B {
    const res = this.run();
    if (isPromise(res)) {
      return res.then((result) => {
        result.isErr()
          ? cases.Err(result.unwrapErr())
          : cases.Ok(result.unwrap() as any);
      }) as any;
    }
    return (
      res.isErr() ? cases.Err(res.unwrapErr()) : cases.Ok(res.unwrap())
    ) as any;
  }

  /**
   * Returns the successful value or throws an error if the Task is Err.
   */
  unwrap(): A {
    const res = this.run();
    return (
      isPromise(res) ? res.then((result) => result.unwrap()) : res.unwrap()
    ) as any;
  }

  /**
   * Returns the error value or throws an error if the Task is Ok.
   */
  unwrapErr(): A extends Promise<unknown> ? Promise<E> : E {
    const res = this.run();
    return (
      isPromise(res)
        ? res.then((result) => result.unwrapErr())
        : res.unwrapErr()
    ) as any;
  }

  /**
   * Returns the successful value or a fallback value if the Task is Err.
   */
  unwrapOr<B extends UnwrapValueWithPromise<A>, C>(
    fallback: [B] extends [never]
      ? C | (() => C | Promise<C>)
      : B | (() => B | Promise<B>)
  ): A extends Promise<unknown>
    ? Promise<[B] extends [never] ? C : B>
    : [B] extends [never]
    ? C
    : B {
    const res = this.run();
    if (isPromise(res)) {
      return res.then((result) =>
        result.isOk()
          ? (result.unwrap() as any)
          : fallback instanceof Function
          ? (fallback() as any)
          : fallback
      ) as any;
    }
    return res.isOk()
      ? (res.unwrap() as any)
      : fallback instanceof Function
      ? (fallback() as any)
      : fallback;
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
    [A] extends [never]
      ? Promise<never>
      : A extends Promise<unknown>
      ? A
      : Promise<A>
  > {
    // @ts-expect-error
    return new Task(async () => {
      const run = async () => {
        let promise = async (): Promise<Result<E | TaskTimeoutError, A>> =>
          this.run() as any;
        if (scheduler.delay) {
          const result = await Task.from(() =>
            scheduler.delay instanceof Function
              ? scheduler.delay(this.attempts.retry, this.attempts.repeat)
              : scheduler.delay!
          )
            .mapErr(() => new TaskSchedulingError())
            .run();

          if (result.isErr()) {
            return result;
          }
          const delay = result.unwrap() as any;

          let oldPromise = promise;
          promise = () =>
            Task.sleep(delay)
              .run()
              .then(() => oldPromise());
        }

        if (scheduler.timeout !== undefined) {
          let oldPromise = promise;
          promise = () =>
            Promise.race([
              oldPromise(),
              Task.sleep(scheduler.timeout!)
                .run()
                .then(() => Result.Err(new TaskTimeoutError()) as any),
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
                )
                  .mapErr(() => new TaskSchedulingError())
                  .run();
                if (task.isErr()) {
                  return task as any;
                }
                const retry = maybeBoolToInt(task.unwrap() as any);
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
                )
                  .mapErr(() => new TaskSchedulingError())
                  .run();

                if (task.isErr()) {
                  return task as any;
                }
                const repeat = maybeBoolToInt(task.unwrap() as any);
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
    return new Task(() => {
      const res = this.run();
      if (isPromise(res)) {
        return res.then((result) => result.inverse());
      }
      return res.inverse() as any;
    });
  }
}

type PseudoTask<E, A> = () => Promise<Result<E, A>>;
type ValidTask<E, A> = Task<E, A> | PseudoTask<E, A>;

type CollectErrors<
  T extends
    | ValidTask<unknown, unknown>[]
    | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
    | Record<string, ValidTask<unknown, unknown>>
> = {
  [K in keyof T]: T[K] extends Task<infer E, unknown>
    ? E
    : T[K] extends () => Promise<infer E>
    ? UnwrapError<E>
    : never;
} & {};

type CollectValues<
  T extends
    | ValidTask<unknown, unknown>[]
    | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
    | Record<string, ValidTask<unknown, unknown>>,
  PreservePromise = false
> = {
  [K in keyof T]: T[K] extends Task<any, infer A>
    ? A extends Promise<infer B>
      ? PreservePromise extends true
        ? A
        : B
      : A
    : T[K] extends () => Promise<infer A>
    ? UnwrapValue<A>
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

type CollectionHasPromise<
  T extends
    | ValidTask<unknown, unknown>[]
    | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
    | Record<string, ValidTask<unknown, unknown>>
> = T extends
  | ValidTask<unknown, unknown>[]
  | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  ? CollectValues<T, true>[number] extends Promise<unknown>
    ? true
    : false
  : T extends Record<string, ValidTask<unknown, unknown>>
  ? CollectValues<T, true>[keyof T] extends Promise<unknown>
    ? true
    : false
  : never;

const maybeBoolToInt = (value: boolean | number) => {
  if (typeof value === "boolean") {
    return value ? Infinity : 0;
  }
  return value;
};

type UnwrapValue<A> = [A] extends [never]
  ? never
  : A extends () => infer B
  ? UnwrapValue<B>
  : A extends Monad<unknown, infer B>
  ? B
  : A extends Promise<infer C>
  ? Promise<UnwrapValue<C>>
  : A;

type UnwrapError<E> = [E] extends [never]
  ? unknown
  : E extends Option<unknown>
  ? UnwrapNoneError
  : E extends Result<infer E, unknown>
  ? E
  : E extends Task<infer E, unknown>
  ? E
  : E extends Promise<infer E>
  ? UnwrapError<E>
  : E extends () => infer E
  ? UnwrapError<E>
  : unknown;

const unwrap = <E, A>(
  value: unknown,
  onErr: (e: unknown) => E
): Promise<Result<E, A>> | Result<E, A> => {
  try {
    const v = value instanceof Function ? value() : value;
    if (isPromise(v)) {
      return v
        .then((v) => unwrap(v, onErr))
        .catch((e) => Result.Err(onErr(e))) as any;
    }
    if (isTask(v)) {
      return v.run() as any;
    }
    if (isResult(v)) {
      return v as Result<E, A>;
    }

    if (isOption(v)) {
      if (v.isNone()) {
        return Result.Err(onErr(new UnwrapNoneError()));
      }
      return Result.Ok(v.unwrap()) as Result<E, A>;
    }

    return Result.Ok(v) as Result<E, A>;
  } catch (e) {
    return Result.Err(onErr(e));
  }
};

type UnwrapValueWithPromise<A> = [UnwrapValue<A>] extends [never]
  ? never
  : UnwrapValue<A> extends Promise<infer B>
  ? B
  : UnwrapValue<A>;
