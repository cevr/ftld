import { Option } from "./option";
import { Result } from "./result";

describe("Option", () => {
  test("Left Identity", () => {
    const f = (a: number) => Option.Some(a * 2);
    const value = 3;
    const option1 = Option.Some(value).flatMap(f);
    const option2 = f(value);

    expect(option1).toEqual(option2);
  });

  test("Right Identity", () => {
    const option = Option.Some(3);
    const option1 = option.flatMap(Option.Some);
    expect(option1).toEqual(option);
  });

  test("Associativity", () => {
    const f = (a: number) => Option.Some(a * 2);
    const g = (a: number) => Option.Some(a + 1);
    const option = Option.Some(3);
    const option1 = option.flatMap(f).flatMap(g);
    const option2 = option.flatMap((x) => f(x).flatMap(g));

    expect(option1).toEqual(option2);
  });

  describe("Some", () => {
    it("should create a Some instance", () => {
      const some = Option.Some(42);
      expect(some.unwrap()).toBe(42);
    });

    it("should map a value", () => {
      const some = Option.Some(42);
      const mapped = some.map((x) => x * 2);
      expect(mapped.unwrap()).toBe(84);
    });

    it("should apply a function", () => {
      const someFn = Option.Some((x: number) => x * 2);
      const some = Option.Some(42);
      const result = some.ap(someFn);
      expect(result.unwrap()).toBe(84);
    });

    it("should flatMap a value", () => {
      const some = Option.Some(42);
      const flatMapped = some.flatMap((x) => Option.Some(x * 2));
      expect(flatMapped.unwrap()).toBe(84);
    });

    it("should reduce a value", () => {
      const some = Option.Some(42);
      const reduced = some.reduce((acc, x) => acc + x, 0);
      expect(reduced).toBe(42);
    });

    it("should match a value", () => {
      const some = Option.Some(42);
      const matched = some.match({
        Some: (x) => x,
        None: () => 0,
      });
      expect(matched).toBe(42);
    });
  });

  describe("None", () => {
    it("should create a None instance", () => {
      const none = Option.None();
      expect(none.isNone()).toBe(true);
    });

    it("should not map a value", () => {
      const none = Option.None();
      const mapped = none.map((x: number) => x * 2);
      expect(mapped.isNone()).toBe(true);
    });

    it("should not apply a function", () => {
      const noneFn = Option.None();
      const none = Option.None();
      const result = none.ap(noneFn);
      expect(result.isNone()).toBe(true);
    });

    it("should not flatMap a value", () => {
      const none = Option.None();
      const flatMapped = none.flatMap((x: number) => Option.Some(x * 2));
      expect(flatMapped.isNone()).toBe(true);
    });

    it("should not reduce a value", () => {
      const none = Option.None();
      const reduced = none.reduce((acc, x: number) => acc + x, 0);
      expect(reduced).toBe(0);
    });

    it("should match a None value", () => {
      const none = Option.None();
      const matched = none.match({
        Some: (x) => x,
        None: () => 0,
      });
      expect(matched).toBe(0);
    });
  });
  describe("fromNullable", () => {
    it("should create a Some instance when value is not null or undefined", () => {
      const some = Option.from(42);
      expect(some.isSome()).toBe(true);
      expect(some.unwrap()).toBe(42);
    });

    it("should create a None instance when value is null or undefined", () => {
      const none1 = Option.from(null);
      expect(none1.isNone()).toBe(true);

      const none2 = Option.from(undefined);
      expect(none2.isNone()).toBe(true);
    });
  });

  describe("fromPredicate", () => {
    it("should create a Some instance when the predicate is true", () => {
      const some = Option.fromPredicate((x: number) => x > 0, 42);
      expect(some.isSome()).toBe(true);
      expect(some.unwrap()).toBe(42);
    });

    it("should create a None instance when the predicate is false", () => {
      const none = Option.fromPredicate((x: number) => x > 0, -42);
      expect(none.isNone()).toBe(true);
    });
  });

  describe("fromResult", () => {
    it("should create a Some instance when the result is Ok", () => {
      const ok = Result.Ok(42);
      const some = Option.fromResult(ok);
      expect(some.isSome()).toBe(true);
      expect(some.unwrap()).toBe(42);
    });

    it("should create a None instance when the result is Err", () => {
      const err = Result.Err("error");
      const none = Option.fromResult(err);
      expect(none.isNone()).toBe(true);
    });
  });

  describe("traverse", () => {
    it("should create a Some instance with an array of transformed values when all transformations succeed", () => {
      const values = [1, 2, 3];
      const f = (x: number) =>
        Option.fromPredicate((y: number) => y > 0, x * 2);
      const some = Option.traverse(values, f);
      expect(some.isSome()).toBe(true);
      expect(some.unwrap()).toEqual([2, 4, 6]);
    });

    it("should create a None instance when any transformation fails", () => {
      const values = [1, -1, 3];
      const f = (x: number) =>
        Option.fromPredicate((y: number) => y > 0, x * 2);
      const none = Option.traverse(values, f);
      expect(none.isNone()).toBe(true);
    });
  });

  describe("sequence", () => {
    it("should create a Some instance with an array of values when all options are Some", () => {
      const values = [Option.Some(1), Option.Some(2), Option.Some(3)];
      const some = Option.sequence(values);
      expect(some.isSome()).toBe(true);
      expect(some.unwrap()).toEqual([1, 2, 3]);
    });

    it("should create a None instance when any option is None", () => {
      const values = [Option.Some(1), Option.None(), Option.Some(3)];
      const none = Option.sequence(values);
      expect(none.isNone()).toBe(true);
    });
  });

  describe("tryCatch", () => {
    it("should catch an error and return an Err", () => {
      const option = Option.tryCatch<number>(() => {
        throw new Error("Error message");
      });
      expect(option.isNone()).toBe(true);
      expect(() => option.unwrap()).toThrow();
    });

    it("should not catch an error and return an Ok", () => {
      const option = Option.tryCatch(() => 42);

      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(42);
    });
  });

  describe("every", () => {
    it("should return an Ok when all values are Ok", () => {
      const options = [
        Option.Some<number>(1),
        Option.Some<number>(2),
        Option.Some<number>(3),
      ];

      const combined = Option.every(options);

      expect(combined.isSome()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2, 3]);
    });

    it("should return the first Err value encountered", () => {
      const options = [
        Option.Some<number>(1),
        Option.None(),
        Option.Some<number>(3),
        Option.None(),
      ];

      const combined = Option.every(options);

      expect(combined.isNone()).toBe(true);
      expect(() => combined.unwrap());
    });
  });

  describe("any", () => {
    it("should return the first Ok value encountered", () => {
      const options = [
        Option.None(),
        Option.Some<number>(2),
        Option.None(),
        Option.Some<number>(4),
      ];

      const combined = Option.any(options);

      expect(combined.isSome()).toBe(true);
      expect(combined.unwrap()).toBe(2);
    });

    it("should return an Err when all values are Err", () => {
      const results = [Option.None(), Option.None(), Option.None()];

      const combined = Option.any(results);

      expect(combined.isNone()).toBe(true);
      expect(() => combined.unwrap()).toThrow();
    });
  });

  describe("toResult", () => {
    it("should return an Ok when the option is Some", () => {
      const some = Option.Some<number>(42);
      const result = some.toResult();
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("should return an Err when the option is None", () => {
      const none = Option.None();
      const result = none.toResult("error");
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });
  });
});
