import { Option } from "./option";
import { Result } from "./result";
import { Task } from "./task";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Monad Laws
// 1. Left Identity: M.of(a).flatMap(f) == f(a)
// 2. Right Identity: m.flatMap(M.of) == m
// 3. Associativity: m.flatMap(f).flatMap(g) == m.flatMap((x) => f(x).flatMap(g))

describe("Task", () => {
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
    const f = (x: number) => Task.of(x * 2);

    const task1 = Task.of(a).flatMap(f);
    const task2 = f(a);

    await compareTaskResults(task1, task2);
  });

  it("should satisfy the Right Identity law", async () => {
    const a = 42;
    const m = Task.of(a);

    const task1 = m.flatMap(Task.of);
    const task2 = m;

    await compareTaskResults(task1, task2);
  });

  it("should satisfy the Associativity law", async () => {
    const a = 42;
    const m = Task.of(a);
    const f = (x: number) => Task.of(x * 2);
    const g = (x: number) => Task.of(x + 1);

    const task1 = m.flatMap(f).flatMap(g);
    const task2 = m.flatMap((b) => f(b).flatMap(g));

    await compareTaskResults(task1, task2);
  });

  it("should correctly construct Task.of", async () => {
    const value = 42;
    const task = Task.of(value);
    const result = await task.run();
    expect(result.isOk()).toBeTruthy();
    expect(result.unwrap()).toEqual(value);
  });

  it("should correctly construct Task.fromPromise", async () => {
    const value = 42;
    const task = Task.fromPromise(() => Promise.resolve(value));
    const result = await task.run();
    expect(result.isOk()).toBeTruthy();
    expect(result.unwrap()).toEqual(value);
  });

  it("should correctly construct Task.fromResult", async () => {
    const value = 42;
    const result = Result.Ok(value);
    const task = Task.fromResult(result);
    const taskResult = await task.run();
    expect(taskResult.isOk()).toBeTruthy();
    expect(taskResult.unwrap()).toEqual(value);
  });

  it("should correctly construct Task.fromOption", async () => {
    const value = 42;
    const error = new Error("An error occurred");
    const option = Option.Some(value);
    const task = Task.fromOption(error, option);
    const result = await task.run();
    expect(result.isOk()).toBeTruthy();
    expect(result.unwrap()).toEqual(value);
  });

  it("should correctly map a function over Task", async () => {
    const value = 42;
    const f = (x: number) => x * 2;
    const task = Task.of(value);
    const mappedTask = task.map(f);
    const result = await mappedTask.run();
    expect(result.isOk()).toBeTruthy();
    expect(result.unwrap()).toEqual(f(value));
  });

  it("should correctly flatMap a function over Task", async () => {
    const value = 42;
    const f = (x: number) => Task.of(x * 2);
    const task = Task.of(value);
    const flatMappedTask = task.flatMap(f);
    const result = await flatMappedTask.run();
    expect(result.isOk()).toBeTruthy();
    expect(result.unwrap()).toEqual((await f(value)).unwrap());
  });

  it("should handle Task rejection in Task.fromPromise", async () => {
    const error = new Error("An error occurred");
    const task = Task.fromPromise(() => Promise.reject(error));
    const result = await task.run();
    expect(result.isErr()).toBeTruthy();
  });

  it("should handle None in Task.fromOption", async () => {
    const error = new Error("An error occurred");
    const option = Option.None();
    const task = Task.fromOption(error, option);
    const result = await task.run();
    expect(result.isErr()).toBeTruthy();
  });

  describe("traverse", () => {
    it("should correctly traverse an array of values", async () => {
      const values = [1, 2, 3, 4];
      const f = (x: number) => Task.of(x * 2);
      const expectedResult = values.map((x) => x * 2);

      const traversedTask = Task.traverse(values, f);
      const result = await traversedTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should handle errors", async () => {
      const values = [1, 2, 3, 4];
      const error = new Error("An error occurred");
      const f = (x: number) => (x === 3 ? Task.reject(error) : Task.of(x * 2));

      const traversedTask = Task.traverse(values, f);
      const result = await traversedTask.run();

      expect(result.isErr()).toBeTruthy();
    });
  });

  describe("sequence", () => {
    it("should correctly sequence an array of Tasks", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.of(x * 2));
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
        x === 3 ? Task.reject(error) : Task.of(x * 2)
      );

      const sequenceTask = Task.sequence(tasks);
      const result = await sequenceTask.run();

      expect(result.isErr()).toBeTruthy();
    });
  });

  describe("any", () => {
    it("should correctly return the first Ok result", async () => {
      const tasks = [
        Task.reject<Error>(new Error("An error occurred")),
        Task.of<Error, number>(42),
        Task.of<Error, string>('24'),
      ];
      const result = await Task.any(tasks);
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(42);
    });

    it("should correctly return the first Err result", async () => {
      const tasks = [
        Task.reject(new Error("An error occurred")),
        Task.reject(new Error("Another error occurred")),
      ];
      const result = await Task.any(tasks);
      expect(result.isErr()).toBeTruthy();
    });
  });

  describe("every", () => {
    it("should correctly return an array of Ok results", async () => {
      const tasks = [Task.resolve(42), Task.resolve(24)];
      const result = await Task.every(tasks).run();
      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual([42, 24]);
    });

    it("should correctly return the first Err result", async () => {
      const tasks = [
        Task.of(42),
        Task.reject(new Error("An error occurred")),
        Task.of(24),
      ];
      const result = await Task.every(tasks).run();
      expect(result.isErr()).toBeTruthy();
    });
  });

  describe("tryCatch", () => {
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

  describe("parallel", () => {
    it("should correctly return an array of Ok results", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.of(x * 2));
      const expectedResult = values.map((x) => x * 2);

      const parallelTask = Task.parallel(tasks);
      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should handle errors", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) =>
        x === 3 ? Task.reject(new Error("An error occurred")) : Task.of(x * 2)
      );

      const parallelTask = Task.parallel(tasks);
      const result = await parallelTask.run();

      expect(result.isErr()).toBeTruthy();
    });

    it("should resolve in parallel", async () => {
      const taskOne = Task.of(async () => {
        await sleep(100);
        return Date.now();
      });
      const taskTwo = Task.of(async () => {
        await sleep(100);
        return Date.now();
      });

      const parallelTask = Task.parallel([taskOne, taskTwo]);
      const result = await parallelTask.run();

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()[0]).toBeLessThanOrEqual(result.unwrap()[1]);
    });
  });

  describe("sequential", () => {
    it("should correctly return an array of Ok results", async () => {
      const values = [1, 2, 3, 4];
      const tasks = values.map((x) => Task.of(x * 2));
      const expectedResult = values.map((x) => x * 2);

      const sequentialTask = Task.sequential(tasks);
      const result = await sequentialTask;

      expect(result.isOk()).toBeTruthy();
      expect(result.unwrap()).toEqual(expectedResult);
    });

    it("should resolve sequentially", async () => {
      const taskOne = Task.of(async () => {
        await sleep(10);
        return Date.now();
      });
      const taskTwo = Task.of(async () => {
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

  describe("collect", () => {
    it("should resolve sequentially", async () => {
      const taskOne = Task.of(async () => {
        await sleep(10);
        return Date.now();
      });
      const taskTwo = Task.of(async () => {
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
        x === 3 ? Task.reject(new Error("An error occurred")) : Task.of(x * 2)
      );

      const result = await Task.collect(tasks);

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr().length).toBe(1);
    });
  });

  describe("collectParallel", () => {
    it("should resolve in parallel", async () => {
      const taskOne = Task.of(async () => {
        await sleep(100);
        return Date.now();
      });
      const taskTwo = Task.of(async () => {
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
        x < 3 ? Task.reject("An error occurred") : Task.of(x * 2)
      );

      const result = await Task.collectParallel(tasks);

      expect(result.isErr()).toBeTruthy();
      expect(result.unwrapErr()).toEqual([
        "An error occurred",
        "An error occurred",
      ]);
    });
  });
  describe("race", () => {
    it("should correctly return the first settled result", async () => {
      const taskOne = Task.of(async () => {
        await sleep(10);
        return 10;
      });

      const taskTwo = Task.of(async () => {
        await sleep(20);
        return 20;
      });

      const taskThree = Task.of(async () => {
        await sleep(30);
        return Promise.reject(new Error("An error occurred"));
      });

      const tasks = [taskOne, taskTwo, taskThree];

      const first = await Task.race(tasks).run();
      expect(first.isOk()).toBeTruthy();
      expect(first.unwrap()).toBe(10);
    });
  });

  describe("match", () => {
    it("should correctly match on Ok", async () => {
      const task = Task.of<string, number>(1);
      const result = await task.match({
        Ok: (value) => value,
        Err: (error) => error,
      });
      expect(result).toBe(1);
    });

    it("should correctly match on Err", async () => {
      const task = Task.reject(new Error("An error occurred"));
      const result = await task.match({
        Ok: (value) => value,
        Err: (error) => error,
      });
      expect(result).toEqual(new Error("An error occurred"));
    });
  });
});
