import { Result } from "./result";
import { Task } from "./task";
import { identity } from "./utils";

type OptionMatcher<A, B> = {
  None: () => B;
  Some: (value: A) => B;
};

export class Some<A> {
  __tag = "Some" as const;
  constructor(private readonly _value: A) {}

  map<B>(f: (a: A) => B): Option<B> {
    return Option.Some(f(this._value));
  }

  apply<B>(fab: Option<(a: A) => NonNullable<B>>): Option<B> {
    if (fab.__tag === "Some") {
      return Option.Some(fab.unwrap()(this._value));
    }

    return Option.None();
  }

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

  match<B>(cases: OptionMatcher<A, B>): B {
    return cases.Some(this._value);
  }

  toResult<E>(error: E): Result<E, A> {
    return Result.Ok<E, A>(this._value);
  }

  toTask<E>(error: E): Task<E, A> {
    return Task.fromOption(error, this);
  }

  tap(f: (a: A) => void): Option<A> {
    f(this._value);
    return this;
  }
}

export class None<A> {
  __tag = "None" as const;

  map<B>(f: (a: A) => B): Option<A> {
    return Option.None();
  }

  apply<B>(_fab: Option<(a: A) => B>): Option<A> {
    return Option.None();
  }
  flatMap<B>(f: (a: A) => Option<B>): Option<A> {
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

  isNone(): this is None<A> {
    return true;
  }

  reduce<B>(f: (b: B, a: A) => B, b: B): B {
    return b;
  }

  match<B>(cases: OptionMatcher<A, B>): B {
    return cases.None();
  }

  toResult<E>(error: E): Result<E, A> {
    return Result.Err(error);
  }

  toTask<E>(error: E): Task<E, A> {
    return Task.fromOption<E, A>(error, this);
  }

  tap(f: (a: "None") => void): Option<A> {
    f("None");
    return this;
  }
}

export type Option<A> = Some<A> | None<A>;

export const Option: {
  None<A>(): Option<A>;
  Some<A>(value: A): Option<A>;
  fromPredicate<A>(predicate: (a: A) => boolean, value: A): Option<A>;
  fromResult<E, A>(result: Result<E, A>): Option<A>;
  isSome<A>(option: Option<A>): option is Some<NonNullable<A>>;
  isNone<A>(option: Option<A>): option is None<A>;
  from<A>(value: A): Option<NonNullable<A>>;
  tryCatch<A>(f: () => A): Option<A>;
  traverse<A, B>(list: Array<A>, f: (a: A) => Option<B>): Option<Array<B>>;
  sequence<TOptions extends Option<unknown>[]>(
    list: TOptions
  ): Option<Array<PickValueFromOptionList<TOptions>>>;
  any<TOptions extends Option<unknown>[]>(
    list: TOptions
  ): Option<PickValueFromOptionList<TOptions>>;
  every<TOptions extends Option<unknown>[]>(
    list: TOptions
  ): Option<Array<PickValueFromOptionList<TOptions>>>;
} = {
  from<A>(value: A): Option<NonNullable<A>> {
    if (value == null) {
      return Option.None();
    }

    return Option.Some(value);
  },

  fromPredicate<A>(
    predicate: (a: A) => boolean,
    value: NonNullable<A>
  ): Option<A> {
    if (predicate(value)) {
      return Option.Some(value);
    }

    return Option.None();
  },

  fromResult<E, A>(result: Result<E, NonNullable<A>>): Option<A> {
    if (result.isOk()) {
      return Option.Some(result.unwrap());
    }

    return Option.None();
  },

  Some<A>(value: A): Some<A> {
    return new Some(value);
  },

  None<A>(): None<A> {
    return new None();
  },

  isSome<A>(option: Option<A>): option is Some<NonNullable<A>> {
    return option.isSome();
  },

  isNone<A>(option: Option<A>): option is None<A> {
    return option.isNone();
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

      acc.unwrap().push(result.unwrap());
      return acc;
    }, Option.Some<B[]>([]));
  },

  sequence<TOptions extends Option<unknown>[]>(
    list: TOptions
  ): Option<Array<PickValueFromOptionList<TOptions>>> {
    // @ts-expect-error
    return Option.traverse(list, identity);
  },

  any<TOptions extends Option<unknown>[]>(
    list: TOptions
  ): Option<PickValueFromOptionList<TOptions>> {
    // @ts-expect-error
    return list.find(Option.isSome) ?? Option.None();
  },

  every<TOptions extends Option<unknown>[]>(
    list: TOptions
  ): Option<Array<PickValueFromOptionList<TOptions>>> {
    // @ts-expect-error
    return Option.traverse(list, identity);
  },

  tryCatch<A>(f: () => NonNullable<A>): Option<A> {
    try {
      return Option.Some(f());
    } catch {
      return Option.None();
    }
  },
};

type PickValueFromOptionList<T extends Array<Option<unknown>>> = {
  [K in keyof T]: T[K] extends Option<infer A> ? A : never;
}[number];
