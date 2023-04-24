import { Option } from "./option";
import { Result } from "./result";
import { Task } from "./task";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Monad Laws
// 1. Left Identity: M.from(a).flatMap(f) == f(a)
// 2. Right Identity: m.flatMap(M.from) == m
// 3. Associativity: m.flatMap(f).flatMap(g) == m.flatMap((x) => f(x).flatMap(g))

describe.concurrent("Task", () => {
  // Helper function to compare Task results
  const compareTaskResults = async (
    task1: Task<any, any>,
    task2: Task<any, any>
  ) => {
    const res1 = await task1.run();
    const res2 = await task2.run();

    expect(res1).toEqual(res2);
  };

  it("should satisfy the Left Identity law", async () => {
    const a = 42;
    const f = (x: number) => Task.from(x * 2);

    const task1 = Task.from(a).flatMap(f);
    const task2 = f(a);

    await compareTaskResults(task1, task2);
  });

  it("should satisfy the Right Identity law", async () => {
    const a = 42;
    const m = Task.from(a);

    const task1 = m.flatMap(Task.from);
    const task2 = m;

    await compareTaskResults(task1, task2);
  });

  it("should satisfy the Associativity law", async () => {
    const a = 42;
    const m = Task.from(a);
    const f = (x: number) => Task.from(x * 2);
    const g = (x: number) => Task.from(x + 1);

    const task1 = m.flatMap(f).flatMap(g);
    const task2 = m.flatMap((b) => f(b).flatMap(g));

    await compareTaskResults(task1, task2);
  });

  describe.concurrent("from", () => {
    it("should correctly construct from a value", async () => {
      const value = 42;
      const task = Task.from(value);
      const result = await task.run();
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
      const task = Task.from(result);
      const taskResult = await task.run();
      expect(taskResult.isOk()).toBeTruthy();
      expect(taskResult.unwrap()).toEqual(value);
    });

    it("should correctly construct from an option", async () => {
      const value = 42;
      const error = new Error("An error occurred");
      const option = Option.Some(value);
      const task = Task.from(option, () => error);
      const result = await task.run();
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(value);
    });
  });

  it("should correctly map a function over Task", async () => {
    const value = 42;
    const f = (x: number) => x * 2;
    const task = Task.from(value);
    const mappedTask = task.map(f);
    const result = await mappedTask.run();
    expect(result.isOk()).toBeTruthy();
    expect(result.unwrap()).toEqual(f(value));
  });

  it("should correctly flatMap a function over Task", async () => {
    const value = 42;
    const f = (x: number) => Task.from(x * 2);
    const task = Task.from(value);
    const flatMappedTask = task.flatMap(f);
    const result = await flatMappedTask.run();
    expect(result.isOk()).toBeTruthy();
    expect(result.unwrap()).toEqual((await f(value)).unwrap());
  });

  it("should correctly mapErr a function over Task", async () => {
    const error = new Error("An error occurred");
    const f = (e: Error) => new Error(e.message.toUpperCase());
    const task = Task.Err(error);
    const mappedErrTask = task.mapErr(f);
    const result = await mappedErrTask.run();
    expect(result.isErr()).toBeTruthy();
    expect(result.unwrapErr()).toEqual(f(error));
  });

  describe.concurrent("traverse", () => {
    it("should correctly traverse an array of values", async () => {
      const values = [1, 2, 3, 4];
      const f = (x: number) => Task.from(x * 2);
      const expectedResult = values.map((x) => x * 2);

      const traversedTask = Task.traverse(values, f);
      const result = await traversedTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should correctly traverse a record of values", async () => {
      const values = { a: 1, b: 2, c: 3, d: 4 };
      const f = (x: number) => Task.from(x * 2);
      const expectedResult = { a: 2, b: 4, c: 6, d: 8 };

      const traversedTask = Task.traverse(values, f);
      const result = await traversedTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should handle errors", async () => {
      const values = [1, 2, 3, 4];
      const error = new Error("An error occurred");
      const f = (x: number) => (x === 3 ? Task.Err(error) : Task.from(x * 2));

      const traversedTask = Task.traverse(values, f);
      const result = await traversedTask.run();

      expect(result.isErr()).toBeTruthy();
    });
  });

  describe.concurrent("traversePar", () => {
    it("should correctly traverse an array of values", async () => {
      const values = [1, 2, 3, 4];
      const f = (x: number) => Task.from(x * 2);
      const expectedResult = values.map((x) => x * 2);

      const traversedTask = Task.traversePar(values, f);
      const result = await traversedTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should correctly traverse a record of values", async () => {
      const values = { a: 1, b: 2, c: 3, d: 4 };
      const f = (x: number) => Task.from(x * 2);
      const expectedResult = { a: 2, b: 4, c: 6, d: 8 };

      const traversedTask = Task.traversePar(values, f);
      const result = await traversedTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should handle errors", async () => {
      const values = [1, 2, 3, 4];
      const error = new Error("An error occurred");
      const f = (x: number) => (x === 3 ? Task.Err(error) : Task.from(x * 2));

      const traversedTask = Task.traversePar(values, f);
      const result = await traversedTask.run();

      expect(result.isErr()).toBeTruthy();
    });

    it("should traverse in parallel", async () => {
      const values = [100, 100];
      const toTask = (x: number) =>
        Task.from(async () => {
          await sleep(x);
          return Date.now();
        });

      const parallelTask = Task.traversePar(values, toTask);
      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()[0]).toBeLessThanOrEqual(result.unwrap()[1]);
    });

    it("should traverse in parallel with a limit", async () => {
      const values = [100, 100, 100, 100, 100, 100];
      const toTask = (x: number) =>
        Task.from(async () => {
          await sleep(x);
          return Date.now();
        });

      const parallelTask = Task.traversePar(values, toTask, 2);
      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()[0]).toBeLessThanOrEqual(result.unwrap()[1]);
      expect(result.unwrap()[2]).toBeLessThanOrEqual(result.unwrap()[3]);
      expect(result.unwrap()[4]).toBeLessThanOrEqual(result.unwrap()[5]);
    });
  });

  describe.concurrent("any", () => {
    it("should correctly return the first Ok result", async () => {
      const tasks = [
        Task.Err<Error, number>(new Error("An error occurred")),
        Task.from<Error, number>(42),
        Task.from<Error, string>("24"),
      ];
      const result = await Task.any(tasks);
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(42);
    });

    it("should correctly return the first Err result", async () => {
      const tasks = [
        Task.Err(new Error("An error occurred")),
        Task.Err(new Error("Another error occurred")),
      ];
      const result = await Task.any(tasks);
      expect(result.isErr()).toBeTruthy();
    });

    it("should correctly return first Ok result in a record", async () => {
      const tasks = {
        a: Task.Err<Error, number>(new Error("An error occurred")),
        b: Task.from<Error, number>(42),
        c: Task.from<Error, string>("24"),
      };
      const result = await Task.any(tasks);
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(42);
    });
  });

  describe.concurrent("tryCatch", () => {
    it("should correctly return an Ok result", async () => {
      const value = 42;
      const task = Task.tryCatch(
        () => value,
        (e) => e as Error
      );
      const result = await task.run();
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(value);
    });

    it("should correctly return an Err result", async () => {
      const error = new Error("An error occurred");
      const task = Task.tryCatch<Error, number>(
        () => {
          throw error;
        },
        (e) => e as Error
      );
      const result = await task.run();
      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr()).toEqual(error);
    });
  });

  describe.concurrent("parallel", () => {
    it("should correctly return an array of Ok results", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.from(x * 2));
      const expectedResult = values.map((x) => x * 2);

      const parallelTask = Task.parallel(tasks);
      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should correctly handle a record of Ok results", async () => {
      const values = { a: 1, b: 2, c: 3, d: 4 };
      const tasks = {
        a: Task.from(values.a * 2),
        b: Task.from(values.b * 2),
        c: Task.from(values.c * 2),
        d: Task.from(values.d * 2),
      };
      const expectedResult = {
        a: values.a * 2,
        b: values.b * 2,
        c: values.c * 2,
        d: values.d * 2,
      };

      const parallelTask = Task.parallel(tasks);
      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should handle errors", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) =>
        x === 3 ? Task.Err(new Error("An error occurred")) : Task.from(x * 2)
      );

      const parallelTask = Task.parallel(tasks);
      const result = await parallelTask.run();

      expect(result.isErr()).toBeTruthy();
    });

    it("should resolve in parallel", async () => {
      const taskOne = Task.from(async () => {
        await sleep(100);
        return Date.now();
      });
      const taskTwo = Task.from(async () => {
        await sleep(100);
        return Date.now();
      });

      const parallelTask = Task.parallel([taskOne, taskTwo]);
      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()[0]).toBeLessThanOrEqual(result.unwrap()[1]);
    });

    it("should resolve in parallel with a limit", async () => {
      const taskOne = Task.from(async () => {
        await sleep(100);
        return Date.now();
      });
      const taskTwo = Task.from(async () => {
        await sleep(100);
        return Date.now();
      });

      const parallelTask = Task.parallel([taskOne, taskTwo], 1);
      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()[0]).toBeLessThan(result.unwrap()[1]);
    });

    it("should throw an error if the limit is less than 1", () => {
      expect(() => Task.parallel([], 0)).toThrow();
    });
  });

  describe.concurrent("sequential", () => {
    it("should correctly return an array of Ok results", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.from(x * 2));
      const expectedResult = values.map((x) => x * 2);

      const sequentialTask = Task.sequential(tasks);
      const result = await sequentialTask;

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should correctly handle a record of Ok results", async () => {
      const values = { a: 1, b: 2, c: 3, d: 4 };
      const tasks = {
        a: Task.from(values.a * 2),
        b: Task.from(values.b * 2),
        c: Task.from(values.c * 2),
        d: Task.from(values.d * 2),
      };
      const expectedResult = {
        a: values.a * 2,
        b: values.b * 2,
        c: values.c * 2,
        d: values.d * 2,
      };

      const parallelTask = Task.sequential(tasks);
      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should return the first error", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) =>
        x === 3
          ? Task.Err(new Error("An error occurred: " + x))
          : Task.from(x * 2)
      );

      const sequentialTask = Task.sequential(tasks);
      const result = await sequentialTask;

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr()).toEqual(new Error("An error occurred: 3"));
    });

    it("should resolve sequentially", async () => {
      const taskOne = Task.from(async () => {
        await sleep(10);
        return Date.now();
      });
      const taskTwo = Task.from(async () => {
        await sleep(10);
        return Date.now();
      }).map(async () => {
        await sleep(10);
        return Date.now();
      });

      const timestamps = await Task.sequential([taskOne, taskTwo]).run();
      const timestampsUnwrapped = timestamps.unwrap();

      expect(timestampsUnwrapped.length).toBe(2);
      expect(
        timestampsUnwrapped[1] - timestampsUnwrapped[0]
      ).toBeGreaterThanOrEqual(20);
    });
  });

  describe.concurrent("coalesce", () => {
    it("should resolve sequentially", async () => {
      const taskOne = Task.from(async () => {
        await sleep(10);
        return Date.now();
      });
      const taskTwo = Task.from(async () => {
        await sleep(10);
        return Date.now();
      }).map(async () => {
        await sleep(10);
        return Date.now();
      });

      const timestamps = await Task.coalesce([taskOne, taskTwo]).run();
      const timestampsUnwrapped = timestamps.unwrap();

      expect(timestampsUnwrapped.length).toBe(2);
      expect(
        timestampsUnwrapped[1] - timestampsUnwrapped[0]
      ).toBeGreaterThanOrEqual(20);
    });

    it("should accumulate errors", async () => {
      const values = [1, 2, 3, 4];
      const tasks: Task<Error, number>[] = values.map((x) =>
        x > 2 ? Task.Err(new Error("An error occurred")) : Task.from(x * 2)
      );

      const result = await Task.coalesce(tasks);

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr().length).toBe(2);
    });

    it("should accumulate errors when provided a record", async () => {
      const values = { a: 1, b: 2, c: 3, d: 4 };
      const tasks = {
        a: Task.from(values.a * 2),
        b: Task.from(values.b * 2),
        c: Task.Err(new Error("An error occurred")),
        d: Task.Err(new Error("Another error occurred")),
      };

      const result = await Task.coalesce(tasks);

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr()).toEqual({
        c: new Error("An error occurred"),
        d: new Error("Another error occurred"),
      });
    });

    it("should resolve a list of Ok results", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.from(x * 2));
      const expectedResult = values.map((x) => x * 2);

      const result = await Task.coalesce(tasks);

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should resolve a record of Ok results", async () => {
      const values = { a: 1, b: 2, c: 3, d: 4 };
      const tasks = {
        a: Task.from(values.a * 2),
        b: Task.from(values.b * 2),
        c: Task.from(values.c * 2),
        d: Task.from(values.d * 2),
      };
      const expectedResult = {
        a: values.a * 2,
        b: values.b * 2,
        c: values.c * 2,
        d: values.d * 2,
      };

      const result = await Task.coalesce(tasks);

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });
  });

  describe.concurrent("coalesceParallel", () => {
    it("should resolve in parallel", async () => {
      const taskOne = Task.from(async () => {
        await sleep(100);
        return Date.now();
      });
      const taskTwo = Task.from(async () => {
        await sleep(100);
        return Date.now();
      });

      const parallelTask = Task.coalescePar([taskOne, taskTwo]);
      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()[0]).toBeLessThanOrEqual(result.unwrap()[1]);
    });

    it("should accumulate errors", async () => {
      const values = [1, 2, 3, 4];
      const tasks: Task<string, number>[] = values.map((x) =>
        x < 3 ? Task.Err("An error occurred") : Task.from(x * 2)
      );

      const result = await Task.coalescePar(tasks);

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr()).toEqual([
        "An error occurred",
        "An error occurred",
      ]);
    });

    it("should accumulate errors when provided a record", async () => {
      const values = { a: 1, b: 2, c: 3, d: 4 };
      const tasks = {
        a: Task.from(values.a * 2),
        b: Task.from(values.b * 2),
        c: Task.Err("An error occurred"),
        d: Task.Err("Another error occurred"),
      };

      const result = await Task.coalescePar(tasks);

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr()).toEqual({
        c: "An error occurred",
        d: "Another error occurred",
      });
    });

    it("should throw an error if the limit is less than 1", () => {
      expect(() => Task.coalescePar([], 0)).toThrow();
    });
  });
  describe.concurrent("race", () => {
    it("should correctly return the first settled result", async () => {
      const taskOne = Task.from(async () => {
        await sleep(10);
        return 10;
      });

      const taskTwo = Task.from(async () => {
        await sleep(20);
        return 20;
      });

      const taskThree = Task.from(async () => {
        await sleep(30);
        return Promise.reject(new Error("An error occurred"));
      });

      const tasks = [taskOne, taskTwo, taskThree];

      const first = await Task.race(tasks).run();
      expect(first.isOk()).toBeTruthy();
      expect(first.unwrap()).toBe(10);
    });

    it("should correctly return the first settled result when provided a record", async () => {
      const taskOne = Task.from(async () => {
        await sleep(10);
        return 10;
      });

      const taskTwo = Task.from(async () => {
        await sleep(20);
        return 20;
      });

      const taskThree = Task.from(async () => {
        await sleep(30);
        return Promise.reject(new Error("An error occurred"));
      });

      const first = await Task.race({
        a: taskOne,
        b: taskTwo,
        c: taskThree,
      }).run();
      expect(first.isOk()).toBeTruthy();
      expect(first.unwrap()).toBe(10);
    });
  });

  describe.concurrent("match", () => {
    it("should correctly match on Ok", async () => {
      const task = Task.from<string, number>(1);
      const result = await task.match({
        Ok: (value) => value,
        Err: (error) => 0,
      });
      expect(result).toBe(1);
    });

    it("should correctly match on Err", async () => {
      const task = Task.Err(new Error("An error occurred"));
      const result = await task.match({
        Ok: (value) => value,
        Err: (error) => error,
      });
      expect(result).toEqual(new Error("An error occurred"));
    });
  });

  describe.concurrent("tap", () => {
    it("should correctly tap on Ok", async () => {
      const task = Task.from(1);
      const fn = vi.fn();
      await task.tap(fn);
      expect(fn).toBeCalledWith(1);
    });

    it("should not call on Err", async () => {
      const task = Task.tryCatch(
        () => {
          throw new Error("An error occurred");
        },
        (error) => error
      );
      const fn = vi.fn();
      await task.tap(fn);
      expect(fn).not.toBeCalled();
    });
  });

  describe.concurrent("tapErr", () => {
    it("should correctly tap on Err", async () => {
      const task = Task.tryCatch(
        () => {
          throw new Error("An error occurred");
        },
        (error) => error
      );
      const fn = vi.fn();
      await task.tapErr(fn);
      expect(fn).toBeCalledWith(new Error("An error occurred"));
    });

    it("should not call on Ok", async () => {
      const task = Task.from(1);
      const fn = vi.fn();
      await task.tapErr(fn);
      expect(fn).not.toBeCalled();
    });
  });
});
