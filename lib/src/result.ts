import { _value, _tag, OK, ERR } from "./internals.js";
import { UnknownError, identity, isResult } from "./utils.js";

export class Result<E, A> {
  [_tag]: symbol;
  [_value]: E | A;

  constructor(tag: symbol, value: E | A) {
    this[_tag] = tag;
    this[_value] = value;
  }

  /**
   * Creates an Ok variant of the Result.
   */
  static Ok(): Result<never, void>;
  static Ok<A>(value: A): Result<never, A>;
  static Ok<A>(value?: A): Result<never, A> {
    // @ts-expect-error
    return new Result(OK, value);
  }
  /**
   * Creates an Err variant of the Result.
   */
  static Err(): Result<void, never>;
  static Err<E>(error: E): Result<E, never>;
  static Err<E>(error?: E): Result<E, never> {
    // @ts-expect-error
    return new Result(ERR, error);
  }
  /**
   * Creates a Result based on a predicate function.
   */
  static fromPredicate<E, A, B extends A>(
    value: A,
    predicate: (a: A) => a is B,
    onErr: (a: A) => E
  ): Result<E, B>;
  static fromPredicate<E, A>(
    value: A,
    predicate: (a: A) => boolean,
    onErr: (a: A) => E
  ): Result<E, A>;
  // @ts-expect-error
  static fromPredicate(value, predicate, onErr) {
    if (predicate(value)) {
      return Result.Ok(value);
    }

    return Result.Err(onErr(value));
  }
  /**
   * Creates a Result from a value or a function returning a value.
   */
  static from<A, E = UnknownError>(
    getter: () => A,
    onErr?: (e: unknown) => E
  ): 0 extends 1 & A
    ? Result<E, unknown>
    : [A] extends [never]
    ? Result<E, never>
    : A extends Result<infer E, infer V>
    ? Result<E, V>
    : Result<E, A> {
    try {
      const value = getter();

      if (isResult(value)) {
        // @ts-expect-error
        return value;
      }

      return Result.Ok(value) as any;
    } catch (e) {
      return Result.Err(onErr ? onErr(e) : new UnknownError(e)) as any;
    }
  }
  /**
   * Type guard for Ok variant of Result.
   */
  static isOk<T extends Result<unknown, unknown>>(result: T): boolean {
    return result.isOk();
  }
  /**
   * Type guard for Err variant of Result.
   */
  static isErr<T extends Result<unknown, unknown>>(result: T): boolean {
    return result.isErr();
  }

