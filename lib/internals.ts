export function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return typeof value === "object" && value !== null && "then" in value;
}

export declare const _tag: unique symbol;