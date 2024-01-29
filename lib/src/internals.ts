export function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}

export type Compute<T> = {
  [K in keyof T]: T[K];
} & {};

export const _value = "_value" as const;
export const _tag = "_tag" as const;
export const SOME = Symbol.for("fltd/Some");
export const NONE = Symbol.for("fltd/None");
export const OK = Symbol.for("fltd/Ok");
export const ERR = Symbol.for("fltd/Err");
export const TASK = Symbol.for("fltd/Task");
