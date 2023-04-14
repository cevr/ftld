import type { Option } from "./option";
import type { Result } from "./result";
import type { Task } from "./task";
import type { Collection } from "./collection";

export function identity<A>(a: A): A {
  return a;
}

export function isResult<E, A>(value: unknown): value is Result<E, A> {
  return (
    typeof value === "object" &&
    value !== null &&
    "__tag" in value &&
    (value.__tag === "Ok" || value.__tag === "Err")
  );
}

export function isOption<A>(value: unknown): value is Option<A> {
  return (
    typeof value === "object" &&
    value !== null &&
    "__tag" in value &&
    (value.__tag === "Some" || value.__tag === "None")
  );
}

export function isTask<E, A>(value: unknown): value is Task<E, A> {
  return (
    typeof value === "object" &&
    value !== null &&
    "__tag" in value &&
    value.__tag === "Task"
  );
}

export function isCollection<A>(value: unknown): value is Collection<A> {
  return (
    typeof value === "object" &&
    value !== null &&
    "__tag" in value &&
    (value.__tag === "Dict" || value.__tag === "List")
  );
}
