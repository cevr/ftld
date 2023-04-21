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

    it("should handle errors", async () => {
      const values = [1, 2, 3, 4];
      const error = new Error("An error occurred");
      const f = (x: number) =>
        x === 3 ? Task.Err(error) : Task.from(x * 2);

      const traversedTask = Task.traverse(values, f);
      const result = await traversedTask.run();

      expect(result.isErr()).toBeTruthy();
    });
  });

  describe.concurrent("sequence", () => {
    it("should correctly sequence an array of Tasks", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.from(x * 2));
      const expectedResult = values.map((x) => x * 2);

      const sequenceTask = Task.sequence(tasks);
      const result = await sequenceTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should handle errors", async () => {
      const values = [1, 2, 3, 4];
      const error = new Error("An error occurred");
      const tasks = values.map((x) =>
        x === 3 ? Task.Err(error) : Task.from(x * 2)
      );

      const sequenceTask = Task.sequence(tasks);
      const result = await sequenceTask.run();

      expect(result.isErr()).toBeTruthy();
    });
  });

  describe.concurrent("sequenceParallel", () => {
    it("should correctly sequence an array of Tasks", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.from(x * 2));
      const expectedResult = values.map((x) => x * 2);

      const sequenceTask = Task.sequenceParallel(tasks);
      const result = await sequenceTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should handle errors", async () => {
      const values = [1, 2, 3, 4];
      const error = new Error("An error occurred");
      const tasks = values.map((x) =>
        x === 3 ? Task.Err(error) : Task.from(x * 2)
      );

      const sequenceTask = Task.sequenceParallel(tasks);
      const result = await sequenceTask.run();

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
  });

  describe.concurrent("every", () => {
    it("should correctly return an array of Ok results", async () => {
      const tasks = [Task.Ok(42), Task.Ok(24)];
      const result = await Task.every(tasks).run();
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual([42, 24]);
    });

    it("should correctly return the first Err result", async () => {
      const tasks = [
        Task.from(42),
        Task.Err(new Error("An error occurred")),
        Task.from(24),
      ];
      const result = await Task.every(tasks).run();
      expect(result.isErr()).toBeTruthy();
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

  describe.concurrent("collect", () => {
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

    it("should accumulate errors", async () => {
      const values = [1, 2, 3, 4];
      const tasks: Task<Error, number>[] = values.map((x) =>
        x === 3 ? Task.Err(new Error("An error occurred")) : Task.from(x * 2)
      );

      const result = await Task.collect(tasks);

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr().length).toBe(1);
    });

    it("should resolve a list of Ok results", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.from(x * 2));
      const expectedResult = values.map((x) => x * 2);

      const result = await Task.collect(tasks);

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });
  });

  describe.concurrent("collectParallel", () => {
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

    it("should accumulate errors", async () => {
      const values = [1, 2, 3, 4];
      const tasks: Task<string, number>[] = values.map((x) =>
        x < 3 ? Task.Err("An error occurred") : Task.from(x * 2)
      );

      const result = await Task.collectParallel(tasks);

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr()).toEqual([
        "An error occurred",
        "An error occurred",
      ]);
    });

    it("should throw an error if the limit is less than 1", () => {
      expect(() => Task.collectParallel([], 0)).toThrow();
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
  });

  describe.concurrent("match", () => {
    it("should correctly match on Ok", async () => {
      const task = Task.from<string, number>(1);
      const result = await task.match({
        Ok: (value) => value,
        Err: (error) => error,
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
    it("should call tap with the result", async () => {
      const task = Task.from(1);
      const tap = vi.fn();
      await task.tap(tap).run();
      expect(tap).toHaveBeenCalledWith(Result.Ok(1));
    });
  });
});
