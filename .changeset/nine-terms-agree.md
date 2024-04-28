---
"ftld": major
---

Simplify Do, remove promise support.

Do no longer needs the unwrapper function.

```
// before
const x = Do(function*($) {
  const a = yield* $(Result.Ok(1))
  const b = yield* $(Option.Some(2))
  return a + b;
});

// after
const x = Do(function*() {
  const a = yield* Result.Ok(1);
  const b = yield* Option.Some(2);
  return a + b;
});
```

A side effect of this is that unwrapping promises is no longer supported. This is a breaking change, but it is for the better.

Promises are not a good fit for the Do notation, and it is better to use async/await instead. Promises also have no way of tracking the Error type, which is a big limitation.
