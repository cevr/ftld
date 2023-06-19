import { Collection } from "./collection";
import { Result } from "./result";
import { None, Option, Some } from "./option";
import { Task, type SyncTask } from "./task";
import { isTask, type UnknownError } from "./utils";

describe.concurrent("Collection", () => {
  describe.concurrent("filter", () => {
    it("should filter an array of primitives", () => {
      const result = Collection.filter([1, 2, 3], (a) => a > 1);
      expect(result).toEqual([2, 3]);
    });

    it("should filter and narrow the type of an array of primitives", () => {
      const result = Collection.filter(
        [1, "2", 3],
        (a): a is string => typeof a === "string"
      );
      expectTypeOf(result).toEqualTypeOf<string[]>();
      expect(result).toEqual(["2"]);
    });

    it("should filter an array of monads", () => {
      const results = Collection.filter(
        [Result.from(() => 1), Result.Err(), Result.from(() => 3)],
        (a) => a > 1
      );
      expectTypeOf(results).toEqualTypeOf<number[]>();
      expect(results).toEqual([3]);
      const options = Collection.filter(
        [Option.from(1), Option.None(), Option.from(3)],
        (a) => a > 1
      );
      expectTypeOf(options).toEqualTypeOf<number[]>();
      expect(options).toEqual([3]);
      const mixed = Collection.filter(
        [Option.from(1), Result.from(() => 2), Option.from(3)],
        (a) => a > 1
      );
      expectTypeOf(mixed).toEqualTypeOf<number[]>();
      expect(mixed).toEqual([2, 3]);
    });

    it("should not implicitly filter the Task type", () => {
      const arr = [
        Task.from(() => 1),
        Task.from(() => 2),
        Task.from(() => 3),
        Result.Ok(1),
      ];
      const res1 = Collection.filter(
        arr,
        (a): a is number => typeof a === "number"
      );
      const res2 = Collection.filter(
        arr,
        (a): a is SyncTask<UnknownError, number> => isTask(a)
      );

      expectTypeOf(res1).toEqualTypeOf<number[]>();
      expect(res1).toEqual([1]);

      expectTypeOf(res2).toEqualTypeOf<SyncTask<UnknownError, number>[]>();
      expect(Task.sequential(res2).run()).toEqual(
        Task.sequential([
          Task.from(() => 1),
          Task.from(() => 2),
          Task.from(() => 3),
        ]).run()
      );
    });

    it("should filter and narrow the type of an array of monads", () => {
      const results = Collection.filter(
        [Result.from(() => 1), Result.from(() => "2"), Option.from(3)],
        (a): a is string => typeof a === "string"
      );
      expectTypeOf(results).toEqualTypeOf<string[]>();
      expect(results).toEqual(["2"]);
    });

    it("should filter an object of primitives", () => {
      const result = Collection.filter({ a: 1, b: 2, c: 3 }, (a) => a > 1);
      expect(result).toEqual({
        a: Option.None(),
        b: Option.Some(2),
        c: Option.Some(3),
      });
    });

    it("should filter and narrow the type of an object of primitives", () => {
      const result = Collection.filter(
        { a: 1, b: "2", c: 3 },
        (a): a is string => typeof a === "string"
      );
      expectTypeOf(result).toEqualTypeOf<{
        a: None<never>;
        b: Some<string>;
        c: None<never>;
      }>();
      expect(result).toEqual({
        a: Option.None(),
        b: Option.Some("2"),
        c: Option.None(),
      });
    });

    it("should filter an object of monads", () => {
      const results = Collection.filter(
        {
          a: Result.from(() => 1),
          b: Result.from(() => 2),
          c: Result.from(() => 3),
        },
        (a) => a > 1
      );
      expectTypeOf(results).toEqualTypeOf<{
        a: Option<number>;
        b: Option<number>;
        c: Option<number>;
      }>();
      expect(results).toEqual({
        a: Option.None(),
        b: Option.Some(2),
        c: Option.Some(3),
      });
    });
  });

  describe.concurrent("filterMap", () => {
    it("should filter and map an array of primitives", () => {
      const result = Collection.filterMap(
        [1, null, 3, undefined],
        (a) => a + 1
      );
      expect(result).toEqual([2, 4]);
    });

    it("should filter and map an array of monads", () => {
      const results = Collection.filterMap(
        [Result.Err(), Result.from(() => 2), Result.from(() => 3)],
        (a) => a + 1
      );
      expectTypeOf(results).toEqualTypeOf<number[]>();
      expect(results).toEqual([3, 4]);
      const options = Collection.filterMap(
        [Option.None(), Option.from(2), Option.from(3)],
        (a) => a + 1
      );
      expectTypeOf(options).toEqualTypeOf<number[]>();
      expect(options).toEqual([3, 4]);
    });

    it("should filter and map an object of primitives", () => {
      const result = Collection.filterMap(
        { a: 1, b: null, c: 3, d: undefined },
        (a) => a + 1
      );
      expectTypeOf(result).toEqualTypeOf<{
        a: Option<number>;
        b: None<never>;
        c: Option<number>;
        d: None<never>;
      }>();
      expect(result).toEqual({
        a: Option.Some(2),
        b: Option.None(),
        c: Option.Some(4),
        d: Option.None(),
      });
    });

    it("should filter and map an object of monads", () => {
      const results = Collection.filterMap(
        {
          a: Result.Err(),
          b: Result.from(() => 2),
          c: Result.from(() => 3),
          d: Option.None(),
        },
        (a) => a + 1
      );
      expectTypeOf(results).toEqualTypeOf<{
        a: Option<number>;
        b: Option<number>;
        c: Option<number>;
        d: Option<number>;
      }>();
      expect(results).toEqual({
        a: Option.None(),
        b: Option.Some(3),
        c: Option.Some(4),
        d: Option.None(),
      });
      expect(Option.all(results)).toEqual(Option.None());
      expect(Option.any(results)).toEqual(Option.Some(3));
    });
  });

  describe.concurrent("map", () => {
    it("should map an array of primitives", () => {
      const result = Collection.map([1, 2, 3], (a) => a + 1);
      expect(result).toEqual([2, 3, 4]);
    });

    it("should map an object of primitives", () => {
      const result = Collection.map({ a: 1, b: 2, c: 3 }, (a) => a + 1);
      expect(result).toEqual({ a: 2, b: 3, c: 4 });
    });

    it("should map an array of monads", () => {
      const results = Collection.map(
        [Result.from(() => 1), Result.from(() => 2), Result.from(() => 3)],
        (a) => a.map((b) => b + 1)
      );
      expectTypeOf(results).toMatchTypeOf<Result<UnknownError, number>[]>();
      expect(results).toEqual([
        Result.from(() => 2),
        Result.from(() => 3),
        Result.from(() => 4),
      ]);
      const options = Collection.map(
        [Option.from(1), Option.from(2), Option.from(3)],
        (a) => a.map((b) => b + 1)
      );
      expectTypeOf(options).toMatchTypeOf<Option<number>[]>();
      expect(options).toEqual([Option.from(2), Option.from(3), Option.from(4)]);

      const tasks = Collection.map(
        [Task.from(() => 1), Task.from(() => 2), Task.from(() => 3)],
        (a) => a.map((b) => b + 1)
      );

      expectTypeOf(tasks).toMatchTypeOf<Task<UnknownError, number>[]>();
    });

    it("should map an object of monads", () => {
      const results = Collection.map(
        {
          a: Result.from(() => 1),
          b: Result.from(() => 2),
          c: Result.from(() => 3),
        },
        (a) => a.map((b) => b + 1)
      );
      expectTypeOf(results).toEqualTypeOf<{
        a: Result<UnknownError, number>;
        b: Result<UnknownError, number>;
        c: Result<UnknownError, number>;
      }>();
      expect(results).toEqual({
        a: Result.from(() => 2),
        b: Result.from(() => 3),
        c: Result.from(() => 4),
      });
      const options = Collection.map(
        { a: Option.from(1), b: Option.from(2), c: Option.from(3) },
        (a) => a.map((b) => b + 1)
      );
      expectTypeOf(options).toEqualTypeOf<{
        a: Option<number>;
        b: Option<number>;
        c: Option<number>;
      }>();
      expect(options).toEqual({
        a: Option.from(2),
        b: Option.from(3),
        c: Option.from(4),
      });
    });
  });

  describe.concurrent("some", () => {
    it("should return true if any the predicate for any of the elements is true", () => {
      const primitivesArray = Collection.some([false, true, false], (a) => a);
      const resultsArray = Collection.some(
        [Result.Err(), Result.from(() => 2), Result.from(() => 3)],
        (a) => a > 2
      );
      const optionsArray = Collection.some(
        [Option.None(), Option.from(2), Option.from(3)],
        (a) => a > 2
      );
      const primitivesObject = Collection.some(
        { a: false, b: true, c: false },
        (a) => a
      );
      const resultsObject = Collection.some(
        { a: Result.Err(), b: Result.from(() => 2), c: Result.from(() => 3) },
        (a) => a > 2
      );
      const optionsObject = Collection.some(
        { a: Option.None(), b: Option.from(2), c: Option.from(3) },
        (a) => a > 2
      );

      expect(primitivesArray).toEqual(true);
      expect(resultsArray).toEqual(true);
      expect(optionsArray).toEqual(true);
      expect(primitivesObject).toEqual(true);
      expect(resultsObject).toEqual(true);
      expect(optionsObject).toEqual(true);
    });

    it("should return false if none of the predicates are true", () => {
      const primitivesArray = Collection.some([false, false, false], (a) => a);
      const resultsArray = Collection.some(
        [Result.Err(), Result.from(() => 2), Result.from(() => 3)],
        (a) => a > 3
      );
      const optionsArray = Collection.some(
        [Option.None(), Option.from(2), Option.from(3)],
        (a) => a > 3
      );
      const primitivesObject = Collection.some(
        { a: false, b: false, c: false },
        (a) => a
      );
      const resultsObject = Collection.some(
        { a: Result.Err(), b: Result.from(() => 2), c: Result.from(() => 3) },
        (a) => a > 3
      );
      const optionsObject = Collection.some(
        { a: Option.None(), b: Option.from(2), c: Option.from(3) },
        (a) => a > 3
      );

      expect(primitivesArray).toEqual(false);
      expect(resultsArray).toEqual(false);
      expect(optionsArray).toEqual(false);
      expect(primitivesObject).toEqual(false);
      expect(resultsObject).toEqual(false);
      expect(optionsObject).toEqual(false);
    });

    it("should return true if the collection is empty", () => {
      const array = Collection.some([], (a) => a);
      const object = Collection.some({}, (a) => a);
      expect(array).toEqual(true);
      expect(object).toEqual(true);
    });
  });

  describe.concurrent("every", () => {
    it("should return true if all the predicates are true", () => {
      const primitivesArray = Collection.every([true, true, true], (a) => a);
      const resultsArray = Collection.every(
        [Result.from(() => 1), Result.from(() => 2), Result.from(() => 3)],
        (a) => a > 0
      );
      const optionsArray = Collection.every(
        [Option.from(1), Option.from(2), Option.from(3)],
        (a) => a > 0
      );
      const primitivesObject = Collection.every(
        { a: true, b: true, c: true },
        (a) => a
      );
      const resultsObject = Collection.every(
        {
          a: Result.from(() => 1),
          b: Result.from(() => 2),
          c: Result.from(() => 3),
        },
        (a) => a > 0
      );
      const optionsObject = Collection.every(
        { a: Option.from(1), b: Option.from(2), c: Option.from(3) },
        (a) => a > 0
      );

      expect(primitivesArray).toEqual(true);
      expect(resultsArray).toEqual(true);
      expect(optionsArray).toEqual(true);
      expect(primitivesObject).toEqual(true);
      expect(resultsObject).toEqual(true);
      expect(optionsObject).toEqual(true);
    });

    it("should return false if any of the predicates are false", () => {
      const primitivesArray = Collection.every([true, false, true], (a) => a);
      const resultsArray = Collection.every(
        [Result.from(() => 1), Result.from(() => 2), Result.from(() => 3)],
        (a) => a > 1
      );
      const optionsArray = Collection.every(
        [Option.from(1), Option.from(2), Option.from(3)],
        (a) => a > 1
      );
      const primitivesObject = Collection.every(
        { a: true, b: false, c: true },
        (a) => a
      );
      const resultsObject = Collection.every(
        {
          a: Result.from(() => 1),
          b: Result.from(() => 2),
          c: Result.from(() => 3),
        },
        (a) => a > 1
      );
      const optionsObject = Collection.every(
        { a: Option.from(1), b: Option.from(2), c: Option.from(3) },
        (a) => a > 1
      );

      expect(primitivesArray).toEqual(false);
      expect(resultsArray).toEqual(false);
      expect(optionsArray).toEqual(false);
      expect(primitivesObject).toEqual(false);
      expect(resultsObject).toEqual(false);
      expect(optionsObject).toEqual(false);
    });

    it("should return false if the collection is empty", () => {
      const array = Collection.every([], (a) => a);
      const object = Collection.every({}, (a) => a);
      expect(array).toEqual(false);
      expect(object).toEqual(false);
    });
  });

  describe.concurrent("reduce", () => {
    it("should reduce an array", () => {
      const result = Collection.reduce([1, 2, 3], (acc, curr) => acc + curr, 0);
      expect(result).toEqual(6);
    });

    it("should reduce an object", () => {
      const result = Collection.reduce(
        { a: 1, b: 2, c: 3 },
        (acc, curr) => acc + curr,
        0
      );
      expect(result).toEqual(6);
    });
  });
});
