import type { Option } from "./option";
import type { Result } from "./result";
import type { Task } from "./task";

export function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return typeof value === "object" && value !== null && "then" in value;
}

export declare const _tag: unique symbol;

export type Monad<E, A> = Option<A> | Result<E, A> | Task<E, A>;
