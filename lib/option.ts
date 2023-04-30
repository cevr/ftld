import { Result } from "./result";
import { Task } from "./task";
import { identity, isResult } from "./utils";

type OptionMatcher<A, B> = {
  None: () => B;
  Some: (value: A) => B;
};

class _Some<A> {
  readonly _tag = "Some" as const;
  constructor(readonly _value: A) {}

  /**
   * Transforms the value contained in the Option instance using the provided function; does nothing for None instances.
   */
  map<B>(f: (a: A) => NonNullable<B>): Option<NonNullable<B>> {
    return Option.Some(f(this._value));
  }

  /**
   * Applies the function contained in the provided Option to the value of the Option instance; does nothing for None instances.
   */
  apply<B>(fab: Option<(a: A) => NonNullable<B>>): Option<NonNullable<B>> {
    if (fab.isSome()) {
      return Option.Some(fab.unwrap()(this._value));
    }

    return Option.None();
  }

  /**
   * Transforms the value contained in the Option instance using the provided function, and flattens the resulting Option; does nothing for None instances.
   */
  flatMap<B>(f: (a: A) => Option<NonNullable<B>>): Option<NonNullable<B>> {
    return f(this._value);
  }

  /**
   * Returns the value contained in the Option instance; throws an error for None instances.
   */
  unwrap(): A {
    return this._value;
  }

  /**
   * Returns the value contained in the Option instance; returns the provided default value for None instances.
   */
  unwrapOr<B>(value: (() => B) | B): A {
    return this._value;
  }

  /**
   * Determines if the Option is a Some instance.
   */
  isSome(): this is _Some<A> {
    return true;
  }

  /**
   * Determines if the Option is a None instance.
   */
  isNone(): this is _None<A> {
    return false;
  }

  /**
   * Executes the appropriate function from the provided matcher based on the type of the Option.
   */
  match<B>(cases: OptionMatcher<A, B>): B {
    return cases.Some(this._value);
  }

  /**
   * Converts the Option instance to a Result.
   */
  toResult<E>(onErr: E | (() => E)): Result<E, A> {
    return Result.Ok<A>(this._value);
  }

  /**
   * Converts the Option instance to a Task.
   */
  toTask<E>(onErr: E | (() => E)): Task<E, A> {
    return Task.from(this, onErr instanceof Function ? onErr : () => onErr);
  }

  /**
   * Executes the provided function with the value contained in the Option instance; does nothing for None instances.
   */
  tap(f: (a: A) => void): Option<A> {
    f(this._value);
    return this;
  }
}

class _None<A> {
  readonly _tag = "None" as const;

  /**
   * Transforms the value contained in the Option instance using the provided function; does nothing for None instances.
   */
  map<B>(f: (a: A) => NonNullable<B>): Option<NonNullable<B>> {
    return this as any;
  }

  /**
   * Applies the function contained in the provided Option to the value of the Option instance; does nothing for None instances.
   */
  apply<B>(fab: Option<(a: A) => NonNullable<B>>): Option<NonNullable<B>> {
    return this as any;
  }

  /**
   * Transforms the value contained in the Option instance using the provided function, and flattens the resulting Option; does nothing for None instances.
   */
  flatMap<B>(f: (a: A) => Option<NonNullable<B>>): Option<NonNullable<B>> {
    return this as any;
  }

  /**
   * Returns the value contained in the Option instance; throws an error for None instances.
   */
  unwrap(): never {
    throw new Error("Cannot unwrap None");
  }

  /**
   * Returns the value contained in the Option instance; returns the provided default value for None instances.
   */
  unwrapOr<B>(value: (() => B) | B): B {
    return value instanceof Function ? value() : value;
  }

  /**
   * Determines if the Option is a Some instance.
   */
  isSome(): this is _Some<A> {
    return false;
  }

  /**
   * Determines if the Option is a None instance.
   */
  isNone(): this is _None<A> {
    return true;
  }

  /**
   * Executes the appropriate function from the provided matcher based on the type of the Option.
   */
  match<B>(cases: OptionMatcher<A, B>): B {
    return cases.None();
  }

  /**
   * Converts the Option instance to a Result.
   */
  toResult<E>(onErr: E | (() => E)): Result<E, A> {
    return Result.Err(onErr instanceof Function ? onErr() : onErr);
  }

  /**
   * Converts the Option instance to a Task.
   */
  toTask<E>(onErr: E | (() => E)): Task<E, A> {
    return Task.from<E, A>(
      this,
      onErr instanceof Function ? onErr : () => onErr
    );
  }

  /**
   * Executes the provided function with the value contained in the Option instance; does nothing for None instances.
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
   */
  None<A>(): Option<A>;

  /**
   * Creates a Some instance of Option.
   */
  Some<A>(value: A): Option<A>;

  /**
   * Creates an Option based on the given predicate and value.
   */
  // @ts-expect-error
  fromPredicate<A, B>(prediate: (a: A) => a is B, value: A): Option<B>;
  fromPredicate<A>(predicate: (a: A) => boolean, value: A): Option<A>;

  /**
   * Determines if the given Option is a Some instance.
   */
  isSome<A>(option: Option<A>): option is _Some<NonNullable<A>>;

  /**
   * Determines if the given Option is a None instance.
   */
  isNone<A>(option: Option<A>): option is _None<A>;

  /**
   * Creates an Option from the given value. If the value is null or undefined, None is returned. If the value is a Result instance, the result is unwrapped and an Option is returned. Otherwise, a Some instance is returned.
   */
  from<A>(
    value: A
  ): A extends Result<any, infer V>
    ? Option<NonNullable<V>>
    : Option<NonNullable<A>>;

  /**
   * Creates an Option by trying to execute the given function.
   */
  tryCatch<A>(f: () => A): Option<A>;

  /**
   * Traverses a list, applying a function that returns an Option to each element.
   */
  traverse<A, B, Collection extends A[] | Record<string, A>>(
    collection: Collection,
    f: (a: A) => Option<B>
  ): Option<{
    [T in keyof Collection]: B;
  }>;

  /**
   * Sequences a list of Option instances; creating an Option instance containing a list of unwrapped values if all elements are Some, otherwise None.
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

  // @ts-expect-error
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
