import { TAGS, _tag } from "./internals";
import type { Option } from "./option";
import type { Result } from "./result";
import type { Task } from "./task";

export class UnwrapNoneError {
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
    (value[_tag] === TAGS.Ok || value[_tag] === TAGS.Err)
  );
}

export function isOption<A>(value: unknown): value is Option<A> {
  return (
    !!value &&
    typeof value === "object" &&
    _tag in value &&
    (value[_tag] === TAGS.Some || value[_tag] === TAGS.None)
  );
}

export function isTask<E, A>(value: unknown): value is Task<E, A> {
  return (
    !!value &&
    typeof value === "object" &&
    _tag in value &&
    value[_tag] === TAGS.Task
  );
}

export function isMonad(value: unknown): value is Monad<unknown, unknown> {
  return isOption(value) || isResult(value) || isTask(value);
}

export type Monad<E, A> = Option<A> | Result<E, A> | Task<E, A>;
