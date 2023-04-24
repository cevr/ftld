import { identity, isResult } from "./utils";
import { None, Option, Some } from "./option";
import { Err, Result } from "./result";

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

        if (maybeResult instanceof None) {
          throw maybeResult;
        }

        if (maybeResult instanceof Some) {
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
   * Traverses a list and applies a function to each element, returning a Task with the results or the first Err.
   * @static
   * @param {A[]} list
   * @param {(a: A) => Task<E, B> | PseudoTask<E, B>} f
   * @returns {Task<E, B[]>}
   */
  static traverse<E, A, B>(
    list: A[],
    f: (a: A) => Task<E, B> | PseudoTask<E, B>
  ): Task<E, B[]> {
    return new Task(async () => {
      let results: B[] = [];
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const task = f(item);
        const result = await (task instanceof Function ? task() : task.run());
        if (result.isErr()) {
          return result as Result<E, B[]>;
        }
        results.push(result.unwrap());
      }
      return Result.Ok(results);
    });
  }

  /**
   * Traverses a list in parallel and applies a function to each element, returning a Task with the results or the first Err.
   * Limited by the concurrency parameter.
   * @static
   * @param {A[]} list
   * @param {(a: A) => Task<E, B> | PseudoTask<E, B>} f
   * @param {number} [concurrency=list.length]
   * @returns {Task<E, B[]>}
   */
  static traversePar<E, A, B>(
    list: A[],
    f: (a: A) => Task<E, B> | PseudoTask<E, B>,
    concurrency = list.length
  ): Task<E, B[]> {
    return new Task(async () => {
      const results: any[] = [];
      let error: Err<any, any> | undefined;
      let currentIndex = 0;

      const executeTask = async () => {
        while (currentIndex < list.length) {
          const taskIndex = currentIndex;
          currentIndex++;

          const task = f(list[taskIndex]);
          const result = await (task instanceof Function ? task() : task.run());

          if (result.isErr()) {
            error = result;
            return;
          }
          results[taskIndex] = result.unwrap();
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency, list.length) },
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
   * @param {TTasks} list
   * @returns {Task<CollectErrors<TTasks>[number], CollectValues<TTasks>>}
   */
  static any<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  >(list: TTasks): Task<CollectErrors<TTasks>[number], CollectValues<TTasks>> {
    // @ts-expect-error
    return new Task<unknown, unknown>(async () => {
      let first: Result<any, any> | undefined;
      for (const task of list) {
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
   * @param {TTasks} list
   * @returns {Task<CollectErrors<TTasks>[number], CollectValues<TTasks>>}
   */
  static sequential<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  >(list: TTasks): Task<CollectErrors<TTasks>[number], CollectValues<TTasks>> {
    // sequentially run the promises
    // @ts-expect-error
    return new Task(async () => {
      let result: Array<any> = [];
      for (const task of list) {
        const next = await (task instanceof Function ? task() : task.run());
        if (next.isErr()) {
          return next;
        }
        result.push(next.unwrap());
      }
      return Result.Ok(result);
    });
  }

  /**
   * Runs tasks in parallel, limited by the given concurrency, and returns a Task with the results.
   * @static
   * @param {TTasks} tasks
   * @param {number} [concurrency=tasks.length]
   * @returns {Task<CollectErrors<TTasks>[number], CollectValues<TTasks>>}
   */
  static parallel<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  >(
    tasks: TTasks,
    concurrency: number = tasks.length
  ): Task<CollectErrors<TTasks>[number], CollectValues<TTasks>> {
    if (concurrency <= 0) {
      throw new Error("Concurrency must be greater than 0.");
    }
    return new Task(async () => {
      const results: any[] = [];
      let error: Err<any, any> | undefined;
      let currentIndex = 0;

      const executeTask = async () => {
        while (currentIndex < tasks.length) {
          const taskIndex = currentIndex;
          currentIndex++;

          const task = tasks[taskIndex];
          const result = await (task instanceof Function ? task() : task.run());

          if (result.isErr()) {
            error = result;
            return;
          }
          results[taskIndex] = result.unwrap();
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency, tasks.length) },
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
   * @param {TTasks} list
   * @returns {Task<CollectErrors<TTasks>[number], CollectValues<TTasks>[number]>}
   */
  static race<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  >(
    list: TTasks
  ): Task<CollectErrors<TTasks>[number], CollectValues<TTasks>[number]> {
    // @ts-expect-error
    return new Task(() => {
      return Promise.race(
        list.map(async (task) => {
          const next = await (task instanceof Function ? task() : task.run());

          return next;
        })
      );
    });
  }

  /**
   * Returns a Task with the successful results or an array of errors for each failed task.
   * @static
   * @param {TTasks} list
   * @returns {Task<CollectErrors<TTasks>, CollectValues<TTasks>>}
   */
  static coalesce<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  >(
    list: TTasks
  ): Task<CollectErrors<TTasks>[number][], CollectValues<TTasks>> {
    // @ts-expect-error
    return new Task(async () => {
      const results: any[] = [];
      const errors: any[] = [];
      for (const task of list) {
        const result = await (task instanceof Function ? task() : task.run());

        if (result.isErr()) {
          errors.push(result.unwrapErr());
        } else {
          results.push(result.unwrap());
        }
      }
      if (errors.length > 0) {
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
   * @returns {Task<CollectErrors<TTasks>, CollectValues<TTasks>>}
   */
  static coalescePar<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  >(
    tasks: TTasks,
    concurrency = tasks.length
  ): Task<CollectErrors<TTasks>[number][], CollectValues<TTasks>> {
    if (concurrency <= 0) {
      throw new Error("Concurrency limit must be greater than 0");
    }

    // @ts-expect-error
    return new Task(async () => {
      const results: any[] = [];
      let errors: any[] = [];
      let currentIndex = 0;

      const executeTask = async () => {
        while (currentIndex < tasks.length) {
          const taskIndex = currentIndex;
          currentIndex++;

          const task = tasks[taskIndex];
          const result = await (task instanceof Function ? task() : task.run());

          if (result.isErr()) {
            errors.push(result.unwrapErr());
          } else {
            results.push(result.unwrap());
          }
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency, tasks.length) },
        () => executeTask()
      );
      await Promise.all(workers);

      return errors.length > 0 ? Result.Err(errors) : Result.Ok(results);
    });
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
      this.run().then((result) => {
        if (result.isOk()) {
          f(result.unwrap());
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
      this.run().then((result) => {
        if (result.isErr()) {
          f(result.unwrapErr());
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
> = {
  [K in keyof T]: T[K] extends Task<any, infer A>
    ? A
    : T[K] extends () => PromiseLike<Result<any, infer A>>
    ? A
    : never;
};

type PseudoTask<E, A> = () => PromiseLike<Result<E, A>>;
