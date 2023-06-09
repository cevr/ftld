import type { Option } from "./option";
import type { Task } from "./task";
import type { Result } from "./result";
import type { Monad, UnknownError, UnwrapNoneError } from "./utils";

export function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}

export type Compute<T> = {
  [K in keyof T]: T[K];
} & {};

export type UnwrapValue<A> = [A] extends [never]
  ? never
  : A extends Monad<unknown, infer B>
  ? B
  : A extends Promise<infer C>
  ? UnwrapValue<C>
  : A extends (...args: any) => infer B
  ? UnwrapValue<B>
  : A;

export type UnwrapError<E> = [E] extends [never]
  ? UnknownError
  : E extends (...any: any) => infer R
  ? UnwrapError<R>
  : E extends Option<unknown>
  ? UnwrapNoneError
  : E extends Result<infer E, unknown>
  ? E
  : E extends Task<infer E, unknown>
  ? E
  : E extends Promise<infer E>
  ? UnwrapError<E>
  : UnknownError;

export const _value = Symbol.for("_value");
export const _tag = Symbol.for("_tag");

export const TAGS = {
  Some: "Some",
  None: "None",
  Ok: "Ok",
  Err: "Err",
  Task: "Task",
};
