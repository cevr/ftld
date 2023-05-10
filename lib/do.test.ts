import { Do, Unwrapper } from "./do";
import { Option, UnwrapNoneError } from "./option";
import { Result } from "./result";
import { Task } from "./task";

describe("Do", () => {
  class SomeError extends Error {}
  class OtherError extends Error {}
  it("works", () => {
    const gen = function* ($: Unwrapper) {
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
      return a + b;
    };
    const result = Do(gen);

    expect(result).toEqual(Result.Ok(2));
  });

  it("works with Tasks", async () => {
    const gen = async function* ($: Unwrapper) {
      const a = yield* $(Task.Ok(1));
      const b = yield* $(Task.Ok(2));
      return a + b;
    };
    const result = await Do(gen);

    expect(result).toEqual(Result.Ok(3));
  });

  it("should error if any of the monads are errors", () => {
    const result = Do(function* ($) {
      const a = yield* $(Result.Ok(1));
      const b = yield* $(
        Result.from(() => {
          throw "error";
          return 1;
        })
      );
      return Result.Ok(a + b);
    });

    const none = Do(function* ($) {
      const a = yield* $(Option.Some(1));
      const b = yield* $(Option.from(null as number | null));
      return $(Option.Some(a + b));
    });

    expect(result).toEqual(Result.Err("error"));
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
