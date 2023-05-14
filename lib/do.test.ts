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

      const c = yield* $(Option.Some(1));

      return `${a + b + c}`;
    });

    expectTypeOf(result).toMatchTypeOf<
      Result<SomeError | OtherError | UnwrapNoneError, string>
    >();

    expect(result).toEqual(Result.Ok("3"));
  });

  it("works with Tasks", async () => {
    const result = Do(function* ($) {
      const a = yield* $(
        Task.from(
          () => 1,
          () => new OtherError()
        )
      );
      const b = yield* $(
        Task.from(
          () => 1,
          () => new SomeError()
        )
      );
      const c = yield* $(Option.Some(1));
      return a + b + c;
    });

    expectTypeOf(result).toMatchTypeOf<
      Task<SomeError | OtherError | UnwrapNoneError, number>
    >();

    expect(await result).toEqual(Result.Ok(3));
  });

  it("returns a task if it contains any promises", async () => {
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
      const c = yield* $(Option.from(1 as number | null));
      const d = yield* $(Promise.resolve(1));
      return a + b + c + d;
    });

    expectTypeOf(result).toMatchTypeOf<Task<unknown, number>>();

    expect(await result).toEqual(Result.Ok(4));
  });

  it("handles Task errors", async () => {
    const result = Do(function* ($) {
      const a = yield* $(
        Task.from(
          () => 1,
          () => new OtherError()
        )
      );
      const b = yield* $(
        Task.from(
          () => {
            throw 1;
            return 1;
          },
          () => new SomeError()
        )
      );
      const c = yield* $(Option.Some(1));
      return a + b + c;
    });

    expectTypeOf(result).toMatchTypeOf<
      Task<SomeError | OtherError | UnwrapNoneError, number>
    >();

    expect(await result).toEqual(Result.Err(new SomeError()));
  });

  it("handles promise errors", async () => {
    const result = Do(function* ($) {
      const a = yield* $(
        Task.from(
          () => 1,
          () => new OtherError()
        )
      );
      const b = yield* $(
        Task.from(
          () => Promise.reject(1),
          () => new SomeError()
        )
      );
      const c = yield* $(Option.Some(1));
      return a + b + c;
    });

    expectTypeOf(result).toMatchTypeOf<
      Task<SomeError | OtherError | UnwrapNoneError, number>
    >();

    expect(await result).toEqual(Result.Err(new SomeError()));
  });

  it("should error if any of the monads are errors", () => {
    const result = Do(function* ($) {
      const a = yield* $(Result.Ok(1));
      const b = yield* $(
        Result.from(() => {
          throw "error";
        })
      );

      return a + b;
    });

    expectTypeOf(result).toMatchTypeOf<Result<unknown, number>>();

    expect(result).toEqual(Result.Err("error"));

    const none = Do(function* ($) {
      const a = yield* $(Option.Some(1));
      const b = yield* $(Option.from(null as number | null));
      return a + b;
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

    expectTypeOf(res).toMatchTypeOf<Result<never, number>>();
    expect(res).toEqual(Result.Ok(3));
  });
});
