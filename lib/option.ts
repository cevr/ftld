import { Result } from "./result";
import { Task } from "./task";
import { identity, isResult } from "./utils";

type OptionMatcher<A, B> = {
  None: () => B;
  Some: (value: A) => B;
};

class _Some<A> {
  // @ts-expect-error
  private readonly _tag = "Some" as const;
  constructor(readonly _value: A) {}

  /**
   * Transforms the value contained in this Some instance using the provided function; does nothing for None instances.
   * @param {function(a: A): NonNullable<B>} f - The function to apply to the value
   * @returns {Option<NonNullable<B>>} - A new Option instance containing the transformed value
   */
  map<B>(f: (a: A) => NonNullable<B>): Option<NonNullable<B>> {
    return Option.Some(f(this._value));
  }

  /**
   * Applies the function contained in the provided Option to the value of this Some instance; does nothing for None instances.
   * @param {Option<(a: A) => NonNullable<B>>} fab - An Option containing the function to apply
   * @returns {Option<B>} - A new Option instance containing the result of applying the function
   */
  apply<B>(fab: Option<(a: A) => NonNullable<B>>): Option<NonNullable<B>> {
    if (fab.isSome()) {
      return Option.Some(fab.unwrap()(this._value));
    }

    return Option.None();
  }

  /**
   * Transforms the value contained in this Some instance using the provided function, and flattens the resulting Option; does nothing for None instances.
   * @param {function(a: A): Option<NonNullable<B>>} f - The function to apply to the value
   * @returns {Option<NonNullable<B>>} - The resulting Option after applying the function and flattening
   */
  flatMap<B>(f: (a: A) => Option<NonNullable<B>>): Option<NonNullable<B>> {
    return f(this._value);
  }

  /**
   * Returns the value contained in this Some instance; throws an error for None instances.
   * @returns {A} - The value
   */
  unwrap(): A {
    return this._value;
  }

  /**
   * Returns the value contained in this Some instance; returns the provided default value for None instances.
   * @param {B} value - The default value to use if the Option is None (ignored for Some)
   * @returns {A} - The value
   */
  unwrapOr<B>(value: B): A {
    return this._value;
  }

  /**
   * Determines if this Option is a Some instance.
   * @returns {boolean} - true if this is a Some instance, false otherwise
   */
  isSome(): this is _Some<A> {
    return true;
  }

  /**
   * Determines if this Option is a None instance.
   * @returns {boolean} - false for a Some instance
   */
  isNone(): this is _None<A> {
    return false;
  }

  /**
   * Executes the appropriate function from the provided matcher based on the type of this Option.
   * @param {OptionMatcher<A, B>} cases - An object with functions for handling Some and None instances
   * @returns {B} - The result of the matched function
   */
  match<B>(cases: OptionMatcher<A, B>): B {
    return cases.Some(this._value);
  }

  /**
   * Converts this Some instance to a Result.
   * @param {E | (() => E)} onErr - The error value to use if the Option is None (ignored for Some)
   * @returns {Result<E, A>} - A Result with the same value as this Some instance
   */
  toResult<E>(onErr: E | (() => E)): Result<E, A> {
    return Result.Ok<E, A>(this._value);
  }

  /**
   * Converts this Some instance to a Task.
   * @param {E | (() => E)} onErr - The error value or function to use if the Option is None (ignored for Some)
   * @returns {Task<E, A>} - A Task with the same value as this Some instance
   */
  toTask<E>(onErr: E | (() => E)): Task<E, A> {
    return Task.from(this, onErr instanceof Function ? onErr : () => onErr);
  }

  /**
   * Executes the provided function with the value contained in this Some instance; does nothing for None instances.
   * @param {function(a: A): void} f - The function to execute
   * @returns {Option<A>} - The original Option
   */
  tap(f: (a: A) => void): Option<A> {
    f(this._value);
    return this;
  }
}

class _None<A> {
  // @ts-expect-error
  private readonly _tag = "None" as const;

  /**
   * Transforms the value contained in this Some instance using the provided function; does nothing for None instances.
   * @param {function(a: A): NonNullable<B>} f - The function to apply to the value
   * @returns {Option<NonNullable<B>>} - A new Option instance containing the transformed value
   */
  map<B>(f: (a: A) => NonNullable<B>): Option<NonNullable<B>> {
    return this as any;
  }

