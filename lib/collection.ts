import { Option } from "./option";
import { CollectionLike, DictLike, ListLike } from "./types";
import { isCollectionLike } from "./utils";

export class List<A> {
  __tag = "List" as const;

  constructor(private readonly _value: A[]) {}

  map<B>(f: (a: A, index: number, collection: List<A>) => B): List<B> {
    return new List(this._value.map((a, index) => f(a, index, this)));
  }

  flatMap<B>(
    f: (a: A, index: number, collection: List<A>) => List<B>
  ): List<B> {
    return new List(
      this._value.flatMap((a, index) => f(a, index, this)._value)
    );
  }

  filter(
    predicate: (a: A, index: number, collection: List<A>) => boolean
  ): List<A> {
    return new List(
      this._value.filter((a, index) => predicate(a, index, this))
    );
  }

  reduce<B>(f: (b: B, a: A, index: number, collection: List<A>) => B, b: B): B {
    return this._value.reduce((acc, a, index) => {
      return f(acc, a, index, this);
    }, b);
  }

  reduceRight<B>(
    f: (b: B, a: A, index: number, collection: List<A>) => B,
    b: B
  ): B {
    return this._value.reduceRight((acc, a, index) => {
      return f(acc, a, index, this);
    }, b);
  }

  get(index: number): Option<A> {
    if (index < 0) {
      return Option.from(this._value[this._value.length + index]);
    }
    if (index >= this._value.length) {
      return Option.None();
    }
    return Option.from(this._value[index]);
  }

  get length(): number {
    return this._value.length;
  }

  isEmpty(): boolean {
    return this._value.length === 0;
  }

  find(
    predicate: (a: A, index: number, collection: List<A>) => boolean
  ): Option<A> {
    return Option.from(
      this._value.find((a, index) => predicate(a, index, this))
    );
  }

  findLast(
    predicate: (a: A, index: number, collection: List<A>) => boolean
  ): Option<A> {
    let result;
    for (let i = this._value.length - 1; i >= 0; i--) {
      const a = this._value[i];
      if (predicate(a, i, this)) {
        result = a;
        break;
      }
    }
    return Option.from(result);
  }

  findIndex(
    predicate: (a: A, index: number, collection: List<A>) => boolean
  ): Option<number> {
    const index = this._value.findIndex((a, index) =>
      predicate(a, index, this)
    );
    return index === -1 ? Option.None() : Option.Some(index);
  }

  findLastIndex(
    predicate: (a: A, index: number, collection: List<A>) => boolean
  ): Option<number> {
    let result;
    for (let i = this._value.length - 1; i >= 0; i--) {
      const a = this._value[i];
      if (predicate(a, i, this)) {
        result = i;
        break;
      }
    }
    return Option.from(result);
  }

  includes(value: A): boolean {
    return this._value.includes(value);
  }

  indexOf(value: A): Option<number> {
    const index = this._value.indexOf(value);
    return index === -1 ? Option.None() : Option.Some(index);
  }

  lastIndexOf(value: A): Option<number> {
    const index = this._value.lastIndexOf(value);
    return index === -1 ? Option.None() : Option.Some(index);
  }

  concat<Other extends List<any> | any[]>(
    other: Other
  ): Other extends List<infer OtherA>
    ? List<A | OtherA>
    : Other extends (infer OtherA)[]
    ? List<A | OtherA>
    : never {
    if (Array.isArray(other)) {
      // @ts-expect-error
      return new List(this._value.concat(other));
    }
    // @ts-expect-error
    return new List(this._value.concat(other._value));
  }

  slice(start: number, end?: number): List<A> {
    return new List(this._value.slice(start, end));
  }

  join(separator?: string): string {
    return this._value.join(separator);
  }

  reverse(): List<A> {
    return new List(this._value.slice().reverse());
  }

  sort(compareFn?: (a: A, b: A) => number): List<A> {
    return new List(this._value.slice().sort(compareFn));
  }

