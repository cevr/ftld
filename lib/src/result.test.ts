import { UnknownError } from "./utils.js";
import { Option } from "./option.js";
import { Result } from "./result.js";

describe.concurrent("Result", () => {
  test("Left Identity", () => {
    const f = (a: number) => Result.Ok(a * 2);
    const value = 3;
    const result1 = Result.Ok(value).flatMap(f);
    expectTypeOf(result1).toEqualTypeOf<Result<never, number>>();
    const result2 = f(value);
    expectTypeOf(result2).toEqualTypeOf<Result<never, number>>();

    expect(result1).toEqual(result2);
  });

  test("Right Identity", () => {
    const result = Result.Ok(3);
    const result1 = result.flatMap((x) => Result.Ok(x));
    expectTypeOf(result1).toEqualTypeOf<Result<never, number>>();
    expect(result1).toEqual(result);
  });

  test("Associativity", () => {
    const f = (a: number) => Result.Ok(a * 2);
    const g = (a: number) => Result.Ok(a + 1);

    const result = Result.Ok(3);
    const result1 = result.flatMap(f).flatMap(g);
    const result2 = result.flatMap((x) => f(x).flatMap(g));

    expect(result1).toEqual(result2);
  });

  describe.concurrent("Ok", () => {
    it("should create an Ok value", () => {
      const ok = Result.Ok(42);
      expect(ok.isOk()).toBe(true);
      expect(ok.unwrap()).toBe(42);
    });

    it('should allow an empty "Ok" value', () => {
      const ok = Result.Ok();
      expect(ok.isOk()).toBe(true);
      expect(ok.unwrap()).toBe(undefined);
    });

    it("should map an Ok value", () => {
      const ok = Result.Ok(42).map((x) => x * 2);
      expect(ok.isOk()).toBe(true);
      expect(ok.unwrap()).toBe(84);
    });

    it("should flatMap an Ok value", () => {
      const ok = Result.Ok(42).flatMap((x) => Result.Ok(x * 2));
      expect(ok.isOk()).toBe(true);
      expect(ok.unwrap()).toBe(84);
    });

    it("should not recover an Ok value", () => {
      const ok = Result.Ok(42).recover((x) => Result.Err(x));
      expect(ok.isOk()).toBe(true);
      expect(ok.unwrap()).toBe(42);
    });

    it("should match an Ok value", () => {
      const ok = Result.Ok(42);
      const matched = ok.match({
        Ok: (x) => x,
        Err: (e) => e,
      });
      expect(matched).toBe(42);
    });
  });

  describe.concurrent("Err", () => {
    it("should create an Err value", () => {
      const err = Result.Err("error");
      expect(err.isErr()).toBe(true);
      expect(err.unwrapErr()).toBe("error");
    });

    it('should allow an empty "Err" value', () => {
      const err = Result.Err();
      expect(err.isErr()).toBe(true);
      expect(err.unwrapErr()).toBe(undefined);
    });

    it("should not map an Err value", () => {
      const err = Result.Err<string>("error").map((x: number) => x * 2);
      expect(err.isErr()).toBe(true);
      expect(err.unwrapErr()).toBe("error");
    });

    it("should not flatMap an Err value", () => {
      const err = Result.Err<string>("error").flatMap((x: number) =>
        Result.Ok(x * 2)
      );
      expect(err.isErr()).toBe(true);
      expect(err.unwrapErr()).toBe("error");
    });

    it("should recover an Err value", () => {
      const err = Result.Err("error").recover((x) => Result.Err(x + "!"));
      expect(err.isErr()).toBe(true);
      expect(err.unwrapErr()).toBe("error!");
    });

    it("should match an Err value", () => {
      const err = Result.Err("error");
      const matched = err.match({
        Ok: (x) => x,
        Err: (e) => e,
      });
      expect(matched).toBe("error");
    });
  });

  describe.concurrent("tryCatch", () => {
    it("should catch an error and return an Err", () => {
      const result = Result.tryCatch<string, number>(
        () => {
          throw new Error("Error message");
        },
        (err) => "Error!"
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("Error!");
    });

    it("should not catch an error and return an Ok", () => {
      const result = Result.tryCatch(
        () => 42,
        (err) => "Error!"
      );

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });
  });

  describe.concurrent("any", () => {
    it("should return the first Ok value encountered", () => {
      const results = [
        Result.Err("error 1"),
        Result.Ok(2),
        Result.Err("error 2"),
        Result.Ok(4),
      ];

      const combined = Result.any(results);

      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toBe(2);
    });

    it("should work with a record", () => {
      const results = {
        a: Result.Err<string>("error 1"),
        b: Result.Ok<number>(2),
        c: Result.Err<string>("error 2"),
        d: Result.Ok<number>(4),
      };

      const combined = Result.any(results);

      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual(2);
    });

    it("should return the first Err when all values are Err", () => {
      const results = [
        Result.Err("error 1"),
        Result.Err("error 2"),
        Result.Err("error 3"),
      ];

      const combined = Result.any(results);

      expect(combined.isErr()).toBe(true);
      expect(combined.unwrapErr()).toEqual("error 1");
    });

    it("should return the first Err when all values are Err in a record", () => {
      const results = {
        a: Result.Err<string>("error 1"),
        b: Result.Err<string>("error 2"),
        c: Result.Err<string>("error 3"),
      };

      const combined = Result.any(results);

      expect(combined.isErr()).toBe(true);
      expect(combined.unwrapErr()).toEqual("error 1");
    });
  });

  describe.concurrent("all", () => {
    it("should return an Ok when all values are Ok", () => {
      const results = [Result.Ok(1), Result.Ok(2), Result.Ok(3)];

      const combined = Result.all(results);

      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2, 3]);
    });

    it("should return an Ok when all values are Ok in a record", () => {
      const results = {
        a: Result.Ok<number>(1),
        b: Result.Ok<number>(2),
        c: Result.Ok<number>(3),
      };

      const combined = Result.all(results);

      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("should return the first Err value encountered", () => {
      const results = [
        Result.Ok(1),
        Result.Err("error 1"),
        Result.Ok(3),
        Result.Err("error 2"),
      ];

      const combined = Result.all(results);

      expect(combined.isErr()).toBe(true);
      expect(combined.unwrapErr()).toBe("error 1");
    });

    it("should return the first Err value encountered in a record", () => {
      const results = {
        a: Result.Ok<number>(1),
        b: Result.Err<string>("error 1"),
        c: Result.Ok<number>(3),
        d: Result.Err<string>("error 2"),
      };

      const combined = Result.all(results);

      expect(combined.isErr()).toBe(true);
      expect(combined.unwrapErr()).toBe("error 1");
    });
  });

  describe.concurrent("traverse", () => {
    const double = (x: number): Result<string, number> => {
      return Result.Ok(x * 2);
    };

    const failOnTwo = (x: number): Result<string, number> => {
      if (x === 2) {
        return Result.Err("Error on 2");
      }
      return Result.Ok(x * 2);
    };

    it("should apply the provided function to each element and return an Ok with the transformed values", () => {
      const input = [1, 2, 3];
      const expectedResult = Result.Ok([2, 4, 6]);

      const result = Result.traverse(input, double);

      expect(result).toEqual(expectedResult);
    });

    it("should apply the provided function to each element and return an Ok with the transformed values in a record", () => {
      const input = {
        a: 1,
        b: 2,
        c: 3,
      };
      const expectedResult = Result.Ok({
        a: 2,
        b: 4,
        c: 6,
      });

      const result = Result.traverse(input, double);

      expect(result).toEqual(expectedResult);
    });

    it("should return the first Err value encountered", () => {
      const input = [1, 2, 3];
      const expectedResult = Result.Err("Error on 2");

      const result = Result.traverse(input, failOnTwo);

      expect(result).toEqual(expectedResult);
    });

    it("should return the first Err value encountered in a record", () => {
      const input = {
        a: 1,
        b: 2,
        c: 3,
      };
      const expectedResult = Result.Err("Error on 2");

      const result = Result.traverse(input, failOnTwo);

      expect(result).toEqual(expectedResult);
    });

    it("should return an Ok with an empty array when the input is empty", () => {
      const input: number[] = [];
      const expectedResult = Result.Ok([]);

      const result = Result.traverse(input, double);

      expect(result).toEqual(expectedResult);
    });

    it("should return an Ok with an empty object when the input is an empty object", () => {
      const input = {};
      const expectedResult = Result.Ok({});

      const result = Result.traverse(input, double);

      expect(result).toEqual(expectedResult);
    });
  });

  describe.concurrent("from", () => {
    it("should return an Ok for normal values", () => {
      const result = Result.from(
        () => 42,
        () => "error"
      );
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("should return an Ok when the value is Some", () => {
      const result = Result.from(
        () => Option.Some(42),
        () => "error"
      );
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("should return an Err when the option is None", () => {
      const result = Result.from(
        () => Option.None(),
        () => "error"
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });
  });

  describe.concurrent("fromPredicate", () => {
    it("should return an Ok when the predicate is true", () => {
      const result = Result.fromPredicate(
        42,
        (x) => x > 0,
        (x) => "error"
      );
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("should return an Err when the predicate is false", () => {
      const result = Result.fromPredicate(
        42,
        (x) => x < 0,
        () => "error"
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });

    it("should allow type narrowing when the predicate is true", () => {
      const result = Result.fromPredicate(
        "hello" as string | number,
        (x: string | number): x is string => typeof x === "string",
        (x) => "error"
      );

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe("hello");
    });
  });

  describe.concurrent("coalesce", () => {
    it("should return an array of Ok values", () => {
      const results = [Result.Ok(1), Result.Ok(2), Result.Ok(3)];

      const collected = Result.coalesce(results);

      expect(collected.unwrap()).toEqual([1, 2, 3]);
    });

    it("should return an object of Ok values", () => {
      const results = {
        a: Result.Ok(1),
        b: Result.Ok(2),
        c: Result.Ok(3),
      };

      const collected = Result.coalesce(results);

      expect(collected.unwrap()).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should accumulate the "Err" values', () => {
      const results = [
        Result.Ok(1),
        Result.Err("error 1"),
        Result.Ok(3),
        Result.Err("error 2"),
      ];

      const collected = Result.coalesce(results);

      expect(collected.unwrapErr()).toEqual(["error 1", "error 2"]);
    });

    it('should accumulate the "Err" values in a record', () => {
      const results = {
        a: Result.Ok(1),
        b: Result.Err("error 1"),
        c: Result.Ok(3),
        d: Result.Err("error 2"),
      };

      const collected = Result.coalesce(results);

      expect(collected.unwrapErr()).toEqual({
        b: "error 1",
        d: "error 2",
      });
    });
  });

  describe.concurrent("settle", () => {
    it("should combine all results into an Ok of settled results", () => {
      const results = [
        Result.Ok<number>(1),
        Result.Err<string>("error 1"),
        Result.Ok<number>(3),
        Result.Err<string>("error 2"),
      ];

      const settled = Result.settle(results);

      expect(settled).toEqual([
        {
          type: "Ok",
          value: 1,
        },
        {
          type: "Err",
          error: "error 1",
        },
        {
          type: "Ok",
          value: 3,
        },
        {
          type: "Err",
          error: "error 2",
        },
      ]);
    });

    it("should combine all results into an Ok of settled results in a record", () => {
      const results = {
        a: Result.Ok<number>(1),
        b: Result.Err<string>("error 1"),
        c: Result.Ok<number>(3),
        d: Result.Err<string>("error 2"),
      };

      const settled = Result.settle(results);

      expect(settled).toEqual({
        a: {
          type: "Ok",
          value: 1,
        },
        b: {
          type: "Err",
          error: "error 1",
        },
        c: {
          type: "Ok",
          value: 3,
        },
        d: {
          type: "Err",
          error: "error 2",
        },
      });
    });
    it("should settle a Ok result", () => {
      const result = Result.Ok(42);

      const settled = result.settle();

      expect(settled).toEqual({
        type: "Ok",
        value: 42,
      });
    });

    it("should settle an Err result", () => {
      const result = Result.Err("error");

      const settled = result.settle();

      expect(settled).toEqual({
        type: "Err",
        error: "error",
      });
    });
  });

  describe.concurrent("unwrap", () => {
    it("should return the value when the result is Ok", () => {
      const result = Result.Ok(42);

      const value = result.unwrap();

      expect(value).toBe(42);
    });

    it("should throw an error when the result is Err", () => {
      const result = Result.Err("error");

      expect(() => result.unwrap()).toThrowError("error");
    });
  });

  describe.concurrent("unwrapErr", () => {
    it("should return the value when the result is Err", () => {
      const result = Result.Err("error");

      const value = result.unwrapErr();

      expect(value).toBe("error");
    });

    it("should throw an error when the result is Ok", () => {
      const result = Result.Ok(42);

      expect(() => result.unwrapErr()).toThrow();
    });
  });

  describe.concurrent("unwrapOr", () => {
    it("should return the value when the result is Ok", () => {
      const result = Result.Ok(42);

      const value = result.unwrapOr(0);

      expect(value).toBe(42);
    });

    it("should return the default value when the result is Err", () => {
      const result = Result.Err("error");

      const value = result.unwrapOr(0);

      expect(value).toBe(0);
    });

    it("should not display the error if the Ok value is never", () => {
      const result = Result.Err(42);

      const value = result.unwrapOr("error");

      expect(value).toBe("error");
    });
  });

  describe.concurrent("tap", () => {
    it("should call the provided function when the result is Ok", () => {
      const result = Result.Ok(42);

      const spy = vi.fn();

      result.tap(spy);

      expect(spy).toHaveBeenCalledWith(42);
    });

    it("should not call the provided function when the result is Err", () => {
      const result = Result.Err("error");

      const spy = vi.fn();

      result.tap(spy);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe.concurrent("tapErr", () => {
    it("should not call the provided function when the result is Ok", () => {
      const result = Result.Ok(42);

      const spy = vi.fn();

      result.tapErr(spy);

      expect(spy).not.toHaveBeenCalled();
    });

    it("should call the provided function when the result is Err", () => {
      const result = Result.Err("error");

      const spy = vi.fn();

      result.tapErr(spy);

      expect(spy).toHaveBeenCalledWith("error");
    });
  });

  describe.concurrent("mapErr", () => {
    it("should call the provided function when the result is Ok", () => {
      const result = Result.Ok(42);

      const spy = vi.fn();

      result.mapErr(spy);

      expect(spy).not.toHaveBeenCalled();
    });

    it("should call the provided function when the result is Err", () => {
      const result = Result.Err("error");

      const spy = vi.fn();

      result.mapErr(spy);

      expect(spy).toHaveBeenCalledWith("error");
    });
  });

  describe.concurrent("validate", () => {
    it("should return Ok when all the results are Ok", () => {
      const result = Result.validate([
        Result.Ok(1),
        Result.Ok(2),
        Result.Ok(3),
      ]);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(1);
    });

    it("should aggregate the errors when any of the results are Errors", () => {
      const result = Result.validate([
        Result.Ok(1),
        Result.from<number>(() => {
          throw "error 1";
        }),
        Result.from<number>(() => {
          throw "error 2";
        }),
      ]);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toEqual([
        new UnknownError("error 1"),
        new UnknownError("error 2"),
      ]);
    });
  });
  describe.concurrent("common use cases", () => {
    it("should work with if statements", () => {
      class DivisionByZeroError extends Error {
        constructor() {
          super("Cannot divide by zero");
        }
      }
      function divide(
        a: number,
        b: number
      ): Result<DivisionByZeroError, number> {
        if (b === 0) {
          return Result.Err(new DivisionByZeroError());
        }

        return Result.Ok(a / b);
      }

      const result1 = divide(10, 0);
      const result2 = divide(10, 2);

      expectTypeOf(result1).toEqualTypeOf<
        Result<DivisionByZeroError, number>
      >();
      expect(result1.isErr()).toBe(true);
      expect(result1.unwrapErr()).toBeInstanceOf(DivisionByZeroError);
      expectTypeOf(result2).toEqualTypeOf<
        Result<DivisionByZeroError, number>
      >();
      expect(result2.isOk()).toBe(true);
      expect(result2.unwrap()).toBe(5);
    });
  });
});
