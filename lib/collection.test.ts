import { Collection } from "./collection";
import { identity } from "./utils";

describe("Collection", () => {
  describe("of", () => {
    it("should create a List if the input is an array", () => {
      const list = Collection.of([1, 2, 3]);
      expect(list.isList()).toEqual(true);

      const notList = Collection.of({ a: 1, b: 2, c: 3 });
      expect(notList.isList()).toEqual(false);

      expect(() => Collection.of(1)).toThrowError();
    });

    it("should create a Dict if the input is an object", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      expect(dict.isDict()).toEqual(true);

      const notDict = Collection.of([1, 2, 3]);
      expect(notDict.isDict()).toEqual(false);

      expect(() => Collection.of(1)).toThrowError();
    });

    it("should throw an error if the input is not an object or an array", () => {
      expect(() => Collection.of(1)).toThrowError();
      expect(() => Collection.of("a")).toThrowError();
      expect(() => Collection.of(true)).toThrowError();
      expect(() => Collection.of(null)).toThrowError();
      expect(() => Collection.of(undefined)).toThrowError();
    });
  });

  describe("fromArray", () => {
    it("should create a List from an array", () => {
      const list = Collection.fromArray([1, 2, 3]);
      expect(list.isList()).toEqual(true);
    });

    it("should throw an error if the input is not an array", () => {
      // @ts-expect-error
      expect(() => Collection.fromArray(1)).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromArray("a")).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromArray(true)).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromArray(null)).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromArray(undefined)).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromArray({ a: 1, b: 2, c: 3 })).toThrowError();
    });
  });

  describe("fromRecord", () => {
    it("should create a Dict from an object", () => {
      const dict = Collection.fromRecord({ a: 1, b: 2, c: 3 });
      expect(dict.isDict()).toEqual(true);
    });

    it("should throw an error if the input is not an object", () => {
      // @ts-expect-error
      expect(() => Collection.fromRecord(1)).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromRecord("a")).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromRecord(true)).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromRecord(null)).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromRecord(undefined)).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromRecord([1, 2, 3])).toThrowError();
    });
  });

  describe("fromEntries", () => {
    it("should create a Dict from an array of entries", () => {
      const dict = Collection.fromEntries([
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ]);
      expect(dict.isDict()).toEqual(true);
    });

    it("should throw an error if the input is not an array", () => {
      // @ts-expect-error
      expect(() => Collection.fromEntries(1)).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromEntries("a")).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromEntries(true)).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromEntries(null)).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromEntries(undefined)).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromEntries({ a: 1, b: 2, c: 3 })).toThrowError();
    });

    it('should throw an error if the input is not an array of entries ("key", "value")', () => {
      // @ts-expect-error
      expect(() => Collection.fromEntries([1, 2, 3])).toThrowError();
      // @ts-expect-error
      expect(() => Collection.fromEntries(["a", "b", "c"])).toThrowError();
      expect(() =>
        Collection.fromEntries([
          // @ts-expect-error
          ["a", 1, 2],
          // @ts-expect-error
          ["b", 2, 3],
        ])
      ).toThrowError();
    });
  });

  describe("map", () => {
    it("should map over a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.map((x) => x * 2);
      expect(result).toEqual(Collection.of([2, 4, 6]));
      expect(result.unwrap()).toEqual([2, 4, 6]);
    });

    it("should map over a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.map((x) => x * 2);
      expect(result).toEqual(Collection.of({ a: 2, b: 4, c: 6 }));
      expect(result.unwrap()).toEqual({ a: 2, b: 4, c: 6 });
    });
  });

  describe("flatMap", () => {
    it("should flatMap over a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.flatMap((x) => Collection.of([x * 2]));
      expect(result).toEqual(Collection.of([2, 4, 6]));
      expect(result.unwrap()).toEqual([2, 4, 6]);
    });

    it("should flatMap over a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.flatMap((value, key) =>
        Collection.of({ [key]: value * 2 })
      );
      expect(result).toEqual(Collection.of({ a: 2, b: 4, c: 6 }));
      expect(result.unwrap()).toEqual({ a: 2, b: 4, c: 6 });
    });

    it("should flatMap over a dictionary with different keys", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.flatMap((value, key) =>
        Collection.of({ [key + "x"]: value * 2 })
      );
      expect(result).toEqual(Collection.of({ ax: 2, bx: 4, cx: 6 }));
      expect(result.unwrap()).toEqual({ ax: 2, bx: 4, cx: 6 });
    });
  });

  describe("filter", () => {
    it("should filter a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.filter((x) => x % 2 === 0);
      expect(result).toEqual(Collection.of([2]));
      expect(result.unwrap()).toEqual([2]);
    });

    it("should filter a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.filter((value, key) => key === "b");
      expect(result).toEqual(Collection.of({ b: 2 }));
      expect(result.unwrap()).toEqual({ b: 2 });
    });
  });

  describe("reduce", () => {
    it("should reduce a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.reduce((acc, x) => acc + x, 0);
      expect(result).toEqual(6);
    });

    it("should reduce a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.reduce((acc, value, key) => acc + value, 0);
      expect(result).toEqual(6);
    });
  });

  describe("reduceRight", () => {
    it("should reduceRight a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.reduceRight((acc, x) => acc + x, 0);
      expect(result).toEqual(6);
    });

    it("should reduceRight a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.reduceRight((acc, value, key) => acc + value, 0);
      expect(result).toEqual(6);
    });
  });

  describe("forEach", () => {
    it("should forEach a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result: number[] = [];
      list.forEach((x) => result.push(x));
      expect(result).toEqual([1, 2, 3]);
    });

    it("should forEach a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result: number[] = [];
      dict.forEach((value, key) => result.push(value));
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("every", () => {
    it("should every a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.every((x) => x < 4);
      expect(result).toEqual(true);
    });

    it("should every a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.every((value, key) => value < 4);
      expect(result).toEqual(true);
    });
  });

  describe("any", () => {
    it("should any a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.any((x) => x === 2);
      expect(result).toEqual(true);
    });

    it("should any a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.any((value, key) => value === 2);
      expect(result).toEqual(true);
    });
  });

  describe("find", () => {
    it("should find a list and return a Some if it exists", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.find((x) => x === 2);
      expect(result.unwrap()).toEqual(2);
      expect(result.isSome()).toEqual(true);
    });

    it("should find a list and return a None if it doesnt exist", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.find((x) => x === 4);
      expect(result.isNone()).toEqual(true);
    });

    it("should find a dictionary and return a Some if it exists", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.find((value, key) => value === 2);
      expect(result.unwrap()).toEqual(2);
      expect(result.isSome()).toEqual(true);
    });

    it("should find a dictionary and return a None if it doesnt exist", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.find((value, key) => value === 4);
      expect(result.isNone()).toEqual(true);
    });
  });

  describe("findIndex", () => {
    it("should findIndex a list and return a Some if it exists", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.findIndex((x) => x === 2);
      expect(result.unwrap()).toEqual(1);
      expect(result.isSome()).toEqual(true);
    });

    it("should findIndex a list and return a None if it doesnt exist", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.findIndex((x) => x === 4);

      expect(result.isNone()).toEqual(true);
    });
  });

  describe("findKey", () => {
    it("should findKey a dictionary and return a Some if it exists", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.findKey((value, key) => value === 2);
      expect(result.unwrap()).toEqual("b");
      expect(result.isSome()).toEqual(true);
    });

    it("should findKey a dictionary and return a None if it doesnt exist", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.findKey((value, key) => value === 4);
      expect(result.isNone()).toEqual(true);
    });
  });

  describe("includes", () => {
    it("should includes a list and return true if it exists", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.includes(2);
      expect(result).toEqual(true);
    });

    it("should includes a list and return false if it doesnt exist", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.includes(4);
      expect(result).toEqual(false);
    });

    it("should includes a dictionary and return true if it exists", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.includes(2);
      expect(result).toEqual(true);
    });

    it("should includes a dictionary and return false if it doesnt exist", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.includes(4);
      expect(result).toEqual(false);
    });
  });

  describe("indexOf", () => {
    it("should indexOf a list and return a Some if it exists", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.indexOf(2);
      expect(result.unwrap()).toEqual(1);
      expect(result.isSome()).toEqual(true);
    });

    it("should indexOf a list and return a None if it doesnt exist", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.indexOf(4);
      expect(result.isNone()).toEqual(true);
    });
  });

  describe("lastIndexOf", () => {
    it("should lastIndexOf a list and return a Some if it exists", () => {
      const list = Collection.of([1, 2, 3, 2]);
      const result = list.lastIndexOf(2);
      expect(result.unwrap()).toEqual(3);
      expect(result.isSome()).toEqual(true);
    });

    it("should lastIndexOf a list and return a None if it doesnt exist", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.lastIndexOf(4);
      expect(result.isNone()).toEqual(true);
    });
  });

  describe("keyOf", () => {
    it("should return the key of a value in a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.keyOf(2);
      expect(result.unwrap()).toEqual("b");
      expect(result.isSome()).toEqual(true);
    });

    it("should return a None if the value doesnt exist in the dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.keyOf(4);
      expect(result.isNone()).toEqual(true);
    });
  });

  describe("keys", () => {
    it("should return the keys of a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.keys();
      expect(result.unwrap()).toEqual(["a", "b", "c"]);
    });
  });

  describe("values", () => {
    it("should return the values of a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.values();
      expect(result.unwrap()).toEqual([1, 2, 3]);
    });
  });

  describe("get", () => {
    it("should get a value from a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.get("b");
      expect(result.unwrap()).toEqual(2);
    });

    it("should return a None if the value doesnt exist in the dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.get("d");
      expect(result.isNone()).toEqual(true);
    });

    it("should get a value from a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.get(1);
      expect(result.unwrap()).toEqual(2);
    });

    it("should return a None if the value doesnt exist in the list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.get(4);
      expect(result.isNone()).toEqual(true);
    });

    it("should be able to to use negative indexes in a List", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.get(-1);
      expect(result.isSome()).toEqual(true);
      expect(result.unwrap()).toEqual(3);
    });
  });

  describe("set", () => {
    it("should set a value in a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.set("b", 4);
      expect(result.unwrap()).toEqual({ a: 1, b: 4, c: 3 });
    });

    it("should set a value in a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.set(1, 4);
      expect(result.unwrap()).toEqual([1, 4, 3]);
    });

    it("should be able to to use negative indexes in a List", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.set(-1, 4);
      expect(result.unwrap()).toEqual([1, 2, 4]);
    });
  });

  describe("delete", () => {
    it("should delete a value in a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.delete("b");
      expect(result.isSome()).toEqual(true);
      expect(result.unwrap()).toEqual(Collection.of({ a: 1, c: 3 }));
    });

    it("should delete a value in a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.delete(1);
      expect(result.isSome()).toEqual(true);
      expect(result.unwrap()).toEqual(Collection.of([1, 3]));
    });

    it("should be able to to use negative indexes in a List", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.delete(-1);
      expect(result.isSome()).toEqual(true);
      expect(result.unwrap()).toEqual(Collection.of([1, 2]));
    });
  });

  describe("clear", () => {
    it("should clear a dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.clear();
      expect(result).toEqual(Collection.of({}));
    });

    it("should clear a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.clear();
      expect(result).toEqual(Collection.of([]));
    });
  });

  describe("push", () => {
    it("should push a value in a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.push(4);
      expect(result.unwrap()).toEqual([1, 2, 3, 4]);
    });
  });

  describe("pop", () => {
    it("should pop a value in a list and return a Some if successful", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.pop();
      expect(result.isSome()).toEqual(true);
      expect(result.unwrap()).toEqual(Collection.of([1, 2]));
    });

    it("should pop a value in a list and return a None if the list is empty", () => {
      const list = Collection.of([]);
      const result = list.pop();
      expect(result.isNone()).toEqual(true);
    });
  });
  describe("shift", () => {
    it("should shift a value in a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.shift();
      expect(result.isSome()).toEqual(true);
      expect(result.unwrap()).toEqual(Collection.of([2, 3]));
    });

    it("should shift a value in a list and return a None if the list is empty", () => {
      const list = Collection.of([]);
      const result = list.shift();
      expect(result.isNone()).toEqual(true);
    });
  });

  describe("unshift", () => {
    it("should unshift a value in a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.unshift(4);
      expect(result.unwrap()).toEqual([4, 1, 2, 3]);
    });
  });

  describe("insert", () => {
    it("should insert a value in a list", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.insert(1, 4);
      expect(result.unwrap()).toEqual([1, 4, 2, 3]);
    });

    it("should be able to to use negative indexes in a List", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.insert(-1, 4);
      expect(result.unwrap()).toEqual([1, 2, 4, 3]);
    });
  });

  describe("concat", () => {
    it("should concat a value in a list if the value is an array", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.concat([4]);
      expect(result.unwrap()).toEqual([1, 2, 3, 4]);
    });

    it("should concat a value in a list if the value is a List", () => {
      const list = Collection.of([1, 2, 3]);
      const result = list.concat(Collection.of([4]));
      expect(result.unwrap()).toEqual([1, 2, 3, 4]);
    });

    it("should concat a value in a dictionary if the value is an object", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.concat({ d: 4 });
      expect(result.unwrap()).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });

    it("should concat a value in a dictionary if the value is a Dictionary", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3 });
      const result = dict.concat(
        Collection.of({
          d: 4,
        })
      );
      expect(result.unwrap()).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });
  });

  describe("toSet", () => {
    it("should convert a list to a set", () => {
      const list = Collection.of([1, 1, 2, 2, 3, 3]);
      const result = list.toSet();
      expect(result).toEqual(new Set([1, 2, 3]));
    });

    it("should convert a dictionary to a set", () => {
      const dict = Collection.of({ a: 1, b: 2, c: 3, d: 3, e: 3 });
      const result = dict.toSet();
      expect(result).toEqual(new Set([1, 2, 3]));
    });
  });

  describe("Dict", () => {
    describe("keys", () => {
      it("should return an array of keys", () => {
        const dict = Collection.of({ a: 1, b: 2, c: 3 });
        const result = dict.keys();
        expect(result.unwrap()).toEqual(["a", "b", "c"]);
      });

      it("should return an empty array if the dictionary is empty", () => {
        const dict = Collection.of({});
        const result = dict.keys();
        expect(result.unwrap()).toEqual([]);
      });
    });

    describe("values", () => {
      it("should return an array of values", () => {
        const dict = Collection.of({ a: 1, b: 2, c: 3 });
        const result = dict.values();
        expect(result.unwrap()).toEqual([1, 2, 3]);
      });

      it("should return an empty array if the dictionary is empty", () => {
        const dict = Collection.of({});
        const result = dict.values();
        expect(result.unwrap()).toEqual([]);
      });
    });

    describe("entries", () => {
      it("should return an array of entries", () => {
        const dict = Collection.of({ a: 1, b: 2, c: 3 });
        const result = dict.entries();
        expect(result.unwrap()).toEqual([
          ["a", 1],
          ["b", 2],
          ["c", 3],
        ]);
      });

      it("should return an empty array if the dictionary is empty", () => {
        const dict = Collection.of({});
        const result = dict.entries();
        expect(result.unwrap()).toEqual([]);
      });
    });

    describe("toList", () => {
      it("should return a List of entries", () => {
        const dict = Collection.of({ a: 1, b: 2, c: 3 });
        const result = dict.toList();
        expect(result.unwrap()).toEqual([
          ["a", 1],
          ["b", 2],
          ["c", 3],
        ]);
      });

      it("should return an empty List if the dictionary is empty", () => {
        const dict = Collection.of({});
        const result = dict.toList();
        expect(result.unwrap()).toEqual([]);
      });
    });
  });

  describe("List", () => {
    describe("toDict", () => {
      it("should return a Dictionary of entries", () => {
        const list = Collection.of([
          ["a", 1],
          ["b", 2],
          ["c", 3],
        ] as const);
        const result = list.toDict(([key, value]) => key);
        expect(result.unwrap()).toEqual({
          a: ["a", 1],
          b: ["b", 2],
          c: ["c", 3],
        });
      });

      it("should return an empty Dictionary if the list is empty", () => {
        const list = Collection.of([]);
        const result = list.toDict(identity);
        expect(result.unwrap()).toEqual({});
      });
    });

    describe("toRecord", () => {
      it("should return a Record of entries", () => {
        const list = Collection.of([
          ["a", 1],
          ["b", 2],
          ["c", 3],
        ] as const);
        const result = list.toRecord(([key, value]) => key);
        expect(result).toEqual({
          a: ["a", 1],
          b: ["b", 2],
          c: ["c", 3],
        });
      });

      it("should return an empty Record if the list is empty", () => {
        const list = Collection.of([]);
        const result = list.toRecord(identity);
        expect(result).toEqual({});
      });
    });
  });
});
