import type { None as _None, Some as _Some } from "./option";
import type { Err as _Err, Ok as _Ok } from "./result";

export type None = _None;
export type Some<A> = _Some<A>;
export type Err<E, A> = _Err<E, A>;
export type Ok<E, A> = _Ok<E, A>;
export { Result } from "./result";
export { Option } from "./option";
export * from "./task";
export * from "./utils";
