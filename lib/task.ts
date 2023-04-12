/* eslint-disable no-await-in-loop */
import { isResult } from "./utils";
import type { Option } from "./option";
import { Result } from "./result";
import type { HKT, Monad } from "./types";
import { identity } from "./utils";

interface TaskHKT<E, A> extends HKT {
  type: Task<E, A>;
}

export class Task<E, A>
  implements Monad<TaskHKT<E, A>, never, E, A>, PromiseLike<Result<E, A>>
{
  __tag = "Task" as const;
  constructor(private readonly _run: () => PromiseLike<Result<E, A>>) {}

  static of<E, A>(
    valueOrGetter:
      | A
      | Result<E, A>
      | PromiseLike<A>
      | (() => A | PromiseLike<A> | Result<E, A>),
    onError?: (e: unknown) => E
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
        return Promise.resolve(Result.Ok(maybeResult));
      } catch (e) {
        return Promise.resolve(Result.Err(onError?.(e) ?? e));
      }
    }) as Task<E, A>;
  }

  static fromPromise<E, A>(f: () => Promise<A>): Task<E, A> {
    return Task.of(f);
  }

  static fromResult<E, A>(result: Result<E, A>): Task<E, A> {
    return Task.of(result);
  }

  static fromOption<E, A>(error: E, option: Option<A>): Task<E, A> {
    return Task.of(Result.fromOption(error, option));
  }

  static resolve<E, A>(value: A): Task<E, A> {
    return Task.of(value);
  }

  static reject<E, A>(error: E): Task<E, A> {
    return Task.of(Result.Err<E, A>(error));
  }

  static traverse<E, A, B>(
    list: Array<A>,
    f: (a: A) => Task<E, B>
  ): Task<E, Array<B>> {
    let task = Task.resolve<E, Array<B>>([]);
    for (const a of list) {
      task = task.flatMap((acc) => f(a).map((b) => [...acc, b]));
    }
    return task;
  }

  static sequence<E, A>(list: Array<Task<E, A>>): Task<E, Array<A>> {
    return Task.traverse(list, identity);
  }

  static sequenceParallel<E, A>(
    list: Array<Task<E, A>>,
    limit = list.length
  ): Task<E, Array<A>> {
    return Task.parallel(list, limit);
  }

  static async any<E, A>(list: Array<Task<E, A>>): Promise<Result<E, A>> {
    let first: Result<E, A> | undefined;
    for (const task of list) {
      const result = await task.run();
      if (result.isOk()) {
        return task;
      }
      if (!first) {
        first = result;
      }
    }
    return first!;
  }

  static every<E, A>(list: Array<Task<E, A>>): Task<E, Array<A>> {
    return Task.traverse(list, identity);
  }

  static tryCatch<E, A>(
    f: () => Promise<A> | A,
    onErr: (e: unknown) => E
  ): Task<E, A> {
    return Task.of(f, onErr);
  }

  static sequential<E, A>(list: Array<Task<E, A>>): Task<E, Array<A>> {
    // sequentially run the promises
    return new Task(async () => {
      let result: Array<A> = [];
      for (const task of list) {
        const next = await task.run();
        if (next.isErr()) {
          return next as Result<E, Array<A>>;
        }
        result.push(next.unwrap());
      }
      return Result.Ok(result);
    });
  }

  static parallel<E, A>(
    tasks: Array<Task<E, A>>,
    limit: number = tasks.length
  ): Task<E, Array<A>> {
    if (limit <= 0) {
      throw new Error("Concurrency must be greater than 0.");
    }
    return new Task(async () => {
      const results: A[] = [];
      let error: Result<E, A[]> | undefined;
      let currentIndex = 0;

      const executeTask = async () => {
        while (currentIndex < tasks.length) {
          const taskIndex = currentIndex;
          currentIndex++;

          const result = await tasks[taskIndex].run();
          if (result.isErr()) {
            error = result as Result<E, A[]>;
            return;
          }
          results[taskIndex] = result.unwrap();
        }
      };

      const workers = Array.from(
        { length: Math.min(limit, tasks.length) },
        () => executeTask()
      );
      await Promise.all(workers);
      if (error) {
        return error;
      }
      return Result.Ok(results);
    });
  }

  static race<E, A>(list: Array<Task<E, A>>): Task<E, A> {
    return new Task(() => {
      return Promise.race(list.map((task) => task.run()));
    });
  }

  static collect<E, A>(list: Array<Task<E, A>>): Task<E[], Array<A>> {
    return new Task(async () => {
      const results: A[] = [];
      const errors: E[] = [];
      for (const task of list) {
        const result = await task.run();
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

  static collectParallel<E, A>(
    tasks: Array<Task<E, A>>,
    limit = tasks.length
  ): Task<E[], A[]> {
    if (limit <= 0) {
      throw new Error("Concurrency limit must be greater than 0");
    }

    return new Task(async () => {
      const results: A[] = [];
      let errors: E[] = [];
      let currentIndex = 0;

      const executeTask = async () => {
        while (currentIndex < tasks.length) {
          const taskIndex = currentIndex;
          currentIndex++;

          const result = await tasks[taskIndex].run();
          if (result.isErr()) {
            errors.push(result.unwrapErr());
          } else {
            results.push(result.unwrap());
          }
        }
      };

      const workers = Array.from(
        { length: Math.min(limit, tasks.length) },
        () => executeTask()
      );
      await Promise.all(workers);

      return errors.length > 0 ? Result.Err(errors) : Result.Ok(results);
    });
  }

  // @ts-expect-error
  ap<B>(fab: Task<E, (a: A) => B | PromiseLike<B>>): Task<E, B> {
    return new Task(() =>
      Promise.all([this.run(), fab.run()]).then(async ([result, result2]) => {
        if (result.isErr()) {
          return result as unknown as Result<E, B>;
        }

        if (result2.isErr()) {
          return result2 as unknown as Result<E, B>;
        }

        const maybePromise = result2.unwrap()(result.unwrap());
        const value = isPromiseLike(maybePromise)
          ? await maybePromise
          : maybePromise;

        return Result.Ok(value) as Result<E, B>;
      })
    );
  }

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

  // @ts-expect-error
  flatMap<B>(f: (a: A) => Task<E, B> | PromiseLike<Task<E, B>>): Task<E, B> {
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

  tap(f: (a: A) => PromiseLike<void> | void): Task<E, A> {
    return this.map(async (a) => {
      const value = f(a);
      if (isPromiseLike(value)) {
        await value;
      }
      return a;
    });
  }
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return typeof value === "object" && value !== null && "then" in value;
}
