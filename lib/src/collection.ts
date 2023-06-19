import { isOption, isResult } from "./utils";
import type { None, Some } from "./option";
import { Option } from "./option";
import type { Result } from "./result";

type Collection = {
  reduce<Collection extends unknown[] | [unknown, ...unknown[]], B>(
    collection: Collection,
    fn: (
      acc: B,
      a: Collection[number],
      index: number,
      collection: Collection
    ) => B,
    initial: B
  ): B;
  reduce<Collection extends Record<string, unknown>, B>(
    collection: Collection,
    fn: (
      acc: B,
      a: Collection[keyof Collection],
      key: keyof Collection,
      collection: Collection
    ) => B,
    initial: B
  ): B;

  map<Collection extends unknown[] | [unknown, ...unknown[]], B>(
    collection: Collection,
    fn: (a: Collection[number], index: number, collection: Collection) => B
  ): {
    [K in keyof Collection]: B;
  };
  map<Collection extends Record<string, unknown>, B>(
    collection: Collection,
    fn: (
      a: Collection[keyof Collection],
      key: keyof Collection,
      collection: Collection
    ) => B
  ): {
    [K in keyof Collection]: B;
  };

  filterMap<Collection extends unknown[] | [unknown, ...unknown[]], B>(
    collection: Collection,
    fn: (
      a: NonNullable<Unwrapped<Collection[number]>>,
      index: number,
      collection: Collection
    ) => B
  ): NonNullable<B>[];
  filterMap<Collection extends Record<string, unknown>, B>(
    collection: Collection,
    fn: (
      a: NonNullable<Unwrapped<Collection[keyof Collection]>>,
      key: keyof Collection,
      collection: Collection
    ) => B
  ): {
    [K in keyof Collection]: [
      Extract<Collection[K], null | undefined>
    ] extends [never]
      ? Option<NonNullable<B>>
      : None<never>;
  };

  filter<
    Collection extends unknown[] | [unknown, ...unknown[]],
    B extends Unwrapped<Collection[number]>
  >(
    collection: Collection,
    fn: (
      a: Unwrapped<Collection[number]>,
      index: number,
      collection: Collection
    ) => a is B
  ): B[];
  filter<Collection extends unknown[] | [unknown, ...unknown[]]>(
    collection: Collection,
    fn: (
      a: Unwrapped<Collection[number]>,
      index: number,
      collection: Collection
    ) => boolean
  ): Unwrapped<Collection[number]>[];
  filter<
    Collection extends Record<string, unknown>,
    B extends Unwrapped<Collection[keyof Collection]>
  >(
    collection: Collection,
    fn: (
      a: Unwrapped<Collection[keyof Collection]>,
      key: keyof Collection,
      collection: Collection
    ) => a is B
  ): {
    [K in keyof Collection]: [Extract<Unwrapped<Collection[K]>, B>] extends [
      never
    ]
      ? None<never>
      : Some<B>;
  };
  filter<Collection extends Record<string, unknown>>(
    collection: Collection,
    fn: (
      a: Unwrapped<Collection[keyof Collection]>,
      key: keyof Collection,
      collection: Collection
    ) => boolean
  ): {
    [K in keyof Collection]: FilterMonad<Collection[K]>;
  };

  some<Collection extends unknown[] | [unknown, ...unknown[]]>(
    collection: Collection,
    fn: (
      a: Unwrapped<Collection[number]>,
      index: number,
      collection: Collection
    ) => unknown
  ): boolean;
  some<Collection extends Record<string, unknown>>(
    collection: Collection,
    fn: (
      a: Unwrapped<Collection[keyof Collection]>,
      key: keyof Collection,
      collection: Collection
    ) => unknown
  ): boolean;

  every<Collection extends unknown[] | [unknown, ...unknown[]]>(
    collection: Collection,
    fn: (
      a: Unwrapped<Collection[number]>,
      index: number,
      collection: Collection
    ) => boolean
  ): boolean;
  every<Collection extends Record<string, unknown>>(
    collection: Collection,
    fn: (
      a: Unwrapped<Collection[keyof Collection]>,
      key: keyof Collection,
      collection: Collection
    ) => boolean
  ): boolean;
};

