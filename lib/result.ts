import { None, Option, Some } from "./option";
import { Task } from "./task";
import { identity } from "./utils";

type ResultMatcher<E, A, B> = {
  Err: (value: E) => B;
  Ok: (value: A) => B;
};

export class Ok<E, A> {
  // @ts-expect-error
  private readonly _tag = "Ok" as const;

  constructor(private readonly _value: A) {}

  /**
   * Maps the error value if the Result is Err; does nothing if the Result is Ok.
   * @template F - Mapped error type
   * @param {function(e: E): F} f - Error mapping function
   * @returns {Result<F, A>} - Unchanged Ok instance
   */
  mapErr<F>(f: (e: E) => F): Result<F, A> {
    // @ts-expect-error
    return this;
  }

  /**
   * Maps the Ok value using the provided function; does nothing if the Result is Err.
   * @template B - Mapped value type
   * @param {function(a: A): B} f - Value mapping function
   * @returns {Result<E, B>} - Result with the mapped value
   */
  map<B>(f: (a: A) => B): Result<E, B> {
    return Result.Ok(f(this._value));
  }

  /**
   * Applies the function contained in another Result to the value of the current Ok instance.
   * @template B - Resulting value type
   * @param {Result<E, (a: A) => B>} fab - Result containing a function
   * @returns {Result<E, B>} - Result with the applied function
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
   * @template F - Error type of the inner Result
   * @template B - Value type of the inner Result
   * @param {function(a: A): Result<F, B>} f - Flat-mapping function
   * @returns {Result<E | F, B>} - Result with the mapped value
   */
  flatMap<F, B>(f: (a: A) => Result<F, B>): Result<E | F, B> {
    return f(this._value);
  }

  /**
   * Folds the Result into a single value using provided functions.
   * @template B - Resulting value type
   * @param {function(e: E): B} g - Function to handle Err case
   * @param {function(a: A): B} f - Function to handle Ok case
   * @returns {B} - Folded value
   */
  fold<B>(g: (e: E) => B, f: (a: A) => B): B {
    return f(this._value);
  }

  /**
   * Unwraps the contained value. Throws an error if called on an Err instance.
   * @returns {A} - Contained value
   */
  unwrap(): A {
    return this._value;
  }

  /**
   * Unwraps the contained error. Throws an error if called on an Ok instance.
   * @returns {E}
   */
  unwrapErr(): E {
    throw this._value;
  }

  /**
   * Returns the contained value or the provided default value.
   * @template B - Default value type
   * @param {B} value - Default value
   * @returns {A} - Contained value
   */
  unwrapOr<B>(value: B): A {
    return this._value;
  }

  /**
   * Checks if the Result is an Ok instance.
   * @returns {boolean} - True if the Result is an Ok instance
   */
  isOk(): this is Ok<E, A> {
    return true;
  }

  /**
   * Checks if the Result is an Err instance.
   * @returns {boolean} - True if the Result is an Err instance
   */
  isErr(): this is Err<E, A> {
    return false;
  }

  /**
   * Matches the Result using provided functions and returns the result.
   * @template B - Resulting value type
   * @param {ResultMatcher<E, A, B>} cases - Object containing functions for each case
   * @returns {B} - Result of the matched function
   */
  match<B>(cases: ResultMatcher<E, A, B>): B {
    return cases.Ok(this._value);
  }

  /**
   * Converts the Result into an Option.
   * @returns {Option<A>} - Some instance containing the value
   */
  toOption(): Option<A> {
    return Option.Some(this._value);
  }

  /**
   * Executes the provided function with the contained value and returns the unchanged Result; Does nothing if the Result is Err.
   * @param {function(a: A): void} f - Function to execute
   * @returns {Result<E, A>} - Unchanged Ok instance
   */
  tap(f: (a: A) => void): Result<E, A> {
    f(this._value);
    return this;
  }

  /**
   * Executes the provided function with the contained error and returns the unchanged Result; Does nothing if the Result is Ok.
   * @param {function(a: E): void} f - Function to execute
   * @returns {Result<E, A>} - Unchanged Ok instance
   */
  tapErr(f: (a: E) => void): Result<E, A> {
    return this;
  }

  /**
   * Converts the Result into a Task.
   * @returns {Task<E, A>} - Task representing the Result
   */
  toTask(): Task<E, A> {
    return Task.from(this);
  }
}

export class Err<E, A> {
  // @ts-expect-error
  private readonly _tag = "Err" as const;

  constructor(private readonly _value: E) {}

  /**
   * Maps the error value if the Result is Err; does nothing if the Result is Ok.
   * @template F - Mapped error type
   * @param {function(e: E): F} f - Error mapping function
   * @returns {Result<F, A>} - Unchanged Ok instance
   */
  mapErr<F>(f: (e: E) => F): Result<F, A> {
    return Result.Err(f(this._value));
  }

