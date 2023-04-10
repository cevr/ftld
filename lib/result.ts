import type { Option } from './option';
import type { Foldable, HKT, Monad } from './types';
import { identity } from './utils';

// Result HKT
interface ResultHKT<E, A> extends HKT {
  type: Result<E, A>;
}

class Ok<E, A> implements Monad<ResultHKT<E, A>, never, E, A>, Foldable<A> {
  __tag = 'Ok' as const;

  constructor(public readonly _value: A) {}

  mapError<F>(f: (e: E) => F): Result<F, A> {
    // @ts-expect-error
    return this;
  }

  map<B>(f: (a: A) => B): Result<E, B> {
    return Result.Ok(f(this._value));
  }

  ap<B>(fab: Result<E, (a: A) => B>): Result<E, B> {
    if (fab.isErr()) {
      // @ts-expect-error
      return fab;
    }
    return Result.Ok(fab._value(this._value));
  }

  of(value: A): Result<E, A> {
    return Result.Ok(value);
  }

  flatMap<B>(f: (a: A) => Result<E, B>): Result<E, B> {
    return f(this._value);
  }

  flatMapError<F>(f: (e: E) => Result<F, A>): Result<F, A> {
    // @ts-expect-error
    return this;
  }

  fold<B>(g: (e: E) => B, f: (a: A) => B): B {
    return f(this._value);
  }

  unwrap(): A {
    return this._value;
  }

  unwrapErr(): E {
    throw this._value;
  }

  unwrapOr<B>(value: B): A {
    return this._value;
  }

  isOk(): this is Ok<E, A> {
    return true;
  }

  isErr(): this is Err<E, A> {
    return false;
  }

  reduce<B>(f: (b: B, a: A) => B, b: B): B {
    return f(b, this._value);
  }

  match<OnErr, OnOk>(cases: { Ok: (value: A) => OnOk; Err: (value: E) => OnErr }): OnOk {
    return cases.Ok(this._value);
  }
}

class Err<E, A> implements Monad<ResultHKT<E, A>, never, E, A>, Foldable<A> {
  __tag = 'Err' as const;

  constructor(public readonly _value: E) {}

  of(value: A): Result<E, A> {
    return Result.Ok(value);
  }

  mapError<F>(f: (e: E) => F): Result<F, A> {
    return Result.Err(f(this._value));
  }

  map<B>(f: (a: A) => B): Result<E, B> {
    // @ts-expect-error
    return this;
  }

  ap<B>(fab: Result<E, (a: A) => B>): Result<E, B> {
    // @ts-expect-error
    return this;
  }

  static of<E, A>(value: A): Result<E, A> {
    return Result.Ok(value);
  }

  flatMap<B>(f: (a: A) => Result<E, B>): Result<E, B> {
    // @ts-expect-error
    return this;
  }

  flatMapError<F>(f: (e: E) => Result<F, A>): Result<F, A> {
    return f(this._value);
  }

  fold<B>(g: (e: E) => B, f: (a: A) => B): B {
    return g(this._value);
  }

  unwrap(): A {
    throw this._value;
  }

  unwrapErr(): E {
    return this._value;
  }

  unwrapOr<B>(value: B): B {
    return value;
  }

  isOk(): this is Ok<E, A> {
    return false;
  }

  isErr(): this is Err<E, A> {
    return true;
  }

  reduce<B>(f: (b: B, a: A) => B, b: B): B {
    return b;
  }

  match<OnErr, OnOk>(cases: { Ok: (value: A) => OnOk; Err: (value: E) => OnErr }): OnErr {
    return cases.Err(this._value);
  }
}

export type Result<E, A> = Ok<E, A> | Err<E, A>;

export const Result: {
  Ok<E, A>(value: A): Result<E, A>;
  Err<E, A>(error: E): Result<E, A>;
  fromNullable<E, A>(error: E, value: A | null | undefined): Result<E, A>;
  fromPredicate<E, A>(predicate: (a: A) => boolean, error: E, value: A): Result<E, A>;
  fromOption<E, A>(error: E, option: Option<A>): Result<E, A>;
  isOk<E, A>(result: Result<E, A>): result is Ok<E, A>;
  isErr<E, A>(result: Result<E, A>): result is Err<E, A>;
  of<E, A>(value: A): Result<E, A>;
  traverse<E, A, B>(list: A[], f: (a: A) => Result<E, B>): Result<E, B[]>;
  sequence<E, A>(list: Result<E, A>[]): Result<E, A[]>;
  tryCatch<E, A>(f: () => A, error: (e: unknown) => E): Result<E, A>;
  any<E, A>(list: Result<E, A>[]): Result<E, A>;
  every<E, A>(list: Result<E, A>[]): Result<E, A[]>;
} = {
  of<E, A>(value: A): Result<E, A> {
    return Result.Ok(value);
  },
  Ok<E, A>(value: A): Result<E, A> {
    return new Ok(value);
  },

  Err<E, A>(error: E): Result<E, A> {
    return new Err(error);
  },

  fromNullable<E, A>(error: E, value: A | null | undefined): Result<E, A> {
    if (value == null) {
      return Result.Err(error);
    }

    return Result.Ok(value);
  },

  fromPredicate<E, A>(predicate: (a: A) => boolean, error: E, value: A): Result<E, A> {
    if (predicate(value)) {
      return Result.Ok(value);
    }

    return Result.Err(error);
  },

  fromOption<E, A>(error: E, option: Option<A>): Result<E, A> {
    if (option.isNone()) {
      return Result.Err(error);
    }

    return Result.Ok(option.unwrap());
  },
  isOk<E, A>(result: Result<E, A>): result is Ok<E, A> {
    return result.__tag === 'Ok';
  },

  isErr<E, A>(result: Result<E, A>): result is Err<E, A> {
    return result.__tag === 'Err';
  },

  traverse<E, A, B>(list: Array<A>, f: (a: A) => Result<E, B>): Result<E, Array<B>> {
    // @ts-expect-error
    return list.reduce((acc, a) => {
      if (Result.isErr(acc)) {
        return acc;
      }

      const result = f(a);

      if (Result.isErr(result)) {
        return result;
      }

      acc._value.push(result._value);
      return acc;
    }, Result.Ok([] as B[]));
  },

  sequence<E, A>(list: Array<Result<E, A>>): Result<E, Array<A>> {
    return Result.traverse(list, identity);
  },

  tryCatch<E, A>(f: () => A, error: (e: unknown) => E): Result<E, A> {
    try {
      return Result.Ok(f());
    } catch (e) {
      return Result.Err(error(e));
    }
  },

  any<E, A>(list: Array<Result<E, A>>): Result<E, A> {
    // @ts-expect-error
    return list.find(Result.isOk) ?? Result.Err(list[0]._value);
  },

  every<E, A>(list: Array<Result<E, A>>): Result<E, Array<A>> {
    return Result.traverse(list, identity);
  },
};
