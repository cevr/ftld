import { Option } from "./option";
import { Task } from "./task";
import { identity, isOption } from "./utils";

type ResultMatcher<E, A, B> = {
  Err: (value: E) => B;
  Ok: (value: A) => B;
};

class _Ok<E, A> {
  readonly _tag = "Ok" as const;

  constructor(private readonly _value: A) {}

  /**
   * Maps the error value if the Result is Err; does nothing if the Result is Ok.
   */
  mapErr<F>(f: (e: E) => F): Result<F, A> {
    // @ts-expect-error
    return this;
  }

  /**
   * Maps the Ok value using the provided function; does nothing if the Result is Err.
   */
  map<B>(f: (a: A) => B): Result<E, B> {
    return Result.Ok(f(this._value));
  }

  /**
   * Applies the function contained in another Result to the value of the current Ok instance.
   */
  apply<B>(fab: Result<E, (a: A) => B>): Result<E, B> {
    if (fab.isErr()) {
      // @ts-expect-error
      return fab;
    }
    return Result.Ok(fab.unwrap()(this._value));
  }

  /**
   * Flat-maps the contained value using the provided function - merging the Results; does nothing if the Result is Err.
   */
  flatMap<F, B>(f: (a: A) => Result<F, B>): Result<E | F, B> {
    return f(this._value);
  }

  /**
   * Flat-maps the contained error using the provided function - merging the Results; does nothing if the Result is Ok.
   */
  flatMapErr<F, B>(f: (e: E) => Result<F, B>): Result<F, A | B> {
    // @ts-expect-error
    return this;
  }

  /**
   * Inverts the Result - Ok becomes Err and vice versa.
   */
  inverse(): Result<A, E> {
    return Result.Err(this._value);
  }

  /**
   * Unwraps the contained value. Throws an error if called on an Err instance.
   */
  unwrap(): A {
    return this._value;
  }

  /**
   * Unwraps the contained error. Throws an error if called on an Ok instance.
   */
  unwrapErr(): E {
    throw this._value;
  }

  /**
   * Returns the contained value or the provided default value.
   */
  unwrapOr<B>(value: (() => B) | B): A {
    return this._value;
  }

  /**
   * Checks if the Result is an Ok instance.
   */
  isOk(): this is _Ok<E, A> {
    return true;
  }

  /**
   * Checks if the Result is an Err instance.
   */
  isErr(): this is _Err<E, A> {
    return false;
  }

  /**
   * Matches the Result using provided functions and returns the result.
   */
  match<B>(cases: ResultMatcher<E, A, B>): B {
    return cases.Ok(this._value);
  }

  /**
   * Converts the Result into an Option.
   */
  option(): Option<A> {
    return Option.Some(this._value);
  }

  /**
   * Executes the provided function with the contained value and returns the unchanged Result; Does nothing if the Result is Err.
   */
  tap(f: (a: A) => void): Result<E, A> {
    f(this._value);
    return this;
  }

  /**
   * Executes the provided function with the contained error and returns the unchanged Result; Does nothing if the Result is Ok.
   */
  tapErr(f: (a: E) => void): Result<E, A> {
    return this;
  }

  /**
   * Converts the Result into a Task.
   */
  task(): Task<E, A> {
    return Task.from(this);
  }

  settle(): SettledResult<E, A> {
    return {
      type: "Ok",
      value: this._value,
    };
  }
}

class _Err<E, A> {
  readonly _tag = "Err" as const;

  constructor(private readonly _value: E) {}

  /**
   * Maps the error value if the Result is Err; does nothing if the Result is Ok.
   */
  mapErr<F>(f: (e: E) => F): Result<F, A> {
    return Result.Err(f(this._value));
  }

  /**
   * Maps the Ok value using the provided function; does nothing if the Result is Err.
   */
  map<B>(f: (a: A) => B): Result<E, B> {
    // @ts-expect-error
    return this;
  }

  /**
   * Applies the function contained in another Result to the value of the current Ok instance.
   */
  apply<B>(fab: Result<E, (a: A) => B>): Result<E, B> {
    // @ts-expect-error
    return this;
  }

  /**
   * Flat-maps the contained value using the provided function - merging the Results; does nothing if the Result is Err.
   */
  flatMap<F, B>(f: (a: A) => Result<F, B>): Result<E | F, B> {
    // @ts-expect-error
    return this;
  }

  /**
   * Flat-maps the contained error using the provided function - merging the Results; does nothing if the Result is Ok.
   */
  flatMapErr<F, B>(f: (e: E) => Result<F, B>): Result<F, A | B> {
    return f(this._value);
  }

  /**
   * Inverts the Result - Ok becomes Err and vice versa.
   */
  inverse(): Result<A, E> {
    return Result.Ok(this._value);
  }

  /**
   * Unwraps the contained error. Throws an error if called on an Ok instance.
   */
  unwrap(): A {
    throw this._value;
  }

