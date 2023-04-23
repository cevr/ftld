import { Err, Ok, Result } from "./result";
import { Task } from "./task";
import { identity } from "./utils";

type OptionMatcher<A, B> = {
  None: () => B;
  Some: (value: A) => B;
};

export class Some<A> {
  // @ts-expect-error
  private readonly _tag = "Some" as const;
  constructor(readonly _value: A) {}

  map<B>(f: (a: A) => B): Option<B> {
    return Option.Some(f(this._value));
  }

  apply<B>(fab: Option<(a: A) => NonNullable<B>>): Option<B> {
    if (fab.isSome()) {
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

  match<B>(cases: OptionMatcher<A, B>): B {
    return cases.Some(this._value);
  }

  toResult<E>(error: E): Result<E, A> {
    return Result.Ok<E, A>(this._value);
  }

  toTask<E>(onErr: E | (() => E)): Task<E, A> {
    return Task.from(this, onErr instanceof Function ? onErr : () => onErr);
  }

  tap(f: (a: A) => void): Option<A> {
    f(this._value);
    return this;
  }
}

export class None<A> {
  // @ts-expect-error
  private readonly _tag = "None" as const;
  map<B>(f: (a: A) => B): Option<A> {
    return this;
  }

  apply<B>(_fab: Option<(a: A) => B>): Option<A> {
    return this;
  }
  flatMap<B>(f: (a: A) => Option<B>): Option<A> {
    return this;
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

  match<B>(cases: OptionMatcher<A, B>): B {
    return cases.None();
  }

  toResult<E>(error: E): Result<E, A> {
    return Result.Err(error);
  }

  toTask<E>(onErr: E | (() => E)): Task<E, A> {
    return Task.from<E, A>(
      this,
      onErr instanceof Function ? onErr : () => onErr
    );
  }

  tap(f: (a: A) => void): Option<A> {
    return this;
  }
}

export type Option<A> = Some<A> | None<A>;

export const Option: {
  None<A>(): Option<A>;
  Some<A>(value: A): Option<A>;
  fromPredicate<A>(predicate: (a: A) => boolean, value: A): Option<A>;
  isSome<A>(option: Option<A>): option is Some<NonNullable<A>>;
  isNone<A>(option: Option<A>): option is None<A>;
  from<A>(
    value: A
  ): A extends Result<any, infer V>
    ? Option<NonNullable<V>>
    : Option<NonNullable<A>>;
  tryCatch<A>(f: () => A): Option<A>;
  traverse<A, B>(list: A[], f: (a: A) => Option<B>): Option<B[]>;
  sequence<TOptions extends Option<unknown>[]>(
    list: TOptions
  ): Option<TraverseOptions<TOptions>>;
  any<TOptions extends Option<unknown>[]>(
    list: TOptions
  ): Option<TraverseOptions<TOptions>[number]>;
  every<TOptions extends Option<unknown>[]>(
    list: TOptions
  ): Option<TraverseOptions<TOptions>>;
} = {
  from<A>(
    value: A
  ): A extends Result<any, infer V>
    ? Option<NonNullable<V>>
    : Option<NonNullable<A>> {
    if (value == null) {
      return Option.None() as any;
    }

    if (value instanceof Err) {
      return Option.None() as any;
    }

    if (value instanceof Ok) {
      return Option.from(value.unwrap()) as any;
    }

    return Option.Some(value) as any;
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

  traverse<A, B>(list: A[], f: (a: A) => Option<B>): Option<B[]> {
    let result: B[] = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const option = f(item);
      if (option.isNone()) {
        return Option.None();
      }

      result.push(option.unwrap());
    }
    return Option.Some(result);
  },

  sequence<TOptions extends Option<unknown>[]>(
    list: TOptions
  ): Option<TraverseOptions<TOptions>> {
    // @ts-expect-error
    return Option.traverse(list, identity) as Option<
      TraverseOptions<TOptions>[]
    >;
  },

  any<TOptions extends Option<unknown>[]>(
    list: TOptions
  ): Option<TraverseOptions<TOptions>[number]> {
    // @ts-expect-error
    return list.find(Option.isSome) ?? Option.None();
  },

  every<TOptions extends Option<unknown>[]>(
    list: TOptions
  ): Option<TraverseOptions<TOptions>> {
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

type TraverseOptions<
  T extends Option<unknown>[] | [Option<unknown>, ...Option<unknown>[]]
> = {
  [K in keyof T]: T[K] extends Option<infer A> ? A : never;
};
