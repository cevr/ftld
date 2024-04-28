export function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}

export type Compute<T> = {
  [K in keyof T]: T[K];
} & {};

export type NoDistribute<T> = [T] extends [infer T] ? T : never;

export const _value = "_value" as const;
export const _tag = "_tag" as const;
export const SOME = Symbol.for("fltd/Some");
export const NONE = Symbol.for("fltd/None");
export const OK = Symbol.for("fltd/Ok");
export const ERR = Symbol.for("fltd/Err");
export const TASK = Symbol.for("fltd/Task");

export class Gen<T, A> implements Generator<T, A> {
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
