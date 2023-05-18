import { None, Option, Some } from "./option";
import { Err, Ok, Result } from "./result";
import { Task } from "./task";

export function identity<A>(a: A): A {
  return a;
}

export function isResult<E, A>(value: unknown): value is Result<E, A> {
  return value instanceof Err || value instanceof Ok;
}

export function isOption<A>(value: unknown): value is Option<A> {
  return value instanceof Some || value instanceof None;
}

export function isTask<E, A>(value: unknown): value is Task<E, A> {
  return value instanceof Task;
}

export function isMonad(value: unknown): value is Monad<unknown, unknown> {
  return isOption(value) || isResult(value) || isTask(value);
}

export type Monad<E, A> = Option<A> | Result<E, A> | Task<E, A>;
