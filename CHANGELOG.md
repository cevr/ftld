# ftld

## 0.57.12

### Patch Changes

- 69277a5: ensure Task collection methods break early in loops

## 0.57.11

### Patch Changes

- 1f46f29: fix traverse types

## 0.57.10

### Patch Changes

- 02d4694: fix ESM imports for types

## 0.57.9

### Patch Changes

- decffc6: improve Do inference

## 0.57.8

### Patch Changes

- 311a5f4: simplify unwrapper

## 0.57.7

### Patch Changes

- 914c449: ensure declared errors within task constructors are preserved

## 0.57.6

### Patch Changes

- fbd5e0e: allow empty Ok/Err initializers

## 0.57.5

### Patch Changes

- cadaea4: Add Task.AsyncOk/AsyncErr, fix Task.Err when using async value, improve types

## 0.57.4

### Patch Changes

- 1918796: normalize task types

## 0.57.3

### Patch Changes

- bc890b2: various type improvements

## 0.57.2

### Patch Changes

- 11e8b12: fix Do type not correctly inferring Async type

## 0.57.1

### Patch Changes

- d498cc7: fix task runtime and types

## 0.57.0

### Minor Changes

- ae76668: overhaul Task type to improve types overall

## 0.56.5

### Patch Changes

- 5f569b6: improve task types

## 0.56.4

### Patch Changes

- 1ace46f: fix task.tap typings

## 0.56.3

### Patch Changes

- b5522a4: improve EvaluateTask type

## 0.56.2

### Patch Changes

- 2e1c3f4: fix Task.from type inference

## 0.56.1

### Patch Changes

- 602c842: add type aliases to better hint whether a task is sync or async

## 0.56.0

### Minor Changes

- 90db067: Remove Task.mapResult/tapResult, only allow functions bodys in task.from/fromPredicate, remove task's PromiseLike interface,improve async performance of Task collection methods

## 0.55.0

### Minor Changes

- 38644dd: do not allow async map

## 0.54.1

### Patch Changes

- 8c08183: do not allow async mapErr in Task

## 0.54.0

### Minor Changes

- fca0609: Make Task sync/async depending on input

## 0.53.1

### Patch Changes

- 80caf8d: better recursion

## 0.53.0

### Minor Changes

- ccf6cce: ensure Do computation result is always lifted to a Task ifany async computations are done. Restrict Promises (even though they aresupported) from being used as it is an anti-pattern.

## 0.52.3

### Patch Changes

- a138fe4: ensure Do return type is always unwrapped

## 0.52.2

### Patch Changes

- c1a8e0d: ensure Do computation remains lazy with tasks, warn of eager resolving when passing promises

## 0.52.1

### Patch Changes

- 487b538: simplify Do implementation, allow non monadic values in types

## 0.52.0

### Minor Changes

- a54c565: improve `Do` by not requiring async generators for async computations

## 0.51.5

### Patch Changes

- 675ddc0: avoid unnecessary microtasks in async Do

## 0.51.4

### Patch Changes

- cee2258: try to reduce bundle size

## 0.51.3

### Patch Changes

- ad9e3f7: Fixes Do type to ensure the Error types are properly spread. Thanks @ggrandi

## 0.51.2

### Patch Changes

- 3058ad4: fix do types, enhance task types

## 0.51.1

### Patch Changes

- 0e8c67a: improve Do typings

## 0.51.0

### Minor Changes

- 629f155: Add Do utility, a method of unwrapping monadic values in a syncronous way

## 0.50.0

### Minor Changes

- 22727d5: rename flatMapErr to recover

## 0.49.0

### Minor Changes

- 376631b: Result/Task `fromPrediate` args is now (value, predicate, onErr)

## 0.48.5

### Patch Changes

- 1ed2ee2: improve result coalesce type

## 0.48.4

### Patch Changes

- 44bb319: improve Result.unwrapOr types and add test cases for Task.unwrap/unwrapOr/unwrapErr

## 0.48.3

### Patch Changes

- add repo/bugs/homepage to package.json

## 0.48.2

### Patch Changes

- fix Task.unwrapOr types

## 0.48.1

### Patch Changes

- ffad3f2: improve types

## 0.48.0

### Minor Changes

- 610630c: make option type more correct

## 0.47.0

### Minor Changes

- 6097cae: Move predicate function argument positioning to be more ergonomic, ensure Result and Option data type inspect names are not prefixed by an underscore

### Patch Changes

- c195630: Simplify Task implementation

## 0.46.1

### Patch Changes

- 75a2e8e: Improve typings by ensuring mapped types are unwrapped

## 0.46.0

### Minor Changes

- 6ffbb15: rename `sequence` to all for `Result` and `Option` types

## 0.45.1

### Patch Changes

- add `flatMapErr` to `Task` and refine typings

## 0.45.0

### Minor Changes

- Adds `inverse` to the Result and Task type, allowing one to invert the Ok instance to an Err and vice versa

## 0.44.1

### Patch Changes

- Fix flatMapErr types to include union of Err types

## 0.44.0

### Minor Changes

- Adds `flatMapErr` to `Result`
