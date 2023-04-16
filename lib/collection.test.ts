import { Collection } from "./collection";
import { identity } from "./utils";

describe.concurrent("Collection", () => {
  describe.concurrent("from", () => {
    it("should create a List if the input is an array-like", () => {
      const array = Collection.from([1, 2, 3]);
      const set = Collection.from(new Set([1, 2, 3]));
      const list = Collection.from(Collection.from([1, 2, 3]));
      expect(array.isList()).toEqual(true);
      expect(set.isList()).toEqual(true);
      expect(list.isList()).toEqual(true);

      const notList = Collection.from({ a: 1, b: 2, c: 3 });
      const notList2 = Collection.from(
        new Map([
          ["a", 1],
          ["b", 2],
          ["c", 3],
        ])
      );
      const notList3 = Collection.from(
        Collection.from({
          a: 1,
          b: 2,
          c: 3,
        })
      );
      expect(notList.isList()).toEqual(false);
      expect(notList2.isList()).toEqual(false);
      expect(notList3.isList()).toEqual(false);
    });

    it("should create a Dict if the input is an record-like", () => {
      const record = Collection.from({ a: 1, b: 2, c: 3 });
      const map = Collection.from(
        new Map([
          ["a", 1],
          ["b", 2],
          ["c", 3],
        ])
      );
      const dict = Collection.from(Collection.from({ a: 1, b: 2, c: 3 }));
      expect(record.isDict()).toEqual(true);
      expect(map.isDict()).toEqual(true);
      expect(dict.isDict()).toEqual(true);

      const notDict = Collection.from([1, 2, 3]);
      const notDict2 = Collection.from(new Set([1, 2, 3]));
      const notDict3 = Collection.from(Collection.from([1, 2, 3]));
      expect(notDict.isDict()).toEqual(false);
      expect(notDict2.isDict()).toEqual(false);
      expect(notDict3.isDict()).toEqual(false);
    });

    it("should throw an error if the input is not an object, map, array, or set", () => {
      expect(() => Collection.from(new Set())).not.toThrowError();
      expect(() => Collection.from(new Map())).not.toThrowError();
      expect(() => Collection.from([])).not.toThrowError();
      expect(() => Collection.from({})).not.toThrowError();
      expect(() => Collection.from(1)).toThrowError();
      expect(() => Collection.from("a")).toThrowError();
      expect(() => Collection.from(true)).toThrowError();
      expect(() => Collection.from(null)).toThrowError();
      expect(() => Collection.from(undefined)).toThrowError();
    });
  });

  describe.concurrent("fromEntries", () => {
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

  describe.concurrent("zip", () => {
    it("should zip any collection-like with any collection-like", () => {
      const list = Collection.from([1, 2, 3]);
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const set = new Set([1, 2, 3]);
      const record = { a: 1, b: 2, c: 3 };
      const map = new Map([
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ]);

      const expected = Collection.from([
        [1, 1],
        [2, 2],
        [3, 3],
      ]);

      expect(Collection.zip(list, record)).toEqual(expected);
      expect(Collection.zip(list, dict)).toEqual(expected);
      expect(Collection.zip(list, set)).toEqual(expected);
      expect(Collection.zip(list, map)).toEqual(expected);
    });
  });

  describe.concurrent("map", () => {
    it("should map over a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.map((x) => x * 2);
      expect(result).toEqual(Collection.from([2, 4, 6]));
      expect(result.unwrap()).toEqual([2, 4, 6]);
    });

    it("should map over a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.map((x) => x * 2);
      expect(result).toEqual(Collection.from({ a: 2, b: 4, c: 6 }));
      expect(result.unwrap()).toEqual({ a: 2, b: 4, c: 6 });
    });
  });

  describe.concurrent("flatMap", () => {
    it("should flatMap over a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.flatMap((x) => Collection.from([x * 2]));
      expect(result).toEqual(Collection.from([2, 4, 6]));
      expect(result.unwrap()).toEqual([2, 4, 6]);
    });

    it("should flatMap over a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.flatMap((value, key) =>
        Collection.from({ [key]: value * 2 })
      );
      expect(result).toEqual(Collection.from({ a: 2, b: 4, c: 6 }));
      expect(result.unwrap()).toEqual({ a: 2, b: 4, c: 6 });
    });

    it("should flatMap over a dictionary with different keys", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.flatMap((value, key) =>
        Collection.from({ [key + "x"]: value * 2 })
      );
      expect(result).toEqual(Collection.from({ ax: 2, bx: 4, cx: 6 }));
      expect(result.unwrap()).toEqual({ ax: 2, bx: 4, cx: 6 });
    });
  });

  describe.concurrent("filter", () => {
    it("should filter a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.filter((x) => x % 2 === 0);
      expect(result).toEqual(Collection.from([2]));
      expect(result.unwrap()).toEqual([2]);
    });

    it("should filter a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.filter((value, key) => key === "b");
      expect(result).toEqual(Collection.from({ b: 2 }));
      expect(result.unwrap()).toEqual({ b: 2 });
    });
  });

  describe.concurrent("reduce", () => {
    it("should reduce a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.reduce((acc, x) => acc + x, 0);
      expect(result).toEqual(6);
    });

    it("should reduce a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.reduce((acc, value, key) => acc + value, 0);
      expect(result).toEqual(6);
    });
  });

  describe.concurrent("reduceRight", () => {
    it("should reduceRight a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.reduceRight((acc, x) => acc + x, 0);
      expect(result).toEqual(6);
    });

    it("should reduceRight a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.reduceRight((acc, value, key) => acc + value, 0);
      expect(result).toEqual(6);
    });
  });

  describe.concurrent("forEach", () => {
    it("should forEach a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result: number[] = [];
      list.forEach((x) => result.push(x));
      expect(result).toEqual([1, 2, 3]);
    });

    it("should forEach a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result: number[] = [];
      dict.forEach((value, key) => result.push(value));
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe.concurrent("every", () => {
    it("should every a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.every((x) => x < 4);
      expect(result).toEqual(true);
    });

    it("should every a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.every((value, key) => value < 4);
      expect(result).toEqual(true);
    });
  });

  describe.concurrent("any", () => {
    it("should any a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.any((x) => x === 2);
      expect(result).toEqual(true);
    });

    it("should any a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.any((value, key) => value === 2);
      expect(result).toEqual(true);
    });
  });

  describe.concurrent("find", () => {
    it("should find a list and return a Some if it exists", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.find((x) => x === 2);
      expect(result.unwrap()).toEqual(2);
      expect(result.isSome()).toEqual(true);
    });

    it("should find a list and return a None if it doesnt exist", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.find((x) => x === 4);
      expect(result.isNone()).toEqual(true);
    });

    it("should find a dictionary and return a Some if it exists", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.find((value, key) => value === 2);
      expect(result.unwrap()).toEqual(2);
      expect(result.isSome()).toEqual(true);
    });

    it("should find a dictionary and return a None if it doesnt exist", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.find((value, key) => value === 4);
      expect(result.isNone()).toEqual(true);
    });
  });

  describe.concurrent("findLast", () => {
    it("should findLast a list and return a Some if it exists", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.findLast((x) => x === 2);
      expect(result.unwrap()).toEqual(2);
      expect(result.isSome()).toEqual(true);
    });

    it("should findLast a list and return a None if it doesnt exist", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.findLast((x) => x === 4);
      expect(result.isNone()).toEqual(true);
    });

    it("should findLast a dictionary and return a Some if it exists", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.findLast((value, key) => value === 2);
      expect(result.unwrap()).toEqual(2);
      expect(result.isSome()).toEqual(true);
    });

    it("should findLast a dictionary and return a None if it doesnt exist", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.findLast((value, key) => value === 4);
      expect(result.isNone()).toEqual(true);
    });
  });

  describe.concurrent("includes", () => {
    it("should includes a list and return true if it exists", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.includes(2);
      expect(result).toEqual(true);
    });

    it("should includes a list and return false if it doesnt exist", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.includes(4);
      expect(result).toEqual(false);
    });

    it("should includes a dictionary and return true if it exists", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.includes(2);
      expect(result).toEqual(true);
    });

    it("should includes a dictionary and return false if it doesnt exist", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.includes(4);
      expect(result).toEqual(false);
    });
  });

  describe.concurrent("indexOf", () => {
    it("should indexOf a list and return a Some if it exists", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.indexOf(2);
      expect(result.unwrap()).toEqual(1);
      expect(result.isSome()).toEqual(true);
    });

    it("should indexOf a list and return a None if it doesnt exist", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.indexOf(4);
      expect(result.isNone()).toEqual(true);
    });
  });

  describe.concurrent("lastIndexOf", () => {
    it("should lastIndexOf a list and return a Some if it exists", () => {
      const list = Collection.from([1, 2, 3, 2]);
      const result = list.lastIndexOf(2);
      expect(result.unwrap()).toEqual(3);
      expect(result.isSome()).toEqual(true);
    });

    it("should lastIndexOf a list and return a None if it doesnt exist", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.lastIndexOf(4);
      expect(result.isNone()).toEqual(true);
    });
  });

  describe.concurrent("keyOf", () => {
    it("should return the key of a value in a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.keyOf(2);
      expect(result.unwrap()).toEqual("b");
      expect(result.isSome()).toEqual(true);
    });

    it("should return a None if the value doesnt exist in the dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.keyOf(4);
      expect(result.isNone()).toEqual(true);
    });
  });

  describe.concurrent("keys", () => {
    it("should return the keys of a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.keys();
      expect(result.unwrap()).toEqual(["a", "b", "c"]);
    });
  });

  describe.concurrent("values", () => {
    it("should return the values of a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.values();
      expect(result.unwrap()).toEqual([1, 2, 3]);
    });
  });

  describe.concurrent("get", () => {
    it("should get a value from a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.get("b");
      expect(result.unwrap()).toEqual(2);
    });

    it("should return a None if the value doesnt exist in the dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.get("d");
      expect(result.isNone()).toEqual(true);
    });

    it("should get a value from a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.get(1);
      expect(result.unwrap()).toEqual(2);
    });

    it("should return a None if the value doesnt exist in the list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.get(4);
      expect(result.isNone()).toEqual(true);
    });

    it("should be able to to use negative indexes in a List", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.get(-1);
      expect(result.isSome()).toEqual(true);
      expect(result.unwrap()).toEqual(3);
    });
  });

  describe.concurrent("set", () => {
    it("should set a value in a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.set("b", 4);
      expect(result.unwrap()).toEqual({ a: 1, b: 4, c: 3 });
    });

    it("should set a value in a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.set(1, 4);
      expect(result.unwrap()).toEqual([1, 4, 3]);
    });

    it("should be able to to use negative indexes in a List", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.set(-1, 4);
      expect(result.unwrap()).toEqual([1, 2, 4]);
    });
  });

  describe.concurrent("delete", () => {
    it("should delete a value in a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.delete("b");
      expect(result.isSome()).toEqual(true);
      expect(result.unwrap()).toEqual(Collection.from({ a: 1, c: 3 }));
    });

    it("should return a None if the value doesnt exist in the dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.delete("d");
      expect(result.isNone()).toEqual(true);
    });

    it("should delete a value in a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.delete(1);
      expect(result.isSome()).toEqual(true);
      expect(result.unwrap()).toEqual(Collection.from([1, 3]));
    });

    it("should return a None if the value doesnt exist in the list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.delete(4);
      expect(result.isNone()).toEqual(true);
    });

    it("should be able to to use negative indexes in a List", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.delete(-1);
      expect(result.isSome()).toEqual(true);
      expect(result.unwrap()).toEqual(Collection.from([1, 2]));
    });
  });

  describe.concurrent("clear", () => {
    it("should clear a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.clear();
      expect(result).toEqual(Collection.from({}));
    });

    it("should clear a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.clear();
      expect(result).toEqual(Collection.from([]));
    });
  });

  describe.concurrent("concat", () => {
    it("should concat a value in a list if the value is an array", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.concat([4]);
      expect(result.unwrap()).toEqual([1, 2, 3, 4]);
    });

    it("should concat a value in a list if the value is a List", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.concat(Collection.from([4]));
      expect(result.unwrap()).toEqual([1, 2, 3, 4]);
    });

    it("should concat a value in a dictionary if the value is an object", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.concat({ d: 4 });
      expect(result.unwrap()).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });

    it("should concat a value in a dictionary if the value is a Dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.concat(
        Collection.from({
          d: 4,
        })
      );
      expect(result.unwrap()).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });
  });

  describe.concurrent("toSet", () => {
    it("should convert a list to a set", () => {
      const list = Collection.from([1, 1, 2, 2, 3, 3]);
      const result = list.toSet();
      expect(result).toEqual(new Set([1, 2, 3]));
    });

    it("should convert a dictionary to a set", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3, d: 3, e: 3 });
      const result = dict.toSet();
      expect(result).toEqual(new Set([1, 2, 3]));
    });
  });

  describe.concurrent("join", () => {
    it("should join a list", () => {
      const list = Collection.from([1, 2, 3]);
      const result = list.join(",");
      expect(result).toEqual("1,2,3");
    });

    it("should join a dictionary", () => {
      const dict = Collection.from({ a: 1, b: 2, c: 3 });
      const result = dict.join(",");
      expect(result).toEqual("1,2,3");
    });
  });

  describe.concurrent("isEmpty", () => {
    it("should return true if the dictionary is empty", () => {
      const dict = Collection.from({});
      const result = dict.isEmpty();
      expect(result).toEqual(true);
    });

    it("should return false if the dictionary is not empty", () => {
      const dict = Collection.from({ a: 1 });
      const result = dict.isEmpty();
      expect(result).toEqual(false);
    });

    it("should return true if the list is empty", () => {
      const list = Collection.from([]);
      const result = list.isEmpty();
      expect(result).toEqual(true);
    });

    it("should return false if the list is not empty", () => {
      const list = Collection.from([1]);
      const result = list.isEmpty();
      expect(result).toEqual(false);
    });
  });

  describe.concurrent("Dict", () => {
    describe.concurrent("keys", () => {
      it("should return an array of keys", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.keys();
        expect(result.unwrap()).toEqual(["a", "b", "c"]);
      });

      it("should return an empty array if the dictionary is empty", () => {
        const dict = Collection.from({});
        const result = dict.keys();
        expect(result.unwrap()).toEqual([]);
      });
    });

    describe.concurrent("values", () => {
      it("should return an array of values", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.values();
        expect(result.unwrap()).toEqual([1, 2, 3]);
      });

      it("should return an empty array if the dictionary is empty", () => {
        const dict = Collection.from({});
        const result = dict.values();
        expect(result.unwrap()).toEqual([]);
      });
    });

    describe.concurrent("entries", () => {
      it("should return an array of entries", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.entries();
        expect(result.unwrap()).toEqual([
          ["a", 1],
          ["b", 2],
          ["c", 3],
        ]);
      });

      it("should return an empty array if the dictionary is empty", () => {
        const dict = Collection.from({});
        const result = dict.entries();
        expect(result.unwrap()).toEqual([]);
      });
    });

    describe.concurrent("keysArray", () => {
      it("should return an array of keys", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.keysArray();
        expect(result).toEqual(["a", "b", "c"]);
      });

      it("should return an empty array if the dictionary is empty", () => {
        const dict = Collection.from({});
        const result = dict.keysArray();
        expect(result).toEqual([]);
      });
    });

    describe.concurrent("valuesArray", () => {
      it("should return an array of values", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.valuesArray();
        expect(result).toEqual([1, 2, 3]);
      });

      it("should return an empty array if the dictionary is empty", () => {
        const dict = Collection.from({});
        const result = dict.valuesArray();
        expect(result).toEqual([]);
      });
    });

    describe.concurrent("entriesArray", () => {
      it("should return an array of entries", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.entriesArray();
        expect(result).toEqual([
          ["a", 1],
          ["b", 2],
          ["c", 3],
        ]);
      });

      it("should return an empty array if the dictionary is empty", () => {
        const dict = Collection.from({});
        const result = dict.entriesArray();
        expect(result).toEqual([]);
      });
    });

    describe.concurrent("toList", () => {
      it("should return a List of entries", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.toList();
        expect(result.unwrap()).toEqual([
          ["a", 1],
          ["b", 2],
          ["c", 3],
        ]);
      });

      it("should return an empty List if the dictionary is empty", () => {
        const dict = Collection.from({});
        const result = dict.toList();
        expect(result.unwrap()).toEqual([]);
      });
    });

    describe.concurrent("findKey", () => {
      it("should findKey a dictionary and return a Some if it exists", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.findKey((value, key) => value === 2);
        expect(result.unwrap()).toEqual("b");
        expect(result.isSome()).toEqual(true);
      });

      it("should findKey a dictionary and return a None if it doesnt exist", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.findKey((value, key) => value === 4);
        expect(result.isNone()).toEqual(true);
      });
    });

    describe.concurrent("findLastKey", () => {
      it("should findLastKey a dictionary and return a Some if it exists", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.findLastKey((value, key) => value === 2);
        expect(result.unwrap()).toEqual("b");
        expect(result.isSome()).toEqual(true);
      });

      it("should findLastKey a dictionary and return a None if it doesnt exist", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.findLastKey((value, key) => value === 4);
        expect(result.isNone()).toEqual(true);
      });
    });

    describe.concurrent("includesKey", () => {
      it("should return true if the dictionary includes the key", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.includesKey("a");
        expect(result).toEqual(true);
      });

      it("should return false if the dictionary doesnt include the key", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.includesKey("d");
        expect(result).toEqual(false);
      });
    });

    describe.concurrent("zip", () => {
      it("should zip two dictionaries", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.zip({ a: 4, b: 5, c: 6 });
        expect(result.unwrap()).toEqual([
          [1, 4],
          [2, 5],
          [3, 6],
        ]);
      });

      it("should throw an error when collections are different sizes", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        expect(() => dict.zip({ a: 4, b: 5 })).toThrowError();
      });

      describe.concurrent("zipWith", () => {
        it("should zip two dictionaries with a custom function", () => {
          const dict = Collection.from({ a: 1, b: 2, c: 3 });
          const result = dict.zipWith({ a: 4, b: 5, c: 6 }, (a, b) => a + b);
          expect(result.unwrap()).toEqual([5, 7, 9]);
        });

        it("throw an error when collections are different sizes", () => {
          const dict = Collection.from({ a: 1, b: 2, c: 3 });
          expect(() =>
            dict.zipWith({ a: 4, b: 5 }, (a, b) => a + b)
          ).toThrowError();
        });
      });
    });

    describe.concurrent("toRecord", () => {
      it("should return a Record", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.toRecord();
        expect(result).toEqual({ a: 1, b: 2, c: 3 });
      });

      it("should return an empty Record if the dictionary is empty", () => {
        const dict = Collection.from({});
        const result = dict.toRecord();
        expect(result).toEqual({});
      });
    });

    describe.concurrent("toMap", () => {
      it("should return a Map", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.toMap();
        expect(result).toEqual(
          new Map([
            ["a", 1],
            ["b", 2],
            ["c", 3],
          ])
        );
      });

      it("should return an empty Map if the dictionary is empty", () => {
        const dict = Collection.from({});
        const result = dict.toMap();
        expect(result).toEqual(new Map());
      });
    });

    describe.concurrent("toArray", () => {
      it("should return an array of entries", () => {
        const dict = Collection.from({ a: 1, b: 2, c: 3 });
        const result = dict.toArray();
        expect(result).toEqual([
          ["a", 1],
          ["b", 2],
          ["c", 3],
        ]);
      });

      it("should return an empty array if the dictionary is empty", () => {
        const dict = Collection.from({});
        const result = dict.toArray();
        expect(result).toEqual([]);
      });
    });
  });

  describe.concurrent("List", () => {
    describe.concurrent("toMap", () => {
      it("should return of map of index and value", () => {
        const list = Collection.from([1, 2, 3] as const);
        const result = list.toMap();
        expect(result).toEqual(
          new Map([
            ["0", 1],
            ["1", 2],
            ["2", 3],
          ])
        );
      });

      it("should return an empty Map if the list is empty", () => {
        const list = Collection.from([]);
        const result = list.toMap();
        expect(result).toEqual(new Map());
      });

      it("should return a Map of index and value with a custom key", () => {
        const list = Collection.from([1, 2, 3] as const);
        const result = list.toMap((value) => String(value + 1));
        expect(result).toEqual(
          new Map([
            ["2", 1],
            ["3", 2],
            ["4", 3],
          ])
        );
      });
    });

    describe.concurrent("toArray", () => {
      it("should return an array of values", () => {
        const list = Collection.from([1, 2, 3] as const);
        const result = list.toArray();
        expect(result).toEqual([1, 2, 3]);
      });

      it("should return an empty array if the list is empty", () => {
        const list = Collection.from([]);
        const result = list.toArray();
        expect(result).toEqual([]);
      });
    });

    describe.concurrent("toDict", () => {
      it("should return a Dictionary of entries", () => {
        const list = Collection.from([
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
        const list = Collection.from([]);
        const result = list.toDict(identity);
        expect(result.unwrap()).toEqual({});
      });
    });

    describe.concurrent("toRecord", () => {
      it("should return a Record of entries", () => {
        const list = Collection.from([
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
        const list = Collection.from([]);
        const result = list.toRecord(identity);
        expect(result).toEqual({});
      });
    });

    describe.concurrent("zip", () => {
      it("should zip two lists", () => {
        const list1 = Collection.from([1, 2, 3] as const);
        const list2 = Collection.from([4, 5, 6] as const);
        const result = list1.zip(list2);
        expect(result.unwrap()).toEqual([
          [1, 4],
          [2, 5],
          [3, 6],
        ]);
      });

      it("should throw an error when lists are not the same size", () => {
        const list1 = Collection.from([1, 2, 3]);
        const list2 = Collection.from([4, 5]);
        expect(() => list1.zip(list2)).toThrowError();
      });
    });
    describe.concurrent("zipWith", () => {
      it("should zip two lists with a custom function", () => {
        const list1 = Collection.from([1, 2, 3]);
        const list2 = Collection.from([4, 5, 6]);
        const result = list1.zipWith(list2, (a, b) => a + b);
        expect(result.unwrap()).toEqual([5, 7, 9]);
      });

      it("should throw an error when lists are not the same size", () => {
        const list1 = Collection.from([1, 2, 3]);
        const list2 = Collection.from([4, 5]);
        expect(() => list1.zipWith(list2, (a, b) => a + b)).toThrowError();
      });
    });

    describe.concurrent("findIndex", () => {
      it("should findIndex a list and return a Some if it exists", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.findIndex((x) => x === 2);
        expect(result.unwrap()).toEqual(1);
        expect(result.isSome()).toEqual(true);
      });

      it("should findIndex a list and return a None if it doesnt exist", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.findIndex((x) => x === 4);

        expect(result.isNone()).toEqual(true);
      });
    });

    describe.concurrent("findLastIndex", () => {
      it("should search from the end of the list", () => {
        const list = Collection.from([1, 2, 3, 2]);
        const result = list.findLastIndex((x) => x === 2);
        expect(result.unwrap()).toEqual(3);
      });

      it("should findLastIndex a list and return a Some if it exists", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.findLastIndex((x) => x === 2);
        expect(result.unwrap()).toEqual(1);
        expect(result.isSome()).toEqual(true);
      });

      it("should findLastIndex a list and return a None if it doesnt exist", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.findLastIndex((x) => x === 4);

        expect(result.isNone()).toEqual(true);
      });
    });

    describe.concurrent("push", () => {
      it("should push a value in a list", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.push(4);
        expect(result.unwrap()).toEqual([1, 2, 3, 4]);
      });
    });

    describe.concurrent("pop", () => {
      it("should pop a value in a list and return a Some if successful", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.pop();
        expect(result.isSome()).toEqual(true);
        expect(result.unwrap()).toEqual(Collection.from([1, 2]));
      });

      it("should pop a value in a list and return a None if the list is empty", () => {
        const list = Collection.from([]);
        const result = list.pop();
        expect(result.isNone()).toEqual(true);
      });
    });
    describe.concurrent("shift", () => {
      it("should shift a value in a list", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.shift();
        expect(result.isSome()).toEqual(true);
        expect(result.unwrap()).toEqual(Collection.from([2, 3]));
      });

      it("should shift a value in a list and return a None if the list is empty", () => {
        const list = Collection.from([]);
        const result = list.shift();
        expect(result.isNone()).toEqual(true);
      });
    });

    describe.concurrent("unshift", () => {
      it("should unshift a value in a list", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.unshift(4);
        expect(result.unwrap()).toEqual([4, 1, 2, 3]);
      });
    });

    describe.concurrent("insert", () => {
      it("should insert a value in a list", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.insert(1, 4);
        expect(result.unwrap()).toEqual([1, 4, 2, 3]);
      });

      it("should be able to to use negative indexes in a List", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.insert(-1, 4);
        expect(result.unwrap()).toEqual([1, 2, 4, 3]);
      });
    });

    describe.concurrent("slice", () => {
      it("should slice a list", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.slice(1, 2);
        expect(result.unwrap()).toEqual([2]);
      });

      it("should slice a list with negative indexes", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.slice(-2, -1);
        expect(result.unwrap()).toEqual([2]);
      });
    });

    describe.concurrent("reverse", () => {
      it("should reverse a list", () => {
        const list = Collection.from([1, 2, 3]);
        const result = list.reverse();
        expect(result.unwrap()).toEqual([3, 2, 1]);
      });
    });
    describe.concurrent("sort", () => {
      it("should sort a list", () => {
        const list = Collection.from([3, 2, 1]);
        const result = list.sort();
        expect(result.unwrap()).toEqual([1, 2, 3]);
      });

      it("should sort a list with a custom function", () => {
        const list = Collection.from([3, 2, 1]);
        const result = list.sort((a, b) => b - a);
        expect(result.unwrap()).toEqual([3, 2, 1]);
      });
    });
  });

  describe.concurrent("zip", () => {
    it("should zip two lists", () => {
      const result = Collection.zip([1, 2, 3], [4, 5, 6]);
      expect(result.unwrap()).toEqual([
        [1, 4],
        [2, 5],
        [3, 6],
      ]);
    });

    it("should zip any collection-like value of the same size", () => {
      const result = Collection.zip([1, 2, 3], {
        a: 4,
        b: 5,
        c: 6,
      });
      expect(result.unwrap()).toEqual([
        [1, 4],
        [2, 5],
        [3, 6],
      ]);
    });

    it("should throw an error when collections are different sizes", () => {
      const list1 = Collection.from([1, 2, 3]);
      const list2 = Collection.from([4, 5]);
      expect(() => list1.zip(list2)).toThrowError();
    });

    it("should throw an error when any arguments are not a collection", () => {
      expect(() => Collection.zip(1, 2)).toThrowError();
    });
  });

  describe.concurrent("zipWith", () => {
    it("should zip two lists with a function", () => {
      const result = Collection.zipWith((a, b) => a + b, [1, 2, 3], [4, 5, 6]);
      expect(result.unwrap()).toEqual([5, 7, 9]);
    });

    it("should zip any collection-like value of the same size with a function", () => {
      const list1 = Collection.from([1, 2, 3]);
      const list2 = {
        a: 4,
        b: 5,
        c: 6,
      };
      const result = Collection.zipWith((a, b) => a + b, list1, list2);
      expect(result.unwrap()).toEqual([5, 7, 9]);
    });

    it("should throw an error when any arguments are not a collection", () => {
      expect(() => Collection.zipWith(() => {}, 1, 2)).toThrowError();
    });

    it("should throw an error when collections are different sizes", () => {
      const list1 = Collection.from([1, 2, 3]);
      const list2 = Collection.from([4, 5]);
      expect(() => list1.zipWith(list2, (a, b) => a + b)).toThrowError();
    });
  });
});
