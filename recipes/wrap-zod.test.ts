import { z } from "zod";
import { wrapZod } from "./wrap-zod";
import { Result } from "../lib";

describe.concurrent("wrapZod", () => {
  class CustomError extends Error {}

  const emailSchema = wrapZod(z.string().email());

  it("should return Ok if the value is valid", () => {
    const email = emailSchema("test@test.com");
    expectTypeOf(email).toEqualTypeOf<Result<z.ZodIssue[], string>>();
    expect(email).toEqual(Result.Ok("test@test.com"));
  });

  it("should return Err if the value is invalid", () => {
    const email = emailSchema("test");
    expectTypeOf(email).toEqualTypeOf<Result<z.ZodIssue[], string>>();
    expect(email).toEqual(
      Result.Err([
        {
          code: "invalid_string",
          message: "Invalid email",
          validation: "email",
          path: [],
        },
      ])
    );
  });

  it("should return Err with custom error if the value is invalid", () => {
    const email = emailSchema("test", () => new CustomError());
    expectTypeOf(email).toEqualTypeOf<Result<CustomError, string>>();
    expect(email).toEqual(Result.Err(new CustomError()));
  });
});
