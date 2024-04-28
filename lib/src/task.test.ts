import { Option } from "./option.js";
import { Result, type SettledResult } from "./result.js";
import {
  Task,
  TaskTimeoutError,
  TaskSchedulingError,
  type AsyncTask,
  type SyncTask,
  TaskAbortedError,
  InvalidConcurrencyError,
} from "./task.js";
import { request } from "undici";

// Monad Laws
// 1. Left Identity: M.from(a).flatMap(f) == f(a)
// 2. Right Identity: m.flatMap(M.from) == m
// 3. Associativity: m.flatMap(f).flatMap(g) == m.flatMap((x) => f(x).flatMap(g))

describe.concurrent("Task", () => {
  class SomeError {
    _tag = "SomeError";
  }

  class OtherError {
    _tag = "OtherError";
  }

  // Helper function to compare Task results
  const compareTaskResults = async (
    task1: Task<any, any>,
    task2: Task<any, any>
  ) => {
    const res1 = task1.run();
    const res2 = task2.run();

    expect(res1).toEqual(res2);
  };

  it("should satisfy the Left Identity law", async () => {
    const a = 42;
    const f = (x: number) => Task.from(() => x * 2);

    const task1 = Task.from(() => a).flatMap(f);
    const task2 = f(a);

    compareTaskResults(task1, task2);
  });

  it("should satisfy the Right Identity law", async () => {
    const a = 42;
    const m = Task.from(() => a);

    const task1 = m.flatMap((x) => Task.from(() => x));
    const task2 = m;

    compareTaskResults(task1, task2);
  });

  it("should satisfy the Associativity law", async () => {
    const a = 42;
    const m = Task.from(() => a);
    const f = (x: number) => Task.from(() => x * 2);
    const g = (x: number) => Task.from(() => x + 1);

    const task1 = m.flatMap(f).flatMap(g);
    const task2 = m.flatMap((b) => f(b).flatMap(g));

    compareTaskResults(task1, task2);
  });

  describe.concurrent("from", () => {
    it("should correctly construct from a value", async () => {
      const value = 42;
      const task = Task.from(() => value);
      const result = task.run();
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(value);
    });

    it("should correctly construct from a promise", async () => {
      const value = 42;
      const task = Task.from(() => Promise.resolve(value));
      const result = await task.run();
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(value);
    });

    it("should correctly construct from a result", async () => {
      const value = 42;
      const result = Result.Ok(value);
      const task = Task.from(() => result);
      const taskResult = task.run();
      expect(taskResult.isOk()).toBeTruthy();
      expect(taskResult.unwrap()).toEqual(value);
    });

    it("should correctly construct from an option", async () => {
      const value = 42;

      const option = Option.Some(value);
      const task = Task.from(() => option);
      const result = task.run();
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(option);
      expectTypeOf(task).toEqualTypeOf<SyncTask<Option<number>>>();
    });

    it("should correctly infer return type from all possible values", async () => {
      const value = [1, 2, 3];
      const option = Option.Some(value);
      const result = Result.from(
        () => value,
        () => new Error("An error occurred")
      );
      const promise = () => Promise.resolve(value);
      const task = Task.from(
        () => value,
        () => new Error("An error occurred")
      );
      const promiseResult = () => Promise.resolve(result);
      const fetchPromise = () =>
        fetch("https://google.com").then(() => value as number[]);
      const promiseObj = () => Promise.resolve({ value });
      const fetchPromiseObj = () =>
        fetch("https://google.com").then(
          (res) => res.json() as Promise<{ value: number[] }>
        );

      const undiciRequest = () =>
        request("https://google.com").then((res) => res.body.json());

      const never = () => {
        throw new Error("This should never be called");
      };

      expectTypeOf(Task.from(never)).toEqualTypeOf<SyncTask<never>>();
      expectTypeOf(Task.from(() => option)).toEqualTypeOf<
        SyncTask<Option<number[]>>
      >();
      expectTypeOf(Task.from(() => result)).toEqualTypeOf<
        SyncTask<number[], Error>
      >();
      expectTypeOf(Task.from(promise)).toEqualTypeOf<AsyncTask<number[]>>();
      expectTypeOf(Task.from(fetchPromise)).toEqualTypeOf<
        AsyncTask<number[]>
      >();
      expectTypeOf(Task.from(() => task)).toEqualTypeOf<
        SyncTask<number[], Error>
      >();
      expectTypeOf(Task.from(promiseResult)).toEqualTypeOf<
        AsyncTask<number[], Error | unknown>
      >();
      expectTypeOf(Task.from(() => value)).toEqualTypeOf<
        SyncTask<number[], unknown>
      >();
      expectTypeOf(Task.from(promiseObj)).toEqualTypeOf<
        AsyncTask<{ value: number[] }>
      >();
      expectTypeOf(Task.from(fetchPromiseObj)).toEqualTypeOf<
        AsyncTask<{ value: number[] }>
      >();
      expectTypeOf(Task.from(undiciRequest)).toEqualTypeOf<
        AsyncTask<unknown, unknown>
      >();

      // with error handled

      expectTypeOf(Task.from(never, () => new SomeError())).toEqualTypeOf<
        SyncTask<never, SomeError>
      >();
      expectTypeOf(
        Task.from(
          () => option,
          () => new SomeError()
        )
      ).toEqualTypeOf<SyncTask<Option<number[]>, SomeError>>();
      expectTypeOf(
        Task.from(
          () => result,
          () => new SomeError()
        )
      ).toEqualTypeOf<SyncTask<number[], SomeError>>();
      expectTypeOf(Task.from(promise, () => new SomeError())).toEqualTypeOf<
        AsyncTask<number[], SomeError>
      >();
      expectTypeOf(
        Task.from(fetchPromise, () => new SomeError())
      ).toEqualTypeOf<AsyncTask<number[], SomeError>>();
      expectTypeOf(
        Task.from(
          () => task,
          () => new SomeError()
        )
      ).toEqualTypeOf<SyncTask<number[], SomeError>>();
      expectTypeOf(
        Task.from(promiseResult, () => new SomeError())
      ).toEqualTypeOf<AsyncTask<number[], SomeError>>();
      expectTypeOf(
        Task.from(
          () => value,
          () => new SomeError()
        )
      ).toEqualTypeOf<SyncTask<number[], SomeError>>();
      expectTypeOf(Task.from(promiseObj, () => new SomeError())).toEqualTypeOf<
        AsyncTask<{ value: number[] }, SomeError>
      >();
      expectTypeOf(
        Task.from(fetchPromiseObj, () => new SomeError())
      ).toEqualTypeOf<AsyncTask<{ value: number[] }, SomeError>>();
      expectTypeOf(
        Task.from(undiciRequest, () => new SomeError())
      ).toEqualTypeOf<AsyncTask<unknown, SomeError>>();
    });
  });

  it("from should not allow a promise to be passed in", () => {
    const promise = Promise.resolve(42);

    // @ts-expect-error
    const task = Task.from(promise);
  });

  describe.concurrent("fromPredicate", () => {
    it("should correctly construct from a value", async () => {
      const value = 42;
      const task = Task.fromPredicate(
        () => value,
        () => true,
        () => new Error("An error occurred")
      );
      const result = task.run();
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(value);
    });

    it("should correctly construct from a promise", async () => {
      const value = 42;
      const task = Task.fromPredicate(
        () => Promise.resolve(value),
        () => true,
        () => new Error("An error occurred")
      );
      const result = await task.run();
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(value);
    });

    it("should correctly construct from a result", async () => {
      const value = 42;
      const result = Result.Ok(value);
      const task = Task.fromPredicate(
        () => result,
        () => true,
        () => new Error("An error occurred")
      );
      const taskResult = task.run();
      expect(taskResult.isOk()).toBeTruthy();
      expect(taskResult.unwrap()).toEqual(value);
    });

    it("should correctly construct from an option", async () => {
      const value = 42;
      const error = new Error("An error occurred");
      const option = Option.Some(value);
      const task = Task.fromPredicate(
        () => option,
        () => true,
        () => error
      );
      const result = task.run();
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(option);
    });

    it("should be able to narrow the type of the value", async () => {
      const value = 42 as number | string;
      const error = new Error("An error occurred");
      const option = Option.Some(value);
      const task = Task.fromPredicate(
        () => option.unwrap(),
        (x): x is number => typeof x === "number",
        (e) => error
      );
      expectTypeOf(task).toEqualTypeOf<SyncTask<number, Error>>();
      const result = await task.run();

      expectTypeOf(result.unwrap()).toEqualTypeOf<number>();
    });

    it("should handle the 'any' type", async () => {
      const value = 42 as any;
      const error = new Error("An error occurred");
      const option = Option.Some(value);
      const task = Task.fromPredicate(
        async () => option.unwrap(),
        (x): x is number => typeof x === "number",
        (e) => error
      );
      expectTypeOf(task).toEqualTypeOf<AsyncTask<number, Error>>();
      const result = await task.run();

      expectTypeOf(result.unwrap()).toEqualTypeOf<number>();
    });
  });

  it("should correctly map a function over Task", async () => {
    const value = 42;
    const f = (x: number) => x * 2;
    const task = Task.from(() => value);
    const mappedTask = task.map(f);
    const result = mappedTask.run();
    expect(result.isOk()).toBeTruthy();
    expect(result.unwrap()).toEqual(f(value));
  });

  it("should not turn the task async if the function is async and the task is an err when mapping", async () => {
    const value = 42;
    const f = async (x: number) => x * 2;
    const task = Task.from(() => Result.Err(value));
    const mappedTask = task.map(f);
    const result = mappedTask.run();
    expect("then" in result).toBeFalsy();
    expect(result.isErr()).toBeTruthy();
    expect(result.unwrapErr()).toEqual(value);
  });

  it("should correctly flatMap a function over Task", async () => {
    const value = 42;
    const f = (x: number) => Task.from(() => x * 2);
    const task = Task.from(() => value);
    const flatMappedTask = task.flatMap(f);
    const result = flatMappedTask.run();
    expect(result.isOk()).toBeTruthy();
    expect(result.unwrap()).toEqual(f(value).unwrap());
  });

  it("should convert to an AsyncTask from a SyncTask when flatMap is async", async () => {
    const value = 42;
    const f = async (x: number) => Task.from(() => x * 2);
    const task = Task.from(() => value);
    const flatMappedTask = task.flatMap(f).map((x) => x);

    expectTypeOf(task).toEqualTypeOf<SyncTask<number>>();
    expectTypeOf(flatMappedTask).toEqualTypeOf<AsyncTask<number>>();

    const result = await flatMappedTask.run();
    expect(result.isOk()).toBeTruthy();
    expect(result.unwrap()).toEqual((await f(value)).unwrap());
  });

  it("should flatMap over any value", async () => {
    const task = Task.from(() => 42);
    const primitiveNumber = task.flatMap(() => 42);
    expectTypeOf(primitiveNumber).toEqualTypeOf<SyncTask<number>>();
    const resultNum = primitiveNumber.run();
    expect(resultNum).toEqual(Result.Ok(42));

    const primitiveString = task.flatMap(() => "42");
    const resultStr = primitiveString.run();
    expect(resultStr).toEqual(Result.Ok("42"));
    expectTypeOf(primitiveString).toEqualTypeOf<SyncTask<string>>();

    const primitiveBoolean = task.flatMap(() => true);
    const resultBool = primitiveBoolean.run();
    expect(resultBool).toEqual(Result.Ok(true));

    const primitiveNull = task.flatMap(() => null);
    const resultNull = primitiveNull.run();
    expect(resultNull).toEqual(Result.Ok(null));
    expectTypeOf(primitiveNull).toEqualTypeOf<SyncTask<null>>();

    const primitiveUndefined = task.flatMap(() => undefined);
    const resultUndefined = primitiveUndefined.run();
    expect(resultUndefined).toStrictEqual(Result.Ok(undefined));
    expectTypeOf(primitiveUndefined).toEqualTypeOf<SyncTask<undefined>>();

    const object = { a: 42 };
    const primitiveObject = task.flatMap(() => object);
    const resultObject = primitiveObject.run();
    expect(resultObject).toEqual(Result.Ok(object));
    expectTypeOf(primitiveObject).toEqualTypeOf<SyncTask<{ a: number }>>();
  });

  it("should correctly recover a Task", async () => {
    const error = new Error("An error occurred");
    const f = (e: Error) =>
      Task.from(() => Result.Err(e.message.toUpperCase()));
    const task = Task.from(() => Result.Err(error));
    const flatMappedErrTask = task.recover(f);
    const result = flatMappedErrTask.run();
    expect(result.isErr()).toBeTruthy();
    expect(result.unwrapErr()).toEqual(f(error).unwrapErr());
  });

  it("can recover using any value", async () => {
    const error = new Error("An error occurred");
    const task = Task.from(() => Result.Err(error));
    const primitiveNumber = task.recover(() => 42);
    expectTypeOf(primitiveNumber).toEqualTypeOf<SyncTask<number, never>>();
    const resultNum = primitiveNumber.run();
    expect(resultNum).toEqual(Result.Ok(42));

    const primitiveString = task.recover(() => "42");
    expectTypeOf(primitiveString).toEqualTypeOf<SyncTask<string, never>>();
    const resultStr = primitiveString.run();
    expect(resultStr).toEqual(Result.Ok("42"));

    const primitiveBoolean = task.recover(() => true);
    expectTypeOf(primitiveBoolean).toEqualTypeOf<SyncTask<boolean, never>>();
    const resultBool = primitiveBoolean.run();
    expect(resultBool).toEqual(Result.Ok(true));

    const primitiveNull = task.recover(() => null);
    expectTypeOf(primitiveNull).toEqualTypeOf<SyncTask<null, never>>();
    const resultNull = primitiveNull.run();
    expect(resultNull).toEqual(Result.Ok(null));
  });

  it("should convert to an AsyncTask from a SyncTask when recover is async", async () => {
    const error = new Error("An error occurred");
    const f = (e: Error) => Promise.resolve(Result.Err(e.message));
    const task = Task.from(() => Result.Err(error));
    const recoveredErrTask = task.recover((e) => f(e));

    expectTypeOf(task).toEqualTypeOf<SyncTask<never, Error>>();
    expectTypeOf(recoveredErrTask).toEqualTypeOf<AsyncTask<never, string>>();

    const result = await recoveredErrTask.run();
    expect(result.isErr()).toBeTruthy();
    expect(result.unwrapErr()).toEqual((await f(error)).unwrapErr());
  });

  it("should correctly mapErr a function over Task", async () => {
    const error = new Error("An error occurred");
    const f = (e: Error) => new Error(e.message.toUpperCase());
    const task = Task.from(() => Result.Err(error));
    const mappedErrTask = task.mapErr(f);
    const result = mappedErrTask.run();
    expect(result.isErr()).toBeTruthy();
    expect(result.unwrapErr()).toEqual(f(error));
  });

  it("should give a type error if the mapErr function is async", () => {
    const error = new Error("An error occurred");
    const f = async (e: Error) => new Error(e.message.toUpperCase());
    const task = Task.from(() => Result.Err(error));
    // @ts-expect-error
    const mappedErrTask = task.mapErr(f);
  });

  it("should not turn the task async when the function is async and the task is Ok", () => {
    const value = 42;
    const f = async (x: number) => x * 2;
    const task = Task.from(() => Result.Ok(value));

    const mappedTask = task.mapErr(f);
    const result = mappedTask.run();
    expect("then" in result).toBeFalsy();
    // @ts-expect-error
    expect(result.isOk()).toBeTruthy();
    // @ts-expect-error
    expect(result.unwrap()).toEqual(value);
  });

  describe.concurrent("traverse", () => {
    it("should correctly traverse an array of values", async () => {
      const values = [1, 2, 3, 4];
      const f = (x: number) => Task.from(() => x * 2);
      const asyncF = (x: number) => Task.from(async () => x * 2);
      const expectedResult = values.map((x) => x * 2);

      const traversedTask = Task.traverse(values, f);
      const traversedAsyncTask = Task.traverse(values, asyncF);
      const result = traversedTask.run();

      expectTypeOf(traversedTask).toEqualTypeOf<SyncTask<number[], unknown>>();
      expectTypeOf(traversedAsyncTask).toEqualTypeOf<
        AsyncTask<number[], unknown>
      >();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should handle errors", async () => {
      const values = [1, 2, 3, 4];
      const error = new Error("An error occurred");
      const f = (x: number): SyncTask<number> =>
        x === 3 ? Task.from(() => Result.Err(error)) : Task.from(() => x * 2);

      const traversedTask = Task.traverse(values, f);
      const result = traversedTask.run();

      expect(result.isErr()).toBeTruthy();
    });

    it("should abort if run context is aboerted", async () => {
      const abortController = new AbortController();
      const values = [1, 2, 3, 4];
      const fn = vi.fn();
      const f = (x: number) =>
        Task.sleep(10)
          .map(() => x * 2)
          .tap((x) => {
            if (x > 4) {
              abortController.abort();
            }
            fn();
          });

      const traversedTask = Task.traverse(values, f);

      const result = await traversedTask.run({
        signal: abortController.signal,
      });

      expect(result.isErr()).toBeTruthy();
      expect(fn).toBeCalledTimes(3);
    });
  });

  describe.concurrent("traversePar", () => {
    it("should correctly traverse an array of values", async () => {
      const values = [1, 2, 3, 4];
      const f = (x: number) => Task.from(() => x * 2);
      const expectedResult = values.map((x) => x * 2);

      const traversedTask = Task.traversePar(values, f);

      expectTypeOf(traversedTask).toEqualTypeOf<
        AsyncTask<number[], unknown | InvalidConcurrencyError>
      >();

      const result = await traversedTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should handle errors", async () => {
      const values = [1, 2, 3, 4];
      const error = new Error("An error occurred");
      const fn = vi.fn();
      const f = (x: number): SyncTask<number, Error | unknown> => {
        if (x === 3) {
          fn();
          return Task.from(() => Result.Err(error));
        }
        return Task.from(() => x * 2);
      };

      const traversedTask = Task.traversePar(values, f);
      const result = await traversedTask.run();

      expect(result.isErr()).toBeTruthy();
      expect(fn).toBeCalledTimes(1);
    });

    it("should traverse in parallel", async () => {
      const values = [10, 10];
      const toTask = (x: number) => Task.sleep(x).map(() => Date.now());
      const parallelTask = Task.traversePar(values, toTask);
      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()[0]).toBeLessThanOrEqual(result.unwrap()[1]!);
    });

    it("should traverse in parallel with a limit", async () => {
      const values = [10, 10, 10];
      const toTask = (x: number) =>
        Task.from(() => Result.Ok(Date.now())).flatMap((now) =>
          Task.sleep(x).map(() => now)
        );
      const parallelTask = Task.traversePar(values, toTask, 1);
      const result = await parallelTask.unwrap();

      expect(result[0]! < result[1]!).toBeTruthy();
      expect(result[1]! < result[2]!).toBeTruthy();
    });

    it("should abort if run context is aborted", async () => {
      const abortController = new AbortController();
      const values = [10, 10, 10, 10, 10, 10];
      const fn = vi.fn();
      const toTask = (x: number) => {
        const now = Date.now();
        return Task.from(() => Result.Ok(now)).flatMap((now) =>
          Task.sleep(x)
            .map(() => Date.now() - now)
            .tap((x) => {
              if (x >= 20) {
                abortController.abort();
              }
              fn();
            })
        );
      };

      const parallelTask = Task.traversePar(values, toTask, 2);

      await parallelTask.run({
        signal: abortController.signal,
      });

      expect(fn).toBeCalledTimes(3);
    });
  });

  describe.concurrent("any", () => {
    it("should correctly return the first Ok result", async () => {
      const tasks = [
        Task.from(() => Result.Err(new Error("An error occurred"))),
        Task.from(() => Result.Ok(42)),
        Task.from(() => Result.Err("24")),
      ];
      const asyncTasks = [
        Task.from(() => Result.Err(new Error("An error occurred"))),
        Task.from(
          () => Promise.resolve(42),
          () => new Error("An error occurred")
        ),
        Task.from(() => Result.Err("24")),
      ];

      const task = Task.any(tasks);
      const asyncTask = Task.any(asyncTasks);

      const result = task.run();

      expectTypeOf(task).toEqualTypeOf<SyncTask<number, string | Error>>();
      expectTypeOf(asyncTask).toEqualTypeOf<
        AsyncTask<number, string | Error>
      >();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(42);
    });

    it("should correctly return the first Err result", async () => {
      const tasks = [
        Task.from(() => Result.Err(new Error("An error occurred"))),
        Task.from(() => Result.Err(new Error("Another error occurred"))),
      ];
      const result = Task.any(tasks).run();
      expect(result.isErr()).toBeTruthy();
    });
  });

  describe.concurrent("parallel", () => {
    it("should correctly return an array of Ok results", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.from(() => x * 2));
      const expectedResult = values.map((x) => x * 2);

      const parallelTask = Task.parallel(tasks);

      expectTypeOf(parallelTask).toMatchTypeOf<
        AsyncTask<
          number[],
          unknown | TaskAbortedError | InvalidConcurrencyError
        >
      >();

      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should handle errors", async () => {
      const values = [1, 2, 3, 4];
      const fn = vi.fn();
      const tasks = values.map((x) => {
        if (x === 3) {
          fn();
          return Task.from(() => Result.Err(new Error("An error occurred")));
        }
        return Task.from(
          () => x * 2,
          () => new Error("An error occurred")
        );
      });

      const parallelTask = Task.parallel(tasks);
      const result = await parallelTask.run();

      expect(result.isErr()).toBeTruthy();
      expect(fn).toBeCalledTimes(1);
    });

    it("should resolve in parallel", async () => {
      const taskOne = Task.sleep(10).map(() => Date.now());
      const taskTwo = Task.sleep(10).map(() => Date.now());

      const parallelTask = Task.parallel([taskOne, taskTwo]);
      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()[0]).toBeLessThanOrEqual(result.unwrap()[1]);
    });

    it("should resolve in parallel with a limit", async () => {
      const values = [10, 10, 10];
      const toTask = (x: number) =>
        Task.from(() => Result.Ok(Date.now())).flatMap((now) =>
          Task.sleep(x).map(() => now)
        );
      const parallelTask = Task.parallel(values.map(toTask), 1);
      const result = await parallelTask.unwrap();

      expect(result[0]! < result[1]!).toBeTruthy();
      expect(result[1]! < result[2]!).toBeTruthy();
    });

    it("should return an Err if the limit is less than 1", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.from(() => x * 2));
      const parallelTask = Task.parallel(tasks, 0);
      const result = await parallelTask.run();

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr()).toBeInstanceOf(InvalidConcurrencyError);
    });

    it("should maintain the order of the tasks", async () => {
      const taskOne = Task.sleep(20).map(() => 1);
      const taskTwo = Task.sleep(10).map(() => 2);

      const tasks = await Task.parallel([taskOne, taskTwo]).run();
      const results = tasks.unwrap();

      expect(results.length).toBe(2);
      expect(results).toEqual([1, 2]);
    });

    it("should abort if run context is aborted", async () => {
      const abortController = new AbortController();
      const values = [10, 10, 10];
      const fn = vi.fn();
      const toTask = (x: number) => {
        const now = Date.now();
        return Task.from(() => Result.Ok(now)).flatMap((now) =>
          Task.sleep(x)
            .map(() => Date.now() - now)
            .tap((x) => {
              if (x >= 20) {
                abortController.abort();
              }
              fn();
            })
        );
      };

      const parallelTask = Task.parallel(values.map(toTask), 1);

      await parallelTask.run({
        signal: abortController.signal,
      });

      expect(fn).toBeCalledTimes(2);
    });
  });

  describe.concurrent("sequential", () => {
    it("should correctly return an array of Ok results", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.from(() => x * 2));
      const asyncTasks = values.map((x) => Task.from(async () => x * 2));
      const expectedResult = values.map((x) => x * 2);
      const genericTask = <T>() =>
        Task.from(
          async () => 1 as T,
          () => new SomeError()
        );

      const sequentialTask = Task.sequential(tasks);
      const sequentialAsyncTask = Task.sequential(asyncTasks);
      const getSequentialGenericTasks = <T>() =>
        Task.sequential([genericTask<T>(), genericTask<T>()]);
      const getComplexSequentialGenericTasks = <T>() => {
        const paths = getSequentialGenericTasks<string>();

        return paths.flatMap(() => getSequentialGenericTasks<T>());
      };
      const result = sequentialTask.run();

      expectTypeOf(sequentialTask).toEqualTypeOf<SyncTask<number[]>>();
      expectTypeOf(sequentialAsyncTask).toEqualTypeOf<AsyncTask<number[]>>();

      const sequentialGenericTasks = getSequentialGenericTasks<number>();
      const complexSequentialGenericTasks =
        getComplexSequentialGenericTasks<string>();

      expectTypeOf(sequentialGenericTasks).toEqualTypeOf<
        AsyncTask<[number, number], SomeError>
      >();
      expectTypeOf(complexSequentialGenericTasks).toEqualTypeOf<
        AsyncTask<[string, string], SomeError>
      >();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should return the first error", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) =>
        x === 3
          ? Task.from(() => Result.Err(new Error("An error occurred: " + x)))
          : Task.from(() => x * 2)
      );

      const sequentialTask = Task.sequential(tasks);
      const result = sequentialTask.run();

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr()).toEqual(new Error("An error occurred: 3"));
    });

    it("should resolve sequentially", async () => {
      const values = [10, 10, 10, 10];

      const toTask = (x: number) => {
        const now = Date.now();
        return Task.from(() => Result.Ok(now)).flatMap(() =>
          Task.sleep(x).map(() => Date.now() - now)
        );
      };

      const results = await Task.sequential(values.map(toTask)).unwrap();

      // expect that each result is greater than the previous
      expect(results.every((x, i, arr) => x >= (arr[i - 1] || 0))).toBeTruthy();
    });
  });

  describe.concurrent("coalesce", () => {
    it("should resolve sequentially", async () => {
      const taskOne = Task.sleep(10).map(() => Date.now());
      const taskTwo = Task.sleep(10)
        .map(() => Date.now())
        .flatMap(() => Task.sleep(15).map(() => Date.now()));

      const timestamps = await Task.coalesce([taskOne, taskTwo]).run();
      const timestampsUnwrapped = timestamps.unwrap();

      expect(timestampsUnwrapped.length).toBe(2);
      expect(
        timestampsUnwrapped[1] - timestampsUnwrapped[0]
      ).toBeGreaterThanOrEqual(20);
    });

    it("should accumulate errors", async () => {
      const values = [1, 2, 3, 4];
      const tasks: SyncTask<number, SomeError | OtherError>[] = values.map(
        (x) =>
          x > 2
            ? Task.from(() => Result.Err(new SomeError()))
            : Task.from(
                () => x * 2,
                () => new OtherError()
              )
      );
      const asyncTasks = tasks.map((task) =>
        task.flatMap(async (x) => Result.Ok(x))
      );

      const task = Task.coalesce(tasks);
      const asyncTask = Task.coalesce(asyncTasks);
      const result = task.run();

      expectTypeOf(task).toMatchTypeOf<
        Task<number[], (SomeError | OtherError)[]>
      >();

      expectTypeOf(asyncTask).toMatchTypeOf<
        AsyncTask<number[], (SomeError | OtherError)[]>
      >();

      expect(asyncTask.run()).toBeInstanceOf(Promise);
      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr().length).toBe(2);
      expect(result.unwrapErr()).toEqual([new SomeError(), new SomeError()]);
    });

    it("should resolve a list of Ok results", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.from(() => x * 2));
      const expectedResult = values.map((x) => x * 2);

      const result = Task.coalesce(tasks).run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });
  });

  describe.concurrent("coalescePar", () => {
    it("should resolve in parallel", async () => {
      const taskOne = Task.sleep(10).map(() => Date.now());
      const taskTwo = Task.sleep(10).map(() => Date.now());

      const parallelTask = Task.coalescePar([taskOne, taskTwo]);
      const result = await parallelTask.run();

      expectTypeOf(parallelTask).toMatchTypeOf<
        AsyncTask<[number, number], never[] | InvalidConcurrencyError>
      >();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()[0]).toBeLessThanOrEqual(result.unwrap()[1]);
    });

    it("should accumulate errors", async () => {
      const values = [1, 2, 3, 4];
      const tasks: Task<number, string>[] = values.map((x) =>
        x < 3
          ? Task.from(() => Result.Err("An error occurred"))
          : Task.from(
              () => x * 2,
              () => ""
            )
      );

      const result = await Task.coalescePar(tasks).run();

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr()).toEqual([
        "An error occurred",
        "An error occurred",
      ]);
    });

    it("should return an Err if the limit is less than 1", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.from(() => x * 2));
      const parallelTask = Task.coalescePar(tasks, 0);
      const result = await parallelTask.run();

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr()).toBeInstanceOf(InvalidConcurrencyError);
    });

    it("should maintain the order of the tasks", async () => {
      const taskOne = Task.sleep(20).map(() => 1);
      const taskTwo = Task.sleep(10).map(() => 2);

      const tasks = await Task.coalescePar([taskOne, taskTwo]).run();
      const results = tasks.unwrap();

      expect(results.length).toBe(2);
      expect(results).toEqual([1, 2]);
    });

    it("should resolve in parallel with a limit", async () => {
      const values = [10, 10, 10];
      const toTask = (x: number) =>
        Task.from(() => Result.Ok(Date.now())).flatMap((now) =>
          Task.sleep(x).map(() => now)
        );
      const parallelTask = Task.coalescePar(values.map(toTask), 1);
      const result = await parallelTask.unwrap();

      expect(result[0]! < result[1]!).toBeTruthy();
      expect(result[1]! < result[2]!).toBeTruthy();
    });

    it("should abort if run context is aborted", async () => {
      const abortController = new AbortController();
      const values = [10, 10, 10];
      const fn = vi.fn();
      const toTask = (x: number) => {
        const now = Date.now();
        return Task.from(() => Result.Ok(now)).flatMap((now) =>
          Task.sleep(x)
            .map(() => Date.now() - now)
            .tap((x) => {
              if (x >= 20) {
                abortController.abort();
              }
              fn();
            })
        );
      };

      const parallelTask = Task.coalescePar(values.map(toTask), 1);

      await parallelTask.run({
        signal: abortController.signal,
      });

      expect(fn).toBeCalledTimes(2);
    });
  });
  describe.concurrent("race", () => {
    it("should correctly return the first settled result", async () => {
      const taskOne = Task.sleep(10).map(() => 10);
      const taskTwo = Task.sleep(20).map(() => 20);
      const taskThree = Task.sleep(30).flatMap(() => Result.Err(new Error()));

      const tasks = [taskOne, taskTwo, taskThree];
      const task = Task.race(tasks);
      const first = await task.run();

      expectTypeOf(task).toMatchTypeOf<AsyncTask<number, Error>>();

      expect(first.isOk()).toBeTruthy();
      expect(first.unwrap()).toBe(10);
    });
  });

  describe.concurrent("settle", () => {
    it("should settle a list of tasks", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map(
        (x): SyncTask<number, SomeError | OtherError> =>
          x > 2
            ? Task.from(() => Result.Err(new OtherError()))
            : Task.from(
                () => x * 2,
                () => new SomeError()
              )
      );

      const asyncsTasks = tasks.map((task) =>
        task.flatMap(async (x) => Result.Ok(x))
      );

      const task = Task.settle(tasks);
      const asyncTask = Task.settle(asyncsTasks);

      const result = task;

      expectTypeOf(task).toMatchTypeOf<
        SettledResult<number, SomeError | OtherError | TaskAbortedError>[]
      >();
      expectTypeOf(asyncTask).toMatchTypeOf<
        Promise<SettledResult<number, SomeError | OtherError>[]>
      >();
      expect(result).toEqual([
        { type: "Ok", value: 2 },
        { type: "Ok", value: 4 },
        { type: "Err", error: new OtherError() },
        { type: "Err", error: new OtherError() },
      ]);
      expect(await asyncTask).toEqual([
        { type: "Ok", value: 2 },
        { type: "Ok", value: 4 },
        { type: "Err", error: new OtherError() },
        { type: "Err", error: new OtherError() },
      ]);
    });
  });

  describe.concurrent("settlePar", () => {
    it("should settle a list of tasks in parallel", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) =>
        x > 2
          ? Task.from(() => Result.Err(new SomeError()))
          : Task.from(
              () => x * 2,
              () => new OtherError()
            )
      );

      const result = Task.settlePar(tasks);

      expectTypeOf(result).toMatchTypeOf<
        Promise<SettledResult<number, SomeError | OtherError>[]>
      >();

      expect(await result).toEqual([
        { type: "Ok", value: 2 },
        { type: "Ok", value: 4 },
        { type: "Err", error: new SomeError() },
        { type: "Err", error: new SomeError() },
      ]);
    });

    it("should resolve in parallel", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.from(() => x * 2));

      const start = Date.now();
      Task.settlePar(tasks);
      const end = Date.now();

      expect(end - start).toBeLessThan(10);
    });

    it("should maintain the order of the tasks", async () => {
      const taskOne = Task.sleep(20).map(() => 1);
      const taskTwo = Task.sleep(10).map(() => 2);

      const tasks = await Task.settlePar([taskOne, taskTwo]);
      const results = tasks;

      expect(results.length).toBe(2);
      expect(results).toEqual([
        { type: "Ok", value: 1 },
        { type: "Ok", value: 2 },
      ]);
    });

    it("should resolve in parallel with a limit", async () => {
      const values = [10, 10, 10];
      const toTask = (x: number) =>
        Task.from(() => Result.Ok(Date.now())).flatMap((now) =>
          Task.sleep(x).map(() => now)
        );
      const result = await Task.settlePar(values.map(toTask), {
        concurrency: 1,
      });

      // @ts-expect-error
      expect(result[0].value! < result[1].value!).toBeTruthy();
      // @ts-expect-error
      expect(result[1].value! < result[2].value!).toBeTruthy();
    });

    it("should abort if run context is aborted", async () => {
      const abortController = new AbortController();
      const values = [10, 10, 10];
      const fn = vi.fn();
      const toTask = (x: number) => {
        const now = Date.now();
        return Task.from(() => Result.Ok(now)).flatMap((now) =>
          Task.sleep(x)
            .map(() => Date.now() - now)
            .tap((x) => {
              if (x >= 20) {
                abortController.abort();
              }
              fn();
            })
        );
      };

      await Task.settlePar(values.map(toTask), {
        concurrency: 1,
        context: {
          signal: abortController.signal,
        },
      });

      expect(fn).toBeCalledTimes(2);
    });
  });

  describe.concurrent("match", () => {
    it("should correctly match an Async Ok", async () => {
      const task = Task.from(async () => 1);
      const result = await task.match({
        Ok: (value) => value,
        Err: (error) => 0,
      });

      expect(result).toBe(1);
    });

    it("should correctly match an Async Err", async () => {
      const task = Task.from(async () =>
        Result.Err(new Error("An error occurred"))
      );
      const result = await task.match({
        Ok: (value) => value,
        Err: (error) => error,
      });

      expect(result).toEqual(new Error("An error occurred"));
    });

    it("should correctly match on Ok", async () => {
      const task = Task.from(() => 1);
      const result = task.match({
        Ok: (value) => value,
        Err: (error) => 0,
      });
      expect(result).toBe(1);
    });

    it("should correctly match on Err", async () => {
      const task = Task.from(() => Result.Err(new Error("An error occurred")));
      const result = task.match({
        Ok: (value) => value,
        Err: (error) => error,
      });
      expect(result).toEqual(new Error("An error occurred"));
    });
  });

  describe.concurrent("tap", () => {
    it("should correctly tap on Ok", async () => {
      const task = Task.from(() => 1);
      const fn = vi.fn(() => void 0);
      task.tap(fn).run();
      expect(fn).toBeCalledWith(1);
    });

    it("should not call on Err", async () => {
      const task = Task.from(
        () => {
          throw new Error("An error occurred");
        },
        (error) => error
      );
      const fn = vi.fn();
      task.tap(fn);
      expect(fn).not.toBeCalled();
    });
  });

  describe.concurrent("tapErr", () => {
    it("should correctly tap on Err", async () => {
      const task = Task.from(
        () => {
          throw new Error("An error occurred");
        },
        (error) => error
      );
      const fn = vi.fn(() => void 0);
      const map = vi.fn(() => void 0);
      const tap = vi.fn(() => void 0);
      task.tapErr(fn).tapErr(fn).tap(tap).map(map).run();
      expect(fn).toBeCalledWith(new Error("An error occurred"));
      expect(tap).not.toBeCalled();
      expect(map).not.toBeCalled();
    });

    it("should not call on Ok", async () => {
      const task = Task.from(() => 1);
      const fn = vi.fn();
      task.tapErr(fn);
      expect(fn).not.toBeCalled();
    });
  });

  describe.concurrent("schedule", () => {
    it("should retry a task", async () => {
      const fn = vi.fn();
      const task = Task.from(
        () => {
          fn();
          throw new Error("An error occurred");
        },
        (error) => error as Error
      );
      const res = task.schedule({
        retry: 3,
      });

      expectTypeOf(res).toEqualTypeOf<AsyncTask<never, Error>>();

      expect(await res.run()).toEqual(
        Result.Err(new Error("An error occurred"))
      );
      expect(fn).toBeCalledTimes(3);
    });

    it("should not retry a successful task", async () => {
      const fn = vi.fn();
      const task = Task.from(() => {
        fn();
        return 1;
      });
      const res = task.schedule({
        retry: 3,
      });

      expectTypeOf(res).toEqualTypeOf<AsyncTask<number>>();

      expect(await res.run()).toEqual(Result.Ok(1));
      expect(fn).toBeCalledTimes(1);
    });

    it("should allow a custom retry strategy", async () => {
      const fn = vi.fn();
      const task = Task.from(
        () => {
          fn();
          throw new Error("An error occurred");
        },
        (error) => error as Error
      );
      const res = task.schedule({
        retry: () => 3,
      });

      expectTypeOf(res).toEqualTypeOf<
        AsyncTask<never, Error | TaskSchedulingError>
      >();

      expect(await res.run()).toEqual(
        Result.Err(new Error("An error occurred"))
      );
      expect(fn).toBeCalledTimes(3);
    });

    it("should allow for the custom retry strategy to return a boolean", async () => {
      const fn = vi.fn();
      const task = Task.from(
        () => {
          fn();
          throw new Error("An error occurred");
        },
        (error) => error as Error
      );
      let times = 0;
      const res = task.schedule({
        retry: () => {
          times++;
          return times < 3;
        },
      });

      expectTypeOf(res).toEqualTypeOf<
        AsyncTask<never, Error | TaskSchedulingError>
      >();

      expect(await res.run()).toEqual(
        Result.Err(new Error("An error occurred"))
      );
      expect(fn).toBeCalledTimes(3);
    });

    it("should allow for the custom retry strategy to return a promise of boolean or number", async () => {
      const fn = vi.fn();
      const task = Task.from(
        () => {
          fn();
          throw new Error("An error occurred");
        },
        (error) => error as Error
      );
      let times = 0;
      const res = task.schedule({
        retry: async () => {
          times++;
          return times < 3 ? true : false;
        },
      });

      expectTypeOf(res).toEqualTypeOf<
        AsyncTask<never, Error | TaskSchedulingError>
      >();

      expect(await res.run()).toEqual(
        Result.Err(new Error("An error occurred"))
      );
      expect(fn).toBeCalledTimes(3);
    });

    it("should timeout a slow task", async () => {
      const fn = vi.fn();
      const task = Task.from(fn).flatMap(() => Task.sleep(100));
      const res = await task
        .schedule({
          timeout: 10,
        })
        .run();
      expect(fn).toBeCalledTimes(1);
      expect(res).toEqual(Result.Err(new TaskTimeoutError()));
    });

    it("should not timeout a task when the task is succeeds before timeout", async () => {
      const fn = vi.fn();
      const now = Date.now();
      const task = Task.from(() => {
        fn();
        return Date.now();
      });
      const res = await task
        .schedule({
          timeout: 10,
        })
        .run();
      expect(fn).toBeCalledTimes(1);
      const value = res.unwrap();
      expect(value).toBeGreaterThanOrEqual(now);
    });

    it("should delay a task", async () => {
      const fn = vi.fn();
      const now = Date.now();
      const task = Task.from(() => {
        fn();
        return Date.now();
      });
      const res = await task
        .schedule({
          delay: 11,
        })
        .run();
      expect(fn).toBeCalledTimes(1);
      const value = res.unwrap();
      expect(value).toBeGreaterThanOrEqual(now + 10);
    });

    it("should delay a task with a custom delay", async () => {
      const fn = vi.fn();
      const now = Date.now();
      const task = Task.from(() => {
        fn();
        return Date.now();
      });
      const res = await task.schedule({ delay: () => 11 }).run();
      expect(fn).toBeCalledTimes(1);
      const value = res.unwrap();
      expect(value).toBeGreaterThanOrEqual(now + 10);
    });

    it("should delay a task with a custom delay that returns a promise", async () => {
      const fn = vi.fn();
      const now = Date.now();
      const task = Task.from(() => {
        fn();
        return Date.now();
      });
      const res = await task.schedule({ delay: async () => 11 }).run();
      expect(fn).toBeCalledTimes(1);
      const value = res.unwrap();
      expect(value).toBeGreaterThanOrEqual(now + 10);
    });

    it("should allow for an exponential backoff by combining retry and delay", async () => {
      const fn = vi.fn();
      const task = Task.from(
        () => {
          fn();
          throw new Error("An error occurred");
        },
        (error) => error as Error
      );
      const delays: number[] = [];
      const res = await task
        .schedule({
          delay: (i) => {
            const delay = 5 * i;
            delays.push(delay);
            return delay;
          },
          retry: 3,
        })
        .run();
      expect(fn).toBeCalledTimes(3);
      expect(delays).toEqual([0, 5, 10]);
      expect(res).toEqual(Result.Err(new Error("An error occurred")));
    });

    it("should repeat a task", async () => {
      const fn = vi.fn();
      const task = Task.from(() => {
        fn();
        return 1;
      });
      const res = await task
        .schedule({
          repeat: 3,
        })
        .run();
      expect(fn).toBeCalledTimes(4);
      expect(res).toEqual(Result.Ok(1));
    });

    it("should not repeat a task if the task fails", async () => {
      const fn = vi.fn();
      const task = Task.from(
        () => {
          fn();
          throw new Error("An error occurred");
        },
        (error) => error as Error
      );
      const res = await task
        .schedule({
          repeat: 3,
        })
        .run();
      expect(fn).toBeCalledTimes(1);
      expect(res).toEqual(Result.Err(new Error("An error occurred")));
    });

    it("should allow for a custom repeat strategy", async () => {
      const fn = vi.fn();
      const task = Task.from(() => {
        fn();
        return 1;
      });
      const res = await task
        .schedule({
          repeat: (invocations, val) => val,
        })
        .run();
      expect(fn).toBeCalledTimes(2);
      expect(res).toEqual(Result.Ok(1));
    });

    it("should allow for a custom repeat strategy that returns a promise", async () => {
      const fn = vi.fn();
      const task = Task.from(() => {
        fn();
        return 1;
      });
      const res = await task
        .schedule({
          repeat: async (invocations, val) => val,
        })
        .run();
      expect(fn).toBeCalledTimes(2);
      expect(res).toEqual(Result.Ok(1));
    });

    it("should allow for a custom retry strategy that returns a boolean", async () => {
      const fn = vi.fn();
      let errors = 0;
      const task = Task.from(
        () => {
          fn();
          if (errors++ < 2) {
            throw new Error("An error occurred");
          }
          return 1;
        },
        (error) => error as Error
      );
      const res = await task
        .schedule({
          retry: (i) => i < 3,
        })
        .run();
      expect(fn).toBeCalledTimes(3);
      expect(res).toEqual(Result.Ok(1));
    });

    it("should allow for a custom retry strategy that returns a promise of boolean", async () => {
      const fn = vi.fn();
      let errors = 0;
      const task = Task.from(
        () => {
          fn();
          if (errors++ < 2) {
            throw new Error("An error occurred");
          }
          return 1;
        },
        (error) => error as Error
      );
      const res = await task
        .schedule({
          retry: async (i) => i < 3,
        })
        .run();
      expect(fn).toBeCalledTimes(3);
      expect(res).toEqual(Result.Ok(1));
    });

    it("should allow for a mix of strategies", async () => {
      const fn = vi.fn();
      let errors = 0;
      const task = Task.from(
        () => {
          fn();
          if (errors++ < 2) {
            throw new Error("An error occurred");
          }
          return 1;
        },
        (error) => error as Error
      );
      const delays: number[][] = [];
      const repeatInvocations: number[] = [];
      const retryInvocations: number[] = [];

      const res = await task
        .schedule({
          timeout: 10,
          delay: (retries, repeats) => {
            delays.push([retries, repeats]);
            return 5;
          },
          repeat: (i) => {
            repeatInvocations.push(i);
            return 3;
          },
          retry: (i) => {
            retryInvocations.push(i);
            return 3;
          },
        })
        .run();
      expect(fn).toBeCalledTimes(6);
      expect(delays).toEqual([
        [0, 0],
        [1, 0],
        [2, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ]);
      expect(repeatInvocations).toEqual([0, 1, 2, 3]);
      expect(retryInvocations).toEqual([0, 1]);
      expect(res).toEqual(Result.Ok(1));
    });

    it("should handle any errors thrown by the strategies", async () => {
      const task = Task.from(() => 1);
      const res1 = await Task.from(() => Result.Err(1))
        .schedule({
          retry: () => {
            throw new Error("An error occurred");
            // @ts-expect-error
            return 1;
          },
        })
        .run();
      const res2 = await task
        .schedule({
          repeat: () => {
            throw new Error("An error occurred");
            // @ts-expect-error
            return 1;
          },
        })
        .run();
      const res3 = await task
        .schedule({
          delay: () => {
            throw new Error("An error occurred");
            // @ts-expect-error
            return 1;
          },
        })
        .run();
      expect(res1).toEqual(Result.Err(new TaskSchedulingError()));
      expect(res2).toEqual(Result.Err(new TaskSchedulingError()));
      expect(res3).toEqual(Result.Err(new TaskSchedulingError()));
    });

    it("should handle any errors returned by the strategies", async () => {
      const task = Task.from(() => 1);
      const res1 = await Task.from(() => Result.Err(1))
        .schedule({
          retry: () => {
            return Result.Err(1);
          },
        })
        .run();
      const res2 = await task
        .schedule({
          repeat: () => {
            return Result.Err(1);
          },
        })
        .run();
      const res3 = await task
        .schedule({
          delay: () => {
            return Result.Err(1);
          },
        })
        .run();
      expect(res1).toEqual(Result.Err(new TaskSchedulingError()));
      expect(res2).toEqual(Result.Err(new TaskSchedulingError()));
      expect(res3).toEqual(Result.Err(new TaskSchedulingError()));
    });
  });

  describe("unwrap", () => {
    it("should unwrap a Ok task", async () => {
      const task = Task.from(() => 1);
      const asyncTask = Task.from(() => Promise.resolve(1));
      const res = task.unwrap();
      const asyncRes = asyncTask.unwrap();
      expect(res).toEqual(1);
      expect(asyncRes).toBeInstanceOf(Promise);
      expect(await asyncRes).toEqual(1);
    });

    it("should throw an error if the task is an an async Err", async () => {
      const task = Task.from(() => Result.Err(1)).recover(async (e) =>
        Result.Err(e)
      );
      expect(task.unwrap()).rejects.toThrowError();
    });

    it("should throw an error if the task is a sync Err", async () => {
      const task = Task.from(() => Result.Err(1));
      expect(() => task.unwrap()).toThrow();
    });
  });

  describe("unwrapOr", () => {
    it("should unwrap a Ok task", async () => {
      const task = Task.from(() => 1);
      const asyncTask = Task.from(() => Promise.resolve(1));
      const res = task.unwrapOr(2);
      const asyncRes = asyncTask.unwrapOr(2);
      expect(res).toEqual(1);
      expect(asyncRes).toBeInstanceOf(Promise);
      expect(await asyncRes).toEqual(1);
    });

    it("should return the default value if the task is an Err", async () => {
      const task = Task.from(() => Result.Err(1));
      const asyncTask = task.mapErr((e) => e);
      const res = task.unwrapOr(2);
      const asyncRes = asyncTask.unwrapOr(2);
      expect(res).toEqual(2);
      expect(asyncRes).not.toBeInstanceOf(Promise);
      expect(asyncRes).toEqual(2);
    });

    it("should accept a function as the default value", async () => {
      const task = Task.from(() => Result.Err(1));
      const res = task.unwrapOr(() => 2);
      expect(res).toEqual(2);
    });
  });

  describe("unwrapErr", () => {
    it("should unwrap a Err task", async () => {
      const task = Task.from(() => Result.Err(1));
      const res = task.unwrapErr();
      expect(res).toEqual(1);
    });

    it("should throw an error if the task is an async Ok", async () => {
      const task = Task.from(() => Promise.resolve(1));
      expect(task.unwrapErr()).rejects.toThrowError();
    });

    it("should throw an error if the task is an sync Ok", async () => {
      const task = Task.from(() => 1);
      expect(() => task.unwrapErr()).toThrow();
    });
  });

  describe("TaskAbort", () => {
    it("should abort a task", async () => {
      const controller = new AbortController();
      const task = Task.sleep(100);
      controller.abort();
      const res = await task.run({ signal: controller.signal });
      expect(res).toEqual(Result.Err(new TaskAbortedError()));
    });

    it("should abort collection methods", async () => {
      const controller = new AbortController();
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const task = Task.sequential([
        Task.sleep(100).map(() => fn1()),
        Task.from(() => {
          throw new Error("An error occurred");
        }).map(() => fn2()),
      ]);
      controller.abort();
      const res = await task.run({ signal: controller.signal });
      expect(fn1).not.toBeCalled();
      expect(fn2).not.toBeCalled();
      expect(res).toEqual(Result.Err(new TaskAbortedError()));
    });

    it("should abort parallel methods", async () => {
      const controller = new AbortController();
      const task = Task.parallel([
        Task.sleep(150),
        Task.sleep(100).flatMap(() => Result.Err(new Error())),
        Task.sleep(50),
      ]);
      const task2 = Task.coalescePar([
        Task.sleep(150),
        Task.sleep(100).flatMap(() => Result.Err(new Error())),
        Task.sleep(50),
      ]);
      controller.abort();
      const res = await task.run({
        signal: controller.signal,
      });
      const res2 = await task2.run({
        signal: controller.signal,
      });
      expectTypeOf(res).toEqualTypeOf<
        Result<[void, never, void], TaskAbortedError | Error>
      >();
      expectTypeOf(res2).toEqualTypeOf<
        Result<
          [void, never, void],
          TaskAbortedError | InvalidConcurrencyError | Error[]
        >
      >();

      expect(res).toEqual(Result.Err(new TaskAbortedError()));
      expect(res2).toEqual(Result.Err(new TaskAbortedError()));
    });

    it("should abort part way through a parallel collection method", async () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      const tasks1 = [
        Task.sleep(10),
        Task.sleep(20).tap(() => controller1.abort()),
        Task.sleep(40),
        Task.sleep(50),
      ];
      const tasks2 = [
        Task.sleep(10),
        Task.sleep(20).tap(() => controller2.abort()),
        Task.sleep(40),
        Task.sleep(50),
      ];

      const task = Task.coalescePar(tasks1);
      const settledResults = await Task.settlePar(tasks2, {
        context: { signal: controller2.signal },
      });

      const res = await task.run({ signal: controller1.signal });
      expectTypeOf(res).toEqualTypeOf<
        Result<void[], TaskAbortedError | InvalidConcurrencyError | never[]>
      >();
      expectTypeOf(settledResults).toEqualTypeOf<
        SettledResult<SettledResult<void, never>[], TaskAbortedError>
      >();

      expect(res).toEqual(Result.Err(new TaskAbortedError()));
      expect(settledResults).toEqual(
        Result.Err(new TaskAbortedError()).settle()
      );
    });
  });

  it("should be able to rerun itself infinitely", async () => {
    const fn = vi.fn();
    const task = Task.from(async () => {
      fn();
      return 1;
    });
    const tasks = Array.from({ length: 10 }, () => task);
    const res = await Task.parallel(tasks).run();
    expect(fn).toBeCalledTimes(10);
    expect(res).toEqual(Result.Ok([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]));
  });

  it("should be reusable", async () => {
    const task = Task.sleep(100).flatMap(() =>
      Task.from(async () => Date.now())
    );

    const res = task.run();
    expect(res).toBeInstanceOf(Promise);
    let x = await res;
    let y = await res;
    let z = await task.run();
    expect(task.run()).toBeInstanceOf(Promise);
    expect(x.unwrap()).toEqual(y.unwrap());
    expect(x.unwrap()).not.toEqual(z.unwrap());
  });
});
