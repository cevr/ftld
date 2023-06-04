---
"ftld": patch
---

add onErr argument for Do `$` unwrapper. Allows for quickly overriding any errors.

example:

```ts
function someTask(): AsyncTask<SomeError, string>;

// the resulting task will have a type of AsyncTask<AnotherError, string>
// instead of AsyncTask<SomeError, string>
const task = Do(function* ($) {
  const x = yield* $(someTask(), () => new AnotherError());
  return x;
});
```
