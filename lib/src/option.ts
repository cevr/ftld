import { _value, _tag, SOME, NONE } from "./internals.js";
import type { Result } from "./result.js";
import { UnwrapNoneError, identity, isResult } from "./utils.js";

type OptionMatcher<A, B, C> = {
  None: () => B;
  Some: (value: A) => C;
} & {};

export type Some<A> = {
  readonly [_tag]: typeof SOME;
  readonly [_value]: A;

  /**
   * Transforms the value contained in the Option instance using the provided function; does nothing for None instances.
   */
  map<B>(f: (a: A) => NonNullable<B>): Option<NonNullable<B>>;

  /**
   * Transforms the value contained in the Option instance using the provided function, and flattens the resulting Option; does nothing for None instances.
   */
  flatMap<B>(f: (a: A) => Option<NonNullable<B>>): Option<NonNullable<B>>;

  /**
   * Returns the value contained in the Option instance; throws an error for None instances.
   */
  unwrap(): A;

  /**
   * Returns the value contained in the Option instance; returns the provided default value for None instances.
   */
  unwrapOr<B>(value: (() => B) | B): A;

  /**
   * Determines if the Option is a Some instance.
   */
  // @ts-expect-error
  isSome(): this is Some<A>;

  /**
   * Determines if the Option is a None instance.
   */
  // @ts-expect-error
  isNone(): this is None<A>;

  /**
   * Executes the appropriate function from the provided matcher based on the type of the Option.
   */
  match<B, C>(cases: OptionMatcher<A, B, C>): C;

  /**
   * Executes the provided function with the value contained in the Option instance; does nothing for None instances.
   */
  tap(f: (a: A) => void): Option<A>;
};

export type None<A = never> = {
  readonly [_tag]: typeof NONE;

  /**
   * Transforms the value contained in the Option instance using the provided function; does nothing for None instances.
   */
  map<B>(f: (a: A) => NonNullable<B>): Option<A>;

  /**
   * Transforms the value contained in the Option instance using the provided function, and flattens the resulting Option; does nothing for None instances.
   */
  flatMap<B>(f: (a: A) => Option<NonNullable<B>>): Option<A>;

  /**
   * Returns the value contained in the Option instance; throws an error for None instances.
   */
  unwrap(): never;

  /**
   * Returns the value contained in the Option instance; returns the provided default value for None instances.
   */
  unwrapOr<B>(value: (() => B) | B): B;

  /**
   * Determines if the Option is a Some instance.
   */
  // @ts-expect-error
  isSome(): this is Some<never>;

  /**
   * Determines if the Option is a None instance.
   */
  // @ts-expect-error
  isNone(): this is None<A>;

  /**
   * Executes the appropriate function from the provided matcher based on the type of the Option.
   */
  match<B, C>(cases: OptionMatcher<never, B, C>): B;

  /**
   * Executes the provided function with the value contained in the Option instance; does nothing for None instances.
   */
  tap(f: (a: A) => void): Option<A>;
};

class _Option<A> {
  [_tag]: symbol;
  [_value]?: A;
  constructor(tag: symbol, value?: A) {
    this[_tag] = tag;
    if (value != null) {
      this[_value] = value;
    }
  }

  /**
   * Creates an Option from the given value. If the value is null or undefined, None is returned. If the value is a Result instance, the result is unwrapped and an Option is returned. Otherwise, a Some instance is returned.
   */
  static from<A>(
    value: A
  ): [NonNullable<UnwrapValue<A>>] extends [never]
    ? None
    : [Exclude<A, NonNullable<UnwrapValue<A>>>] extends [never]
    ? Some<NonNullable<UnwrapValue<A>>>
    : Option<NonNullable<UnwrapValue<A>>> {
    if (value == null) {
      return Option.None() as any;
    }

    if (isResult(value)) {
      // @ts-expect-error
      return value.isOk() ? Option.from(value.unwrap()) : Option.None();
    }

    return Option.Some(value) as any;
  }

  /**
   * Creates an Option based on the given predicate and value.
   */
  static fromPredicate<A, B extends A>(
    value: A,
    prediate: (a: A) => a is B
  ): Option<B>;
  static fromPredicate<A>(value: A, predicate: (a: A) => boolean): Option<A>;
  static fromPredicate<A, B extends A>(value: A, predicate: (a: A) => a is B) {
    if (predicate(value)) {
      return Option.Some(value);
    }

    return Option.None();
  }

