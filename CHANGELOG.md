# ftld

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