  forEach(callbackfn: (value: A, index: number, array: List<A>) => void): void {
    this._value.forEach((a, index) => callbackfn(a, index, this));
  }

  every(
    predicate: (value: A, index: number, array: List<A>) => boolean
  ): boolean {
    return this._value.every((a, index) => predicate(a, index, this));
  }

  any(
    predicate: (value: A, index: number, array: List<A>) => boolean
  ): boolean {
    return this._value.some((a, index) => predicate(a, index, this));
  }

  isList(): this is List<A> {
    return true;
  }
  isDict(): never {
    // @ts-expect-error
    return false;
  }

  unwrap(): A[] {
    return this._value;
  }

  set(index: number, value: A): List<A> {
    if (index < 0) {
      index = this._value.length + index;
    }
    this._value[index] = value;
    return this;
  }

  delete(index: number): Option<List<A>> {
    if (index < 0) {
      index = this._value.length + index;
    }

    return this.findIndex((_, i) => i === index).map(
      (index) => new List(this._value.filter((_, i) => i !== index))
    );
  }

  clear(): List<A> {
    return new List([]);
  }

  insert(index: number, value: A): List<A> {
    if (index < 0) {
      index = this._value.length + index;
    }
    this._value.splice(index, 0, value);
    return this;
  }

  push(value: A): List<A> {
    this._value.push(value);
    return this;
  }

  pop(): Option<List<A>> {
    const result = this._value.pop();

    if (result === undefined) {
      return Option.None();
    }

    return Option.Some(this);
  }

  shift(): Option<List<A>> {
    const result = this._value.shift();

    if (result === undefined) {
      return Option.None();
    }

    return Option.Some(this);
  }

  unshift(value: A): List<A> {
    this._value.unshift(value);
    return this;
  }

  zip<B>(other: B): List<[A, ExtractValueFromCollectionLike<B>]> {
    if (!isCollectionLike(other)) {
      throw new Error("Cannot zip non-collection-like types");
    }

    const otherArr = collectionLikeToArray(other);

    if (this._value.length !== otherArr.length) {
      throw new Error("List.zip: collections must have the same length");
    }

    // @ts-expect-error
    return new List(this._value.map((a, i) => [a, otherArr[i]]));
  }

  zipWith<B, C>(
    other: B,
    f: (a: A, b: ExtractValueFromCollectionLike<B>) => C
  ): List<C> {
    if (!isCollectionLike(other)) {
      throw new Error("Cannot zip non-collection-like types");
    }

    const otherArr = collectionLikeToArray(other);

    if (this._value.length !== otherArr.length) {
      throw new Error("List.zipWith: collections must have the same length");
    }

    // @ts-expect-error
    return new List(this._value.map((a, i) => f(a, otherArr[i] ?? fill)));
  }

  toDict(getKey?: (a: A, i: number, collection: List<A>) => string): Dict<A> {
    const result: Record<string, A> = {};
    this.forEach((a, i) => {
      result[getKey?.(a, i, this) ?? i] = a;
    });
    return new Dict(result);
  }

  toRecord(
    getKey?: (a: A, i: number, collection: List<A>) => string
  ): Record<string, A> {
    const result: Record<string, A> = {};
    this.forEach((a, i) => {
      result[getKey?.(a, i, this) ?? i] = a;
    });
    return result;
  }

  toMap(
    getKey?: (a: A, i: number, collection: List<A>) => string
  ): Map<string, A> {
    return new Map(
      // @ts-expect-error
      this.map((a, i) => [getKey?.(a, i, this) ?? i.toString(), a]).unwrap()
    );
  }

  toSet(): Set<A> {
    return new Set(this._value);
  }

  toArray(): A[] {
    return this._value;
  }
}

export class Dict<A> {
  __tag = "Dict" as const;

  size: number = 0;

  constructor(private readonly _value: Record<any, unknown>) {
    this.size = Object.keys(_value).length;
  }

  get(key: string): Option<A> {
    // @ts-expect-error
    return Option.from(this._value[key]);
  }

