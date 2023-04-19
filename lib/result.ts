import { Option } from "./option";
import { Task } from "./task";
import { identity } from "./utils";

type ResultMatcher<E, A, B> = {
  Err: (value: E) => B;
  Ok: (value: A) => B;
};

export class Ok<E, A> {
  __tag = "Ok" as const;

  constructor(private readonly _value: A) {}

  mapErr<F>(f: (e: E) => F): Result<F, A> {
    // @ts-expect-error
    return this;
  }

  map<B>(f: (a: A) => B): Result<E, B> {
    return Result.Ok(f(this._value));
  }

  apply<B>(fab: Result<E, (a: A) => B>): Result<E, B> {
    if (fab.isErr()) {
      // @ts-expect-error
      return fab;
    }
    return Result.Ok(fab.unwrap()(this._value));
  }

  flatMap<F, B>(f: (a: A) => Result<F, B>): Result<E | F, B> {
    return f(this._value);
  }

  fold<B>(_g: (e: never) => B, f: (a: A) => B): B {
    return f(this._value);
  }

  unwrap(): A {
    return this._value;
  }

  unwrapErr(): never {
    throw this._value;
  }

  unwrapOr<B>(value: B): A {
    return this._value;
  }

  isOk(): this is Ok<E, A> {
    return true;
  }

  isErr(): never {
    // @ts-expect-error
    return false;
  }

  reduce<B>(f: (b: B, a: A) => B, b: B): B {
    return f(b, this._value);
  }

  match<B>(cases: ResultMatcher<E, A, B>): B {
    return cases.Ok(this._value);
  }

  toOption(): Option<A> {
    return Option.Some(this._value);
  }

  tap(f: (a: A) => void): Result<E, A> {
    f(this._value);
    return this;
  }

  toTask(): Task<E, A> {
    return Task.from(this);
  }
}

export class Err<E, A> {
  __tag = "Err" as const;

  constructor(private readonly _value: E) {}

  mapErr<F>(f: (e: E) => F): Result<F, A> {
    return Result.Err(f(this._value));
  }

  map<B>(f: (a: A) => B): Result<E, B> {
    // @ts-expect-error
    return this;
  }

  apply<B>(fab: Result<E, (a: A) => B>): Result<E, B> {
    // @ts-expect-error
    return this;
  }

  flatMap<F, B>(f: (a: A) => Result<F, B>): Result<E | F, B> {
    // @ts-expect-error
    return this;
  }

  fold<B>(g: (e: E) => B, f: (a: never) => B): B {
    return g(this._value);
  }

  unwrap(): never {
    throw this._value;
  }

  unwrapErr(): E {
    return this._value;
  }

  unwrapOr<B>(value: B): B {
    return value;
  }

  isOk(): never {
    // @ts-expect-error
    return false;
  }

  isErr(): this is Err<E, A> {
    return true;
  }

  reduce<B>(f: (b: B, a: A) => B, b: B): B {
    return b;
  }

  match<B>(cases: ResultMatcher<E, A, B>): B {
    return cases.Err(this._value);
  }

  toOption(): Option<A> {
    return Option.None();
  }

  tap(f: (a: E) => void): Result<E, A> {
    f(this._value);
    return this;
  }

  toTask(): Task<E, A> {
    return Task.fromResult<E, A>(this);
  }
}

export type Result<E, A> = Ok<E, A> | Err<E, A>;

