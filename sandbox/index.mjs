import { Result, Option, Task, Do } from "ftld";

const t = Do(function* ($) {
  const a = yield* $(Task.from(() => 1));
  const b = yield* $(Result.from(2));
  const c = yield* $(Option.from(3));
  return a + b + c;
});

const x = t.run();
const res = x.unwrap();
if (res !== 6) throw new Error("Expected 6, got " + res);
