import { Brand } from "./brand";
import { Result } from "./result";

declare const IntTypeId: unique symbol;

describe.concurrent("Brand", () => {
  type Int = Brand<number, typeof IntTypeId>;
  it("nominal", () => {
    const Int = Brand<Int>();
    expect(Int(1)).toEqual(1);
  });

  it("refined", () => {
    const RefinedInt = Brand<Error, Int>({
      validate: (n) => Number.isInteger(n),
      onErr: (n) => new Error(`Expected ${n} to be an integer`),
    });

    type PositiveNumber = Brand<number, "Positive">;
    const Positive = Brand<Error, PositiveNumber>({
      validate: (n) => n > 0,
      onErr: (n) => new Error(`Expected ${n} to be positive`),
    });

    type PositiveInt = PositiveNumber & Int;
    const PositiveInt = Brand.compose(RefinedInt, Positive);
    expect(RefinedInt(1)).toEqual(Result.Ok(1));
    expect(RefinedInt(1.1)).toEqual(
      Result.Err(new Error("Expected 1.1 to be an integer"))
    );
    expect(PositiveInt(1)).toEqual(Result.Ok(1));
    expect(PositiveInt(1.1)).toEqual(
      Result.Err([new Error("Expected 1.1 to be an integer")])
    );
    expect(PositiveInt(-1.1)).toEqual(
      Result.Err([
        new Error("Expected -1.1 to be an integer"),
        new Error("Expected -1.1 to be positive"),
      ])
    );
  });
});
