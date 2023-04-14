import type { None as _None, Some as _Some } from "./option";
export { Option } from "./option";
import type { Err as _Err, Ok as _Ok } from "./result";
export { Result } from "./result";
export * from "./task";
export * from "./utils";

export type None = _None;
export type Some<A> = _Some<A>;
export type Err<E, A> = _Err<E, A>;
export type Ok<E, A> = _Ok<E, A>;