export const Result: {
  Ok<A, E = unknown>(value: A): Result<E, A>;
  Err<A = unknown, E = unknown>(error: E): Result<E, A>;
  fromPredicate<E, A>(
    predicate: (a: A) => boolean,
    error: E,
    value: A
  ): Result<E, A>;
  fromOption<E, A>(error: E, option: Option<A>): Result<E, A>;
  isOk<E, A>(result: Result<E, A>): result is Ok<E, A>;
  isErr<E, A>(result: Result<E, A>): result is Err<E, A>;
  from<E, A>(err: E, value: A): Result<E, NonNullable<A>>;
  tryCatch<E, A>(f: () => A, error: (e: unknown) => E): Result<E, A>;
  traverse<E, A, B>(list: A[], f: (a: A) => Result<E, B>): Result<E, B[]>;
  sequence<TResults extends Result<unknown, unknown>[]>(
    list: TResults
  ): Result<
    PickErrorFromResultList<TResults>,
    PickValueFromResultList<TResults>[]
  >;
  any<TResults extends Result<unknown, unknown>[]>(
    list: TResults
  ): Result<
    PickErrorFromResultList<TResults>,
    PickValueFromResultList<TResults>
  >;
  every<TResults extends Result<unknown, unknown>[]>(
    list: TResults
  ): Result<
    PickErrorFromResultList<TResults>,
    PickValueFromResultList<TResults>[]
  >;
  collect<TResults extends Result<unknown, unknown>[]>(
    list: TResults
  ): Result<
    PickErrorFromResultList<TResults>[],
    PickValueFromResultList<TResults>[]
  >;
} = {
  from<E, A>(err: E, value: A): Result<E, NonNullable<A>> {
    if (value == null) {
      return Result.Err(err);
    }

    return Result.Ok(value);
  },
  Ok<A>(value: A): Ok<never, A> {
    return new Ok(value);
  },

  Err<E>(error: E): Err<E, never> {
    return new Err(error);
  },

  fromPredicate<E, A>(
    predicate: (a: A) => boolean,
    error: E,
    value: A
  ): Result<E, A> {
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
    return result.__tag === "Ok";
  },

  isErr<E, A>(result: Result<E, A>): result is Err<E, A> {
    return result.__tag === "Err";
  },

  tryCatch<E, A>(f: () => A, error: (e: unknown) => E): Result<E, A> {
    try {
      return Result.Ok(f());
    } catch (e) {
      return Result.Err(error(e));
    }
  },

  traverse<E, A, B>(
    list: Array<A>,
    f: (a: A) => Result<E, B>
  ): Result<E, Array<B>> {
    // @ts-expect-error
    return list.reduce((acc, a) => {
      if (Result.isErr(acc)) {
        return acc;
      }

      const result = f(a);

      if (Result.isErr(result)) {
        return result;
      }

      acc.unwrap().push(result.unwrap());
      return acc;
    }, Result.Ok([] as B[]));
  },

  sequence<TResults extends Result<unknown, unknown>[]>(
    list: TResults
  ): Result<
    PickErrorFromResultList<TResults>,
    PickValueFromResultList<TResults>[]
  > {
    // @ts-expect-error
    return Result.traverse(list, identity);
  },

  any<TResults extends Result<unknown, unknown>[]>(
    list: TResults
  ): Result<
    PickErrorFromResultList<TResults>,
    PickValueFromResultList<TResults>
  > {
    // @ts-expect-error
    return list.find(Result.isOk) ?? Result.Err(list[0].unwrapErr());
  },

  every<TResults extends Result<unknown, unknown>[]>(
    list: TResults
  ): Result<
    PickErrorFromResultList<TResults>,
    PickValueFromResultList<TResults>[]
  > {
    // @ts-expect-error
    return Result.traverse(list, identity);
  },

  collect<TResults extends Result<unknown, unknown>[]>(
    list: TResults
  ): Result<
    PickErrorFromResultList<TResults>[],
    PickValueFromResultList<TResults>[]
  > {
    let errors: any[] = [];
    let values: any[] = [];
    for (const result of list) {
      if (Result.isOk(result)) {
        values.push(result.unwrap());
      } else {
        errors.push(result.unwrapErr());
      }
    }
    return errors.length > 0 ? Result.Err(errors) : Result.Ok(values);
  },
};

type PickErrorFromResultList<T extends Array<Result<unknown, unknown>>> = {
  [K in keyof T]: T[K] extends Result<infer E, any> ? E : never;
}[number];

type PickValueFromResultList<T extends Array<Result<unknown, unknown>>> = {
  [K in keyof T]: T[K] extends Result<any, infer A> ? A : never;
}[number];
