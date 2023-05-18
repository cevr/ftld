export function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}

export declare const _tag: unique symbol;

export type Compute<T> = {
  [K in keyof T]: T[K];
} & {};
