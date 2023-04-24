import { identity, isResult } from "./utils";
import { None, Option, Some } from "./option";
import { Err, Result } from "./result";

export class Task<E, A> {
  // @ts-expect-error
  private readonly _tag = "Task" as const;
  constructor(private readonly _run: () => PromiseLike<Result<E, A>>) {}

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

  static Ok<E, A>(value: A): Task<E, A> {
    return Task.from(Result.Ok(value));
  }

  static Err<E, A>(error: E): Task<E, A> {
    return Task.from(Result.Err<E, A>(error));
  }

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

  static parallel<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  >(
    tasks: TTasks,
    limit: number = tasks.length
  ): Task<CollectErrors<TTasks>[number], CollectValues<TTasks>> {
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
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  >(list: TTasks): Task<CollectErrors<TTasks>[number], CollectValues<TTasks>[number]> {
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

  static coalesce<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  >(list: TTasks): Task<CollectErrors<TTasks>, CollectValues<TTasks>> {
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

  static coalescePar<
    TTasks extends
      | ValidTask<unknown, unknown>[]
      | [ValidTask<unknown, unknown>, ...ValidTask<unknown, unknown>[]]
  >(
    tasks: TTasks,
    limit = tasks.length
  ): Task<CollectErrors<TTasks>, CollectValues<TTasks>> {
    if (limit <= 0) {
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
        { length: Math.min(limit, tasks.length) },
        () => executeTask()
      );
      await Promise.all(workers);

      return errors.length > 0 ? Result.Err(errors) : Result.Ok(results);
    });
  }

  static tryCatch<E, A>(
    f: () => Promise<A> | A,
    onErr: (e: unknown) => E
  ): Task<E, A> {
    return Task.from(f, onErr);
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
    return new Task(() =>
      this.run().then((result) => {
        if (result.isOk()) {
          f(result.unwrap());
        }
        return result;
      })
    );
  }

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