  /**
   * Traverses a list and applies a function to each element, returning a Result with the transformed elements.
   */
  static traverse<
    E,
    B,
    const Collection extends
      | unknown[]
      | [unknown, ...unknown[]]
      | readonly [unknown, ...unknown[]]
      | readonly unknown[]
  >(
    list: Collection,
    f: (a: Collection[number]) => Result<E, B>
  ): Result<
    E,
    Compute<{
      [K in keyof Collection]: B;
    }>
  > {
    let result = [];

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const res = f(item);
      if (res.isErr()) {
        return res as any;
      }
      result.push(res.unwrap());
    }
    return Result.Ok(result) as any;
  }
  /**
   * alls a list of Results, returning a single Result with the collected values.
   */
  static all<
    const TResults extends
      | Result<unknown, unknown>[]
      | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | readonly [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | readonly Result<unknown, unknown>[]
  >(
    list: TResults
  ): Result<CollectErrors<TResults>[number], CollectValues<TResults>> {
    // @ts-expect-error
    return Result.traverse(list, identity);
  }
  /**
   * Returns the first successful Result in a list of Results.
   */
  static any<
    const TResults extends
      | Result<unknown, unknown>[]
      | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | readonly [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | readonly Result<unknown, unknown>[]
  >(
    collection: TResults
  ): Result<
    CollectErrors<TResults>[number] | EmptyArrayError,
    CollectValues<TResults>[number]
  > {
    if (collection.length === 0) {
      return Result.Err(new EmptyArrayError());
    }
    return collection.find(Result.isOk) ?? (collection[0] as any);
  }

  /**
   * Coalesces a list of Results into a single Result with the combined values and errors.
   */
  static coalesce<
    const TResults extends
      | Result<unknown, unknown>[]
      | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | readonly [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | readonly Result<unknown, unknown>[]
  >(
    collection: TResults
  ): Result<CollectErrors<TResults>, CollectValues<TResults>> {
    let hasError = false;
    let errors: any = [];
    let values: any = [];

    for (let i = 0; i < collection.length; i++) {
      const result = collection[i];
      if (!result) continue;
      if (Result.isOk(result)) {
        values.push(result.unwrap());
      } else {
        hasError = true;
        errors.push(result.unwrapErr());
      }
    }

    if (hasError) return Result.Err(errors);
    return Result.Ok(values);
  }

  /**
   * Validates a list of Results, returning a single Result with the collected errors, otherwise the Ok Result at index 0.
   */
  static validate<
    const TResults extends
      | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | readonly [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
  >(
    collection: EnsureCommonBase<TResults>
  ): Result<CollectErrors<TResults>, CollectValues<TResults>[number]> {
    let hasError = false;
    let firstResult: Result<unknown, unknown> | undefined;
    let errors: any = Array.isArray(collection) ? [] : {};
    const keys = (
      Array.isArray(collection) ? collection : Object.keys(collection)
    ) as (string | number)[];
    for (let i = 0; i < keys.length; i++) {
      const key = (Array.isArray(collection) ? i : keys[i])!;
      const result = (collection as any)[key];
      if (firstResult === undefined) {
        firstResult = result;
      }
      if (Result.isErr(result)) {
        hasError = true;
        if (Array.isArray(collection)) {
          errors.push(result.unwrapErr());
        } else {
          errors[key] = result.unwrapErr();
        }
      }
    }

    if (hasError) return Result.Err(errors);
    return firstResult as any;
  }

  /**
   * Settles a collection of Results. Each Result is converted into a SettledResult.
   */
  static settle<
    const TResults extends
      | Result<unknown, unknown>[]
      | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | readonly [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | readonly Result<unknown, unknown>[]
  >(
    collection: TResults
  ): {
    [K in keyof TResults]: TResults[K] extends Result<infer E, infer A>
      ? SettledResult<E, A>
      : never;
  } & {} {
    let results: any = [];

    for (let i = 0; i < collection.length; i++) {
      const result = collection[i];
      if (!result) continue;
      results[i] = result.settle();
    }
    return results;
  }

  /**
   * Maps the error value if the Result is Err; does nothing if the Result is Ok.
   */
  mapErr<F>(f: (e: E) => F): any {
    if (this[_tag] === ERR) {
      return Result.Err(f(this[_value] as any));
    } else {
      return this;
    }
  }

  /**
   * Maps the Ok value using the provided function; does nothing if the Result is Err.
   */
  map<B>(f: (a: A) => B): Result<E, B> {
    if (this[_tag] === OK) {
      return Result.Ok(f(this[_value] as any));
    } else {
      // @ts-expect-error
      return this;
    }
  }

  /**
   * Flat-maps the contained value using the provided function - merging the Results; does nothing if the Result is Err.
   */
  flatMap<B, _T = ToResult<B>>(
    f: (a: A) => B
  ): B extends Promise<unknown>
    ? never
    : _T extends Result<infer F, infer B>
    ? Result<E | F, B>
    : never {
    if (this[_tag] === ERR) {
      // @ts-expect-error
      return this;
    }

    const result = f(this[_value] as any);
    // @ts-expect-error
    return Result.from(() => result);
  }

  /**
   * Flat-maps the contained error using the provided function - merging the Results; does nothing if the Result is Ok.
   */
  recover<B, _T = ToResult<B>>(
    f: (e: E) => B
  ): B extends Promise<unknown>
    ? never
    : _T extends Result<infer F, infer B>
    ? Result<F, A | B>
    : never {
    if (this[_tag] === OK) {
      // @ts-expect-error
      return this;
    }

    const result = f(this[_value] as any);
    // @ts-expect-error
    return Result.from(() => result);
  }

  /**
   * Inverts the Result - Ok becomes Err and vice versa.
   */
  inverse(): Result<A, E> {
    if (this[_tag] === OK) {
      // @ts-expect-error
      return Result.Err(this[_value]);
    } else {
      // @ts-expect-error
      return Result.Ok(this[_value]);
    }
  }

  /**
   * Unwraps the contained value. Throws an error if called on an Err instance.
   */
  unwrap(): A {
    if (this[_tag] === ERR) {
      throw this[_value];
    }
    // @ts-expect-error
    return this[_value];
  }

  /**
   * Unwraps the contained error. Throws an error if called on an Ok instance.
   */
  unwrapErr(): E {
    if (this[_tag] === OK) {
      throw this[_value];
    }
    // @ts-expect-error
    return this[_value];
  }

  /**
   * Returns the contained value or the provided default value.
   */
  unwrapOr<B extends A, C>(
    fallback: [A] extends [never] ? C | (() => C) : B | (() => B)
  ): A | B | C {
    if (this[_tag] === ERR) {
      return fallback instanceof Function ? fallback() : fallback;
    }
    // @ts-expect-error
    return this[_value];
  }

  /**
   * Checks if the Result is an Ok instance.
   */
  isOk(): boolean {
    return this[_tag] === OK;
  }

  /**
   * Checks if the Result is an Err instance.
   */
  isErr(): boolean {
    return this[_tag] === ERR;
  }

  /**
   * Matches the Result using provided functions and returns the result.
   */
  match<F = E, B = A>(cases: {
    Err: (value: E) => F;
    Ok: (value: A) => B;
  }): F | B {
    return this[_tag] === OK
      ? cases.Ok(this[_value] as any)
      : cases.Err(this[_value] as any);
  }

  /**
   * Executes the provided function with the contained value and returns the unchanged Result; Does nothing if the Result is Err.
   */
  tap(f: (a: A) => void): Result<E, A> {
    if (this[_tag] === OK) {
      // @ts-expect-error
      f(this[_value]);
    }
    return this;
  }

  /**
   * Executes the provided function with the contained error and returns the unchanged Result; Does nothing if the Result is Ok.
   */
  tapErr(f: (a: E) => void): Result<E, A> {
    if (this[_tag] === ERR) {
      // @ts-expect-error
      f(this[_value]);
    }
    return this;
  }

  settle(): SettledResult<E, A> {
    if (this[_tag] === ERR) {
      return {
        type: "Err",
        // @ts-expect-error
        error: this[_value],
      };
    }
    return {
      type: "Ok",
      // @ts-expect-error
      value: this[_value],
    };
  }
}

type CollectErrors<
  T extends
    | Result<unknown, unknown>[]
    | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
    | readonly [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
    | readonly Result<unknown, unknown>[]
> = {
  [K in keyof T]: T[K] extends Result<infer E, any> ? E : never;
} & {};

type CollectValues<
  T extends
    | Result<unknown, unknown>[]
    | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
    | readonly [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
    | readonly Result<unknown, unknown>[]
> = {
  [K in keyof T]: T[K] extends Result<any, infer A> ? A : never;
} & {};

type EnsureCommonBase<
  TResults extends readonly [
    Result<unknown, unknown>,
    ...Result<unknown, unknown>[]
  ]
> = {
  [B in keyof TResults]: ExtractOk<TResults[0]> extends ExtractOk<TResults[B]>
    ? ExtractOk<TResults[0]> extends ExtractOk<TResults[B]>
      ? TResults[B]
      : TResults[B]
    : "ERROR: All results should have the same Ok type";
};

type ExtractOk<T extends Result<unknown, unknown>> = T extends Result<
  unknown,
  infer A
>
  ? A
  : never;

export type SettledOk<T> = {
  type: "Ok";
  value: T;
};

export type SettledErr<T> = {
  type: "Err";
  error: T;
};

export type SettledResult<E, A> = SettledErr<E> | SettledOk<A>;

type Compute<T> = {
  [K in keyof T]: T[K];
} & {};

type ToResult<T> = T extends 0 & 1
  ? Result<UnknownError, unknown>
  : [T] extends [never]
  ? Result<UnknownError, never>
  : T extends Result<infer E, infer A>
  ? Result<E, A>
  : Result<never, T>;

export class EmptyArrayError extends Error {
  constructor() {
    super("Array is empty");
    this.name = "EmptyArrayError";
  }
}
