---
"ftld": major
---

Change Result/Task generic order, remove UnknownError class, simplify

Now instead of having `Result<Error, Value>`, it will be `Result<Value, Error>`.

This makes the happy path less verbose.

```ts
// Before
const x: Result<unknown, number> = Result.from(() => 1);

// After
const x: Result<number, unknown> = Result.from(() => 1);
// which now can be simplified to
const x: Result<number> = Result.from(() => 1);
```