  /**
   * Creates a Some instance of Option.
   */
  static Some<A>(value: A): Some<A> {
    // @ts-expect-error
    return new _Option(SOME, value);
  }

  /**
   * Creates a None instance of Option.
   */
  static None<A = never>(): None<A> {
    // @ts-expect-error
    return new _Option(NONE);
  }

  /**
   * Determines if the given Option is a Some instance.
   */
  static isSome<A extends Option<unknown>, B = UnwrapValue<A>>(
    option: A
    // @ts-expect-error
  ): option is Some<B> {
    return option.isSome();
  }

  /**
   * Determines if the given Option is a None instance.
   */
  static isNone<A extends Option<unknown>, B = UnwrapValue<A>>(
    option: A
    // @ts-expect-error
  ): option is None<B> {
    return option.isNone();
  }

  /**
   * Traverses a list, applying a function that returns an Option to each element.
   */
  static traverse<B, Collection extends unknown[] | [unknown, ...unknown[]]>(
    collection: Collection,
    f: (a: Collection[number]) => Option<B>
  ): Option<
    {
      [T in keyof Collection]: B;
    } & {}
  >;
  static traverse<B, Collection extends Record<string, unknown>>(
    collection: Collection,
    f: (a: Collection[keyof Collection]) => Option<B>
  ): Option<
    {
      [T in keyof Collection]: B;
    } & {}
  >;
  // @ts-expect-error
  static traverse(collection, f) {
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
  }

  /**
   * Combines a list of Option instances; creating an Option instance containing a list of unwrapped values if all elements are Some, otherwise None.
   */
  static all<
    TOptions extends
      | Option<unknown>[]
      | [Option<unknown>, ...Option<unknown>[]]
      | Record<string, Option<unknown>>
  >(
    collection: TOptions
  ): [CollectOptionsToUnion<TOptions>] extends [never]
    ? None
    : Option<CollectOptions<TOptions>> {
    // @ts-expect-error
    return Option.traverse(collection, identity as any);
  }

  /**
   * Returns the first Some instance in a list of Option instances.
   */
  static any<
    TOptions extends
      | Option<unknown>[]
      | [Option<unknown>, ...Option<unknown>[]]
      | Record<string, Option<unknown>>
  >(
    collection: TOptions
  ): [CollectOptionsToUnion<TOptions>] extends [never]
    ? None
    : Option<CollectOptionsToUnion<TOptions>> {
    const values = Array.isArray(collection)
      ? collection
      : Object.values(collection);
    return values.find(Option.isSome) ?? values[0];
  }

  /**
   * Creates an Option by trying to execute the given function.
   */
  static tryCatch<A>(
    f: () => A
  ): [NonNullable<UnwrapValue<A>>] extends [never]
    ? None
    : [Exclude<A, NonNullable<UnwrapValue<A>>>] extends [never]
    ? Some<NonNullable<UnwrapValue<A>>>
    : Option<NonNullable<UnwrapValue<A>>> {
    try {
      return Option.from(f());
    } catch {
      // @ts-expect-error
      return Option.None();
    }
  }

  map<B>(f: (a: A) => NonNullable<B>): any {
    return this[_tag] === SOME ? Option.Some(f(this[_value]!)) : this;
  }

  flatMap<B>(f: (a: A) => Option<NonNullable<B>>): any {
    return this[_tag] === SOME ? f(this[_value]!) : this;
  }

  unwrap(): A {
    if (this[_tag] === SOME) {
      return this[_value]!;
    }

    throw new UnwrapNoneError();
  }

  unwrapOr<B>(value: (() => B) | B): any {
    if (this[_tag] === SOME) {
      return this[_value]!;
    }

    return value instanceof Function ? value() : value;
  }

  isSome(): boolean {
    return this[_tag] === SOME;
  }

  isNone(): boolean {
    return this[_tag] === NONE;
  }

  match<B, C>(cases: OptionMatcher<A, B, C>): B | C {
    return this[_tag] === SOME ? cases.Some(this[_value]!) : cases.None();
  }

  tap(f: (a: A) => void): any {
    if (this[_tag] === SOME) {
      f(this[_value]!);
    }

    return this;
  }
}

export type Option<A> = Some<A> | None<A>;
export const Option = _Option;

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

type UnwrapValue<T> = T extends Result<unknown, infer A>
  ? A
  : T extends Option<infer A>
  ? A
  : T;
