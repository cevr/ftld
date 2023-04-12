import { Option } from "./option";
import { Result } from "./result";
import { Task } from "./task";

export function toResult<E, A>(
  error: E,
  value: A | null | undefined
): Result<E, A> {
  if (value == null) {
    return Result.Err(error);
  }

  return Result.Ok(value);
}

export function toOption<A>(value: A | null | undefined): Option<A> {
  if (value == null) {
    return Option.None();
  }

  return Option.Some(value);
}

export function toTask<E, A>(
  value: A | null | undefined,
  error: E
): Task<E, A> {
  if (value == null) {
    return Task.fromResult(Result.Err(error));
  }

  return Task.of(value);
}

export function identity<A>(a: A): A {
  return a;
}

export function isResult<E, A>(value: unknown): value is Result<E, A> {
  return (
    (typeof value === "object" &&
      value !== null &&
      "__tag" in value &&
      (value as Result<E, A>).__tag === "Ok") ||
    (value as Result<E, A>).__tag === "Err"
  );
}

export function isOption<A>(value: unknown): value is Option<A> {
  return (
    (typeof value === "object" &&
      value !== null &&
      "__tag" in value &&
      (value as Option<A>).__tag === "Some") ||
    (value as Option<A>).__tag === "None"
  );
}

export function isTask<E, A>(value: unknown): value is Task<E, A> {
  return (
    typeof value === "object" &&
    value !== null &&
    "__tag" in value &&
    (value as Task<E, A>).__tag === "Task"
  );
}
