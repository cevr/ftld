import { Option } from "./option";
import { HKT, Monad, Semigroup } from "./types";

interface CollectionHKT<A> extends HKT {
  type: Collection<A>;
}

export type Collection<TValue> = List<TValue> | Dict<TValue>;

export class List<A>
  implements Monad<CollectionHKT<A>, never, never, A>, Semigroup<A>
{
  __tag = "List" as const;
  constructor(private readonly _value: A[]) {}
  of(value: A[]): List<A> {
    return new List(value);
  }

  map<B>(f: (a: A, index: number, collection: List<A>) => B): List<B> {
    return new List(this._value.map((a, index) => f(a, index, this)));
  }

  // @ts-expect-error
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
      return Option.fromNullable(this._value[this._value.length + index]);
    }
    if (index >= this._value.length) {
      return Option.None();
    }
    return Option.fromNullable(this._value[index]);
  }

  get length(): number {
    return this._value.length;
  }

  get isEmpty(): boolean {
    return this._value.length === 0;
  }

  find(
    predicate: (a: A, index: number, collection: List<A>) => boolean
  ): Option<A> {
    return Option.fromNullable(
      this._value.find((a, index) => predicate(a, index, this))
    );
  }

  findIndex(
    predicate: (a: A, index: number, collection: List<A>) => boolean
  ): Option<number> {
    const index = this._value.findIndex((a, index) =>
      predicate(a, index, this)
    );
    return index === -1 ? Option.None() : Option.Some(index);
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

  static empty<A>(): List<A> {
    return new List([]);
  }

  has(index: number): boolean {
    return this.get(index).isSome();
  }

  toDict(getKey: (a: A) => string): Dict<A> {
    const result: Record<string, A> = {};
    this.forEach((a) => {
      result[getKey(a)] = a;
    });
    return new Dict(result);
  }

  toRecord(getKey: (a: A) => string): Record<string, A> {
    const result: Record<string, A> = {};
    this.forEach((a) => {
      result[getKey(a)] = a;
    });
    return result;
  }

  toSet(): Set<A> {
    return new Set(this._value);
  }
}

export class Dict<A>
  implements Monad<CollectionHKT<A>, never, never, A>, Semigroup<A>
{
  __tag = "Dict" as const;
  constructor(private readonly _value: Record<any, unknown>) {}

  get(key: string): Option<A> {
    // @ts-expect-error
    return Option.fromNullable(this._value[key]);
  }

  map<B>(f: (a: A, key: string, collection: Dict<A>) => B): Dict<B> {
    // @ts-expect-error
    const result: Record<K, B> = {};
    for (const key in this._value) {
      // @ts-expect-error
      result[key] = f(this._value[key], key, this);
    }
    return new Dict(result);
  }

  // @ts-expect-error
  flatMap<BKey extends string, B>(
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
    return Option.fromNullable(result?.[1]);
  }

  findKey(
    predicate: (a: A, key: string, collection: Dict<A>) => boolean
  ): Option<string> {
    const result = Object.entries(this._value).find(([key, value]) => {
      // @ts-expect-error
      return predicate(value, key, this._value);
    });

    return Option.fromNullable(result?.[0]);
  }

  findLast(
    predicate: (a: A, key: string, collection: Dict<A>) => boolean
  ): Option<A> {
    const result = Object.entries(this._value).findLast(([key, value]) => {
      // @ts-expect-error
      return predicate(value, key, this._value);
    });
    // @ts-expect-error
    return Option.fromNullable(result?.[1]);
  }

  findLastKey(
    predicate: (a: A, key: string, collection: Dict<A>) => boolean
  ): Option<string> {
    const result = Object.entries(this._value).findLast(([key, value]) => {
      // @ts-expect-error
      return predicate(value, key, this._value);
    });

    return Option.fromNullable(result?.[0]);
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

  toList(): List<[string, A]> {
    // @ts-expect-error
    return new List(Object.entries(this._value));
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

  toRecord(): Record<string, A> {
    // @ts-expect-error
    return this._value;
  }

  get size(): number {
    return Object.keys(this._value).length;
  }

  get isEmpty(): boolean {
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

  static empty<A>(): Dict<A> {
    return new Dict({});
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
      return Option.Some(this);
    }
    return Option.None();
  }

  clear(): Dict<A> {
    return new Dict({});
  }

  has(key: string): boolean {
    return this._value.hasOwnProperty(key);
  }

  toSet(): Set<A> {
    // @ts-expect-error
    return new Set(Object.values(this._value));
  }
}

export const Collection: {
  fromArray: <A>(array: A[]) => List<A>;
  fromRecord: <A>(object: Record<string, A>) => Dict<A>;
  of: <V>(
    a: V
  ) => V extends any[] | readonly any[]
    ? V extends readonly (infer A)[]
      ? List<A>
      : V extends (infer A)[]
      ? List<A>
      : never
    : V extends Record<infer K, any>
    ? Dict<V[Extract<K, string>]>
    : never;

  isList: <A>(a: Collection<A>) => a is List<A>;
  isDict: <A>(a: Collection<A>) => a is Dict<A>;
  fromEntries: <TEntries extends [string, unknown][]>(
    entries: TEntries
  ) => Dict<TEntries[number][1]>;
} = {
  fromArray: (array) => {
    if (!Array.isArray(array)) {
      throw new Error("Collection.fromArray: expected an array");
    }

    return new List(array);
  },
  fromRecord: (object) => {
    if (
      typeof object !== "object" ||
      object === null ||
      Array.isArray(object)
    ) {
      throw new Error("Collection.fromRecord: expected an object");
    }
    return new Dict(object);
  },
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
    return new Dict(Object.fromEntries(entries));
  },

  // @ts-expect-error
  of(a) {
    if (Array.isArray(a)) {
      return Collection.fromArray(a);
    }
    if (typeof a === "object" && a !== null) {
      // @ts-expect-error
      return Collection.fromRecord(a);
    }
    throw new Error("Cannot create collection from value");
  },
  isList: <A>(a: Collection<A>): a is List<A> => a.isList(),
  isDict: <A>(a: Collection<A>): a is Dict<A> => a.isDict(),
};
