import type { Result } from './result';
import type { Foldable, HKT, Monad } from './types';
import { identity } from './utils';

// Option HKT
interface OptionHKT<A> extends HKT {
  type: Option<A>;
}

class Some<A> implements Monad<OptionHKT<A>, never, never, A>, Foldable<A> {
  __tag = 'Some' as const;
  constructor(public readonly _value: A) {}

  map<B>(f: (a: A) => B): Option<B> {
    return Option.Some(f(this._value));
  }

  of<B>(value: B): Option<B> {
    return Option.Some(value);
  }

  ap<B>(fab: Option<(a: A) => B>): Option<B> {
    if (fab.__tag === 'Some') {
      return Option.Some(fab._value(this._value));
    }

    return Option.None();
  }

  flatMap<B>(f: (a: A) => Option<B>): Option<B> {
    return f(this._value);
  }

  unwrap(): A {
    return this._value;
  }

  unwrapOr<B>(value: B): A {
    return this._value;
  }

  isSome(): this is Some<A> {
    return true;
  }

  isNone(): this is None<A> {
    return false;
  }

  reduce<B>(f: (b: B, a: A) => B, b: B): B {
    return f(b, this._value);
  }

  match<OnNone, OnSome>(cases: { None: () => OnNone; Some: (value: A) => OnSome }): OnSome {
    return cases.Some(this._value);
  }
}

class None<A> implements Monad<OptionHKT<A>, never, never, A>, Foldable<A> {
  __tag = 'None' as const;

  of<B>(value: B): Option<B> {
    return Option.Some(value);
  }

  map<B>(f: (a: A) => B): Option<B> {
    return Option.None();
  }

  ap<B>(fab: Option<(a: A) => B>): Option<B> {
    return Option.None();
  }

  flatMap<B>(f: (a: A) => Option<B>): Option<B> {
    return Option.None();
  }

  unwrap(): A {
    throw new Error('Cannot unwrap None');
  }

  unwrapOr<B>(value: B): B {
    return value;
  }

  isSome(): this is Some<A> {
    return false;
  }

  isNone(): this is None<A> {
    return true;
  }

  reduce<B>(f: (b: B, a: A) => B, b: B): B {
    return b;
  }

  match<OnNone, OnSome>(cases: { None: () => OnNone; Some: (value: A) => OnSome }): OnNone {
    return cases.None();
  }
}

export type Option<A> = Some<A> | None<A>;

export const Option: {
  None<A>(): None<A>;
  Some<A>(value: A): Some<A>;
  fromNullable<A>(value: A | null | undefined): Option<A>;
  fromPredicate<A>(predicate: (a: A) => boolean, value: A): Option<A>;
  fromResult<E, A>(result: Result<E, A>): Option<A>;
  isSome<A>(option: Option<A>): option is Some<A>;
  isNone<A>(option: Option<A>): option is None<A>;
  of<A>(value: A): Option<A>;
  traverse<A, B>(list: Array<A>, f: (a: A) => Option<B>): Option<Array<B>>;
  sequence<A>(list: Array<Option<A>>): Option<Array<A>>;
  any<A>(list: Array<Option<A>>): Option<A>;
  every<A>(list: Array<Option<A>>): Option<Array<A>>;
  tryCatch<A>(f: () => A): Option<A>;
} = {
  of<A>(value: A): Option<A> {
    return Option.Some(value);
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

  None<A>(): None<A> {
    return new None();
  },

  isSome<A>(option: Option<A>): option is Some<A> {
    return option.__tag === 'Some';
  },

  isNone<A>(option: Option<A>): option is None<A> {
    return option.__tag === 'None';
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
