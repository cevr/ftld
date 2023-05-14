import type { Option, UnwrapNoneError } from "./option";
import { isPromiseLike } from "./internals";
import { Task } from "./task";
import { Result } from "./result";

class Gen<T, A> implements Generator<T, A> {
  called = false;

  constructor(readonly self: T) {}

  next(a: [A] extends [never] ? any : A): IteratorResult<T, A> {
    return this.called
      ? {
          value: a,
          done: true,
        }
      : ((this.called = true),
        {
          value: this.self,
          done: false,
        });
  }

  return(a: A): IteratorResult<T, A> {
    return {
      value: a,
      done: true,
    };
  }

  throw(e: unknown): IteratorResult<T, A> {
    throw e;
  }

  [Symbol.iterator](): Generator<T, A> {
    return new Gen<T, A>(this.self);
  }
}

class UnwrapGen<A> {
  declare _E: UnwrapError<A>;
  constructor(readonly value: unknown) {}
  [Symbol.iterator]() {
    return new Gen<this, UnwrapValue<A>>(this);
  }
}

type UnwrapValue<A> = [A] extends [never]
  ? never
  : A extends Option<infer B>
  ? B
  : A extends Result<infer _, infer C>
  ? C
  : A extends Task<infer _, infer D>
  ? D
  : A extends PromiseLike<infer A>
  ? UnwrapValue<A>
  : A;

type UnwrapError<A> = [A] extends [never]
  ? never
  : A extends Option<unknown>
  ? UnwrapNoneError
  : A extends Result<infer A, unknown>
  ? A
  : A extends Task<infer A, unknown>
  ? A
  : A extends PromiseLike<infer A>
  ? unknown
  : never;

export type Unwrapper = <A>(a: A) => UnwrapGen<A>;

export function Do<T, Gen extends UnwrapGen<unknown>>(
  f: ($: Unwrapper) => Generator<Gen, T, any>
): EitherTaskOrResult<Tuple<Gen>, UnwrapValue<T>> {
  const iterator = f((x: unknown) => new UnwrapGen(x));

  // @ts-expect-error
  const run = (state: any) => {
    if (isPromiseLike(state)) {
      return state.then(run);
    }
    if (state.done) {
      return unwrap(getGeneratorValue(state.value));
    }

    const next = unwrap(getGeneratorValue(state.value));
    if (isPromiseLike(next)) {
      return next.then((value) => run(iterator.next(value)));
    }
    return run(iterator.next(next));
  };

  const res = Result.from(() => run(iterator.next()));
  if (res.isOk()) {
    const val = res.unwrap();
    if (isPromiseLike(val)) {
      return Task.from(val) as any;
    }
  }
  return res as any;
}

function isUnwrapable(x: unknown): x is {
  unwrap: () => unknown;
} {
  return (
    !!x &&
    typeof x === "object" &&
    "unwrap" in x &&
    typeof x.unwrap === "function"
  );
}

function unwrap(x: unknown): unknown {
  return isUnwrapable(x) ? x.unwrap() : x;
}

function getGeneratorValue(x: unknown): unknown {
  return x instanceof UnwrapGen ? x.value : x;
}

// if the generator includes any Tasks, the return type will be a Task
// otherwise it will be a Result
type EitherTaskOrResult<E, V> = E extends Array<UnwrapGen<infer T>>
  ? [Extract<T, Task<unknown, unknown> | PromiseLike<unknown>>] extends [never]
    ? Result<UnwrapError<T>, V>
    : Task<UnwrapError<T>, V>
  : never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type LastOf<T> = UnionToIntersection<
  T extends any ? () => T : never
> extends () => infer R
  ? R
  : never;

type Push<T extends any[], V> = [...T, V];

type TuplifyUnion<
  T,
  L = LastOf<T>,
  N = [T] extends [never] ? true : false
> = true extends N ? [] : Push<TuplifyUnion<Exclude<T, L>>, L>;

// https://stackoverflow.com/a/73641837
type Tuple<
  T,
  A extends T[] = []
> = TuplifyUnion<T>["length"] extends A["length"]
  ? [...A]
  : Tuple<T, [T, ...A]>;