export const Collection: Collection = {
  // @ts-expect-error
  reduce(collection, fn, initial) {
    let isArr = Array.isArray(collection);
    let keys = isArr
      ? (collection as unknown[])
      : (Object.keys(collection) as (keyof Collection)[]);
    let result = initial;

    for (let i = 0; i < keys.length; i++) {
      let key = isArr ? i : keys[i]!;
      // @ts-expect-error
      let value = collection[key]!;

      result = fn(result, value, key, collection);
    }
    return result;
  },
  // @ts-expect-error
  map(collection, fn) {
    let isArr = Array.isArray(collection);
    let keys = isArr
      ? (collection as unknown[])
      : (Object.keys(collection) as (keyof Collection)[]);
    let result = isArr ? [] : ({} as any);

    for (let i = 0; i < keys.length; i++) {
      let key = isArr ? i : keys[i]!;
      // @ts-expect-error
      let value = collection[key]!;

      // @ts-expect-error
      result[key] = fn(collection[key], key, collection);
    }
    return result as any;
  },

  // @ts-expect-error
  filterMap(collection, fn): unknown {
    let isArr = Array.isArray(collection);
    let keys = isArr
      ? (collection as unknown[])
      : (Object.keys(collection) as (keyof Collection)[]);
    let result = isArr ? [] : ({} as any);

    for (let i = 0; i < keys.length; i++) {
      let key = (isArr ? i : keys[i]!) as any;
      let value = collection[key]!;
      if (!value) {
        if (!isArr) {
          addToCollection(result, key, Option.None(), isArr);
        }
        continue;
      }

      if (isNonTaskMonad(value)) {
        if (hasValue(value)) {
          let v = fn(value.unwrap(), key, collection);
          addToCollection(result, key, isArr ? v : Option.Some(v), isArr);
          continue;
        }
        if (!isArr) {
          addToCollection(result, key, Option.None(), isArr);
        }
      } else {
        let v = fn(value, key, collection);
        addToCollection(result, key, isArr ? v : Option.Some(v), isArr);
      }
    }
    return result as any;
  },

  // @ts-expect-error
  filter(collection, fn): unknown {
    let isArr = Array.isArray(collection);
    let keys = isArr
      ? (collection as unknown[])
      : (Object.keys(collection) as (keyof Collection)[]);
    let result = isArr ? [] : ({} as any);

    for (let i = 0; i < keys.length; i++) {
      let key = (isArr ? i : keys[i]!) as any;
      let value = collection[key] as unknown;
      if (
        isNonTaskMonad(value) &&
        hasValue(value) &&
        fn(value.unwrap(), key, collection)
      ) {
        addToCollection(
          result,
          key,
          isArr ? value.unwrap() : getObjValue(value),
          isArr
        );
      } else if (fn(value, key, collection)) {
        addToCollection(result, key, isArr ? value : Option.Some(value), isArr);
      } else if (!isArr) {
        result[key] = Option.None();
      }
    }
    return result as any;
  },

  some(
    collection: Record<string, unknown> | unknown[] | [unknown, ...unknown[]],
    fn: any
  ): boolean {
    let isArr = Array.isArray(collection);
    let keys = isArr
      ? (collection as unknown[])
      : (Object.keys(collection) as (keyof Collection)[]);
    if (keys.length === 0) return true;

    for (let i = 0; i < keys.length; i++) {
      let key = (isArr ? i : keys[i]!) as any;
      // @ts-expect-error
      let value = collection[key]!;

      if (isNonTaskMonad(value)) {
        if (hasValue(value)) {
          if (fn(value.unwrap(), key, collection)) {
            return true;
          }
        }
      } else if (fn(value, key, collection)) {
        return true;
      }
    }
    return false;
  },

  // @ts-expect-error
  every(collection, fn): boolean {
    let isArr = Array.isArray(collection);
    let keys = isArr
      ? (collection as unknown[])
      : (Object.keys(collection) as (keyof Collection)[]);

    if (keys.length === 0) return false;

    for (let i = 0; i < keys.length; i++) {
      let key = (isArr ? i : keys[i]!) as any;
      let value = collection[key]!;
      if (isNonTaskMonad(value)) {
        if (!hasValue(value)) return false;
        if (!fn(value.unwrap(), key, collection)) return false;
      } else if (!fn(value, key, collection)) return false;
    }
    return true;
  },
};

// type NestedKeyOf<ObjectType extends object> = {
//   [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
//     ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
//     : `${Key}`;
// }[keyof ObjectType & (string | number)];

// type NestedPick<TObject, TPath extends string> =
//   // Constraining TKey so we don't need to check if its keyof TObject
//   TPath extends `${infer TKey extends keyof TObject & string}.${infer TRest}`
//     ? NestedPick<TObject[TKey], TRest>
//     : TPath extends keyof TObject
//     ? TObject[TPath]
//     : never;

type FilterMonad<A> = A extends Option<unknown>
  ? A
  : A extends Result<unknown, infer V>
  ? Option<V>
  : Option<A>;

type Unwrapped<A> = A extends Option<infer B>
  ? B
  : A extends Result<unknown, infer B>
  ? B
  : A;

function addToCollection(
  collection: Record<string, unknown> | unknown[] | [unknown, ...unknown[]],
  key: string | number,
  value: unknown,
  isArr: boolean
): void {
  if (isArr) {
    (collection as unknown[]).push(value);
  } else {
    // @ts-expect-error
    collection[key] = value;
  }
}

function getObjValue(
  a: Result<unknown, unknown> | Option<unknown>
): Option<unknown> {
  return isOption(a) ? a : Option.Some(a.unwrap());
}

function isNonTaskMonad(
  a: unknown
): a is Option<unknown> | Result<unknown, unknown> {
  return isResult(a) || isOption(a);
}

function hasValue(a: Option<unknown> | Result<unknown, unknown>) {
  return isOption(a) ? a.isSome() : a.isOk();
}
