import type { Option, UnwrapNoneError } from "./option";
import type { Monad } from "./internals";
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

class AsyncGen<T, A> implements AsyncGenerator<T, A> {
  called = false;

  constructor(readonly self: T) {}

  async next(a: [A] extends [never] ? any : A): Promise<IteratorResult<T, A>> {
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

  async return(a: A): Promise<IteratorResult<T, A>> {
    return {
      value: a,
      done: true,
    };
  }

  async throw(e: unknown): Promise<IteratorResult<T, A>> {
    throw e;
  }

  [Symbol.asyncIterator](): AsyncGenerator<T, A> {
    return new AsyncGen<T, A>(this.self);
  }
}

class UnwrapGen<A> {
  declare _E: UnwrapError<A>;
  constructor(readonly value: unknown) {}
  [Symbol.iterator]() {
    return new Gen<this, UnwrapValue<A>>(this);
  }
  [Symbol.asyncIterator]() {
    return new AsyncGen<this, UnwrapValue<A>>(this);
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
  ? UnwrapError<A>
  : unknown;

export type Unwrapper = <A>(a: A) => UnwrapGen<A>;

export function Do<T, Gen extends UnwrapGen<unknown>>(
  f: ($: Unwrapper) => Generator<Gen, T, any>
): Collect<UnionToTuple<Gen>, UnwrapValue<T>> {
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

type CollectErrors<T extends any[]> = {
  [K in keyof T]: T[K] extends UnwrapGen<infer Value>
    ? UnwrapError<Value>
    : never;
}[number];

// if the generator includes any Tasks, the return type will be a Task
// otherwise it will be a Result
type Collect<T, V> = T extends Array<
  UnwrapGen<Exclude<Monad<unknown, unknown>, Task<unknown, unknown>>>
>
  ? Result<CollectErrors<T>, V>
  : T extends Array<UnwrapGen<Monad<unknown, unknown> | PromiseLike<unknown>>>
  ? Task<CollectErrors<T>, V>
  : T extends Array<UnwrapGen<PromiseLike<unknown>>>
  ? Task<CollectErrors<T>, V>
  : never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type UnionToOvlds<U> = UnionToIntersection<
  U extends any ? (f: U) => void : never
>;

type PopUnion<U> = UnionToOvlds<U> extends (a: infer A) => void ? A : never;

type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;

type UnionToTuple<T, A extends unknown[] = []> = IsUnion<T> extends true
  ? UnionToTuple<Exclude<T, PopUnion<T>>, [PopUnion<T>, ...A]>
  : [T, ...A];
