import { Collection } from "./collection";
import { Option } from "./option";
import { Result } from "./result";
import { Task } from "./task";
import {
  isCollection,
  isCollectionLike,
  isNonEmptyArray,
  isOption,
  isResult,
  isTask,
} from "./utils";

describe("isResult", () => {
  it("should return true when value is a Result", () => {
    const res = Result.Err("error");
    expect(isResult(res)).toBe(true);
  });

  it("should return false when value is not a Result", () => {
    expect(isResult(42)).toBe(false);
    expect(isResult("error")).toBe(false);
    expect(isResult(null)).toBe(false);
    expect(isResult(undefined)).toBe(false);
    expect(isResult({})).toBe(false);
  });
});

describe("isOption", () => {
  it("should return true when value is an Option", () => {
    const some = Option.Some(42);
    expect(isOption(some)).toBe(true);

    const none = Option.None();
    expect(isOption(none)).toBe(true);
  });

  it("should return false when value is not an Option", () => {
    expect(isOption(42)).toBe(false);
    expect(isOption("error")).toBe(false);
    expect(isOption(null)).toBe(false);
    expect(isOption(undefined)).toBe(false);
    expect(isOption({})).toBe(false);
  });
});

describe("isTask", () => {
  it("should return true when value is a Task", () => {
    const task = Task.from(42);
    expect(isTask(task)).toBe(true);
  });

  it("should return false when value is not a Task", () => {
    expect(isTask(42)).toBe(false);
    expect(isTask("error")).toBe(false);
    expect(isTask(null)).toBe(false);
    expect(isTask(undefined)).toBe(false);
    expect(isTask({})).toBe(false);
  });
});

describe("isCollection", () => {
  it("should return true when value is a collection", () => {
    const dict = Collection.from({ a: 1, b: 2 });
    const list = Collection.from([1, 2, 3]);
    expect(isCollection(dict)).toBe(true);
    expect(isCollection(list)).toBe(true);
  });

  it("should return false when value is not a collection", () => {
    expect(isCollection({})).toBe(false);
    expect(isCollection([])).toBe(false);
    expect(isCollection(42)).toBe(false);
    expect(isCollection("error")).toBe(false);
    expect(isCollection(null)).toBe(false);
    expect(isCollection(undefined)).toBe(false);
  });
});

describe("isCollectionLike", () => {
  it("should return true when value is a collection like", () => {
    expect(isCollectionLike({})).toBe(true);
    expect(isCollectionLike([])).toBe(true);
    expect(isCollectionLike(new Map())).toBe(true);
    expect(isCollectionLike(new Set())).toBe(true);
  });

  it("should return false when value is not a collection like", () => {
    expect(isCollectionLike(42)).toBe(false);
    expect(isCollectionLike("error")).toBe(false);
    expect(isCollectionLike(null)).toBe(false);
    expect(isCollectionLike(undefined)).toBe(false);
  });
});

describe("isNonEmptyArray", () => {
  it("should return true when value is a non empty array", () => {
    expect(isNonEmptyArray([1, 2, 3])).toBe(true);
    expect(isNonEmptyArray([1])).toBe(true);
  });

  it("should return false when value is not a non empty array", () => {
    expect(isNonEmptyArray([])).toBe(false);
    expect(isNonEmptyArray({})).toBe(false);
    expect(isNonEmptyArray(42)).toBe(false);
    expect(isNonEmptyArray("error")).toBe(false);
    expect(isNonEmptyArray(null)).toBe(false);
    expect(isNonEmptyArray(undefined)).toBe(false);
  });
});