  /**
   * Applies the function contained in the provided Option to the value of this Some instance; does nothing for None instances.
   * @param {Option<(a: A) => NonNullable<B>>} fab - An Option containing the function to apply
   * @returns {Option<B>} - A new Option instance containing the result of applying the function
   */
  apply<B>(fab: Option<(a: A) => NonNullable<B>>): Option<NonNullable<B>> {
    return this as any;
  }

  /**
   * Transforms the value contained in this Some instance using the provided function, and flattens the resulting Option; does nothing for None instances.
   * @param {function(a: A): Option<B>} f - The function to apply to the value
   * @returns {Option<B>} - The resulting Option after applying the function and flattening
   */
  flatMap<B>(f: (a: A) => Option<NonNullable<B>>): Option<NonNullable<B>> {
    return this as any;
  }

  /**
   * Returns the value contained in this Some instance; throws an error for None instances.
   * @returns {A} - The value
   */
  unwrap(): never {
    throw new Error("Cannot unwrap None");
  }

  /**
   * Returns the value contained in this Some instance; returns the provided default value for None instances.
   * @param {B} value - The default value to use if the Option is None (ignored for Some)
   * @returns {A} - The value
   */
  unwrapOr<B>(value: B): B {
    return value;
  }

  /**
   * Determines if this Option is a Some instance.
   * @returns {boolean} - true if this is a Some instance, false otherwise
   */
  isSome(): this is _Some<A> {
    return false;
  }

  /**
   * Determines if this Option is a None instance.
   * @returns {boolean} - false for a Some instance
   */
  isNone(): this is _None<A> {
    return true;
  }

  /**
   * Executes the appropriate function from the provided matcher based on the type of this Option.
   * @param {OptionMatcher<A, B>} cases - An object with functions for handling Some and None instances
   * @returns {B} - The result of the matched function
   */
  match<B>(cases: OptionMatcher<A, B>): B {
    return cases.None();
  }

  /**
   * Converts this Some instance to a Result.
   * @param {E | (() => E)} onErr - The error value to use if the Option is None (ignored for Some)
   * @returns {Result<E, A>} - A Result with the same value as this Some instance
   */
  toResult<E>(onErr: E | (() => E)): Result<E, A> {
    return Result.Err(onErr instanceof Function ? onErr() : onErr);
  }

  /**
   * Converts this Some instance to a Task.
   * @param {E | (() => E)} onErr - The error value or function to use if the Option is None (ignored for Some)
   * @returns {Task<E, A>} - A Task with the same value as this Some instance
   */
  toTask<E>(onErr: E | (() => E)): Task<E, A> {
    return Task.from<E, A>(
      this,
      onErr instanceof Function ? onErr : () => onErr
    );
  }

  /**
   * Executes the provided function with the value contained in this Some instance; does nothing for None instances.
   * @param {function(a: A): void} f - The function to execute
   * @returns {Option<A>} - The original Option
   */
  tap(f: (a: A) => void): Option<A> {
    return this;
  }
}

export type Some<A> = _Some<A>;
export type None<A> = _None<A>;
export type Option<A> = Some<A> | None<A>;

