import { Result, Option, Task, Do, Collection } from "ftld";

const obj = {
  a: 1,
  b: 2,
};
const t = Do(function* ($) {
  const a = yield* $(Task.from(() => 1));
  const b = yield* $(Result.from(() => 2));
  const c = yield* $(Option.from(3));
  const d = Collection.reduce(obj, (acc, a) => acc + a, 0);

  return a + b + c + d;
});

const x = t.run();
const res = x.unwrap();
if (res !== 9) throw new Error("Expected 9, got " + res);
