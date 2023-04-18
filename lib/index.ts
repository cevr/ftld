import type { None as _None, Some as _Some } from "./option";
import type { Err as _Err, Ok as _Ok } from "./result";
import type { Dict as _Dict, List as _List } from "./collection";

export type None<A> = _None<A>;
export type Some<A> = _Some<A>;
export type Err<E, A> = _Err<E, A>;
export type Ok<E, A> = _Ok<E, A>;
export type Dict<A> = _Dict<A>;
export type List<A> = _List<A>;
export type { BrandError, Unbrand } from "./brand";

export { Brand } from "./brand";
export { Result } from "./result";
export { Option } from "./option";
export { Collection } from "./collection";
export { Task } from "./task";
export { identity, isCollection, isOption, isResult, isTask } from "./utils";
