import { Option } from "./option";
import { Result } from "./result";
import { Task } from "./task";
import { isOption, isResult, isTask } from "./utils";

describe.concurrent("isResult", () => {
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

describe.concurrent("isOption", () => {
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

describe.concurrent("isTask", () => {
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
