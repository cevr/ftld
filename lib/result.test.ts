import { Option } from "./option";
import { Result } from "./result";

describe.concurrent("Result", () => {
  test("Left Identity", () => {
    const f = (a: number) => Result.Ok(a * 2);
    const value = 3;
    const result1 = Result.Ok(value).flatMap(f);
    const result2 = f(value);

    expect(result1).toEqual(result2);
  });

  test("Right Identity", () => {
    const result = Result.Ok(3);
    const result1 = result.flatMap(Result.Ok);
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

    it("should fold an Ok value", () => {
      const ok = Result.Ok(42);
      const value = ok.fold(
        (e) => "Error: " + e,
        (x) => "Ok: " + x
      );
      expect(value).toBe("Ok: 42");
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

    it("should not map an Err value", () => {
      const err = Result.Err<string, number>("error").map((x: number) => x * 2);
      expect(err.isErr()).toBe(true);
      expect(err.unwrapErr()).toBe("error");
    });

    it("should not flatMap an Err value", () => {
      const err = Result.Err<string, number>("error").flatMap((x: number) =>
        Result.Ok(x * 2)
      );
      expect(err.isErr()).toBe(true);
      expect(err.unwrapErr()).toBe("error");
    });

    it("should fold an Err value", () => {
      const err = Result.Err("error");
      const value = err.fold(
        (e) => "Error: " + e,
        (x) => "Ok: " + x
      );
      expect(value).toBe("Error: error");
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

  describe.concurrent("every", () => {
    it("should return an Ok when all values are Ok", () => {
      const results = [Result.Ok(1), Result.Ok(2), Result.Ok(3)];

      const combined = Result.every(results);

      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2, 3]);
    });

    it("should return the first Err value encountered", () => {
      const results = [
        Result.Ok(1),
        Result.Err("error 1"),
        Result.Ok(3),
        Result.Err("error 2"),
      ];

      const combined = Result.every(results);

      expect(combined.isErr()).toBe(true);
      expect(combined.unwrapErr()).toBe("error 1");
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

    it("should return an Err when all values are Err", () => {
      const results = [
        Result.Err("error 1"),
        Result.Err("error 2"),
        Result.Err("error 3"),
      ];

      const combined = Result.any(results);

      expect(combined.isErr()).toBe(true);
      expect(combined.unwrapErr()).toEqual("error 1");
    });
  });

  describe.concurrent("sequence", () => {
    it("should return an Ok when all values are Ok", () => {
      const results = [Result.Ok(1), Result.Ok(2), Result.Ok(3)];

      const combined = Result.sequence(results);

      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2, 3]);
    });

    it("should return the first Err value encountered", () => {
      const results = [
        Result.Ok(1),
        Result.Err("error 1"),
        Result.Ok(3),
        Result.Err("error 2"),
      ];

      const combined = Result.sequence(results);

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

    it("should return the first Err value encountered", () => {
      const input = [1, 2, 3];
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
  });

  describe.concurrent("from", () => {
    it("should return an Ok when the value is not null", () => {
      const result = Result.from(42, () => "error");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("should return an Ok when the value is Some", () => {
      const result = Result.from(Option.Some(42), () => "error");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("should return an Err when the option is None", () => {
      const result = Result.from(Option.None(), () => "error");
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });
  });

  describe.concurrent("fromPredicate", () => {
    it("should return an Ok when the predicate is true", () => {
      const result = Result.fromPredicate((x) => x > 0, "error", 42);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("should return an Err when the predicate is false", () => {
      const result = Result.fromPredicate((x) => x < 0, "error", 42);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });
  });

  describe.concurrent("collect", () => {
    it("should return an array of Ok values", () => {
      const results = [Result.Ok(1), Result.Ok(2), Result.Ok(3)];

      const collected = Result.collect(results);

      expect(collected.unwrap()).toEqual([1, 2, 3]);
    });

    it('should accumulate the "Err" values', () => {
      const results = [
        Result.Ok(1),
        Result.Err("error 1"),
        Result.Ok(3),
        Result.Err("error 2"),
      ];

      const collected = Result.collect(results);

      expect(collected.unwrapErr()).toEqual(["error 1", "error 2"]);
    });
  });

  describe.concurrent("toOption", () => {
    it("should return Some when the result is Ok", () => {
      const result = Result.Ok(42);

      const option = result.toOption();

      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(42);
    });

    it("should return None when the result is Err", () => {
      const result = Result.Err("error");

      const option = result.toOption();

      expect(option.isNone()).toBe(true);
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

      const value = result.unwrapOr("woah");

      expect(value).toBe(42);
    });

    it("should return the default value when the result is Err", () => {
      const result = Result.Err("error");

      const value = result.unwrapOr(0);

      expect(value).toBe(0);
    });
  });

  describe.concurrent("tap", () => {
    it("should call the provided function when the result is Ok", () => {
      const result = Result.Ok(42);

      const spy = vi.fn();

      result.tap(spy);

      expect(spy).toHaveBeenCalledWith(42);
    });

    it("should call the provided function when the result is Err", () => {
      const result = Result.Err("error");

      const spy = vi.fn();

      result.tap(spy);

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

  describe.concurrent("apply", () => {
    it("should call the provided function when the result is Ok", () => {
      const result = Result.Ok(42);

      const spy = Result.Ok(vi.fn());

      result.apply(spy);

      expect(spy.unwrap()).toHaveBeenCalledWith(42);
    });

    it("should call the provided function when the result is Err", () => {
      const result = Result.Err<string, number>("error");

      const spy = Result.Ok<string, () => number>(vi.fn());

      result.apply(spy);

      expect(spy.unwrap()).not.toHaveBeenCalled();
    });

    it("should not call the provided result when the result is Err", () => {
      const result = Result.from("test", () => "error");

      const spy = Result.Err(vi.fn());

      result.apply(spy as any);

      expect(spy.unwrapErr()).not.toHaveBeenCalled();
    });
  });

  describe.concurrent("toTask", () => {
    it("should return the result", async () => {
      const result = Result.Ok(42);
      const error = Result.Err("error");

      const result2 = result.toTask();
      const error2 = error.toTask();

      expect(await result2).toBe(result);
      expect(await error2).toBe(error);
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
        Result.Ok<string, number>(1),
        Result.Err<string, number>("error 1"),
        Result.Err<string, number>("error 2"),
      ]);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toEqual(["error 1", "error 2"]);
    });
  });
});
