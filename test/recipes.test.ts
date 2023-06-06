import { z } from "zod";
import * as fs from "fs/promises";
import path from "path";

import { Result } from "../lib/result";
import { Task, type AsyncTask, type SyncTask } from "../lib/task";
import { isResult } from "../lib/utils";

describe.concurrent("recipes", () => {
  describe.concurrent("wrapZod", () => {
    const wrapZod =
      <T extends z.Schema>(schema: T) =>
      <E = z.ZodIssue[]>(
        value: unknown,
        onErr: (issues: z.ZodIssue[]) => E = (issues) => issues as E
      ): Result<E, z.infer<T>> => {
        const res = schema.safeParse(value);
        if (res.success) {
          return Result.Ok(res.data);
        }
        return Result.Err(onErr(res.error.errors));
      };

    class CustomError extends Error {}

    const emailSchema = wrapZod(z.string().email());

    it("should return Ok if the value is valid", () => {
      const email = emailSchema("test@test.com");
      expectTypeOf(email).toEqualTypeOf<Result<z.ZodIssue[], string>>();
      expect(email).toEqual(Result.Ok("test@test.com"));
    });

    it("should return Err if the value is invalid", () => {
      const email = emailSchema("test");
      expectTypeOf(email).toEqualTypeOf<Result<z.ZodIssue[], string>>();
      expect(email).toEqual(
        Result.Err([
          {
            code: "invalid_string",
            message: "Invalid email",
            validation: "email",
            path: [],
          },
        ])
      );
    });

    it("should return Err with custom error if the value is invalid", () => {
      const email = emailSchema("test", () => new CustomError());
      expectTypeOf(email).toEqualTypeOf<Result<CustomError, string>>();
      expect(email).toEqual(Result.Err(new CustomError()));
    });
  });

  describe.concurrent("taskify", () => {
    type Taskify = {
      // this is so we preserve the types of the original api if it includes overloads
      <A extends Record<string, unknown>>(obj: A): {
        [K in keyof A]: A[K] extends {
          (...args: infer P1): infer R1;
          (...args: infer P2): infer R2;
          (...args: infer P3): infer R3;
        }
          ? {
              (...args: P1): R1 extends Promise<infer RP1>
                ? AsyncTask<unknown, RP1>
                : SyncTask<unknown, R1>;
              (...args: P2): R2 extends Promise<infer RP2>
                ? AsyncTask<unknown, RP2>
                : SyncTask<unknown, R2>;
              (...args: P3): R3 extends Promise<infer RP3>
                ? AsyncTask<unknown, RP3>
                : SyncTask<unknown, R3>;
            }
          : A[K] extends {
              (...args: infer P1): infer R1;
              (...args: infer P2): infer R2;
            }
          ? {
              (...args: P1): R1 extends Promise<infer RP1>
                ? AsyncTask<unknown, RP1>
                : SyncTask<unknown, R1>;
              (...args: P2): R2 extends Promise<infer RP2>
                ? AsyncTask<unknown, RP2>
                : SyncTask<unknown, R2>;
            }
          : A[K] extends { (...args: infer P1): infer R1 }
          ? {
              (...args: P1): R1 extends Promise<infer RP1>
                ? AsyncTask<unknown, RP1>
                : SyncTask<unknown, R1>;
            }
          : A[K];
      } & {};

      <
        A extends {
          (...args: any[]): any;
          (...args: any[]): any;
          (...args: any[]): any;
        }
      >(
        fn: A
      ): A extends {
        (...args: infer P1): infer R1;
        (...args: infer P2): infer R2;
        (...args: infer P3): infer R3;
      }
        ? {
            (...args: P1): R1 extends Promise<infer RP1>
              ? AsyncTask<unknown, RP1>
              : SyncTask<unknown, R1>;
            (...args: P2): R2 extends Promise<infer RP2>
              ? AsyncTask<unknown, RP2>
              : SyncTask<unknown, R2>;
            (...args: P3): R3 extends Promise<infer RP3>
              ? AsyncTask<unknown, RP3>
              : SyncTask<unknown, R3>;
          }
        : never;
      <
        A extends {
          (...args: any[]): any;
          (...args: any[]): any;
        }
      >(
        fn: A
      ): A extends {
        (...args: infer P1): infer R1;
        (...args: infer P2): infer R2;
      }
        ? {
            (...args: P1): R1 extends Promise<infer RP1>
              ? AsyncTask<unknown, RP1>
              : SyncTask<unknown, R1>;
            (...args: P2): R2 extends Promise<infer RP2>
              ? AsyncTask<unknown, RP2>
              : SyncTask<unknown, R2>;
          }
        : never;
      <
        A extends {
          (...args: any[]): any;
        }
      >(
        fn: A
      ): A extends {
        (...args: infer P1): infer R1;
      }
        ? {
            (...args: P1): R1 extends Promise<infer RP1>
              ? AsyncTask<unknown, RP1>
              : SyncTask<unknown, R1>;
          }
        : never;
    };

    const taskify: Taskify = (fnOrRecord: any): any => {
      if (fnOrRecord instanceof Function) {
        return (...args: any[]) => {
          return Task.from(() => fnOrRecord(...args));
        };
      }

      return Object.fromEntries(
        Object.entries(fnOrRecord).map(([key, value]) => {
          if (value instanceof Function) {
            return [
              key,
              (...args: any[]) => {
                return Task.from(() => value(...args));
              },
            ];
          }
          return [key, value];
        })
      );
    };

    it("should work with functions", async () => {
      const readFile = taskify(fs.readFile);
      const __dirname = new URL(".", import.meta.url).pathname;
      const task = readFile(
        path.resolve(__dirname, "../package.json"),
        "utf-8"
      );
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
});
