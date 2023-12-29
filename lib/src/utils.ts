import { ERR, NONE, OK, SOME, TASK, _tag } from "./internals.js";
import type { Option } from "./option.js";
import type { Result } from "./result.js";
import type { Task } from "./task.js";

export class UnwrapNoneError extends Error {
  readonly [_tag] = "UnwrapNoneError";
}

export class UnknownError {
  readonly [_tag] = "UnknownError";
  constructor(public readonly error: unknown) {}
}

export function identity<A>(a: A): A {
  return a;
}

export function isResult<E, A>(value: unknown): value is Result<E, A> {
  return (
    !!value &&
    typeof value === "object" &&
    _tag in value &&
    (value[_tag] === OK || value[_tag] === ERR)
  );
}

export function isOption<A>(value: unknown): value is Option<A> {
  return (
    !!value &&
    typeof value === "object" &&
    _tag in value &&
    (value[_tag] === SOME || value[_tag] === NONE)
  );
}

export function isTask<E, A>(value: unknown): value is Task<E, A> {
  return (
    !!value &&
    typeof value === "object" &&
    _tag in value &&
    value[_tag] === TASK
  );
}

export function isMonad(value: unknown): value is Monad<unknown, unknown> {
  return isOption(value) || isResult(value) || isTask(value);
}

export type Monad<E, A> = Option<A> | Result<E, A> | Task<E, A>;
