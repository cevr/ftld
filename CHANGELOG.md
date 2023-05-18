# ftld

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
