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