export const Option: {
  /**
   * Creates a None instance of Option.
   * @template A - The type of the value
   * @returns {Option<A>} - An instance of None
   */
  None<A>(): Option<A>;

  /**
   * Creates a Some instance of Option.
   * @template A - The type of the value
   * @param {A} value - The value to be wrapped in the Some instance
   * @returns {Option<A>} - An instance of Some containing the value
   */
  Some<A>(value: A): Option<A>;

  /**
   * Creates an Option based on the given predicate and value.
   * @template A - The type of the value
   * @param {function(a: A): boolean} predicate - The predicate function to apply on the value
   * @param {A} value - The value to be tested with the predicate
   * @returns {Option<A>} - An instance of Some if the predicate is true, otherwise None
   */
  fromPredicate<A>(predicate: (a: A) => boolean, value: A): Option<A>;

  /**
   * Determines if the given Option is a Some instance.
   * @template A - The type of the value
   * @param {Option<A>} option - The Option instance to check
   * @returns {boolean} - True if the Option is a Some instance, otherwise false
   */
  isSome<A>(option: Option<A>): option is _Some<NonNullable<A>>;

  /**
   * Determines if the given Option is a None instance.
   * @template A - The type of the value
   * @param {Option<A>} option - The Option instance to check
   * @returns {boolean} - True if the Option is a None instance, otherwise false
   */
  isNone<A>(option: Option<A>): option is _None<A>;

  /**
   * Creates an Option from the given value. If the value is null or undefined, None is returned. If the value is a Result instance, the result is unwrapped and an Option is returned. Otherwise, a Some instance is returned.
   * @template A - The type of the value
   * @param {A} value - The value to be wrapped in an Option
   * @returns {Option<NonNullable<A>>} - An instance of Some if the value is not null or undefined, otherwise None
   */
  from<A>(
    value: A
  ): A extends Result<any, infer V>
    ? Option<NonNullable<V>>
    : Option<NonNullable<A>>;

  /**
   * Creates an Option by trying to execute the given function.
   * @template A - The type of the value
   * @param {function(): A} f - The function to execute
   * @returns {Option<A>} - An instance of Some if the function executes successfully, otherwise None
   */
  tryCatch<A>(f: () => A): Option<A>;

  /**
   * Traverses a list, applying a function that returns an Option to each element.
   * @template A - The type of the elements in the input list
   * @template B - The type of the elements in the output list
   * @param {Collection} collection - The input list to traverse
   * @param {function(a: A): Option<B>} f - The function to apply to each element
   * @returns {Option<{ [T in keyof Collection]: B}>} - An instance of Some containing the list of transformed elements, or None if any element fails the transformation
   */
  traverse<A, B, Collection extends A[] | Record<string, A>>(
    collection: Collection,
    f: (a: A) => Option<B>
  ): Option<{
    [T in keyof Collection]: B;
  }>;

  /**
   * Sequences a list of Option instances; creating an Option instance containing a list of unwrapped values if all elements are Some, otherwise None.
   * @template TOptions - The type of Option instances in the list
   * @param {TOptions} collection - The list of Option instances to sequence
   * @returns {Option<CollectOptions<TOptions>>} - An instance of Some containing a list of unwrapped values if all elements are Some, otherwise None
   */
  sequence<
    TOptions extends
      | Option<unknown>[]
      | [Option<unknown>, ...Option<unknown>[]]
      | Record<string, Option<unknown>>
  >(
    collection: TOptions
  ): Option<CollectOptions<TOptions>>;

  /**
   * Returns the first Some instance in a list of Option instances.
   * @template TOptions - The type of Option instances in the list
   * @param {TOptions} collection - The list of Option instances to search
   * @returns {Option<CollectOptions<TOptions>[number]>} - The first Some instance in the list, or None if all elements are None
   */
  any<
    TOptions extends
      | Option<unknown>[]
      | [Option<unknown>, ...Option<unknown>[]]
      | Record<string, Option<unknown>>
  >(
    collection: TOptions
  ): Option<CollectOptionsToUnion<TOptions>>;
} = {
  from(value) {
    if (value == null) {
      return Option.None() as any;
    }

    if (isResult(value)) {
      return value.isOk() ? Option.from(value.unwrap()) : Option.None();
    }

    return Option.Some(value) as any;
  },

  fromPredicate(predicate, value) {
    if (predicate(value)) {
      return Option.Some(value);
    }

    return Option.None();
  },

  Some(value) {
    return new _Some(value);
  },

  None() {
    return new _None();
  },

  // @ts-expect-error
  isSome(option) {
    return option.isSome();
  },

  // @ts-expect-error
  isNone(option) {
    return option.isNone();
  },

  traverse(collection, f) {
    let result: any = Array.isArray(collection) ? [] : {};
    const keys = Array.isArray(collection)
      ? collection
      : Object.keys(collection);
    for (let i = 0; i < keys.length; i++) {
      const key = Array.isArray(collection) ? i : keys[i];
      const item = (collection as any)[key];
      const option = f(item);
      if (option.isNone()) {
        return option;
      }

      result[key] = option.unwrap();
    }
    return Option.Some(result);
  },

  sequence(collection) {
    return Option.traverse(collection, identity as any);
  },

  any(collection) {
    const values = Array.isArray(collection)
      ? collection
      : Object.values(collection);
    return values.find(Option.isSome) ?? values[0];
  },

  tryCatch(f) {
    try {
      return Option.Some(f());
    } catch {
      return Option.None();
    }
  },
};

type CollectOptions<
  T extends
    | Option<unknown>[]
    | [Option<unknown>, ...Option<unknown>[]]
    | Record<string, Option<unknown>>
> = {
  [K in keyof T]: T[K] extends Option<infer A> ? A : never;
};

type CollectOptionsToUnion<
  T extends
    | Option<unknown>[]
    | [Option<unknown>, ...Option<unknown>[]]
    | Record<string, Option<unknown>>
> = T extends Option<unknown>[] | [Option<unknown>, ...Option<unknown>[]]
  ? CollectOptions<T>[number]
  : CollectOptions<T>[keyof T];