  /**
   * Unwraps the contained error. Throws an error if called on an Ok instance.
   */
  unwrapErr(): E {
    return this._value;
  }

  /**
   * Returns the contained value or the provided default value.
   */
  unwrapOr<B>(value: (() => B) | B): B {
    return value instanceof Function ? value() : value;
  }

  /**
   * Checks if the Result is an Ok instance.
   */
  isOk(): this is _Ok<E, A> {
    return false;
  }

  /**
   * Checks if the Result is an Err instance.
   */
  isErr(): this is _Err<E, A> {
    return true;
  }

  /**
   * Matches the Result using provided functions and returns the result.
   */
  match<B>(cases: ResultMatcher<E, A, B>): B {
    return cases.Err(this._value);
  }

  /**
   * Converts the Result into an Option.
   */
  option(): Option<A> {
    return Option.None();
  }

  /**
   * Executes the provided function with the contained value and returns the unchanged Result; Does nothing if the Result is Err.
   */
  tap(f: (a: E) => void): Result<E, A> {
    return this;
  }

  /**
   * Executes the provided function with the contained error and returns the unchanged Result; Does nothing if the Result is Ok.
   */
  tapErr(f: (a: E) => void): Result<E, A> {
    f(this._value);
    return this;
  }

  /**
   * Converts the Result into a Task.
   */
  task(): Task<E, A> {
    return Task.from<E, A>(this);
  }

  settle(): SettledResult<E, A> {
    return {
      type: "Err",
      error: this._value,
    };
  }
}

export type Ok<E, A> = _Ok<E, A>;
export type Err<E, A> = _Err<E, A>;
export type Result<E, A> = Ok<E, A> | Err<E, A>;

