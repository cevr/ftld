import type { z } from "zod";
import { Result } from "../lib/result";

export const wrapZod =
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
