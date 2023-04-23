import { None, Option, Some } from "./option";
import { Task } from "./task";
import { identity } from "./utils";

type ResultMatcher<E, A, B> = {
  Err: (value: E) => B;
  Ok: (value: A) => B;
};

export class Ok<E, A> {
  // @ts-expect-error
  private readonly _tag = "Ok" as const;

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

  tapErr(f: (a: E) => void): Result<E, A> {
    return this;
  }

  toTask(): Task<E, A> {
    return Task.from(this);
  }
}

export class Err<E, A> {
  // @ts-expect-error
  private readonly _tag = "Err" as const;

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

  match<B>(cases: ResultMatcher<E, A, B>): B {
    return cases.Err(this._value);
  }

  toOption(): Option<A> {
    return Option.None();
  }

  tap(f: (a: E) => void): Result<E, A> {
    return this;
  }

  tapErr(f: (a: E) => void): Result<E, A> {
    f(this._value);
    return this;
  }

  toTask(): Task<E, A> {
    return Task.from<E, A>(this);
  }
}

export type Result<E, A> = Ok<E, A> | Err<E, A>;

export const Result: {
  Ok<E, A>(value: A): Result<E, A>;
  Err<E, A>(error: E): Result<E, A>;
  fromPredicate<E, A>(
    predicate: (a: A) => boolean,
    error: E,
    value: A
  ): Result<E, A>;
  from<E, A>(
    value: A | (() => A),
    onErr?: (e: unknown) => E
  ): A extends Option<infer V> ? Result<E, V> : Result<E, A>;
  isOk<E, A>(result: Result<E, A>): result is Ok<E, A>;
  isErr<E, A>(result: Result<E, A>): result is Err<E, A>;
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
  validate<
    TResults extends [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
  >(
    list: EnsureCommonBase<TResults>
  ): Result<
    PickErrorFromResultList<TResults>[],
    PickValueFromResultList<TResults>
  >;
} = {
  from<E, A>(
    valueOrGetter: A | (() => A),
    onErr: (e: unknown) => E = identity as () => E
  ): A extends Option<infer V> ? Result<E, V> : Result<E, A> {
    try {
      const value =
        valueOrGetter instanceof Function ? valueOrGetter() : valueOrGetter;

      if (value instanceof None) {
        return Result.Err(onErr(value)) as any;
      }

      if (value instanceof Some) {
        return Result.Ok(value.unwrap()) as any;
      }

      return Result.Ok(value) as any;
    } catch (e) {
      return Result.Err(onErr(e)) as any;
    }
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

  isOk<E, A>(result: Result<E, A>): result is Ok<E, A> {
    return result.isOk();
  },

  isErr<E, A>(result: Result<E, A>): result is Err<E, A> {
    return result.isErr();
  },

  tryCatch<E, A>(f: () => A, onErr: (e: unknown) => E): Result<E, A> {
    return Result.from(f, onErr) as any;
  },

  traverse<E, A, B>(list: A[], f: (a: A) => Result<E, B>): Result<E, B[]> {
    let result: B[] = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const res = f(item);
      if (res.isErr()) {
        return res as Result<E, B[]>;
      }
      result.push(res.unwrap());
    }
    return Result.Ok(result);
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
  validate<
    TResults extends [Result<unknown, unknown>, ...Result<unknown, unknown>[]]
  >(
    list: EnsureCommonBase<TResults>
  ): Result<
    PickErrorFromResultList<TResults>[],
    PickValueFromResultList<TResults>
  > {
    let errors: any[] = [];
    for (const result of list) {
      if (Result.isErr(result)) {
        errors.push(result.unwrapErr());
      }
    }
    // @ts-expect-error
    return errors.length > 0 ? Result.Err(errors) : list[0];
  },
};

type PickErrorFromResultList<T extends Result<unknown, unknown>[]> = {
  [K in keyof T]: T[K] extends Result<infer E, any> ? E : never;
}[number];

type PickValueFromResultList<T extends Result<unknown, unknown>[]> = {
  [K in keyof T]: T[K] extends Result<any, infer A> ? A : never;
}[number];

type EnsureCommonBase<
  TResults extends readonly [
    Result<unknown, unknown>,
    ...Result<unknown, unknown>[]
  ]
> = {
  [B in keyof TResults]: ExtractOk<TResults[0]> extends ExtractOk<TResults[B]>
    ? ExtractOk<TResults[0]> extends ExtractOk<TResults[B]>
      ? TResults[B]
      : TResults[B]
    : "ERROR: All results should have the same Ok type";
};

type ExtractOk<T extends Result<unknown, unknown>> = T extends Result<
  unknown,
  infer A
>
  ? A
  : never;
