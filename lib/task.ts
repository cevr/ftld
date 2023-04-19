import { isResult } from "./utils";
import type { Option } from "./option";
import { Err, Result } from "./result";

export class Task<E, A> {
  __tag = "Task" as const;
  constructor(private readonly _run: () => PromiseLike<Result<E, A>>) {}

  static from<E, A>(
    valueOrGetter: A | Result<E, A> | (() => A | PromiseLike<A> | Result<E, A>),
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
    return Task.from(f, onErr);
  }

  static fromResult<E, A>(result: Result<E, A>): Task<E, A> {
    return Task.from(result);
  }

  static fromOption<E, A>(error: E, option: Option<A>): Task<E, A> {
    return Task.from(Result.fromOption(error, option));
  }

  static resolve<E, A>(value: A): Task<E, A> {
    return Task.from(value);
  }

  static reject<E, A>(error: E): Task<E, A> {
    return Task.from(Result.Err<E, A>(error));
  }

  static traverse<E, A, B>(
    list: Array<A>,
    f: (a: A) => Task<E, B>
  ): Task<E, Array<B>> {
    let task = Task.resolve<E, Array<B>>([]);
    for (const a of list) {
      task = task.flatMap((acc) => f(a).map((b) => [...acc, b]));
    }

    return task as any;
  }

  static sequence<
    TTasks extends
      | Task<unknown, unknown>[]
      | (() => PromiseLike<Result<unknown, unknown>>)[]
  >(
    list: TTasks
  ): Task<PickErrorFromTaskList<TTasks>, PickValueFromTaskList<TTasks>[]> {
    // @ts-expect-error
    return Task.traverse(list, (task) => {
      if (task instanceof Function) {
        return Task.from(task);
      }
      return task;
    });
  }

  static sequenceParallel<
    TTasks extends
      | Task<unknown, unknown>[]
      | (() => PromiseLike<Result<unknown, unknown>>)[]
  >(
    list: TTasks,
    limit = list.length
  ): Task<PickErrorFromTaskList<TTasks>, PickValueFromTaskList<TTasks>[]> {
    return Task.parallel(list, limit);
  }

  static any<
    TTasks extends
      | Task<unknown, unknown>[]
      | (() => PromiseLike<Result<unknown, unknown>>)[]
  >(
    list: TTasks
  ): Task<PickErrorFromTaskList<TTasks>, PickValueFromTaskList<TTasks>> {
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

  static every<
    TTasks extends
      | Task<unknown, unknown>[]
      | (() => PromiseLike<Result<unknown, unknown>>)[]
  >(
    list: TTasks
  ): Task<PickErrorFromTaskList<TTasks>, PickValueFromTaskList<TTasks>[]> {
    return Task.sequence(list);
  }

  static tryCatch<E, A>(
    f: () => Promise<A> | A,
    onErr: (e: unknown) => E
  ): Task<E, A> {
    return Task.from(f, onErr);
  }

  static sequential<
    TTasks extends
      | Task<unknown, unknown>[]
      | (() => PromiseLike<Result<unknown, unknown>>)[]
  >(
    list: TTasks
  ): Task<PickErrorFromTaskList<TTasks>, PickValueFromTaskList<TTasks>[]> {
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

  static parallel<
    TTasks extends
      | Task<unknown, unknown>[]
      | (() => PromiseLike<Result<unknown, unknown>>)[]
  >(
    tasks: TTasks,
    limit: number = tasks.length
  ): Task<PickErrorFromTaskList<TTasks>, PickValueFromTaskList<TTasks>[]> {
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

  static race<
    TTasks extends
      | Task<unknown, unknown>[]
      | (() => PromiseLike<Result<unknown, unknown>>)[]
  >(
    list: TTasks
  ): Task<PickErrorFromTaskList<TTasks>, PickValueFromTaskList<TTasks>> {
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

  static collect<
    TTasks extends
      | Task<unknown, unknown>[]
      | (() => PromiseLike<Result<unknown, unknown>>)[]
  >(
    list: TTasks
  ): Task<PickErrorFromTaskList<TTasks>[], PickValueFromTaskList<TTasks>[]> {
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

  static collectParallel<
    TTasks extends
      | Task<unknown, unknown>[]
      | (() => PromiseLike<Result<unknown, unknown>>)[]
  >(
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
        { length: Math.min(limit, tasks.length) },
        () => executeTask()
      );
      await Promise.all(workers);

      return errors.length > 0 ? Result.Err(errors) : Result.Ok(results);
    });
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

  tap(f: (a: Result<E, A>) => PromiseLike<void> | void): Task<E, A> {
    return new Task(() =>
      this.run().then((result) => {
        f(result);
        return result;
      })
    );
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

type PickErrorFromTaskList<
  T extends
    | Task<unknown, unknown>[]
    | (() => PromiseLike<Result<unknown, unknown>>)[]
> = {
  [K in keyof T]: T[K] extends Task<infer E, any>
    ? E
    : T[K] extends () => PromiseLike<Result<infer E, any>>
    ? E
    : never;
}[number];

type PickValueFromTaskList<
  T extends
    | Task<unknown, unknown>[]
    | (() => PromiseLike<Result<unknown, unknown>>)[]
> = {
  [K in keyof T]: T[K] extends Task<any, infer A>
    ? A
    : T[K] extends () => PromiseLike<Result<any, infer A>>
    ? A
    : never;
}[number];
