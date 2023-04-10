/* eslint-disable no-await-in-loop */
import { isPromiseLike } from "./utils";
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
  constructor(private readonly _run: () => Promise<Result<E, A>>) {}

  static of<E, A>(valueOrGetter: A | (() => PromiseLike<A> | A)): Task<E, A> {
    return new Task(async () => {
      const maybePromise =
        valueOrGetter instanceof Function ? valueOrGetter() : valueOrGetter;
      const value = isPromiseLike(maybePromise)
        ? await maybePromise
        : maybePromise;
      return Promise.resolve(Result.Ok(value));
    });
  }

  static fromPromise<E, A>(
    f: () => Promise<A>,
    onErr?: (e: unknown) => E
  ): Task<E, A> {
    return new Task(() =>
      f()
        .then((a) => Result.Ok<E, A>(a))
        .catch((error) => Result.Err<E, A>(onErr?.(error) ?? error))
    );
  }

  static fromResult<E, A>(result: Result<E, A>): Task<E, A> {
    return new Task(() => Promise.resolve(result));
  }

  static fromOption<E, A>(error: E, option: Option<A>): Task<E, A> {
    return new Task(() =>
      Promise.resolve(Result.fromOption<E, A>(error, option))
    );
  }

  static resolve<E, A>(value: A): Task<E, A> {
    return new Task(() => Promise.resolve(Result.Ok(value)));
  }

  static reject<E, A>(error: E): Task<E, A> {
    return new Task(() => Promise.resolve(Result.Err(error)));
  }

  static traverse<E, A, B>(
    list: Array<A>,
    f: (a: A) => Task<E, B>
  ): Task<E, Array<B>> {
    let result = Task.resolve<E, Array<B>>([]);
    for (const a of list) {
      result = result.flatMap((acc) => f(a).map((b) => [...acc, b]));
    }
    return result;
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
    return new Task(async () => {
      try {
        const maybePromise = f();
        const value = isPromiseLike(maybePromise)
          ? await maybePromise
          : maybePromise;
        return Promise.resolve(Result.Ok<E, A>(value));
      } catch (error) {
        return Promise.resolve(Result.Err<E, A>(onErr(error)));
      }
    });
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
    return new Task(async () => {
      let first = Promise.race(list.map((task) => task.run()));
      return first!;
    });
  }

  // @ts-expect-error
  ap<B>(fab: Task<E, (a: A) => B>): Task<E, B> {
    return new Task(() =>
      Promise.all([this.run(), fab.run()]).then(([result, result2]) => {
        if (result.isErr()) {
          return result as unknown as Result<E, B>;
        }

        if (result2.isErr()) {
          return result2 as unknown as Result<E, B>;
        }

        return Result.Ok(result2.unwrap()(result.unwrap()));
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
