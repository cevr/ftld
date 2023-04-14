import { isResult } from "./utils";
import type { Option } from "./option";
import { Err, Result } from "./result";
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

  static fromPromise<E, A>(
    f: () => Promise<A>,
    onErr?: (e: unknown) => E
  ): Task<E, A> {
    return Task.of(f, onErr);
  }

  static fromResult<E, A>(result: Result<E, A>): Task<E, A> {
    return Task.of(result);
  }

  static fromOption<E, A>(error: E, option: Option<A>): Task<E, A> {
    return Task.of(Result.fromOption(error, option));
  }

  static resolve<A>(value: A): Task<never, A> {
    return Task.of(value);
  }

  static reject<E>(error: E): Task<E, never> {
    return Task.of(Result.Err<E>(error));
  }

  static traverse<E, A, B>(
    list: Array<A>,
    f: (a: A) => Task<E, B>
  ): Task<E, Array<B>> {
    let task = Task.resolve<Array<B>>([]);
    for (const a of list) {
      // @ts-expect-error
      task = task.flatMap((acc) => f(a).map((b) => [...acc, b]));
    }
    return task;
  }

  static sequence<TTasks extends Task<unknown, unknown>[]>(
    list: TTasks
  ): ConvergeTaskList<TTasks> {
    // @ts-expect-error
    return Task.traverse(list, identity);
  }

  static sequenceParallel<TTasks extends Task<unknown, unknown>[]>(
    list: TTasks,
    limit = list.length
  ): ConvergeTaskList<TTasks> {
    return Task.parallel(list, limit);
  }

  static any<TTasks extends Task<unknown, unknown>[]>(
    list: TTasks
  ): Task<PickErrorFromTaskList<TTasks>, PickValueFromTaskList<TTasks>> {
    // @ts-expect-error
    return new Task<unknown, unknown>(async () => {
      let first: Result<any, any> | undefined;
      for (const task of list) {
        const result = await task.run();
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

  static every<TTasks extends Task<unknown, unknown>[]>(
    list: TTasks
  ): ConvergeTaskList<TTasks> {
    // @ts-expect-error
    return Task.traverse(list, identity);
  }

  static tryCatch<E, A>(
    f: () => Promise<A> | A,
    onErr: (e: unknown) => E
  ): Task<E, A> {
    return Task.of(f, onErr);
  }

  static sequential<TTasks extends Task<unknown, unknown>[]>(
    list: TTasks
  ): ConvergeTaskList<TTasks> {
    // sequentially run the promises
    // @ts-expect-error
    return new Task(async () => {
      let result: Array<any> = [];
      for (const task of list) {
        const next = await task.run();
        if (next.isErr()) {
          return next;
        }
        result.push(next.unwrap());
      }
      return Result.Ok(result);
    });
  }

  static parallel<TTasks extends Task<unknown, unknown>[]>(
    tasks: TTasks,
    limit: number = tasks.length
  ): ConvergeTaskList<TTasks> {
    if (limit <= 0) {
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

          const result = await tasks[taskIndex].run();
          if (result.isErr()) {
            error = result;
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

  static race<TTasks extends Task<unknown, unknown>[]>(
    list: TTasks
  ): Task<PickErrorFromTaskList<TTasks>, PickValueFromTaskList<TTasks>> {
    // @ts-expect-error
    return new Task(() => {
      return Promise.race(list.map((task) => task.run()));
    });
  }

  static collect<TTasks extends Task<unknown, unknown>[]>(
    list: TTasks
  ): Task<PickErrorFromTaskList<TTasks>[], PickValueFromTaskList<TTasks>[]> {
    return new Task(async () => {
      const results: any[] = [];
      const errors: any[] = [];
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

  static collectParallel<TTasks extends Task<unknown, unknown>[]>(
    tasks: TTasks,
    limit = tasks.length
  ): Task<PickErrorFromTaskList<TTasks>[], PickValueFromTaskList<TTasks>[]> {
    if (limit <= 0) {
      throw new Error("Concurrency limit must be greater than 0");
    }

    return new Task(async () => {
      const results: any[] = [];
      let errors: any[] = [];
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
  flatMap<F, B>(
    f: (a: A) => Task<F, B> | PromiseLike<Task<F, B>>
  ): Task<F | E, B> {
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

  async match<F, B>(cases: {
    Ok: (a: A) => B | PromiseLike<B>;
    Err: (e: E) => F | PromiseLike<F>;
  }): Promise<F | B> {
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

type PickErrorFromTaskList<T extends Array<Task<unknown, unknown>>> = {
  [K in keyof T]: T[K] extends Task<infer E, any> ? E : never;
}[number];

type PickValueFromTaskList<T extends Array<Task<unknown, unknown>>> = {
  [K in keyof T]: T[K] extends Task<any, infer A> ? A : never;
}[number];

type ConvergeTaskList<T extends Array<Task<unknown, unknown>>> = Task<
  PickErrorFromTaskList<T>,
  PickValueFromTaskList<T>[]
>;
