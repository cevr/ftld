import * as fs from "fs/promises";
import path from "path";

import { type AsyncTask } from "../lib/task";
import { isResult } from "../lib/utils";
import { taskify } from "./taskify";

describe.concurrent("taskify", () => {
  it("should work with functions", async () => {
    const readFile = taskify(fs.readFile);
    const __dirname = new URL(".", import.meta.url).pathname;
    const task = readFile(path.resolve(__dirname, "../package.json"), "utf-8");
    expectTypeOf(task).toEqualTypeOf<AsyncTask<unknown, string>>();
    expectTypeOf(
      readFile(path.resolve(__dirname, "../package.json"))
    ).toEqualTypeOf<AsyncTask<unknown, Buffer>>();

    const result = await task.run();
    expect(isResult(result)).toBe(true);
    expect(result.isOk()).toBe(true);
    expect(typeof result.unwrap()).toBe("string");
  });

  it("should work with objects", async () => {
    const fsTask = taskify(fs);
    const __dirname = new URL(".", import.meta.url).pathname;
    const task = fsTask.readFile(
      path.resolve(__dirname, "../package.json"),
      "utf-8"
    );

    // overloads are preserved
    expectTypeOf(task).toEqualTypeOf<AsyncTask<unknown, string>>();
    expectTypeOf(
      fsTask.readFile(path.resolve(__dirname, "../package.json"))
    ).toEqualTypeOf<AsyncTask<unknown, Buffer>>();

    const result = await task.run();

    expect(isResult(result)).toBe(true);
    expect(result.isOk()).toBe(true);
    expect(typeof result.unwrap()).toBe("string");
  });
});
