import { _value, _tag, TAGS } from "./internals";
import type { Result } from "./result";
import { UnwrapNoneError, identity, isResult } from "./utils";

type OptionMatcher<A, B> = {
  None: () => B;
  Some: (value: A) => B;
} & {};

export class Some<A> {
  readonly [_tag] = TAGS.Some;
  private readonly [_value]: A;
  private constructor(value: A) {
    this[_value] = value;
  }

  /**
   * Transforms the value contained in the Option instance using the provided function; does nothing for None instances.
   */
  map<B>(f: (a: A) => NonNullable<B>): Option<NonNullable<B>> {
    return Option.Some(f(this[_value]));
  }

  /**
   * Transforms the value contained in the Option instance using the provided function, and flattens the resulting Option; does nothing for None instances.
   */
  flatMap<B>(f: (a: A) => Option<NonNullable<B>>): Option<NonNullable<B>> {
    return f(this[_value]);
  }

  /**
   * Returns the value contained in the Option instance; throws an error for None instances.
   */
  unwrap(): A {
    return this[_value];
  }

  /**
   * Returns the value contained in the Option instance; returns the provided default value for None instances.
   */
  unwrapOr<B>(value: (() => B) | B): A {
    return this[_value];
  }

  /**
   * Determines if the Option is a Some instance.
   */
  isSome(): this is Some<A> {
    return true;
  }

  /**
   * Determines if the Option is a None instance.
   */
  isNone(): this is None<A> {
    return false;
  }

  /**
   * Executes the appropriate function from the provided matcher based on the type of the Option.
   */
  match<B>(cases: OptionMatcher<A, B>): B {
    return cases.Some(this[_value]);
  }

  /**
   * Executes the provided function with the value contained in the Option instance; does nothing for None instances.
   */
  tap(f: (a: A) => void): Option<A> {
    f(this[_value]);
    return this;
  }
}

export class None<A> {
  readonly [_tag] = TAGS.None;
  private constructor() {}

  /**
   * Transforms the value contained in the Option instance using the provided function; does nothing for None instances.
   */
  map<B>(f: (a: A) => NonNullable<B>): None<A> {
    return this as any;
  }

  /**
   * Transforms the value contained in the Option instance using the provided function, and flattens the resulting Option; does nothing for None instances.
   */
  flatMap<B>(f: (a: A) => Option<NonNullable<B>>): None<A> {
    return this as any;
  }

  /**
   * Returns the value contained in the Option instance; throws an error for None instances.
   */
  unwrap(): never {
    throw new UnwrapNoneError();
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
  isSome(): this is Some<never> {
    return false;
  }

  /**
   * Determines if the Option is a None instance.
   */
  isNone(): this is None<A> {
    return true;
  }

  /**
   * Executes the appropriate function from the provided matcher based on the type of the Option.
   */
  match<B>(cases: OptionMatcher<never, B>): B {
    return cases.None();
  }

  /**
   * Executes the provided function with the value contained in the Option instance; does nothing for None instances.
   */
  tap(f: (a: A) => void): None<A> {
    return this;
  }
}

export type Option<A> = Some<A> | None<A>;

export const Option: {
  /**
   * Creates a None instance of Option.
   */
  None<A = never>(): Option<A>;

  /**
   * Creates a Some instance of Option.
   */
  Some<A>(value: A): Option<A>;

  /**
   * Creates an Option based on the given predicate and value.
   */
  fromPredicate<A, B extends A>(
    value: A,
    prediate: (a: A) => a is B
  ): Option<B>;
  fromPredicate<A>(value: A, predicate: (a: A) => boolean): Option<A>;

  /**
   * Determines if the given Option is a Some instance.
   */
  isSome<A>(option: Option<A>): option is Some<NonNullable<A>>;

  /**
   * Determines if the given Option is a None instance.
   */
  isNone<A>(option: Option<A>): option is None<A>;

  /**
   * Creates an Option from the given value. If the value is null or undefined, None is returned. If the value is a Result instance, the result is unwrapped and an Option is returned. Otherwise, a Some instance is returned.
   */
  from<A>(
    value: A
  ): [NonNullable<UnwrapValue<A>>] extends [never]
    ? None<never>
    : [Exclude<A, NonNullable<UnwrapValue<A>>>] extends [never]
    ? Some<NonNullable<UnwrapValue<A>>>
    : Option<NonNullable<UnwrapValue<A>>>;

  /**
   * Creates an Option by trying to execute the given function.
   */
  tryCatch<A>(
    f: () => A
  ): [NonNullable<UnwrapValue<A>>] extends [never]
    ? None<never>
    : [Exclude<A, NonNullable<UnwrapValue<A>>>] extends [never]
    ? Some<NonNullable<UnwrapValue<A>>>
    : Option<NonNullable<UnwrapValue<A>>>;
  /**
   * Traverses a list, applying a function that returns an Option to each element.
   */
  traverse<B, Collection extends unknown[] | [unknown, ...unknown[]]>(
    collection: Collection,
    f: (a: Collection[number]) => Option<B>
  ): Option<
    {
      [T in keyof Collection]: B;
    } & {}
  >;
  traverse<B, Collection extends Record<string, unknown>>(
    collection: Collection,
    f: (a: Collection[keyof Collection]) => Option<B>
  ): Option<
    {
      [T in keyof Collection]: B;
    } & {}
  >;

  /**
   * Combines a list of Option instances; creating an Option instance containing a list of unwrapped values if all elements are Some, otherwise None.
   */
  all<
    TOptions extends
      | Option<unknown>[]
      | [Option<unknown>, ...Option<unknown>[]]
      | Record<string, Option<unknown>>
  >(
    collection: TOptions
  ): [CollectOptionsToUnion<TOptions>] extends [never]
    ? None<never>
    : Option<CollectOptions<TOptions>>;

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
  ): [CollectOptionsToUnion<TOptions>] extends [never]
    ? None<never>
    : Option<CollectOptionsToUnion<TOptions>>;
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
  fromPredicate(value, predicate) {
    if (predicate(value)) {
      return Option.Some(value);
    }

    return Option.None();
  },

  Some(value) {
    // @ts-expect-error
    return new Some(value);
  },

  None() {
    // @ts-expect-error
    return new None();
  },

  // @ts-expect-error
  isSome(option) {
    return option.isSome();
  },

  // @ts-expect-error
  isNone(option) {
    return option.isNone();
  },

  // @ts-expect-error
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

  // @ts-expect-error
  all(collection) {
    // @ts-expect-error
    return Option.traverse(collection, identity as any);
  },

  any(collection) {
    const values = Array.isArray(collection)
      ? collection
      : Object.values(collection);
    return values.find(Option.isSome) ?? values[0];
  },

  // @ts-expect-error
  tryCatch(f) {
    try {
      return Option.from(f());
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
  [K in keyof T]: T[K] extends Option<infer A>
    ? T[K] extends None<unknown>
      ? never
      : A
    : never;
} & {};

type CollectOptionsToUnion<
  T extends
    | Option<unknown>[]
    | [Option<unknown>, ...Option<unknown>[]]
    | Record<string, Option<unknown>>
> = T extends Option<unknown>[] | [Option<unknown>, ...Option<unknown>[]]
  ? CollectOptions<T>[number]
  : CollectOptions<T>[keyof T];

type UnwrapValue<T> = T extends Result<unknown, infer A> ? A : T;
