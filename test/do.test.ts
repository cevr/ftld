import { UnknownError, UnwrapNoneError } from "../lib/utils";
import { Do } from "../lib/do";
import { Option } from "../lib/option";
import { Result } from "../lib/result";
import { type AsyncTask, type SyncTask, Task } from "../lib/task";

describe("Do", () => {
  class SomeError {
    _tag = "SomeError";
  }

  class OtherError {
    _tag = "OtherError";
  }

  class AnotherError {
    _tag = "AnotherError";
  }

  it("works", () => {
    const result = Do(function* ($) {
      const a = yield* $(Option.Some(1));
      const b = yield* $(
        Result.from(
          () => 1,
          () => new SomeError()
        )
      );
      const c = yield* $(
        Result.from(
          () => 1,
          () => new OtherError()
        )
      );

      return `${a + b + c}`;
    });

    expectTypeOf(result).toEqualTypeOf<
      SyncTask<SomeError | OtherError | UnwrapNoneError, string>
    >();

    expect(result.run()).toEqual(Result.Ok("3"));
  });

  it("works with Tasks", async () => {
    const result = Do(function* ($) {
      const a = yield* $(
        Task.from(
          async () => 1,
          () => new OtherError()
        )
      );
      const b = yield* $(
        Task.from(
          async () => 1,
          () => new SomeError()
        )
      );
      const c = yield* $(Option.Some(1));
      return a + b + c;
    });

    expectTypeOf(result).toEqualTypeOf<
      AsyncTask<SomeError | OtherError | UnwrapNoneError, number>
    >();

    expect(await result.run()).toEqual(Result.Ok(3));
  });

  it("correctly infers asynctask if the return value is async", async () => {
    const result = Do(function* ($) {
      const a = yield* $(
        Task.from(
          () => 1,
          () => new OtherError()
        )
      );
      return Task.from(
        async () => a + 2,
        () => new SomeError()
      );
    });

    expectTypeOf(result).toEqualTypeOf<
      AsyncTask<SomeError | OtherError, number>
    >();

    expect(await result.run()).toEqual(Result.Ok(3));
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

    expectTypeOf(result).toEqualTypeOf<
      AsyncTask<OtherError | UnwrapNoneError | SomeError | UnknownError, number>
    >();

    expect(await result.run()).toEqual(Result.Ok(4));
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
          async () => {
            throw 1;
            // @ts-expect-error
            return 1;
          },
          () => new SomeError()
        )
      );
      const c = yield* $(Option.Some(1));
      return a + b + c;
    });

    expectTypeOf(result).toEqualTypeOf<
      AsyncTask<SomeError | OtherError | UnwrapNoneError, number>
    >();
    const res = await result.run();
    expect(res.unwrapErr()).toStrictEqual(new SomeError());
  });

  it("handles error overrides", async () => {
    const task1 = Do(function* ($) {
      yield* $(Option.from(null as number | null), () => new AnotherError());
    });
    const task2 = Do(function* ($) {
      yield* $(
        Result.from(
          () => {
            throw "";
          },
          () => new SomeError()
        ),
        () => new AnotherError()
      );
    });

    const task3 = Do(function* ($) {
      yield* $(
        Task.from(
          () => Promise.reject(1),
          () => new SomeError()
        ),
        () => new AnotherError()
      );
    });

    const task4 = Do(function* ($) {
      yield* $(Promise.reject(1), () => new AnotherError());
    });

    expectTypeOf(task1).toEqualTypeOf<SyncTask<AnotherError, void>>();
    const res1 = task1.run();
    const res2 = task2.run();
    const res3 = await task3.run();
    const res4 = await task4.run();
    expect(res1.unwrapErr()).toStrictEqual(new AnotherError());
    expect(res2.unwrapErr()).toStrictEqual(new AnotherError());
    expect(res3.unwrapErr()).toStrictEqual(new AnotherError());
    expect(res4.unwrapErr()).toStrictEqual(new AnotherError());
  });

  it("handles async errors", async () => {
    const result = Do(function* ($) {
      const a = yield* $(
        Result.from(
          () => {
            throw 1;
            // @ts-expect-error
            return 1;
          },
          () => new OtherError()
        )
      );
      const b = yield* $(Option.from(null as number | null));
      const c = yield* $(
        Task.from(
          () => Promise.reject(1),
          () => new SomeError()
        )
      );
      return a + b + c;
    });

    expectTypeOf(result).toEqualTypeOf<
      AsyncTask<SomeError | OtherError | UnwrapNoneError, number>
    >();

    expect(await result.run()).toEqual(Result.Err(new OtherError()));
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

    expectTypeOf(result).toEqualTypeOf<SyncTask<UnknownError, number>>();

    expect(result.run().unwrapErr()).toEqual(new UnknownError("error"));

    const none = Do(function* ($) {
      const a = yield* $(Option.Some(1));
      const b = yield* $(Option.from(null as number | null));
      return a + b;
    });

    expectTypeOf(none).toEqualTypeOf<SyncTask<UnwrapNoneError, number>>();

    expect(none.run()).toEqual(Result.Err(new UnwrapNoneError()));
  });

  it("should handle non monadic values", () => {
    const res = Do(function* ($) {
      const a = yield* $(1);
      const b = yield* $(2);
      return a + b;
    });

    expectTypeOf(res).toEqualTypeOf<SyncTask<UnknownError, number>>();
    expect(res.run()).toEqual(Result.Ok(3));
  });

  it("should work without a return statement", async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const res = Do(function* ($) {
      fn1();
      const a = yield* $(Task.Ok(Promise.resolve(1)));
      const b = yield* $(Task.Ok(2));
      fn2(a + b);
    });

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
    expectTypeOf(res).toEqualTypeOf<AsyncTask<never, void>>();
    expect((await res.run()).unwrap()).toEqual(undefined);
    expect(fn1).toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledWith(3);
  });

  it("should unwrap a generator return value", () => {
    const res = Do(function* ($) {
      const a = yield* $(1);
      const b = yield* $(2);
      return $(a + b);
    });

    expectTypeOf(res).toEqualTypeOf<SyncTask<UnknownError, number>>();
    expect(res.run()).toEqual(Result.Ok(3));
  });

  it("should infer as an AsyncTask if any of the generators return a Promise or AsyncTask", async () => {
    const res = Do(function* ($) {
      const a = yield* $(1);
      const b = yield* $(Task.from(() => Promise.resolve(2)));
      return a + b;
    });

    expectTypeOf(res).toEqualTypeOf<AsyncTask<UnknownError, number>>();
    expect(await res.run()).toEqual(Result.Ok(3));
  });

  it("should infer an AsyncTask if any of the generators return a Promise or AsyncTask, even if the return value is generic", async () => {
    const generic = <T>(a: unknown) => Task.from(() => Promise.resolve(a as T));
    const res = Do(function* ($) {
      const a = yield* $(1);
      const b = yield* $(Task.from(() => Promise.resolve(2)));
      return $(generic<number>(a + b));
    });

    expectTypeOf(res).toEqualTypeOf<AsyncTask<UnknownError, number>>();
    expect(await res.run()).toEqual(Result.Ok(3));
  });

  it("should be able to infer a task if all of the generators return non async values but the final return value is generic", async () => {
    const generic = <T>(a: unknown) => Task.from(() => Promise.resolve(a as T));
    const res = Do(function* ($) {
      const a = yield* $(1);
      const b = yield* $(Task.from(() => 2));
      return $(generic<number>(a + b));
    });

    expectTypeOf(res).toEqualTypeOf<AsyncTask<UnknownError, number>>();
    expect(await res.run()).toEqual(Result.Ok(3));
  });
});
