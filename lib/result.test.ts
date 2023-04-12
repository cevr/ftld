import { Option } from "./option";
import { Result } from "./result";

describe("Result", () => {
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

  describe("Ok", () => {
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

    it("should reduce an Ok value", () => {
      const ok = Result.Ok(42);
      const initialValue = 0;
      const reducedValue = ok.reduce(
        (accumulator, currentValue) => accumulator + currentValue,
        initialValue
      );
      expect(reducedValue).toBe(42);
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

  describe("Err", () => {
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
      const err = Result.Err<string, number>("error");
      const value = err.fold(
        (e) => "Error: " + e,
        (x) => "Ok: " + x
      );
      expect(value).toBe("Error: error");
    });

    it("should not reduce an Err value", () => {
      const err = Result.Err<string, number>("error");
      const initialValue = 0;
      const reducedValue = err.reduce(
        (accumulator, currentValue) => accumulator + currentValue,
        initialValue
      );
      expect(reducedValue).toBe(initialValue);
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

  describe("tryCatch", () => {
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

  describe("every", () => {
    it("should return an Ok when all values are Ok", () => {
      const results = [
        Result.Ok<string, number>(1),
        Result.Ok<string, number>(2),
        Result.Ok<string, number>(3),
      ];

      const combined = Result.every(results);

      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2, 3]);
    });

    it("should return the first Err value encountered", () => {
      const results = [
        Result.Ok<string, number>(1),
        Result.Err<string, number>("error 1"),
        Result.Ok<string, number>(3),
        Result.Err<string, number>("error 2"),
      ];

      const combined = Result.every(results);

      expect(combined.isErr()).toBe(true);
      expect(combined.unwrapErr()).toBe("error 1");
    });
  });

  describe("any", () => {
    it("should return the first Ok value encountered", () => {
      const results = [
        Result.Err<string, number>("error 1"),
        Result.Ok<string, number>(2),
        Result.Err<string, number>("error 2"),
        Result.Ok<string, number>(4),
      ];

      const combined = Result.any(results);

      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toBe(2);
    });

    it("should return an Err when all values are Err", () => {
      const results = [
        Result.Err<string, number>("error 1"),
        Result.Err<string, number>("error 2"),
        Result.Err<string, number>("error 3"),
      ];

      const combined = Result.any(results);

      expect(combined.isErr()).toBe(true);
      expect(combined.unwrapErr()).toEqual("error 1");
    });
  });

  describe("sequence", () => {
    it("should return an Ok when all values are Ok", () => {
      const results = [
        Result.Ok<string, number>(1),
        Result.Ok<string, number>(2),
        Result.Ok<string, number>(3),
      ];

      const combined = Result.sequence(results);

      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2, 3]);
    });

    it("should return the first Err value encountered", () => {
      const results = [
        Result.Ok<string, number>(1),
        Result.Err<string, number>("error 1"),
        Result.Ok<string, number>(3),
        Result.Err<string, number>("error 2"),
      ];

      const combined = Result.sequence(results);

      expect(combined.isErr()).toBe(true);
      expect(combined.unwrapErr()).toBe("error 1");
    });
  });

  describe("traverse", () => {
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
      const expectedResult = Result.Ok<string, number[]>([]);

      const result = Result.traverse(input, double);

      expect(result).toEqual(expectedResult);
    });
  });

  describe("fromNullable", () => {
    it("should return an Ok when the value is not null", () => {
      const result = Result.fromNullable("error", 42);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("should return an Err when the value is null", () => {
      const result = Result.fromNullable("error", null);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });
  });

  describe("fromPredicate", () => {
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

  describe("fromOption", () => {
    it("should return an Ok when the option is Some", () => {
      const result = Result.fromOption("error", Option.Some(42));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("should return an Err when the option is None", () => {
      const result = Result.fromOption("error", Option.None());
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });
  });

  describe("collect", () => {
    it("should return an array of Ok values", () => {
      const results = [
        Result.Ok<string, number>(1),
        Result.Ok<string, number>(2),
        Result.Ok<string, number>(3),
      ];

      const collected = Result.collect(results);

      expect(collected.unwrap()).toEqual([1, 2, 3]);
    });

    it('should accumulate the "Err" values', () => {
      const results = [
        Result.Ok<string, number>(1),
        Result.Err<string, number>("error 1"),
        Result.Ok<string, number>(3),
        Result.Err<string, number>("error 2"),
      ];

      const collected = Result.collect(results);

      expect(collected.unwrapErr()).toEqual(["error 1", "error 2"]);
    })
  });
});