  /**
   * Maps the Ok value using the provided function; does nothing if the Result is Err.
   * @template B - Mapped value type
   * @param {function(a: A): B} f - Value mapping function
   * @returns {Result<E, B>} - Result with the mapped value
   */
  map<B>(f: (a: A) => B): Result<E, B> {
    // @ts-expect-error
    return this;
  }

  /**
   * Applies the function contained in another Result to the value of the current Ok instance.
   * @template B - Resulting value type
   * @param {Result<E, (a: A) => B>} fab - Result containing a function
   * @returns {Result<E, B>} - Result with the applied function
   */ apply<B>(fab: Result<E, (a: A) => B>): Result<E, B> {
    // @ts-expect-error
    return this;
  }

  /**
   * Flat-maps the contained value using the provided function - merging the Results; does nothing if the Result is Err.
   * @template F - Error type of the inner Result
   * @template B - Value type of the inner Result
   * @param {function(a: A): Result<F, B>} f - Flat-mapping function
   * @returns {Result<E | F, B>} - Result with the mapped value
   */
  flatMap<F, B>(f: (a: A) => Result<F, B>): Result<E | F, B> {
    // @ts-expect-error
    return this;
  }

  /**
   * Folds the Result into a single value using provided functions.
   * @template B - Resulting value type
   * @param {function(e: E): B} g - Function to handle Err case
   * @param {function(a: A): B} f - Function to handle Ok case
   * @returns {B} - Folded value
   */
  fold<B>(g: (e: E) => B, f: (a: A) => B): B {
    return g(this._value);
  }

  /**
   * Unwraps the contained error. Throws an error if called on an Ok instance.
   * @returns {E}
   */
  unwrap(): A {
    throw this._value;
  }

  /**
   * Unwraps the contained error. Throws an error if called on an Ok instance.
   * @returns {E}
   */
  unwrapErr(): E {
    return this._value;
  }

  /**
   * Returns the contained value or the provided default value.
   * @template B - Default value type
   * @param {B} value - Default value
   * @returns {A} - Contained value
   */
  unwrapOr<B>(value: B): B {
    return value;
  }

  /**
   * Checks if the Result is an Ok instance.
   * @returns {boolean} - True if the Result is an Ok instance
   */
  isOk(): this is Ok<E, A> {
    return false;
  }

  /**
   * Checks if the Result is an Err instance.
   * @returns {boolean} - True if the Result is an Err instance
   */
  isErr(): this is Err<E, A> {
    return true;
  }

  /**
   * Matches the Result using provided functions and returns the result.
   * @template B - Resulting value type
   * @param {ResultMatcher<E, A, B>} cases - Object containing functions for each case
   * @returns {B} - Result of the matched function
   */
  match<B>(cases: ResultMatcher<E, A, B>): B {
    return cases.Err(this._value);
  }

  /**
   * Converts the Result into an Option.
   * @returns {Option<A>} - Some instance containing the value
   */
  toOption(): Option<A> {
    return Option.None();
  }

  /**
   * Executes the provided function with the contained value and returns the unchanged Result; Does nothing if the Result is Err.
   * @param {function(a: A): void} f - Function to execute
   * @returns {Result<E, A>} - Unchanged Ok instance
   */
  tap(f: (a: E) => void): Result<E, A> {
    return this;
  }

  /**
   * Executes the provided function with the contained error and returns the unchanged Result; Does nothing if the Result is Ok.
   * @param {function(a: E): void} f - Function to execute
   * @returns {Result<E, A>} - Unchanged Ok instance
   */
  tapErr(f: (a: E) => void): Result<E, A> {
    f(this._value);
    return this;
  }

  /**
   * Converts the Result into a Task.
   * @returns {Task<E, A>} - Task representing the Result
   */
  toTask(): Task<E, A> {
    return Task.from<E, A>(this);
  }
}

export type Result<E, A> = Ok<E, A> | Err<E, A>;

