import { Option } from "../lib/option";
import { Result } from "../lib/result";

describe.concurrent("Option", () => {
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

  describe.concurrent("Some", () => {
    it("should create a Some instance", () => {
      const some = Option.Some(42);
      expect(some.unwrap()).toBe(42);
    });

    it("should map a value", () => {
      const some = Option.from(42);
      const mapped = some.map((x) => x * 2);
      expect(mapped.unwrap()).toBe(84);
    });

    it("should flatMap a value", () => {
      const some = Option.Some(42);
      const flatMapped = some.flatMap((x) => Option.Some(x * 2));
      expect(flatMapped.unwrap()).toBe(84);
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

  describe.concurrent("None", () => {
    it("should create a None instance", () => {
      const none = Option.None();
      expect(none.isNone()).toBe(true);
    });

    it("should not map a value", () => {
      const none = Option.None();
      const mapped = none.map((x) => x * 2);
      expect(mapped.isNone()).toBe(true);
    });

    it("should not flatMap a value", () => {
      const none = Option.None();
      const flatMapped = none.flatMap((x) => Option.Some(x * 2));
      expect(flatMapped.isNone()).toBe(true);
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

  describe.concurrent("from", () => {
    it("should create a Some instance when value is not null or undefined", () => {
      const some = Option.from(42);
      expect(some.isSome()).toBe(true);
      expect(some.unwrap()).toBe(42);
    });

    it("should create an Option instance when the value may be nullish", () => {
      const some = Option.from(42 as number | null | undefined);
      expectTypeOf(some).toMatchTypeOf<Option<number>>();
    });

    it("should create a None instance when value is null or undefined", () => {
      const none1 = Option.from(null);
      expect(none1.isNone()).toBe(true);

      const none2 = Option.from(undefined);
      expect(none2.isNone()).toBe(true);
    });

    it("should create a None instance when the value is a Err Result", () => {
      const err = Result.Err("error");
      const none = Option.from(err);
      expect(none.isNone()).toBe(true);
    });

    it("should create an Option from a Result", () => {
      const ok = Result.Ok(42);
      const some = Option.from(ok);
      expect(some.isSome()).toBe(true);
      expect(some.unwrap()).toBe(42);

      const err = Result.Err("error");
      const none = Option.from(err);
      expect(none.isNone()).toBe(true);
    });
  });

  describe.concurrent("fromPredicate", () => {
    it("should create a Some instance when the predicate is true", () => {
      const some = Option.fromPredicate(42, (x: number) => x > 0);
      expect(some.isSome()).toBe(true);
      expect(some.unwrap()).toBe(42);
    });

    it("should allow type narrowing when the predicate is true", () => {
      const some = Option.fromPredicate(
        42 as number | string,
        (x): x is number => typeof x === "number"
      );
      expect(some.isSome()).toBe(true);
      expect(some.unwrap()).toBe(42);
    });

    it("should create a None instance when the predicate is false", () => {
      const none = Option.fromPredicate(-42, (x: number): x is number => x > 0);
      expect(none.isNone()).toBe(true);
    });
  });

  describe.concurrent("traverse", () => {
    it("should create a Some instance with an array of transformed values when all transformations succeed", () => {
      const values = [1, 2, 3];
      const f = (x: number) =>
        Option.fromPredicate(x * 2, (y: number) => y > 0);
      const some = Option.traverse(values, f);
      expect(some.isSome()).toBe(true);
      expect(some.unwrap()).toEqual([2, 4, 6]);
    });

    it("should work on a record", () => {
      const values = { a: 1, b: 2, c: 3 };
      const f = (x: number) =>
        Option.fromPredicate(x * 2, (y: number) => y > 0);
      const some = Option.traverse(values, f);
      expect(some.isSome()).toBe(true);
    });

    it("should create a None instance when any transformation fails", () => {
      const values = [1, -1, 3];
      const f = (x: number) =>
        Option.fromPredicate(x * 2, (y: number) => y > 0);
      const none = Option.traverse(values, f);
      expect(none.isNone()).toBe(true);
    });
  });

  describe.concurrent("all", () => {
    it("should create a Some instance with an array of values when all options are Some", () => {
      const values = [Option.Some(1), Option.Some(2), Option.Some(3)];
      const some = Option.all(values);
      expect(some.isSome()).toBe(true);
      expect(some.unwrap()).toEqual([1, 2, 3]);
    });

    it("should work on a record", () => {
      const values = {
        a: Option.Some(1),
        b: Option.Some(2),
        c: Option.Some(3),
      };
      const some = Option.all(values);
      expect(some.isSome()).toBe(true);
    });

    it("should create a None instance when any option is None", () => {
      const values = [Option.Some(1), Option.None(), Option.Some(3)];
      const none = Option.all(values);
      expect(none.isNone()).toBe(true);
    });
  });

  describe.concurrent("tryCatch", () => {
    it("should catch an error and return an Err", () => {
      const option = Option.tryCatch(() => {
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

  describe.concurrent("any", () => {
    it("should return the first Ok value encountered", () => {
      const options = [
        Option.None(),
        Option.Some(2),
        Option.None(),
        Option.Some(4),
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

    it("should work on a record", () => {
      const options = {
        a: Option.None(),
        b: Option.Some(2),
        c: Option.None(),
        d: Option.Some(4),
      };

      const combined = Option.any(options);

      expect(combined.isSome()).toBe(true);
      expect(combined.unwrap()).toBe(2);
    });
  });

  describe.concurrent("unwrap", () => {
    it("should return the value when the option is Some", () => {
      const some = Option.Some<number>(42);
      expect(some.unwrap()).toBe(42);
    });

    it("should throw an error when the option is None", () => {
      const none = Option.None();
      expect(() => none.unwrap()).toThrow();
    });
  });

  describe.concurrent("unwrapOr", () => {
    it("should return the value when the option is Some", () => {
      const some = Option.Some<number>(42);
      expect(some.unwrapOr(0)).toBe(42);
    });

    it("should return the default value when the option is None", () => {
      const none = Option.None();
      expect(none.unwrapOr(0)).toBe(0);
    });
  });

  describe.concurrent("tap", () => {
    it("should call the function when the option is Some", () => {
      const some = Option.Some<number>(42);
      const fn = vi.fn();
      some.tap(fn);
      expect(fn).toBeCalledWith(42);
    });

    it("should not call the function when the option is None", () => {
      const none = Option.None();
      const fn = vi.fn();
      none.tap(fn);
      expect(fn).not.toBeCalled();
    });
  });

  describe.concurrent("isSome", () => {
    it("should return true when the option is Some", () => {
      const some = Option.Some<number>(42);
      expect(some.isSome()).toBe(true);
    });

    it("should return false when the option is None", () => {
      const none = Option.None();
      expect(none.isSome()).toBe(false);
    });
  });

  describe.concurrent("isNone", () => {
    it("should return false when the option is Some", () => {
      const some = Option.Some<number>(42);
      expect(some.isNone()).toBe(false);
    });

    it("should return true when the option is None", () => {
      const none = Option.None();
      expect(none.isNone()).toBe(true);
    });
  });
});
