import { Result } from "./result";
import type { Err, Ok } from "./result";
import type { Foldable, HKT, Monad } from "./types";
import { identity } from "./utils";

// Option HKT
interface OptionHKT<A> extends HKT {
  type: Option<A>;
}

export class Some<A>
  implements Monad<OptionHKT<A>, never, never, A>, Foldable<A>
{
  __tag = "Some" as const;
  constructor(public readonly _value: A) {}

  map<B>(f: (a: A) => B): Some<B> {
    return Option.Some(f(this._value));
  }

  // @ts-expect-error
  of<B>(value: B): Some<B> {
    return Option.Some(value);
  }

  // @ts-expect-error
  ap<B>(fab: Option<(a: A) => B>): Option<B> {
    if (fab.__tag === "Some") {
      return Option.Some(fab._value(this._value));
    }

    return Option.None();
  }

  // @ts-expect-error
  flatMap<B>(f: (a: A) => Option<B>): Option<B> {
    return f(this._value);
  }

  unwrap(): A {
    return this._value;
  }

  unwrapOr<B>(_value: B): A {
    return this._value;
  }

  isSome(): this is Some<A> {
    return true;
  }

  isNone(): never {
    // @ts-expect-error
    return false;
  }

  reduce<B>(f: (b: B, a: A) => B, b: B): B {
    return f(b, this._value);
  }

  match<OnNone, OnSome>(cases: {
    None: () => OnNone;
    Some: (value: A) => OnSome;
  }): OnSome {
    return cases.Some(this._value);
  }

  toResult(): Ok<never, A> {
    return Result.Ok<A>(this._value);
  }

  tap(f: (a: A) => void): Some<A> {
    f(this._value);
    return this;
  }
}

export class None
  implements Monad<OptionHKT<never>, never, never, never>, Foldable<never>
{
  __tag = "None" as const;

  // @ts-expect-error
  of<B>(_value: B): None {
    return Option.None();
  }

  map<B>(_f: (a: never) => B): None {
    return Option.None();
  }

  // @ts-expect-error
  ap<B>(_fab: Option<(a: never) => B>): None {
    return Option.None();
  }

  // @ts-expect-error
  flatMap<B>(_f: (a: never) => Option<B>): None {
    return Option.None();
  }

  unwrap(): never {
    throw new Error("Cannot unwrap None");
  }

  unwrapOr<B>(value: B): B {
    return value;
  }

  isSome(): never {
    // @ts-expect-error
    return false;
  }

  isNone(): this is None {
    return true;
  }

  reduce<B>(f: (b: B, a: never) => B, b: B): B {
    return b;
  }

  match<OnNone, OnSome>(cases: {
    None: () => OnNone;
    Some: (value: never) => OnSome;
  }): OnNone {
    return cases.None();
  }

  toResult<E>(error: E): Err<E, never> {
    return Result.Err(error);
  }

  tap(f: (a: never) => void): None {
    // @ts-expect-error
    f();
    return this;
  }
}

export type Option<A> = Some<A> | None;

export const Option: {
  None(): None;
  Some<A>(value: A): Some<A>;
  fromNullable<A>(value: A | null | undefined): Option<A>;
  fromPredicate<A>(predicate: (a: A) => boolean, value: A): Option<A>;
  fromResult<E, A>(result: Result<E, A>): Option<A>;
  isSome<A>(option: Option<A>): option is Some<A>;
  isNone<A>(option: Option<A>): option is None;
  of<A>(value: A): Option<A>;
  tryCatch<A>(f: () => A): Option<A>;
  traverse<A, B>(list: Array<A>, f: (a: A) => Option<B>): Option<Array<B>>;
  sequence<TOptions extends Option<any>[]>(
    list: TOptions
  ): Option<Array<PickValueFromOptionList<TOptions>>>;
  any<TOptions extends Option<any>[]>(
    list: TOptions
  ): Option<PickValueFromOptionList<TOptions>>;
  every<TOptions extends Option<any>[]>(
    list: TOptions
  ): Option<Array<PickValueFromOptionList<TOptions>>>;
} = {
  of<A>(value: A): Option<A> {
    return Option.fromNullable(value);
  },

  fromNullable<A>(value: A | null | undefined): Option<A> {
    if (value == null) {
      return Option.None();
    }

    return Option.Some(value);
  },

  fromPredicate<A>(predicate: (a: A) => boolean, value: A): Option<A> {
    if (predicate(value)) {
      return Option.Some(value);
    }

    return Option.None();
  },

  fromResult<E, A>(result: Result<E, A>): Option<A> {
    if (result.isOk()) {
      return Option.Some(result.unwrap());
    }

    return Option.None();
  },

  Some<A>(value: A): Some<A> {
    return new Some(value);
  },

  None(): None {
    return new None();
  },

  isSome<A>(option: Option<A>): option is Some<A> {
    return option.__tag === "Some";
  },

  isNone<A>(option: Option<A>): option is None {
    return option.__tag === "None";
  },

  traverse<A, B>(list: Array<A>, f: (a: A) => Option<B>): Option<Array<B>> {
    // @ts-expect-error
    return list.reduce((acc, a) => {
      if (Option.isNone(acc)) {
        return acc;
      }

      const result = f(a);

      if (Option.isNone(result)) {
        return result;
      }

      acc._value.push(result._value);
      return acc;
    }, Option.Some([] as B[]));
  },

  sequence<A>(list: Array<Option<A>>): Option<Array<A>> {
    return Option.traverse(list, identity);
  },

  any<A>(list: Array<Option<A>>): Option<A> {
    return list.find(Option.isSome) ?? Option.None();
  },

  every<A>(list: Array<Option<A>>): Option<Array<A>> {
    return Option.traverse(list, identity);
  },

  tryCatch<A>(f: () => A): Option<A> {
    try {
      return Option.Some(f());
    } catch {
      return Option.None();
    }
  },
};

type PickValueFromOptionList<T extends Array<Option<any>>> = {
  [K in keyof T]: T[K] extends Option<infer A> ? A : never;
}[number];
