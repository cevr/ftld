import { UnwrapNoneError } from "./utils.js";
import { Do } from "./do.js";
import { Option } from "./option.js";
import { Result } from "./result.js";
import { type AsyncTask, type SyncTask, Task } from "./task.js";
import { request } from "undici";

describe("Do", () => {
  class SomeError {
    _tag = "SomeError" as const;
  }

  class OtherError {
    _tag = "OtherError" as const;
  }

  class AnotherError {
    _tag = "AnotherError" as const;
  }

  it("works", () => {
    const result = Do(function* () {
      const a = yield* Option.Some(1);
      const b = yield* Result.from(
        () => 1,
        () => new SomeError()
      );
      const c = yield* Result.from(
        () => 1,
        () => new OtherError()
      );

      return `${a + b + c}`;
    });

    expectTypeOf(result).toEqualTypeOf<
      SyncTask<string, SomeError | OtherError | UnwrapNoneError>
    >();

    expect(result.run()).toEqual(Result.Ok("3"));
  });

  it("works with Tasks", async () => {
    const result = Do(function* () {
      const a = yield* Task.from(
        async () => 1,
        () => new OtherError()
      );
      const b = yield* Task.from(
        async () => 1,
        () => new SomeError()
      );
      const c = yield* Option.Some(1);
      return a + b + c;
    });

    expectTypeOf(result).toEqualTypeOf<
      AsyncTask<number, SomeError | OtherError | UnwrapNoneError>
    >();

    expect(await result.run()).toEqual(Result.Ok(3));
  });

  it("correctly infers asynctask if the return value is async", async () => {
    const result = Do(function* () {
      const a = yield* Task.from(
        () => 1,
        () => new OtherError()
      );
      return Task.from(
        async () => a + 2,
        () => new SomeError()
      );
    });

    expectTypeOf(result).toEqualTypeOf<
      AsyncTask<number, SomeError | OtherError>
    >();

    expect(await result.run()).toEqual(Result.Ok(3));
  });

  it("handles Task errors", async () => {
    const result = Do(function* () {
      const a = yield* Task.from(
        () => 1,
        () => new OtherError()
      );
      const b = yield* Task.from(
        async () => {
          throw 1;
          // @ts-expect-error
          return 1;
        },
        () => new SomeError()
      );
      const c = yield* Option.Some(1);
      return a + b + c;
    });

    expectTypeOf(result).toEqualTypeOf<
      AsyncTask<number, SomeError | OtherError | UnwrapNoneError>
    >();
    const res = await result.run();
    expect(res.unwrapErr()).toStrictEqual(new SomeError());
  });

  it("handles async errors", async () => {
    const result = Do(function* () {
      const a = yield* Result.from(
        () => {
          throw 1;
          // @ts-expect-error
          return 1;
        },
        () => new OtherError()
      );
      const b = yield* Option.from(null as number | null);
      const c = yield* Task.from(
        async () => Result.Err(1),
        () => new SomeError()
      );
      return a + b + c;
    });

    expectTypeOf(result).toEqualTypeOf<
      AsyncTask<number, SomeError | OtherError | UnwrapNoneError>
    >();

    expect(await result.run()).toEqual(Result.Err(new OtherError()));
  });

  it("should error if any of the monads are errors", () => {
    const result = Do(function* () {
      const a = yield* Result.Ok(1);
      const b = yield* Result.Err("error");

      return a + b;
    });

    expectTypeOf(result).toEqualTypeOf<SyncTask<number, string>>();

    expect(result.run().unwrapErr()).toEqual("error");

    const none = Do(function* () {
      const a = yield* Option.Some(1);
      const b = yield* Option.from(null as number | null);
      return a + b;
    });

    expectTypeOf(none).toEqualTypeOf<SyncTask<number, UnwrapNoneError>>();

    expect(none.run()).toEqual(Result.Err(new UnwrapNoneError()));
  });

  it("should work without a return statement", async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const res = Do(function* () {
      fn1();
      const a = yield* Task.from(() => Promise.resolve(1));
      const b = yield* Task.from(() => 2);
      fn2(a + b);
    });

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
    expectTypeOf(res).toEqualTypeOf<AsyncTask<void>>();
    expect((await res.run()).unwrap()).toEqual(undefined);
    expect(fn1).toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledWith(3);
  });

  it("should unwrap a generator return value", () => {
    const res = Do(function* () {
      const a = yield* Result.Ok(1);
      const b = yield* Result.Ok(2);
      return Result.Ok(a + b);
    });

    expectTypeOf(res).toEqualTypeOf<SyncTask<number, never>>();
    expect(res.run()).toEqual(Result.Ok(3));
  });

  it("should infer as an AsyncTask if any of the generators return a Promise or AsyncTask", async () => {
    const res = Do(function* () {
      const a = yield* Result.Ok(1);
      const b = yield* Task.from(() => Promise.resolve(2));
      return a + b;
    });

    expectTypeOf(res).toEqualTypeOf<AsyncTask<number, unknown>>();
    expect(await res.run()).toEqual(Result.Ok(3));
  });

  it("should infer an AsyncTask if any of the generators return a Promise or AsyncTask, even if the return value is generic", async () => {
    class SomeError {
      _tag = "SomeError" as const;
    }

    const generic = <T>(a: unknown) => Task.from(() => Promise.resolve(a as T));
    const res = Do(function* () {
      const a = yield* Result.Ok(1);
      const b = yield* Task.from(() => Promise.resolve(2));
      const c = yield* generic<number>(a + b);

      return c;
    });

    const genericDo = <T>() =>
      Do(function* () {
        yield* Task.from(
          () =>
            request("https://example.com").then(
              (res) => res.body.text() as Promise<T>
            ),
          () => new SomeError()
        );
        const b = yield* Task.from(
          async () =>
            request("https://example.com").then(
              (res) => res.body.text() as Promise<T>
            ),
          () => new OtherError()
        );
        return b;
      });

    const res2 = genericDo<string>();
    expectTypeOf(res2).toEqualTypeOf<
      AsyncTask<string, SomeError | OtherError>
    >();
    expectTypeOf(res).toEqualTypeOf<AsyncTask<number>>();
    expect(await res.run()).toEqual(Result.Ok(3));
  });

  it("should be able to infer a task if all of the generators return non async values but the final return value is generic", async () => {
    const generic = <T>(a: unknown) => Task.from(() => Promise.resolve(a as T));
    const res = Do(function* () {
      const a = yield* Result.Ok(1);
      const b = yield* Task.from(() => 2);
      return generic<number>(a + b);
    });

    expectTypeOf(res).toEqualTypeOf<AsyncTask<number>>();
    expect(await res.run()).toEqual(Result.Ok(3));
  });

  it("should infer error types for all monadic return values", async () => {
    const res1 = Do(function* () {
      const a = yield* Task.from(
        async () => 1,
        () => new SomeError()
      );
      const b = yield* Task.from(
        async () => 2,
        () => new OtherError()
      );
      return Result.from(
        () => a + b,
        () => new AnotherError()
      );
    });

    const res2 = Do(function* () {
      const a = yield* Task.from(
        async () => 1,
        () => new SomeError()
      );
      const b = yield* Task.from(
        async () => 2,
        () => new OtherError()
      );
      return Option.from(a + b);
    });

    expectTypeOf(res1).toEqualTypeOf<
      AsyncTask<number, SomeError | OtherError | AnotherError>
    >();
    expectTypeOf(res2).toEqualTypeOf<
      AsyncTask<Option<number>, SomeError | OtherError | UnwrapNoneError>
    >();

    const result2 = await res2.run();

    console.log(result2);

    expect(await res1.run()).toEqual(Result.Ok(3));
    expect(await res2.run()).toEqual(Result.Ok(3));
  });

  it("should able to reuse a Do expression", async () => {
    const res = Do(function* () {
      const a = yield* Task.from(async () => 1);
      const b = yield* Option.from(2);
      return a + b;
    });

    let result = res.run();
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toEqual(Result.Ok(3));

    let result2 = res.run();
    expect(result2).toBeInstanceOf(Promise);
    expect(await result2).toEqual(Result.Ok(3));
  });

  it("should be lazy", async () => {
    const task = Do(function* () {
      yield* Task.sleep(100);
      return Date.now();
    });

    const resultA = await task.run();
    const resultB = await task.run();

    expect(resultA.unwrap()).not.toEqual(resultB.unwrap());
    expect(resultA.unwrap()).toBeLessThan(resultB.unwrap());
  });

  it("should unwrap nested monads", async () => {
    const task = Do(function* () {
      const x = yield* Task.from(() =>
        Promise.resolve(
          Result.from(() =>
            Option.Some(
              Result.from(() =>
                Option.Some(Task.from(() => Promise.resolve(1)))
              )
            )
          )
        )
      );
      // @ts-expect-error types wont reflect the unwrapping
      return x + 3;
    });

    expect(await task.run()).toEqual(Result.Ok(4));
  });

  it("should not unwrap the return value unless it is a generator", async () => {
    const task = Do(function* () {
      const x = yield* Result.Ok(1);
      const y = yield* Result.Ok(2);
      return Result.Ok(x + y);
    });

    const task2 = Do(function* () {
      const x = yield* Result.Ok(1);
      const y = yield* Result.Ok(2);
      const z = yield* Option.Some(3);
      return Option.Some(x + y + z);
    });

    const task3 = Do(function* () {
      const x = yield* Result.Ok(1);
      const y = yield* Result.Ok(2);
      const z = yield* Option.Some(3);
      return yield* Option.Some(x + y + z);
    });

    expectTypeOf(task).toEqualTypeOf<SyncTask<number, never>>();
    expectTypeOf(task2).toEqualTypeOf<
      SyncTask<Option<number>, UnwrapNoneError>
    >();
    expectTypeOf(task3).toEqualTypeOf<SyncTask<number, UnwrapNoneError>>();

    expect(task.run()).toEqual(Result.Ok(3));
    expect(task2.run()).toEqual(Result.Ok(6));
    expect(task3.run()).toEqual(Result.Ok(6));
  });

  it("it should properly handle Task/Result Err when they are returned", () => {
    const task = Do(function* () {
      return Result.Err(1);
    });
    const task2 = Do(function* () {
      return Task.from(() => Result.Err(1));
    });
    const task3 = Do(function* () {
      return yield* Result.Err(1);
    });
    const task4 = Do(function* () {
      return yield* Task.from(() => Result.Err(1));
    });

    expectTypeOf(task).toEqualTypeOf<SyncTask<never, number>>();
    expectTypeOf(task2).toEqualTypeOf<SyncTask<never, number>>();
    expectTypeOf(task3).toEqualTypeOf<SyncTask<never, number>>();
    expectTypeOf(task4).toEqualTypeOf<SyncTask<never, number>>();
    expect(task.run()).toEqual(Result.Err(1));
    expect(task2.run()).toEqual(Result.Err(1));
    expect(task3.run()).toEqual(Result.Err(1));
    expect(task4.run()).toEqual(Result.Err(1));
  });
});
