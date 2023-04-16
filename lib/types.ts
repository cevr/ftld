import { Dict, List } from "./collection";

export type DictLike<T> =
  | Record<string, T>
  | Map<string, T>
  | ReadonlyMap<string, T>
  | Dict<T>;
export type ListLike<T> =
  | T[]
  | Set<T>
  | ReadonlyArray<T>
  | ReadonlySet<T>
  | List<T>;

export type CollectionLike<T> = ListLike<T> | DictLike<T>;

export type NonEmptyArray<T> = [T, ...T[]];

export type ToPrimitive<T> = T extends string
  ? string
  : T extends number
  ? number
  : T extends boolean
  ? boolean
  : T extends (..._args: any[]) => any
  ? (..._args: Parameters<T>) => ReturnType<T>
  : T extends object // Check if object and call itself
  ? { [key in keyof T]: ToPrimitive<T[key]> }
  : T;