export const Result: {
  /**
   * Creates an Ok variant of the Result.
   */
  Ok<A>(value: A): Result<never, A>;
  /**
   * Creates an Err variant of the Result.
   */
  Err<E>(error: E): Result<E, never>;
  /**
   * Creates a Result based on a predicate function.
   */
  fromPredicate<E, A, B>(
    // @ts-expect-error
    predicate: (a: A) => a is B,
    value: A,
    onErr: (a: A) => E
  ): Result<E, B>;
  fromPredicate<E, A>(
    predicate: (a: A) => boolean,
    value: A,
    onErr: (a: A) => E
  ): Result<E, A>;
  /**
   * Creates a Result from a value or a function returning a value.
   */
  from<E, A>(
    value: A | (() => A),
    onErr?: (e: unknown) => E
  ): A extends Option<infer V> ? Result<E, V> : Result<E, A>;
  /**
   * Type guard for Ok variant of Result.
   */
  isOk<E, A>(result: Result<E, A>): result is _Ok<E, A>;
  /**
   * Type guard for Err variant of Result.
   */
  isErr<E, A>(result: Result<E, A>): result is _Err<E, A>;
  /**
   * Wraps a function in a try-catch block and returns a Result.
   */
  tryCatch<E, A>(f: () => A, error: (e: unknown) => E): Result<E, A>;
  /**
   * Traverses a list and applies a function to each element, returning a Result with the transformed elements.
   */
  traverse<E, A, B, Collection extends A[] | Record<string, A>>(
    collection: Collection,
    f: (a: A) => Result<E, B>
  ): Result<
    E,
    {
      [K in keyof Collection]: B;
    }
  >;
  /**
   * Sequences a list of Results, returning a single Result with the collected values.
   */
  sequence<
    TResults extends
      | Result<unknown, unknown>[]
      | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | Record<string, Result<unknown, unknown>>
  >(
    collection: TResults
  ): Result<CollectErrorsToUnion<TResults>, CollectValues<TResults>>;
  /**
   * Returns the first successful Result in a list of Results.
   */
  any<
    TResults extends
      | Result<unknown, unknown>[]
      | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | Record<string, Result<unknown, unknown>>
  >(
    collection: TResults
  ): Result<CollectErrorsToUnion<TResults>, CollectValuesToUnion<TResults>>;

  /**
   * Coalesces a list of Results into a single Result with the combined values and errors.
   */
  coalesce<
    TResults extends
      | Result<unknown, unknown>[]
      | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | Record<string, Result<unknown, unknown>>
  >(
    collection: TResults
  ): Result<CollectErrorsToUnion<TResults>[], CollectValues<TResults>>;

  /**
   * Validates a list of Results, returning a single Result with the collected errors, otherwise the Ok Result at index 0.
   */
  validate<
    TResults extends [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
  >(
    collection: EnsureCommonBase<TResults>
  ): Result<CollectErrorsToUnion<TResults>[], CollectValuesToUnion<TResults>>;

  /**
   * Settles a collection of Results. Each Result is converted into a SettledResult.
   */
  settle<
    TResults extends
      | Result<unknown, unknown>[]
      | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
      | Record<string, Result<unknown, unknown>>
  >(
    collection: TResults
  ): {
    [K in keyof TResults]: TResults[K] extends Result<infer E, infer A>
      ? SettledResult<E, A>
      : never;
  };
} = {
  from(
    valueOrGetter,
    // @ts-expect-error
    onErr = identity
  ) {
    try {
      const value =
        valueOrGetter instanceof Function ? valueOrGetter() : valueOrGetter;

      if (isOption(value)) {
        return value.isNone()
          ? Result.Err(onErr(value))
          : (Result.Ok(value.unwrap()) as any);
      }

      return Result.Ok(value) as any;
    } catch (e) {
      return Result.Err(onErr(e)) as any;
    }
  },
  Ok(value) {
    return new _Ok(value);
  },
  Err(error) {
    return new _Err(error);
  },

  // @ts-expect-error
  fromPredicate(predicate, value, onErr) {
    if (predicate(value)) {
      return Result.Ok(value);
    }

    return Result.Err(onErr(value));
  },

  // @ts-expect-error
  isOk(result) {
    return result.isOk();
  },

  // @ts-expect-error
  isErr(result) {
    return result.isErr();
  },

  tryCatch(f, onErr) {
    return Result.from(f, onErr) as any;
  },

  traverse(collection, f) {
    let result: any = Array.isArray(collection) ? [] : {};
    let keys = Array.isArray(collection) ? collection : Object.keys(collection);
    for (let i = 0; i < keys.length; i++) {
      const key = Array.isArray(collection) ? i : keys[i];
      const item = (collection as any)[key];
      const res = f(item);
      if (res.isErr()) {
        return res;
      }
      result[key] = res.unwrap();
    }
    return Result.Ok(result) as any;
  },

  sequence(collection) {
    return Result.traverse(collection, identity as any);
  },

  any(collection) {
    const values = Array.isArray(collection)
      ? collection
      : Object.values(collection);
    return values.find(Result.isOk) ?? values[0];
  },

  coalesce(collection) {
    let hasError = false;
    let errors: any = Array.isArray(collection) ? [] : {};
    let values: any = Array.isArray(collection) ? [] : {};
    const keys = Array.isArray(collection)
      ? collection
      : Object.keys(collection);
    for (let i = 0; i < keys.length; i++) {
      const key = Array.isArray(collection) ? i : keys[i];
      const result = (collection as any)[key];
      if (Result.isOk(result)) {
        if (Array.isArray(collection)) {
          values.push(result.unwrap());
        } else {
          values[key] = result.unwrap();
        }
      } else {
        hasError = true;
        if (Array.isArray(collection)) {
          errors.push(result.unwrapErr());
        } else {
          errors[key] = result.unwrapErr();
        }
      }
    }

    if (hasError) return Result.Err(errors);
    return Result.Ok(values);
  },
  validate(collection) {
    let hasError = false;
    let firstResult: Result<unknown, unknown> | undefined;
    let errors: any = Array.isArray(collection) ? [] : {};
    const keys = (
      Array.isArray(collection) ? collection : Object.keys(collection)
    ) as (string | number)[];
    for (let i = 0; i < keys.length; i++) {
      const key = Array.isArray(collection) ? i : keys[i];
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
  },

  settle(collection) {
    let results: any = Array.isArray(collection) ? [] : {};
    const keys = Array.isArray(collection)
      ? collection
      : Object.keys(collection);
    for (let i = 0; i < keys.length; i++) {
      const key = Array.isArray(collection) ? i : keys[i];
      const result = (collection as any)[key] as Result<unknown, unknown>;
      results[key] = result.settle();
    }
    return results;
  },
};

type CollectErrors<
  T extends
    | Result<unknown, unknown>[]
    | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
    | Record<string, Result<unknown, unknown>>
> = {
  [K in keyof T]: T[K] extends Result<infer E, any> ? E : never;
};

type CollectValues<
  T extends
    | Result<unknown, unknown>[]
    | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
    | Record<string, Result<unknown, unknown>>
> = {
  [K in keyof T]: T[K] extends Result<any, infer A> ? A : never;
};

type CollectErrorsToUnion<
  T extends
    | Result<unknown, unknown>[]
    | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
    | Record<string, Result<unknown, unknown>>
> = T extends
  | Result<unknown, unknown>[]
  | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
  ? CollectErrors<T>[number]
  : T extends Record<string, Result<unknown, unknown>>
  ? CollectErrors<T>[keyof T]
  : never;

type CollectValuesToUnion<
  T extends
    | Result<unknown, unknown>[]
    | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
    | Record<string, Result<unknown, unknown>>
> = T extends
  | Result<unknown, unknown>[]
  | [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
  ? CollectValues<T>[number]
  : T extends Record<string, Result<unknown, unknown>>
  ? CollectValues<T>[keyof T]
  : never;

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
