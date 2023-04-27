import { Option } from "./option";
import { Result } from "./result";
import { Task } from "./task";

export function identity<A>(a: A): A {
  return a;
}

export function isResult<E, A>(value: unknown): value is Result<E, A> {
  return (
    typeof value === "object" &&
    value !== null &&
    "_tag" in value &&
    (value._tag === "Ok" || value._tag === "Err")
  );
}

export function isOption<A>(value: unknown): value is Option<A> {
  return (
    typeof value === "object" &&
    value !== null &&
    "_tag" in value &&
    (value._tag === "Some" || value._tag === "None")
  );
}

export function isTask<E, A>(value: unknown): value is Task<E, A> {
  return typeof value === "object" && value !== null && "_tag" in value;
}
