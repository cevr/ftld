import type { Compute } from "./internals.js";
import { isPromise, _tag, TASK } from "./internals.js";
import { isResult, isTask, UnknownError } from "./utils.js";
import { Result } from "./result.js";
import type { SettledResult } from "./result.js";
import type { Option } from "./option.js";

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

export class TaskAbortedError extends Error {
  constructor() {
    super("Task aborted");
  }
}

export type AsyncTask<E, A> = {
  readonly [_tag]: "AsyncTask";
  run(): Promise<Result<E, A>>;
  run(ctx?: RunContext): Promise<Result<MapAbort<E>, A>>;

  /**
   * Maps a function over a Task's successful value.
   */

  map<B>(f: (a: A) => B): AsyncTask<E, B>;

  /**
   * Maps a function over a Task's error value.
   */
  mapErr<F>(f: (e: E) => F): AsyncTask<F, A>;

  /**
   * Flat maps a function over a Task's successful value. Combines the result of the function into a single Task.
   */
  /**
   * Flat maps a function over a Task's error value. Combines the result of the function into a single Task. Automatically unwraps nested Tasks and Promises.
   */
  flatMap<B>(f: (e: A) => B): ToAsyncTask<B, E, never>;
  /**
   * Flat maps a function over a Task's error value. Combines the result of the function into a single Task. Automatically unwraps nested Tasks and Promises.
   */
  recover<B>(f: (e: E) => B): ToAsyncTask<B, never, A>;

  /**
   * Executes a side-effecting function with the Task's successful value.
   */
  tap(f: (a: A) => void): AsyncTask<E, A>;

  /**
   * Executes a side-effecting function with the Task's error value.
   */
  tapErr(f: (e: E) => void): AsyncTask<E, A>;

  /**
   * Matches the Task's Result and executes a function based on its variant (Ok or Err).
   */
  match<B, C>(cases: { Ok: (a: A) => B; Err: (e: E) => C }): Promise<B | C>;

  /**
   * Returns the successful value or throws an error if the Task is Err.
   */
  unwrap(ctx?: RunContext): Promise<A>;

  /**
   * Returns the error value or throws an error if the Task is Ok.
   */
  unwrapErr(): Promise<E>;
  unwrapErr(ctx: RunContext): Promise<E | TaskAbortedError>;

  /**
   * Returns the successful value or a fallback value if the Task is Err.
   */
  unwrapOr<B>(fallback: B, ctx?: RunContext): Promise<B>;

  /**
   * Manages the execution of the Task. You can specify a delay and a timeout, and a retry policy. Returns a new Task.
   * If a timeout is specified, the Task may fail with a TaskTimeoutError.
   * You can pass a function to each scheduler option to make it dynamic. It will pass the number of attempts as an argument, starting from 1.
   */
  schedule<S extends TaskSchedulingOptions<E, A>>(
    scheduler: S
  ): AsyncTask<
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
  >;

  /**
   * Inverts the Task's Result. Err becomes Ok, and Ok becomes Err.
   */
  inverse(): AsyncTask<A, E>;
  inverse(ctx: RunContext): AsyncTask<A, E | TaskAbortedError>;
};

export type SyncTask<E, A> = {
  readonly [_tag]: "SyncTask";
  run(): Result<E, A>;
  run(ctx?: RunContext): Result<MapAbort<E>, A>;

  /**
   * Maps a function over a Task's successful value.
   */
  map<B>(f: (a: A) => Promise<B>): SyncTask<E, B>;
  map<B>(f: (a: A) => B): SyncTask<E, B>;

  /**
   * Maps a function over a Task's error value.
   */
  mapErr<F>(f: (e: E) => F): SyncTask<F, A>;

  /**
   * Flat maps a function over a Task's successful value. Combines the result of the function into a single Task. Automatically unwraps nested Tasks and Promises.
   */
  flatMap<B>(f: (a: A) => B): ToSyncTask<B, E, never>;

  /**
   * Flat maps a function over a Task's error value. Combines the result of the function into a single Task. Automatically unwraps nested Tasks and Promises.
   */
  recover<B = never>(f: (e: E) => B): ToSyncTask<B, never, A>;

  /**
   * Executes a side-effecting function with the Task's successful value.
   */
  tap(f: (a: A) => Promise<void>): AsyncTask<E, A>;
  tap(f: (a: A) => void): SyncTask<E, A>;

  /**
   * Executes a side-effecting function with the Task's error value.
   */
  tapErr(f: (e: E) => Promise<void>): AsyncTask<E, A>;
  tapErr(f: (e: E) => void): SyncTask<E, A>;

  /**
   * Matches the Task's Result and executes a function based on its variant (Ok or Err).
   */
  match<B, C>(cases: {
    Ok: (a: A) => Promise<B>;
    Err: (e: E) => Promise<C>;
  }): Promise<B | C>;
  match<B, C>(cases: { Ok: (a: A) => B; Err: (e: E) => C }): B | C;

  /**
   * Returns the successful value or throws an error if the Task is Err.
   */
  unwrap(ctx?: RunContext): A;

  /**
   * Returns the error value or throws an error if the Task is Ok.
   */
  unwrapErr(): E;
  unwrapErr(ctx: RunContext): E | TaskAbortedError;

  /**
   * Returns the successful value or a fallback value if the Task is Err.
   */
  unwrapOr<
    B extends A,
    C,
    D extends [B] extends [never] ? C | (() => C) : B | (() => B)
  >(
    fallback: D,
    ctx?: RunContext
  ): D extends () => infer E ? E : D;

  /**
   * Manages the execution of the Task. You can specify a delay and a timeout, and a retry policy. Returns a new Task.
   * If a timeout is specified, the Task may fail with a TaskTimeoutError.
   * You can pass a function to each scheduler option to make it dynamic. It will pass the number of attempts as an argument, starting from 1.
   */
  schedule<S extends TaskSchedulingOptions<E, A>>(
    scheduler: S
  ): AsyncTask<
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
  >;

  /**
   * Inverts the Task's Result. Err becomes Ok, and Ok becomes Err.
   */
  inverse(): SyncTask<A, E>;
  inverse(ctx: RunContext): SyncTask<A, E | TaskAbortedError>;
};

