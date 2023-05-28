import type { _tag, Compute, UnwrapError, UnwrapValue } from "./internals";
import { isPromise } from "./internals";
import { identity, isOption, isResult, isTask } from "./utils";
import { Result } from "./result";
import type { Err, SettledResult } from "./result";
import { UnwrapNoneError } from "./option";

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

export type AsyncTask<E, A> = {
  readonly [_tag]: "AsyncTask";
  run(): Promise<Result<E, A>>;

  /**
   * Maps a function over a Task's successful value.
   */

  map<B>(f: (a: A) => never): never;
  map<B>(f: (a: A) => Promise<B>): never;
  map<B>(f: (a: A) => B): AsyncTask<E, B>;

  /**
   * Maps a function over a Task's error value.
   */
  mapErr<F>(f: (e: E) => never): never;
  mapErr<F>(f: (e: E) => Promise<F>): never;
  mapErr<F>(f: (e: E) => F): AsyncTask<F, A>;

  /**
   * Flat maps a function over a Task's successful value. Combines the result of the function into a single Task.
   */
  flatMap(f: (a: A) => never): never;
  flatMap<F, B>(
    f: (
      a: A
    ) =>
      | AsyncTask<F, B>
      | Promise<Result<F, B>>
      | Promise<AsyncTask<F, B>>
      | Promise<SyncTask<F, B>>
  ): AsyncTask<E | F, B>;
  flatMap<F, B>(
    f: (a: A) => SyncTask<F, B> | Result<F, B>
  ): AsyncTask<E | F, B>;

  /**
   * Flat maps a function over a Task's error value. Combines the result of the function into a single Task.
   */
  recover(f: (e: E) => never): never;
  recover<F, B>(
    f: (
      e: E
    ) =>
      | AsyncTask<F, B>
      | Promise<Result<F, B>>
      | Promise<AsyncTask<F, B>>
      | Promise<SyncTask<F, B>>
  ): AsyncTask<F, A | B>;
  recover<F, B>(
    f: (e: E) => SyncTask<F, B> | Result<F, B>
  ): AsyncTask<F, A | B>;

  /**
   * Executes a side-effecting function with the Task's successful value.
   */
  tap(f: (a: A) => never): never;
  tap(f: (a: A) => Promise<void>): AsyncTask<E, A>;
  tap(f: (a: A) => void): AsyncTask<E, A>;

  /**
   * Executes a side-effecting function with the Task's error value.
   */
  tapErr(f: (e: E) => never): never;
  tapErr(f: (e: E) => Promise<void>): AsyncTask<E, A>;
  tapErr(f: (e: E) => void): AsyncTask<E, A>;

  /**
   * Matches the Task's Result and executes a function based on its variant (Ok or Err).
   */
  match<B>(cases: {
    Ok: (a: A) => Promise<B>;
    Err: (e: E) => Promise<B>;
  }): Promise<B>;
  match<B>(cases: { Ok: (a: A) => B; Err: (e: E) => B }): Promise<B>;

  /**
   * Returns the successful value or throws an error if the Task is Err.
   */
  unwrap(): Promise<A>;

  /**
   * Returns the error value or throws an error if the Task is Ok.
   */
  unwrapErr(): Promise<E>;

  /**
   * Returns the successful value or a fallback value if the Task is Err.
   */
  unwrapOr<
    B extends A,
    C,
    D extends [B] extends [never]
      ? C | (() => C | Promise<C>)
      : B | (() => B | Promise<B>)
  >(
    fallback: D
  ): Promise<
    D extends () => infer C ? (C extends Promise<infer E> ? E : C) : D
  >;

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
};