export const Result: {
  /**
   * Creates an Ok variant of the Result.
   * @template E - Error type
   * @template A - Success type
   * @param {A} value - The success value
   * @returns {Result<E, A>} - The Ok variant of the Result
   */
  Ok<E, A>(value: A): Result<E, A>;
  /**
   * Creates an Err variant of the Result.
   * @template E - Error type
   * @template A - Success type
   * @param {E} error - The error value
   * @returns {Result<E, A>} - The Err variant of the Result
   */
  Err<E, A>(error: E): Result<E, A>;
  /**
   * Creates a Result based on a predicate function.
   * @template E - Error type
   * @template A - Success type
   * @param {(a: A) => boolean} predicate - The predicate function to test the value
   * @param {E} error - The error value to use if the predicate fails
   * @param {A} value - The value to test with the predicate
   * @returns {Result<E, A>} - The Result based on the predicate
   */
  fromPredicate<E, A>(
    predicate: (a: A) => boolean,
    value: A,
    onErr: (a: A) => E
  ): Result<E, A>;
  /**
   * Creates a Result from a value or a function returning a value.
   * @template E - Error type
   * @template A - Success type
   * @param {A | (() => A)} value - The value or function returning a value
   * @param {(e: unknown) => E} [onErr] - Optional error handling function
   * @returns {A extends Option<infer V> ? Result<E, V> : Result<E, A>} - The Result
   */
  from<E, A>(
    value: A | (() => A),
    onErr?: (e: unknown) => E
  ): A extends Option<infer V> ? Result<E, V> : Result<E, A>;
  /**
   * Type guard for Ok variant of Result.
   * @template E - Error type
   * @template A - Success type
   * @param {Result<E, A>} result - The Result to test
   * @returns {result is Ok<E, A>} - True if the Result is Ok, false otherwise
   */
  isOk<E, A>(result: Result<E, A>): result is Ok<E, A>;
  /**
   * Type guard for Err variant of Result.
   * @template E - Error type
   * @template A - Success type
   * @param {Result<E, A>} result - The Result to test
   * @returns {result is Err<E, A>} - True if the Result is Err, false otherwise
   */
  isErr<E, A>(result: Result<E, A>): result is Err<E, A>;
  /**
   * Wraps a function in a try-catch block and returns a Result.
   * @template E - Error type
   * @template A - Success type
   * @param {() => A} f - The function to wrap
   * @param {(e: unknown) => E} error - The error handling function
   * @returns {Result<E, A>} - The Result from the wrapped function
   */
  tryCatch<E, A>(f: () => A, error: (e: unknown) => E): Result<E, A>;
  /**
   * Traverses a list and applies a function to each element, returning a Result with the transformed elements.
   * @template E - Error type
   * @template A - Input type
   * @template B - Output type
   * @param {A[] | Record<string, A>} collection - The list to traverse
   * @param {(a: A) => Result<E, B>} f - The function to apply to each element
   * @returns {Result<E,  { [K in keyof Collection]: B; }>} - The Result with the transformed elements
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
   * @template TResults - List of Results
   * @param {TResults} collection - The list of Results
   * @returns {Result<CollectErrorsToUnion<TResults>, CollectValues<TResults>>} - The sequenced Result
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
   * @template TResults - List of Results
   * @param {TResults} collection - The list of Results
   * @returns {Result<CollectErrorsToUnion<TResults>, CollectValuesToUnion<TResults>>} - The first successful Result
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
   * @template TResults - List of Results
   * @param {TResults} collection - The list of Results
   * @returns {Result<CollectErrors<TResults>, CollectValues<TResults>>} - The coalesced Result
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
   * @template TResults - List of Results
   * @param {EnsureCommonBase<TResults>} collection - The list of Results
   * @returns {Result<CollectErrors<TResults>, CollectValuesToUnion<TResults>>} - The validated Result
   */
  validate<
    TResults extends [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
  >(
    collection: EnsureCommonBase<TResults>
  ): Result<CollectErrorsToUnion<TResults>[], CollectValuesToUnion<TResults>>;

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

      if (value instanceof None) {
        return Result.Err(onErr(value)) as any;
      }

      if (value instanceof Some) {
        return Result.Ok(value.unwrap()) as any;
      }

      return Result.Ok(value) as any;
    } catch (e) {
      return Result.Err(onErr(e)) as any;
    }
  },
  Ok(value) {
    return new Ok(value);
  },
  Err(error) {
    return new Err(error);
  },
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
        if (Array.isArray(collection)) {
          errors.push(result.unwrapErr());
        } else {
          errors[key] = result.unwrapErr();
        }
      }
    }

    if (Array.isArray(collection)) {
      return errors.length > 0
        ? Result.Err(errors)
        : (Result.Ok(values) as any);
    }

    return Object.keys(errors).length > 0
      ? Result.Err(errors)
      : (Result.Ok(values) as any);
  },
  validate(collection) {
    let errors: any = Array.isArray(collection) ? [] : {};
    const keys = (
      Array.isArray(collection) ? collection : Object.keys(collection)
    ) as (string | number)[];
    for (let i = 0; i < keys.length; i++) {
      const key = Array.isArray(collection) ? i : keys[i];
      const result = (collection as any)[key];
      if (Result.isErr(result)) {
        if (Array.isArray(collection)) {
          errors.push(result.unwrapErr());
        } else {
          errors[key] = result.unwrapErr();
        }
      }
    }

    if (Array.isArray(collection)) {
      return errors.length > 0 ? Result.Err(errors) : (collection[0] as any);
    }

    return Object.keys(errors).length > 0
      ? Result.Err(errors)
      : (collection[0] as any);
  },

  settle(collection) {
    let results: any = Array.isArray(collection) ? [] : {};
    const keys = Array.isArray(collection)
      ? collection
      : Object.keys(collection);
    for (let i = 0; i < keys.length; i++) {
      const key = Array.isArray(collection) ? i : keys[i];
      const result = (collection as any)[key];
      if (Result.isOk(result)) {
        results[key] = {
          type: "Ok",
          value: result.unwrap(),
        };
      } else {
        results[key] = {
          type: "Err",
          error: result.unwrapErr(),
        };
      }
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