class _Task {
  readonly [_tag] = TASK;
  private attempts = {
    retry: 0,
    repeat: 0,
  };

  private constructor(
    readonly run: (
      ctx?: RunContext
    ) => Promise<Result<unknown, unknown>> | Result<unknown, unknown>
  ) {}

  /**
   * Creates a Task from a value, Result, Option.
   * If the value is a function, it will be called, using the return value.
   * If the function returns a Promise, it will be awaited.
   */

  static from<A>(getter: () => A): ToTask<A, DeclaredErrors<A>, never>;
  static from<A, E>(
    getter: () => A,
    onErr: (a: unknown) => E
  ): ToTask<A, E, never>;
  static from(
    getter: () => unknown,
    onErr: (a: unknown) => unknown = (e) => new UnknownError(e)
  ): unknown {
    return new Task((ctx) => {
      return unwrap(getter, onErr, ctx);
    });
  }

  /**
   * Creates a Task based on a predicate function.
   */
  static fromPredicate<A, B extends UnwrapValue<A>, E>(
    getter: () => Promise<A>,
    predicate: (a: UnwrapValue<A>) => a is B,
    onErr: (a: UnwrapValue<A>) => E
  ): AsyncTask<E, B>;
  static fromPredicate<A, B extends UnwrapValue<A>, E>(
    getter: () => A,
    predicate: (a: UnwrapValue<A>) => a is B,
    onErr: (a: A) => E
  ): SyncTask<E, B>;
  static fromPredicate<A, E>(
    getter: () => Promise<A>,
    predicate: (a: UnwrapValue<A>) => boolean,
    onErr: (a: UnwrapValue<A>) => E
  ): AsyncTask<E, UnwrapValue<A>>;
  static fromPredicate<A, E>(
    getter: () => A,
    predicate: (a: UnwrapValue<A>) => boolean,
    onErr: (a: UnwrapValue<A>) => E
  ): SyncTask<E, UnwrapValue<A>>;
  static fromPredicate<A, E>(
    getter: () => Promise<A> | A,
    predicate: (a: UnwrapValue<A>) => boolean,
    onErr: (a: UnwrapValue<A>) => E
  ): Task<E, UnwrapValue<A>> {
    // @ts-expect-error
    return new Task((_ctx) => {
      const maybePromise = unwrap(getter, onErr as any, _ctx);
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
  static Ok(): SyncTask<never, void>;
  static Ok<A>(value: () => Promise<A>): AsyncTask<never, A>;
  static Ok<A>(value: () => A): SyncTask<never, A>;
  static Ok<A>(value: Promise<A>): never;
  static Ok<A>(value: A): SyncTask<never, A>;
  static Ok<A>(value?: A | (() => A) | (() => Promise<A>)): Task<never, A> {
    // @ts-expect-error
    return new Task(() => {
      const val = value instanceof Function ? value() : value;
      return isPromise(val) ? val.then((v) => Result.Ok(v)) : Result.Ok(val);
    });
  }

  static AsyncOk(): AsyncTask<never, void>;
  static AsyncOk<A>(value: Promise<A>): never;
  static AsyncOk<A>(value: A): AsyncTask<never, A>;
  static AsyncOk<A>(value: () => Promise<A>): AsyncTask<never, A>;
  static AsyncOk<A>(value: () => A): AsyncTask<never, A>;
  static AsyncOk<A>(
    value?: A | (() => A) | (() => Promise<A>)
  ): AsyncTask<never, A> {
    // @ts-expect-error
    return new Task(() => {
      const val = value instanceof Function ? value() : value;
      return isPromise(val)
        ? val.then((v) => Result.Ok(v))
        : Promise.resolve(Result.Ok(val));
    });
  }

  /**
   * Creates a Task with an Err Result.
   */
  static Err(): SyncTask<void, never>;
  static Err<E>(error: () => Promise<E>): AsyncTask<E, never>;
  static Err<E>(error: () => E): SyncTask<E, never>;
  static Err<E>(error: Promise<E>): never;
  static Err<E>(error: E): SyncTask<E, never>;
  static Err<E>(error?: E | (() => E) | (() => Promise<E>)): Task<E, never> {
    // @ts-expect-error
    return new Task(() => {
      const val = error instanceof Function ? error() : error;
      return isPromise(val) ? val.then((e) => Result.Err(e)) : Result.Err(val);
    });
  }

  static AsyncErr(): AsyncTask<void, never>;
  static AsyncErr<E>(error: () => Promise<E>): AsyncTask<E, never>;
  static AsyncErr<E>(error: () => E): AsyncTask<E, never>;
  static AsyncErr<E>(error: Promise<E>): never;
  static AsyncErr<E>(error: E): AsyncTask<E, never>;
  static AsyncErr<E>(error?: E): AsyncTask<E, never> {
    // @ts-expect-error
    return new Task(() => {
      const val = error instanceof Function ? error() : error;
      return isPromise(val)
        ? val.then((e) => Result.Err(e))
        : Promise.resolve(Result.Err(val));
    });
  }

  /**
   * Creates a Task that will resolve with `void` after a given amount of time.
   */
  static sleep(ms: number): AsyncTask<never, void> {
    // @ts-expect-error
    return new Task(
      (ctx) =>
        new Promise((resolve) =>
          setTimeout(() => {
            if (isAborted(ctx)) {
              resolve(Result.Err(new TaskAbortedError()));
              return;
            }
            resolve(Result.Ok());
          }, ms)
        )
    );
  }

  /**
   * Traverses a collection and applies a function to each element, returning a Task with the results or the first Err.
   */
  static traverse<E, B, Collection extends unknown[] | [unknown, ...unknown[]]>(
    collection: Collection,
    f: (a: Collection[number]) => AsyncTask<E, B>
  ): AsyncTask<
    E,
    {
      [K in keyof Collection]: B;
    } & {}
  >;
  static traverse<E, B, Collection extends Record<string, unknown>>(
    collection: Collection,
    f: (a: Collection[keyof Collection]) => AsyncTask<E, B>
  ): AsyncTask<
    E,
    {
      [K in keyof Collection]: B;
    } & {}
  >;
  static traverse<E, B, Collection extends unknown[] | [unknown, ...unknown[]]>(
    collection: Collection,
    f: (a: Collection[number]) => SyncTask<E, B>
  ): SyncTask<
    E,
    {
      [K in keyof Collection]: B;
    } & {}
  >;
  static traverse<E, B, Collection extends Record<string, unknown>>(
    collection: Collection,
    f: (a: Collection[keyof Collection]) => SyncTask<E, B>
  ): SyncTask<
    E,
    {
      [K in keyof Collection]: B;
    } & {}
  >;
  static traverse<
    E,
    B,
    Collection extends
      | unknown[]
      | [unknown, ...unknown[]]
      | Record<string, unknown>
  >(collection: Collection, f: (a: unknown) => Task<E, B>): any {
    return new Task((ctx) => {
      const isArray = Array.isArray(collection);
      let hasPromise: [number, Promise<Result<unknown, unknown>>] | null = null;
      let maybePromises: any = isArray ? [] : {};
      const keys = isArray ? collection : Object.keys(collection);
      for (let i = 0; i < keys.length; i++) {
        const key = isArray ? i : keys[i];
        const item = (collection as any)[key];
        const task = f(item);
        const result = task.run(ctx);
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
            return;
          }
          const key = isArray ? index : keys[index];
          maybePromises[key] = result.unwrap();

          for (let i = index + 1; i < keys.length; i++) {
            const key = isArray ? i : keys[i];
            const item = (collection as any)[key];
            const task = f(item);
            const result = await task.run(ctx);
            if (result.isErr()) {
              resolve(result);
              return;
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
    f: (a: A) => Task<E, B>,
    concurrency?: number
  ): AsyncTask<
    E | TaskAbortedError,
    {
      [K in keyof Collection]: B;
    } & {}
  > {
    // @ts-expect-error
    return new Task(async (ctx) => {
      return parallelMap(collection, async (item) => f(item).run(ctx), {
        concurrency: concurrency ?? Number.POSITIVE_INFINITY,
        stopOnError: true,
      });
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
  ): IsAsyncCollection<TTasks> extends true
    ? AsyncTask<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>>
    : SyncTask<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>> {
    // @ts-expect-error
    return new Task((ctx) => {
      let hasPromise: [number, Promise<Result<unknown, unknown>>] | null = null;
      let first: Result<any, any> | undefined;

      const values = Array.isArray(tasks) ? tasks : Object.values(tasks);

      for (let i = 0; i < values.length; i++) {
        const task = values[i] as ValidTask<unknown, unknown>;
        const result = (isTask(task) ? task.run(ctx) : task()) as
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
            return;
          }
          if (!first) {
            first = result;
          }

          for (let i = index + 1; i < values.length; i++) {
            const task = values[i] as ValidTask<unknown, unknown>;
            const result = await (isTask(task) ? task.run(ctx) : task());
            if (result.isOk()) {
              resolve(result as any);
              return;
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
  ): IsAsyncCollection<TTasks> extends true
    ? AsyncTask<CollectErrorsToUnion<TTasks>, CollectValues<TTasks>>
    : SyncTask<CollectErrorsToUnion<TTasks>, CollectValues<TTasks>> {
    // @ts-expect-error
    return new Task((ctx) => {
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
        const next = (isTask(task) ? task.run(ctx) : task()) as
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
            return;
          }
          const key = isArray ? index : keys[index];
          result[key] = next.unwrap();

          for (let i = index + 1; i < keys.length; i++) {
            const key = isArray ? i : keys[i];
            const task = (isArray ? tasks[i] : tasks[key]) as ValidTask<
              unknown,
              unknown
            >;
            const val = isTask(task) ? task.run(ctx) : task();
            const next = await val;

            if (next.isErr()) {
              resolve(next as any);
              return;
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
  ): AsyncTask<CollectErrorsToUnion<TTasks>, CollectValues<TTasks>> {
    const isArray = Array.isArray(tasks);
    const keys = isArray ? tasks : Object.keys(tasks);
    concurrency = concurrency ?? keys.length;
    if (concurrency <= 0) {
      throw new Error("Concurrency must be greater than 0.");
    }
    // @ts-expect-error
    return new Task(async (ctx) => {
      return parallelMap(
        tasks,
        async (task) => (isTask(task) ? task.run(ctx) : task()),
        {
          concurrency: concurrency ?? Number.POSITIVE_INFINITY,
          stopOnError: true,
        }
      );
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
  ): AsyncTask<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>> {
    // @ts-expect-error
    return new Task((ctx) => {
      const tasksArray = (
        Array.isArray(tasks) ? tasks : Object.values(tasks)
      ) as ValidTask<unknown, unknown>[];
      return Promise.race(
        tasksArray.map(async (task) => {
          const next = await (isTask(task) ? task.run(ctx) : task());
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
  ): IsAsyncCollection<TTasks> extends true
    ? AsyncTask<
        TTasks extends
          | ValidTask<unknown, unknown>[]
          | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
          ? [CollectErrorsToUnion<TTasks>] extends [never]
            ? never
            : CollectErrorsToUnion<TTasks>[]
          : Compute<Partial<CollectErrors<TTasks>>>,
        CollectValues<TTasks>
      >
    : SyncTask<
        TTasks extends
          | ValidTask<unknown, unknown>[]
          | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
          ? [CollectErrorsToUnion<TTasks>] extends [never]
            ? never[]
            : CollectErrorsToUnion<TTasks>[]
          : Compute<Partial<CollectErrors<TTasks>>>,
        CollectValues<TTasks>
      > {
    // @ts-expect-error
    return new Task((_ctx) => {
      const isArray = Array.isArray(tasks);
      let hasPromise: [number, Promise<Result<unknown, unknown>>] | null = null;
      const results: any = isArray ? [] : {};
      const errors: any = isArray ? [] : {};
      const keys = isArray ? tasks : Object.keys(tasks);
      let hasErrors = false;
      for (let i = 0; i < keys.length; i++) {
        const key = isArray ? i : keys[i];
        const task = isArray ? tasks[i] : tasks[key];
        const result = isTask(task) ? task.run(_ctx) : task!();

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
            const result = await (isTask(task) ? task.run(_ctx) : task!());

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
            return;
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
  ): AsyncTask<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      ? [CollectErrorsToUnion<TTasks>] extends [never]
        ? never[]
        : CollectErrorsToUnion<TTasks>[]
      : Compute<Partial<CollectErrors<TTasks>>>,
    CollectValues<TTasks>
  > {
    const isArray = Array.isArray(tasks);
    const keys = isArray ? tasks : Object.keys(tasks);
    concurrency = concurrency ?? keys.length;
    if (concurrency <= 0) {
      throw new Error("Concurrency limit must be greater than 0");
    }

    // @ts-expect-error
    return new Task(async (_ctx) => {
      return parallelMap(
        tasks,
        async (task) => (isTask(task) ? task.run(_ctx) : task()),
        {
          concurrency: concurrency ?? keys.length,
          stopOnError: false,
        }
      );
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
  ): IsAsyncCollection<TTasks> extends true
    ? Promise<
        {
          [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
            ? SettledResult<E, A>
            : never;
        } & {}
      >
    : {
        [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
          ? SettledResult<E, A>
          : never;
      } & {};
  static settle<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks,
    ctx: RunContext
  ): IsAsyncCollection<TTasks> extends true
    ? Promise<
        {
          [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
            ? SettledResult<E | TaskAbortedError, A>
            : never;
        } & {}
      >
    : {
        [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
          ? SettledResult<E | TaskAbortedError, A>
          : never;
      } & {};
  static settle<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks,
    ctx?: RunContext
  ): IsAsyncCollection<TTasks> extends true
    ? Promise<
        {
          [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
            ? SettledResult<E | TaskAbortedError, A>
            : never;
        } & {}
      >
    : {
        [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
          ? SettledResult<E | TaskAbortedError, A>
          : never;
      } & {} {
    const isArray = Array.isArray(tasks);
    const results: any = isArray ? [] : {};
    const keys = isArray ? tasks : Object.keys(tasks);
    let hasPromise: [number, Promise<Result<unknown, unknown>>] | null = null;
    for (let i = 0; i < keys.length; i++) {
      const key = isArray ? i : keys[i];
      const task = isArray ? tasks[i] : tasks[key];
      const result = isTask(task) ? task.run(ctx) : task!();
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
          const result = await (isTask(task) ? task.run(ctx) : task!());
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
    opts?: { concurrency?: number; context?: undefined }
  ): Promise<
    {
      [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
        ? SettledResult<E, A>
        : never;
    } & {}
  >;
  static async settlePar<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks,
    opts?: { concurrency?: number; context?: RunContext }
  ): Promise<
    {
      [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
        ? SettledResult<E | TaskAbortedError, A>
        : never;
    } & {}
  >;
  static async settlePar<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
      | Record<string, ValidTask<unknown, unknown>>
  >(
    tasks: TTasks,
    {
      concurrency,
      context: ctx,
    }: { concurrency?: number; context?: RunContext | undefined } = {}
  ): Promise<
    {
      [K in keyof TTasks]: TTasks[K] extends ValidTask<infer E, infer A>
        ? SettledResult<E | TaskAbortedError, A>
        : never;
    } & {}
  > {
    const isArray = Array.isArray(tasks);
    const keys = isArray ? tasks : Object.keys(tasks);
    concurrency = concurrency ?? keys.length;
    if (concurrency <= 0) {
      throw new Error("Concurrency limit must be greater than 0");
    }

    return parallelMap(
      tasks,
      async (task) => {
        const result = await (isTask(task) ? task.run(ctx) : task!());
        return result.settle();
      },
      {
        concurrency,
        stopOnError: false,
      }
    ).then((result) =>
      // @ts-expect-error
      result.unwrap()
    );
  }

  map(f: any): any {
    // @ts-expect-error
    return new Task<E, B>((_ctx) => {
      const res = this.run(_ctx);
      if (isPromise(res)) {
        return res.then(async (result) => {
          return result.map(f);
        });
      }

      return res.map(f);
    });
  }

  /**
   * Maps a function over a Task's error value.
   */
  mapErr(f: (e: unknown) => unknown): any {
    return new Task((_ctx) => {
      const res = this.run(_ctx);
      if (isPromise(res)) {
        return res.then(async (result) => {
          return result.mapErr(f);
        });
      }

      return res.mapErr(f);
    });
  }

  /**
   * Flat maps a function over a Task's successful value. Combines the result of the function into a single Task.
   */
  flatMap(
    f: (
      a: unknown
    ) =>
      | Result<unknown, unknown>
      | Task<unknown, unknown>
      | Promise<Result<unknown, unknown>>
      | Promise<Task<unknown, unknown>>
  ): any {
    return new Task((ctx) => {
      const res = this.run(ctx);
      if (isPromise(res)) {
        return res.then(async (result) => {
          if (result.isErr()) {
            return result;
          }

          const next = f(result.unwrap() as any);
          const maybeTask = isPromise(next) ? await next : next;
          const value = isTask(maybeTask)
            ? await maybeTask.run(ctx)
            : Task.from(() => maybeTask).run();
          return value;
        });
      }

      if (res.isErr()) {
        return res as any;
      }

      const next = f(res.unwrap() as any);
      if (isPromise(next)) {
        return next.then((value) =>
          isTask(value) ? value.run(ctx) : Task.from(() => value).run()
        );
      }

      return isTask(next) ? next.run(ctx) : Task.from(() => next).run();
    });
  }

  /**
   * Flat maps a function over a Task's error value. Combines the result of the function into a single Task.
   */
  recover(
    f: (
      e: unknown
    ) =>
      | Result<unknown, unknown>
      | Task<unknown, unknown>
      | Promise<Result<unknown, unknown>>
      | Promise<Task<unknown, unknown>>
      | UnwrapValue<unknown>
  ): any {
    return new Task((ctx) => {
      const res = this.run(ctx);
      if (isPromise(res)) {
        return res.then(async (result) => {
          if (result.isOk()) {
            return result as any;
          }

          const next = f(result.unwrapErr());
          const maybeTask = isPromise(next) ? await next : next;
          const value = isTask(maybeTask)
            ? await maybeTask.run(ctx)
            : Task.from(() => maybeTask).run();
          return value;
        });
      }

      if (res.isOk()) {
        return res as any;
      }

      const next = f(res.unwrapErr());
      if (isPromise(next)) {
        return next.then((value) =>
          isTask(value) ? value.run(ctx) : Task.from(() => value).run()
        );
      }
      return isTask(next) ? next.run(ctx) : Task.from(() => next).run();
    });
  }

  /**
   * Executes a side-effecting function with the Task's successful value.
   */
  tap(f: (a: unknown) => void | Promise<void>): any {
    return new Task((ctx) => {
      const res = this.run(ctx);
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

      return res.tap(f);
    });
  }

  /**
   * Executes a side-effecting function with the Task's error value.
   */
  tapErr(f: (e: unknown) => void | Promise<void>): any {
    return new Task((ctx) => {
      const res = this.run(ctx);
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
      return res.tapErr(f);
    });
  }

  /**
   * Matches the Task's Result and executes a function based on its variant (Ok or Err).
   */
  match(cases: {
    Err: (e: unknown) => unknown;
    Ok: (a: unknown) => unknown;
  }): any {
    const res = this.run();
    if (isPromise(res)) {
      return res.then((result) =>
        result.isErr()
          ? cases.Err(result.unwrapErr())
          : cases.Ok(result.unwrap())
      );
    }
    return res.isErr() ? cases.Err(res.unwrapErr()) : cases.Ok(res.unwrap());
  }

  /**
   * Returns the successful value or throws an error if the Task is Err.
   */
  unwrap(ctx?: RunContext): any {
    const res = this.run(ctx);
    return isPromise(res)
      ? res.then((result) => result.unwrap())
      : res.unwrap();
  }

  /**
   * Returns the error value or throws an error if the Task is Ok.
   */
  unwrapErr(ctx?: RunContext): any {
    const res = this.run(ctx);
    return isPromise(res)
      ? res.then((result) => result.unwrapErr())
      : res.unwrapErr();
  }

  /**
   * Returns the successful value or a fallback value if the Task is Err.
   */
  unwrapOr(fallback: (() => unknown) | unknown, ctx?: RunContext): any {
    const res = this.run(ctx);
    if (isPromise(res)) {
      return res.then((result) =>
        result.isOk()
          ? result.unwrap()
          : fallback instanceof Function
          ? fallback()
          : fallback
      );
    }
    return res.isOk()
      ? res.unwrap()
      : fallback instanceof Function
      ? fallback()
      : fallback;
  }

  /**
   * Manages the execution of the Task. You can specify a delay and a timeout, and a retry policy. Returns a new Task.
   * If a timeout is specified, the Task may fail with a TaskTimeoutError.
   * You can pass a function to each scheduler option to make it dynamic. It will pass the number of attempts as an argument, starting from 1.
   */
  schedule<S extends TaskSchedulingOptions<unknown, unknown>>(
    scheduler: S
  ): any {
    return new Task(async (ctx) => {
      const run = async () => {
        let promise = async (): Promise<Result<TaskTimeoutError, any>> =>
          this.run(ctx) as any;
        if (scheduler.delay) {
          const result = await Task.from(async () =>
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
          promise = () => Task.sleep(delay).flatMap(oldPromise).run() as any;
        }

        if (scheduler.timeout !== undefined) {
          let oldPromise = promise;
          promise = () =>
            Promise.race([
              oldPromise(),
              Task.sleep(scheduler.timeout!)
                .flatMap(() => Result.Err(new TaskTimeoutError()))
                .run(),
            ]);
        }
        if (scheduler.retry !== undefined) {
          let oldPromise = promise;
          promise = () =>
            oldPromise().then(async (result) => {
              if (result.isErr()) {
                const error = result.unwrapErr();
                if (error instanceof TaskTimeoutError) {
                  return result;
                }
                const task = await Task.from(async () =>
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
                const task = await Task.from(async () =>
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
  inverse(): any {
    return new Task((_ctx) => {
      const res = this.run(_ctx);
      if (isPromise(res)) {
        return res.then((result) => result.inverse());
      }
      return res.inverse();
    });
  }
}

export type Task<E, A> = AsyncTask<E, A> | SyncTask<E, A>;
export const Task = _Task;

const unwrap = <A, E = UnknownError>(
  value: unknown,
  onErr: (e: unknown) => E,
  ctx?: RunContext
):
  | Promise<Result<E | TaskAbortedError, A>>
  | Result<E | TaskAbortedError, A> => {
  if (isAborted(ctx)) {
    return Result.Err(new TaskAbortedError());
  }
  try {
    let v = value instanceof Function ? value() : value;
    if (isTask<E, A>(v)) {
      v = v.run(ctx);
    }

    if (isPromise(v)) {
      return v
        .then((v) => unwrap<A, E>(v, onErr, ctx))
        .catch((e) => Result.Err(onErr(e)));
    }
    if (isResult(v)) {
      return v as Result<E, A>;
    }

    return Result.Ok(v) as Result<E, A>;
  } catch (e) {
    return Result.Err(onErr(e));
  }
};
const maybeBoolToInt = (value: boolean | number) => {
  if (typeof value === "boolean") {
    return value ? Infinity : 0;
  }
  return value;
};

async function parallelMap<T extends unknown>(
  iterable: T[] | [T, ...T[]] | Record<string, T>,
  mapper: (
    value: T
  ) => Promise<Result<unknown, unknown> | SettledResult<unknown, unknown>>,
  {
    concurrency = Number.POSITIVE_INFINITY,
    stopOnError = true,
  }: {
    concurrency?: number;
    stopOnError?: boolean;
  } = {}
) {
  return new Promise((resolve) => {
    const keys = Array.isArray(iterable) ? iterable : Object.keys(iterable);
    const results: any = Array.isArray(iterable) ? [] : {};
    const errors: any = Array.isArray(iterable) ? [] : {};
    let hasErrors = false;

    const getIndex = (index: number): any => {
      if (Array.isArray(iterable)) {
        return index;
      }
      return keys[index];
    };

    let isResolved = false;
    let isIterableDone = false;
    let resolvingCount = 0;
    let currentIndex = 0;
    const iterator = Array.isArray(iterable)
      ? iterable[Symbol.iterator]()
      : makeIteratorFromRecord(iterable, keys as string[]);

    const next = async () => {
      if (isResolved) {
        return;
      }

      const nextItem = iterator.next();

      const index = currentIndex;
      currentIndex++;

      // Note: `iterator.next()` can be called many times in parallel.
      // This can cause multiple calls to this `next()` function to
      // receive a `nextItem` with `done === true`.
      // The shutdown logic that rejects/resolves must be protected
      // so it runs only one time as the `skippedIndex` logic is
      // non-idempotent.
      if (nextItem.done) {
        isIterableDone = true;

        if (resolvingCount === 0 && !isResolved) {
          isResolved = true;
          if (hasErrors) {
            resolve(Result.Err(errors));
            return;
          }

          resolve(Result.Ok(results));
        }

        return;
      }

      resolvingCount++;

      // Intentionally detached
      (async () => {
        const element = nextItem.value;

        if (isResolved) {
          return;
        }

        const value = await mapper(element);

        resolvingCount--;

        if (isResult(value) && value.isErr()) {
          hasErrors = true;
          if (stopOnError) {
            resolve(Result.Err(value.unwrapErr()));
            return;
          }
          if (Array.isArray(errors)) {
            errors.push(value.unwrapErr());
          } else {
            errors[getIndex(index)] = value.unwrapErr();
          }
        } else {
          if (Array.isArray(results)) {
            results.push(isResult(value) ? value.unwrap() : value);
          } else {
            results[getIndex(index)] = isResult(value) ? value.unwrap() : value;
          }
        }

        await next();
      })();
    };

    (async () => {
      for (let index = 0; index < concurrency; index++) {
        await next();
        if (isIterableDone) {
          break;
        }
      }
    })();
  });
}

const makeIteratorFromRecord = <T extends Record<string, unknown>>(
  record: T,
  keys: string[]
) => {
  let index = 0;
  return {
    next(): IteratorResult<T[keyof T]> {
      if (index < keys.length) {
        const key = keys[index]!;
        index++;
        return { value: record[key] as T[keyof T], done: false };
      }
      return { value: undefined, done: true };
    },
  };
};

const isAborted = (ctx: RunContext | undefined): boolean =>
  !!ctx?.signal.aborted;

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

type MapAbort<T> = [T] extends [never]
  ? TaskAbortedError
  : T extends unknown[] | [unknown, ...unknown[]] | Record<string, unknown>
  ? {
      [K in keyof T]: T[K] | TaskAbortedError;
    }
  : T | TaskAbortedError;

type PseudoAsyncTask<E, A> = () => Promise<Result<E, A>>;
type PseudoSyncTask<E, A> = () => Result<E, A>;
type ValidTask<E, A> =
  | Task<E, A>
  | PseudoAsyncTask<E, A>
  | PseudoSyncTask<E, A>;
type SyncValidTask<E, A> = SyncTask<E, A> | PseudoSyncTask<E, A>;

type CollectErrors<
  T extends
    | ValidTask<unknown, unknown>[]
    | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
    | Record<string, ValidTask<unknown, unknown>>
> = {
  [K in keyof T]: T[K] extends ValidTask<infer E, unknown> ? E : never;
} & {};

type CollectValues<
  T extends
    | ValidTask<unknown, unknown>[]
    | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
    | Record<string, ValidTask<unknown, unknown>>
> = {
  [K in keyof T]: T[K] extends ValidTask<any, infer A> ? A : never;
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

type ToUnion<
  T extends
    | ValidTask<unknown, unknown>[]
    | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
    | Record<string, ValidTask<unknown, unknown>>
> = T extends
  | ValidTask<unknown, unknown>[]
  | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  ? T[number]
  : T extends Record<string, ValidTask<unknown, unknown>>
  ? T[keyof T]
  : never;

type IsAsyncCollection<
  T extends
    | ValidTask<unknown, unknown>[]
    | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
    | Record<string, ValidTask<unknown, unknown>>
> = [Exclude<ToUnion<T>, SyncValidTask<unknown, unknown>>] extends [never]
  ? false
  : true;

type RunContext = {
  signal: AbortSignal;
};

type ToTask<T, E, A> = [T] extends [never]
  ? SyncTask<E, never | A>
  : [T] extends [AsyncTask<infer F, infer B>]
  ? AsyncTask<E | F, A | B>
  : [T] extends [SyncTask<infer F, infer B>]
  ? SyncTask<E | F, A | B>
  : [T] extends [Result<infer F, infer B>]
  ? SyncTask<E | F, A | B>
  : [T] extends [Promise<infer C>]
  ? ToAsyncTask<C, E, A>
  : [T] extends [infer T]
  ? SyncTask<E, A | T>
  : never;

type ToAsyncTask<T, E, A> = [T] extends [never]
  ? AsyncTask<UnknownError | E, never | A>
  : [T] extends [AsyncTask<infer F, infer B>]
  ? AsyncTask<E | F, A | B>
  : [T] extends [SyncTask<infer F, infer B>]
  ? AsyncTask<E | F, A | B>
  : [T] extends [Result<infer F, infer B>]
  ? AsyncTask<E | F, A | B>
  : [T] extends [Promise<infer C>]
  ? ToAsyncTask<C, E, A>
  : [T] extends [infer T]
  ? AsyncTask<E, T | A>
  : never;

type ToSyncTask<T, E, A> = [T] extends [never]
  ? SyncTask<UnknownError | E, never | A>
  : [T] extends [AsyncTask<infer F, infer B>]
  ? AsyncTask<E | F, A | B>
  : [T] extends [Promise<infer C>]
  ? ToAsyncTask<C, E, A>
  : [T] extends [SyncTask<infer F, infer B>]
  ? SyncTask<E | F, A | B>
  : [T] extends [Result<infer F, infer B>]
  ? SyncTask<E | F, A | B>
  : [T] extends [infer T]
  ? SyncTask<E, A | T>
  : never;

type UnwrapValue<A> = [A] extends [never]
  ? never
  : A extends Task<infer E, infer B>
  ? B
  : A extends Result<infer E, infer B>
  ? B
  : A extends Promise<infer C>
  ? UnwrapValue<C>
  : A extends (...args: any) => infer B
  ? UnwrapValue<B>
  : A;

type DeclaredErrors<T> = 0 extends 1 & T
  ? UnknownError
  : [T] extends [never]
  ? UnknownError
  : [T] extends [Task<infer E, any>]
  ? E
  : [T] extends [Result<infer E, any>]
  ? E
  : [T] extends [Option<unknown>]
  ? never
  : UnknownError;