export type SyncTask<E, A> = {
  readonly [_tag]: "SyncTask";
  run(): Result<E, A>;

  /**
   * Maps a function over a Task's successful value.
   */
  map<B>(f: (a: A) => never): never;
  map<B>(f: (a: A) => Promise<B>): never;
  map<B>(f: (a: A) => B): SyncTask<E, B>;

  /**
   * Maps a function over a Task's error value.
   */
  mapErr<F>(f: (e: E) => never): never;
  mapErr<F>(f: (e: E) => Promise<F>): never;
  mapErr<F>(f: (e: E) => F): SyncTask<F, A>;

  /**
   * Flat maps a function over a Task's successful value. Combines the result of the function into a single Task.
   */
  flatMap(f: (a: A) => never): never;
  flatMap<F, B>(
    f: (
      a: A
    ) =>
      | AsyncTask<F, B>
      | Promise<Result<F, B>>
      | Promise<AsyncTask<F, B>>
      | Promise<SyncTask<F, B>>
  ): AsyncTask<E | F, B>;
  flatMap<F, B>(f: (a: A) => SyncTask<F, B> | Result<F, B>): SyncTask<E | F, B>;

  /**
   * Flat maps a function over a Task's error value. Combines the result of the function into a single Task.
   */
  recover(f: (e: E) => never): never;
  recover<F, B>(
    f: (
      e: E
    ) =>
      | AsyncTask<F, B>
      | Promise<Result<F, B>>
      | Promise<AsyncTask<F, B>>
      | Promise<SyncTask<F, B>>
  ): AsyncTask<F, A | B>;
  recover<F, B>(f: (e: E) => SyncTask<F, B> | Result<F, B>): SyncTask<F, A | B>;

  /**
   * Executes a side-effecting function with the Task's successful value.
   */
  tap(f: (a: A) => never): never;
  tap(f: (a: A) => Promise<void>): never;
  tap(f: (a: A) => void): SyncTask<E, A>;

  /**
   * Executes a side-effecting function with the Task's error value.
   */
  tapErr(f: (e: E) => never): never;
  tapErr(f: (e: E) => Promise<void>): never;
  tapErr(f: (e: E) => void): SyncTask<E, A>;

  /**
   * Matches the Task's Result and executes a function based on its variant (Ok or Err).
   */
  match<B>(cases: {
    Ok: (a: A) => Promise<B>;
    Err: (e: E) => Promise<B>;
  }): Promise<B>;
  match<B>(cases: { Ok: (a: A) => B; Err: (e: E) => B }): B;

  /**
   * Returns the successful value or throws an error if the Task is Err.
   */
  unwrap(): A;

  /**
   * Returns the error value or throws an error if the Task is Ok.
   */
  unwrapErr(): E;

  /**
   * Returns the successful value or a fallback value if the Task is Err.
   */
  unwrapOr<
    B extends A,
    C,
    D extends [B] extends [never] ? C | (() => C) : B | (() => B)
  >(
    fallback: D
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
};

class _Task {
  private attempts = {
    retry: 0,
    repeat: 0,
  };

  private constructor(
    readonly run: () =>
      | Promise<Result<unknown, unknown>>
      | Result<unknown, unknown>
  ) {}

  /**
   * Creates a Task from a value, Result, Option.
   * If the value is a function, it will be called, using the return value.
   * If the function returns a Promise, it will be awaited.
   */
  static from<A, Err = UnwrapError<A>>(
    getter: () => never,
    onErr?: (a: unknown) => Err
  ): SyncTask<DeclaredErrors<A> | Err, never>;
  static from<A, Err = UnwrapError<A>>(
    getter: () => Promise<A>,
    onErr?: (a: unknown) => Err
  ): AsyncTask<DeclaredErrors<A> | Err, UnwrapValue<A>>;
  static from<A, Err = UnwrapError<A>>(
    getter: () => A,
    onErr?: (a: unknown) => Err
  ): SyncTask<DeclaredErrors<A> | Err, UnwrapValue<A>>;
  static from<A, Err = UnwrapError<A>>(
    getter: () => Promise<A> | A,
    onErr?: (a: unknown) => Err
  ): Task<DeclaredErrors<A> | Err, UnwrapValue<A>> {
    const onE = onErr ?? (identity as (a: unknown) => unknown);
    // @ts-expect-error
    return new Task(() => {
      return unwrap(getter, onE) as any;
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
    return new Task(() => {
      const maybePromise = unwrap(getter, onErr as any);
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
  static Ok<A>(value: Promise<A>): AsyncTask<never, A>;
  static Ok<A>(value: A): SyncTask<never, A>;
  static Ok<A>(value?: A | Promise<A>): Task<never, A> {
    // @ts-expect-error
    return new Task(() =>
      isPromise(value) ? value.then((v) => Result.Ok(v)) : Result.Ok(value)
    );
  }

  static AsyncOk(): AsyncTask<never, void>;
  static AsyncOk<A>(value: A): AsyncTask<never, A>;
  static AsyncOk<A>(value?: A): AsyncTask<never, A> {
    // @ts-expect-error
    return new Task(async () => {
      return Result.Ok(value);
    });
  }

  /**
   * Creates a Task with an Err Result.
   */
  static Err(): SyncTask<void, never>;
  static Err<E>(error: Promise<E>): AsyncTask<E, never>;
  static Err<E>(error: E): SyncTask<E, never>;
  static Err<E>(error?: E | Promise<E>): Task<E, never> {
    // @ts-expect-error
    return new Task(() => {
      return isPromise(error)
        ? error.then((e) => Result.Err(e))
        : Result.Err(error);
    });
  }

  static AsyncErr(): AsyncTask<void, never>;
  static AsyncErr<E>(error: E): AsyncTask<E, never>;
  static AsyncErr<E>(error?: E): AsyncTask<E, never> {
    // @ts-expect-error
    return new Task(async () => {
      return Result.Err(error);
    });
  }

  /**
   * Creates a Task that will resolve with `void` after a given amount of time.
   */
  static sleep(ms: number): AsyncTask<never, void> {
    // @ts-expect-error
    return new Task(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
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
    return new Task(() => {
      const isArray = Array.isArray(collection);
      let hasPromise: [number, Promise<Result<unknown, unknown>>] | null = null;
      let maybePromises: any = isArray ? [] : {};
      const keys = isArray ? collection : Object.keys(collection);
      for (let i = 0; i < keys.length; i++) {
        const key = isArray ? i : keys[i];
        const item = (collection as any)[key];
        const task = f(item);
        const result = task.run();
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
            const result = await task.run();
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
    E,
    {
      [K in keyof Collection]: B;
    } & {}
  > {
    // @ts-expect-error
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
          const result = await task.run();

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
  ): IsAsyncCollection<TTasks> extends true
    ? AsyncTask<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>>
    : SyncTask<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>> {
    // @ts-expect-error
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
            return;
          }
          if (!first) {
            first = result;
          }

          for (let i = index + 1; i < values.length; i++) {
            const task = values[i] as ValidTask<unknown, unknown>;
            const result = await (isTask(task) ? task.run() : task());
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
            const val = isTask(task) ? task.run() : task();
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
          const result = await (isTask(task) ? task.run() : task!());

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
  ): AsyncTask<CollectErrorsToUnion<TTasks>, CollectValuesToUnion<TTasks>> {
    // @ts-expect-error
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
            ? never
            : CollectErrorsToUnion<TTasks>[]
          : Compute<Partial<CollectErrors<TTasks>>>,
        CollectValues<TTasks>
      > {
    // @ts-expect-error
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
        const result = isTask(task) ? task.run() : task!();

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
            const result = await (isTask(task) ? task.run() : task!());

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
        ? never
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
          const result = await (isTask(task) ? task.run() : task!());

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
      } & {} {
    const isArray = Array.isArray(tasks);
    const results: any = isArray ? [] : {};
    const keys = isArray ? tasks : Object.keys(tasks);
    let hasPromise: [number, Promise<Result<unknown, unknown>>] | null = null;
    for (let i = 0; i < keys.length; i++) {
      const key = isArray ? i : keys[i];
      const task = isArray ? tasks[i] : tasks[key];
      const result = isTask(task) ? task.run() : task!();
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
          const result = await (isTask(task) ? task.run() : task!());
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
        const result = await (isTask(task) ? task.run() : task!());

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

  map(f: any): any {
    // @ts-expect-error
    return new Task<E, B>(() => {
      const res = this.run();
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
    return new Task(() => {
      const res = this.run();
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
    return new Task(() => {
      const res = this.run();
      if (isPromise(res)) {
        return res.then(async (result) => {
          if (result.isErr()) {
            return result;
          }

          const next = f(result.unwrap() as any);
          const maybeTask = isPromise(next) ? await next : next;
          const value = isTask(maybeTask) ? await maybeTask.run() : maybeTask;
          return value;
        });
      }

      if (res.isErr()) {
        return res as any;
      }

      const next = f(res.unwrap() as any);
      if (isPromise(next)) {
        return next.then((value) => (isTask(value) ? value.run() : value));
      }

      return isTask(next) ? next.run() : next;
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
  ): any {
    return new Task(() => {
      const res = this.run();
      if (isPromise(res)) {
        return res.then(async (result) => {
          if (result.isOk()) {
            return result as any;
          }

          const next = f(result.unwrapErr());
          const maybeTask = isPromise(next) ? await next : next;
          const value = isTask(maybeTask) ? await maybeTask.run() : maybeTask;
          return value;
        });
      }

      if (res.isOk()) {
        return res as any;
      }

      const next = f(res.unwrapErr());
      if (isPromise(next)) {
        return next.then((value) => (isTask(value) ? value.run() : value));
      }
      return isTask(next) ? next.run() : next;
    });
  }

  /**
   * Executes a side-effecting function with the Task's successful value.
   */
  tap(f: (a: unknown) => void | Promise<void>): any {
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

      return res.tap(f);
    });
  }

  /**
   * Executes a side-effecting function with the Task's error value.
   */
  tapErr(f: (e: unknown) => void | Promise<void>): any {
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
      return res.then((result) => {
        result.isErr()
          ? cases.Err(result.unwrapErr())
          : cases.Ok(result.unwrap());
      });
    }
    return res.isErr() ? cases.Err(res.unwrapErr()) : cases.Ok(res.unwrap());
  }

  /**
   * Returns the successful value or throws an error if the Task is Err.
   */
  unwrap(): any {
    const res = this.run();
    return isPromise(res)
      ? res.then((result) => result.unwrap())
      : res.unwrap();
  }

  /**
   * Returns the error value or throws an error if the Task is Ok.
   */
  unwrapErr(): any {
    const res = this.run();
    return isPromise(res)
      ? res.then((result) => result.unwrapErr())
      : res.unwrapErr();
  }

  /**
   * Returns the successful value or a fallback value if the Task is Err.
   */
  unwrapOr(fallback: (() => unknown) | unknown): any {
    const res = this.run();
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
    return new Task(async () => {
      const run = async () => {
        let promise = async (): Promise<Result<TaskTimeoutError, any>> =>
          this.run() as any;
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
    return new Task(() => {
      const res = this.run();
      if (isPromise(res)) {
        return res.then((result) => result.inverse());
      }
      return res.inverse();
    });
  }
}

export type Task<E, A> = AsyncTask<E, A> | SyncTask<E, A>;
export const Task = _Task;

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

type DeclaredErrors<T> = T extends Task<infer E, any>
  ? E
  : T extends Result<infer E, any>
  ? E
  : never;

const unwrap = <E, A>(
  value: unknown,
  onErr: (e: unknown) => E
): Promise<Result<E, A>> | Result<E, A> => {
  try {
    const v = value instanceof Function ? value() : value;
    if (isPromise(v)) {
      return v
        .then((v) => unwrap<E, A>(v, onErr))
        .catch((e) => Result.Err(onErr(e)));
    }
    if (isTask<E, A>(v)) {
      return v.run();
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
const maybeBoolToInt = (value: boolean | number) => {
  if (typeof value === "boolean") {
    return value ? Infinity : 0;
  }
  return value;
};
