import type { None as _None, Some as _Some } from "./option";
import type { Err as _Err, Ok as _Ok } from "./result";

export type None<A> = _None<A>;
export type Some<A> = _Some<A>;
export type Err<E, A> = _Err<E, A>;
export type Ok<E, A> = _Ok<E, A>;

export type { Unbrand } from "./brand";
export { Brand } from "./brand";
export { Result } from "./result";
export { Option } from "./option";
export { Task } from "./task";
export { identity, isOption, isResult, isTask } from "./utils";