  map<B>(f: (a: A, key: string, collection: Dict<A>) => B): Dict<B> {
    const result: Record<string, B> = {};
    for (const key in this._value) {
      // @ts-expect-error
      result[key] = f(this._value[key], key, this);
    }
    return new Dict(result);
  }

  flatMap<B>(
    f: (a: A, key: string, collection: Dict<A>) => Dict<B>
  ): Dict<A | B> {
    const nextResult = Object.entries(this._value).reduce(
      // @ts-expect-error
      (acc, [key, value]) => {
        // @ts-expect-error
        const next = f(value, key, this._value);
        return { ...acc, ...next._value };
      },
      {} as Record<string, A | B>
    );
    // @ts-expect-error
    return new Dict(nextResult);
  }

  filter(
    predicate: (a: A, key: string, collection: Dict<A>) => boolean
  ): Dict<A> {
    const result = Object.entries(this._value).reduce((acc, [key, value]) => {
      // @ts-expect-error
      if (predicate(value, key, this)) {
        // @ts-expect-error
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, A>);
    return new Dict(result);
  }

  reduce<B>(f: (b: B, a: A, key: string, collection: Dict<A>) => B, b: B): B {
    return Object.entries(this._value).reduce((acc, [key, value]) => {
      // @ts-expect-error
      return f(acc, value, key, this._value);
    }, b);
  }

  reduceRight<B>(
    f: (b: B, a: A, key: string, collection: Dict<A>) => B,
    b: B
  ): B {
    return Object.entries(this._value).reduceRight((acc, [key, value]) => {
      // @ts-expect-error
      return f(acc, value, key, this._value);
    }, b);
  }

  forEach(
    callbackfn: (value: A, key: string, collection: Dict<A>) => void
  ): void {
    Object.entries(this._value).forEach(([key, value]) => {
      // @ts-expect-error
      callbackfn(value, key, this._value);
    });
  }

  find(
    predicate: (a: A, key: string, collection: Dict<A>) => boolean
  ): Option<A> {
    const result = Object.entries(this._value).find(([key, value]) => {
      // @ts-expect-error
      return predicate(value, key, this._value);
    });
    // @ts-expect-error
    return Option.from(result?.[1]);
  }

  findKey(
    predicate: (a: A, key: string, collection: Dict<A>) => boolean
  ): Option<string> {
    const result = Object.entries(this._value).find(([key, value]) => {
      // @ts-expect-error
      return predicate(value, key, this._value);
    });

    return Option.from(result?.[0]);
  }

  findLast(
    predicate: (a: A, key: string, collection: Dict<A>) => boolean
  ): Option<A> {
    const arr = Object.entries(this._value);
    let result: A | undefined = undefined;
    for (let i = arr.length - 1; i >= 0; i--) {
      const [key, value] = arr[i];
      // @ts-expect-error
      if (predicate(value, key, this._value)) {
        result = value as A;
        break;
      }
    }

    return Option.from(result);
  }

  findLastKey(
    predicate: (a: A, key: string, collection: Dict<A>) => boolean
  ): Option<string> {
    const arr = Object.entries(this._value);
    let result: string | undefined = undefined;
    for (let i = arr.length - 1; i >= 0; i--) {
      const [key, value] = arr[i];
      // @ts-expect-error
      if (predicate(value, key, this._value)) {
        result = key;
        break;
      }
    }

    return Option.from(result);
  }

  includes(value: A): boolean {
    return Object.values(this._value).includes(value);
  }

  includesKey(key: string): boolean {
    return Object.keys(this._value).includes(key);
  }

  every(
    predicate: (a: A, key: string, collection: Dict<A>) => boolean
  ): boolean {
    return Object.entries(this._value).every(([key, value]) => {
      // @ts-expect-error
      return predicate(value, key, this._value);
    });
  }

  any(predicate: (a: A, key: string, collection: Dict<A>) => boolean): boolean {
    return Object.entries(this._value).some(([key, value]) => {
      // @ts-expect-error
      return predicate(value, key, this._value);
    });
  }

  join(separator?: string): string {
    return Object.values(this._value).join(separator);
  }

  keys(): List<string> {
    return new List(Object.keys(this._value));
  }

  values(): List<A> {
    // @ts-expect-error
    return new List(Object.values(this._value));
  }

  entries(): List<[string, A]> {
    // @ts-expect-error
    return new List(Object.entries(this._value));
  }

  valuesArray(): A[] {
    // @ts-expect-error
    return Object.values(this._value);
  }

  keysArray(): string[] {
    return Object.keys(this._value);
  }

  entriesArray(): [string, A][] {
    // @ts-expect-error
    return Object.entries(this._value);
  }

  isEmpty(): boolean {
    return this.size === 0;
  }

  // @ts-expect-error
  concat<T extends Dict<string, unknown> | Record<string, unknown>>(
    other: T
  ): T extends Dict<infer OtherValue>
    ? Dict<A | OtherValue>
    : T extends Record<string, infer OtherRecordValue>
    ? Dict<A | OtherRecordValue>
    : never {
    if (other instanceof Dict) {
      // @ts-expect-error
      return new Dict({ ...this._value, ...other._value });
    }
    // @ts-expect-error
    return new Dict({ ...this._value, ...other });
  }

  isList(): never {
    // @ts-expect-error
    return false;
  }

  isDict(): this is Dict<A> {
    return true;
  }

  unwrap(): Record<string, A> {
    // @ts-expect-error
    return this._value;
  }

  keyOf(value: A): Option<string> {
    return this.findKey((a) => a === value);
  }

  set(key: string, value: A): Dict<A> {
    this._value[key] = value;
    return this;
  }

  delete(key: string): Option<Dict<A>> {
    if (this.has(key)) {
      delete this._value[key];
      // @ts-expect-error
      return Option.Some(new Dict(this._value));
    }
    return Option.None();
  }

  clear(): Dict<A> {
    return new Dict({});
  }

  has(key: string): boolean {
    return this._value.hasOwnProperty(key);
  }

  zip<B>(other: B): List<[A, ExtractValueFromCollectionLike<B>]> {
    if (!isCollectionLike(other)) {
      throw new Error("Cannot zip with non collection like");
    }

    const otherArr = collectionLikeToArray(other);
    const thisArr = this.valuesArray();

    if (thisArr.length !== otherArr.length) {
      throw new Error("Dict.zip: lists must have the same length");
    }

    // @ts-expect-error
    return new List(
      thisArr.map((a, i) => {
        return [a, otherArr[i]];
      })
    );
  }

  zipWith<B, C>(
    other: B,
    fn: (a: A, b: ExtractValueFromCollectionLike<B>) => C
  ): List<C> {
    if (!isCollectionLike(other)) {
      throw new Error("Cannot zip with non collection like");
    }

    const otherArr = collectionLikeToArray(other);
    const thisArr = this.valuesArray();

    if (thisArr.length !== otherArr.length) {
      throw new Error("Dict.zipWith: collections must have the same size");
    }

    return new List(
      thisArr.map((a, i) => {
        // @ts-expect-error
        return fn(a, otherArr[i] ?? fill);
      })
    );
  }

  toList(): List<[string, A]> {
    // @ts-expect-error
    return new List(Object.entries(this._value));
  }

  toRecord(): Record<string, A> {
    // @ts-expect-error
    return this._value;
  }

  toArray(): [string, A][] {
    // @ts-expect-error
    return Object.entries(this._value);
  }

  toSet(): Set<A> {
    // @ts-expect-error
    return new Set(Object.values(this._value));
  }

  toMap(): Map<string, A> {
    // @ts-expect-error
    return new Map(Object.entries(this._value));
  }
}

export type Collection<TValue> = List<TValue> | Dict<TValue>;

export const Collection: {
  from: <V>(
    a: V
  ) => V extends ListLike<infer A>
    ? List<A>
    : V extends DictLike<infer A>
    ? Dict<A>
    : never;

  isList: <A>(a: Collection<A>) => a is List<A>;
  isDict: <A>(a: Collection<A>) => a is Dict<A>;
  fromEntries: <TEntries extends [string, unknown][]>(
    entries: TEntries
  ) => Dict<TEntries[number][1]>;

  zip: <A, B>(
    a: A,
    b: B
  ) => List<
    [ExtractValueFromCollectionLike<A>, ExtractValueFromCollectionLike<B>]
  >;
  zipWith: <A, B, C>(
    f: (
      a: ExtractValueFromCollectionLike<A>,
      b: ExtractValueFromCollectionLike<B>
    ) => C,
    a: A,
    b: B
  ) => List<C>;
} = {
  fromEntries: <TEntries extends [string, unknown][]>(
    entries: TEntries
  ): Dict<TEntries[number][1]> => {
    if (!Array.isArray(entries)) {
      throw new Error("Collection.fromEntries: expected an array");
    }
    if (
      !entries.every((entry) => {
        const [key] = entry;
        return entry.length === 2 && typeof key === "string";
      })
    ) {
      throw new Error(
        "Collection.fromEntries: invalid entries. Expected [string, any][]"
      );
    }
    return new Dict(
      entries.reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, TEntries[number][1]>)
    );
  },
  // @ts-expect-error
  from(a) {
    if (a instanceof Set) {
      return new List(Array.from(a));
    }
    if (Array.isArray(a)) {
      return new List(a);
    }
    if (typeof a === "object" && a !== null) {
      // @ts-expect-error
      return new Dict(a);
    }
    throw new Error("Cannot create collection from value");
  },
  isList: <A>(a: Collection<A>): a is List<A> => a.isList(),
  isDict: <A>(a: Collection<A>): a is Dict<A> => a.isDict(),
  zip: <A, B>(
    a: A,
    b: B
  ): List<
    [ExtractValueFromCollectionLike<A>, ExtractValueFromCollectionLike<B>]
  > => {
    if (
      !isCollectionLike<ExtractValueFromCollectionLike<A>>(a) ||
      !isCollectionLike<ExtractValueFromCollectionLike<B>>(b)
    ) {
      throw new Error(
        "Collection.zip: expected a collection like for both arguments"
      );
    }

    const arrA = collectionLikeToArray(a);
    const arrB = collectionLikeToArray(b);

    if (arrA.length !== arrB.length) {
      throw new Error("Collection.zip: collections must have the same length");
    }

    return new List(arrA.map((a, i) => [a, arrB[i]]));
  },
  zipWith: <A, B, C>(
    f: (
      a: ExtractValueFromCollectionLike<A>,
      b: ExtractValueFromCollectionLike<B>
    ) => C,
    a: A,
    b: B
  ): List<C> => {
    if (
      !isCollectionLike<ExtractValueFromCollectionLike<A>>(a) ||
      !isCollectionLike<ExtractValueFromCollectionLike<B>>(b)
    ) {
      throw new Error(
        "Collection.zipWith: expected a collection like for both arguments"
      );
    }

    const arrA = collectionLikeToArray(a);
    const arrB = collectionLikeToArray(b);

    if (arrA.length !== arrB.length) {
      throw new Error("Collection.zipWith: lists must have the same length");
    }

    return new List(arrA.map((a, i) => f(a, arrB[i])));
  },
};

type ExtractValueFromCollectionLike<T> = T extends CollectionLike<infer V>
  ? V
  : never;

function collectionLikeToArray<A>(a: CollectionLike<A>): A[] {
  if (a instanceof List) {
    return a.unwrap();
  }
  if (a instanceof Dict) {
    return a.valuesArray();
  }
  if (a instanceof Set) {
    return Array.from(a);
  }

  if (a instanceof Map) {
    return Array.from(a.values());
  }

  if (Array.isArray(a)) {
    return a;
  }
  return Object.values(a);
}
