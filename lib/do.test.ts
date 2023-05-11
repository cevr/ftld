import { Do } from "./do";
import { Option, UnwrapNoneError } from "./option";
import { Result } from "./result";
import { Task } from "./task";

describe("Do", () => {
  class SomeError extends Error {
    declare _tag: "SomeError";
  }

  class OtherError extends Error {
    declare _tag: "OtherError";
  }

  it("works", () => {
    const result = Do(function* ($) {
      const a = yield* $(
        Result.from(
          () => 1,
          () => new OtherError()
        )
      );
      const b = yield* $(
        Result.from(
          () => 1,
          () => new SomeError()
        )
      );

      return `${a + b}`;
    });

    expectTypeOf(result).toMatchTypeOf<
      Result<SomeError | OtherError, string>
    >();

    expect(result).toEqual(Result.Ok("2"));
  });

  it("works with Tasks", async () => {
    const result = await Do(async function* ($) {
      const a = yield* $(Task.Ok(1));
      const b = yield* $(Task.Ok(2));
      return a + b;
    });

    expectTypeOf(result).toEqualTypeOf<Result<never, number>>();

    expect(result).toEqual(Result.Ok(3));
  });

  it("should error if any of the monads are errors", () => {
    const result = Do(function* ($) {
      const a = yield* $(Result.Ok(1));
      const b = yield* $(
        Result.from(() => {
          throw "error";
        })
      );

      return Result.Ok(a + b);
    });

    expectTypeOf(result).toMatchTypeOf<Result<unknown, number>>();

    expect(result).toEqual(Result.Err("error"));

    const none = Do(function* ($) {
      const a = yield* $(Option.Some(1));
      const b = yield* $(Option.from(null as number | null));
      return yield* $(Option.Some(a + b));
    });

    expectTypeOf(none).toMatchTypeOf<Result<UnwrapNoneError, number>>();

    expect(none).toEqual(Result.Err(new UnwrapNoneError()));
  });

  it("should handle non monadic values", () => {
    const res = Do(function* ($) {
      const a = yield* $(1);
      const b = yield* $(2);
      return a + b;
    });

    expect(res).toEqual(Result.Ok(3));
  });
});
