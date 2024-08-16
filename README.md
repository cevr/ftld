`ftld` is a small, focused, library that provides a set of functional primitives for building robust and resilient applications in TypeScript.

[![ftld's badge](https://deno.bundlejs.com/?q=ftld&badge=simple)](https://bundlejs.com/?q=ftld)

# Why

Functional programming is a style of programming that emphasizes safety and composability. It's a powerful paradigm that can help you write more concise, readable, and maintainable code. However, it can be difficult to get started with functional programming in TypeScript. There are many libraries that provide functional programming primitives, but they often have a large API surface area and can be difficult to learn.

`ftld` on the other hand is:

- 🟢 tiny (4kb minified and gzipped)
- 📦 tree-shakeable
- 🕺 pragmatic
- 🔍 focused (it provides a small set of primitives)
- 🧠 easy to learn (it has a small API surface area)
- 🎯 easy to use (it's written in TypeScript and has first-class support for TypeScript)
- 🤝 easy to integrate
- 🎉 provides all around great DX

# What it's not

`ftld` is not a replacement for a full-featured library like [Effect](https://www.effect.website/). I highly recommend checking out Effect if you're looking for a more comprehensive library. Many of the ideas in `ftld` were inspired directly by Effect.

# Installation

`ftld` is available as an npm package.

```bash
npm install ftld
```

```bash
pnpm install ftld
```

# Usage

`ftld` exports the following:

- `Do`
- `Option`
- `Result`
- `Task`

## Option

The `Option` type is a useful way to handle values that might be absent. Instead of using `null` or `undefined`, which can lead to runtime errors, the `Option` type enforces handling the absence of a value at the type level. It provides a set of useful methods for working with optional values.

`Option` can have one of two variants: `Some` and `None`. `Some` represents a value that exists, while `None` represents an absence of value.

### Methods

- `Option.from` - Creates an `Option` from a value that might be `null` or `undefined`.
- `Option.fromPredicate` - Creates an `Option` from a predicate. Can narrow the type of the value.
- `Option.tryCatch` - Creates an `Option` from a function that might throw an error.
- `Option.Some` - Creates an `Option` from a value that exists.
- `Option.None` - Creates an `Option` from a value that doesn't exist.
- `Option.isSome` - Checks if an `Option` is `Some`.
- `Option.isNone` - Checks if an `Option` is `None`.
- `option.map` - Maps an `Option` to a new `Option` by applying a function to the value.
- `option.flatMap` - Maps an `Option` to a new `Option` by applying a function to the value and flattening the result.
- `option.tap` - Applies a side effect to the value of an `Option` if the it is a `Some` and returns the original `Option`.
- `option.unwrap` - Unwraps an `Option` and returns the value, or throws an error if the `Option` is `None`.
- `option.unwrapOr` - Unwraps an `Option` and returns the value, or returns a default value if the `Option` is `None`.
- `option.match` - Matches an `Option` to a value based on whether it is `Some` or `None`.

```ts
const someValue: Option<number> = Option.Some(42);

// Map a value
const doubled: Option<number> = someValue.map((x) => x * 2);
console.log(doubled.unwrap()); // 84

// FlatMap a value
const flatMapped: Option<number> = someValue.flatMap((x) => Option.Some(x * 2));
console.log(flatMapped.unwrap()); // 84

// Unwrap a value, or provide a default
const defaultValue = 0;
const unwrappedOr: number = someValue.unwrapOr(defaultValue);
console.log(unwrappedOr); // 42

// better yet - pattern match it!
const value: number = someValue.match({
  Some: (x) => x,
  None: () => 0,
});
```

### Collection Methods

The `Option` type also provides a set of collection methods that can be used to work with arrays of `Option` values.

- `traverse`
- `all`
- `any`

#### Traverse

`traverse` is used when you have a collection of values and a function that transforms each value into an `Option`. It applies the function to each element of the array and combines the resulting `Option` values into a single `Option` containing an array of the transformed values, if all the values were `Some`. If any of the values are `None`, the result will be a `None`.

Here's an example using traverse:

```ts
import { Option } from "./option";

const values = [1, 2, 3, 4, 5];

const isEven = (x) => x % 2 === 0;
const toEvenOption = (x) => (isEven(x) ? Option.Some(x) : Option.None());

const traversed: Option<number[]> = Option.traverse(values, toEvenOption);

console.log(traversed); // None, since not all values are even
```

In this example, we use the traverse function to apply toEvenOption to each value in the values array. Since not all values are even, the result is `None`.

#### all

`all` is used when you have an array of `Option` values and you want to combine them into a single `Option` containing an array of the unwrapped values, if all the values are `Some`. If any of the values are `None`, the result will be a `None`.

Here's an example using all:

```ts
import { Option } from "./option";

const options = [
  Option.Some(1),
  Option.Some(2),
  Option.None(),
  Option.Some(4),
  Option.Some(5),
];

const option: Option<number[]> = Option.all(options);

console.log(option); // None, since there's a None value in the array
```

In this example, we use the `all` function to combine the options array into a single `Option`. Since there's a `None` value in the array, the result is `None`.

In summary, `traverse` is used when you have an array of values and a function that turns each value into an `Option`, whereas `all` is used when you already have an array of `Option` values. Both functions return an `Option` containing an array of unwrapped values if all values are `Some`, or a `None` if any of the values are None.

#### Any

`any` is used when you have an array of `Option` values and you want to check if any of the values are `Some`. It returns the first `Some` value it finds, or `None` if none of the values are `Some`.

Here's an example using `any`:

```ts
import { Option } from "ftld";

const options = [
  Option.Some(1),
  Option.Some(2),
  Option.None(),
  Option.Some(4),
  Option.Some(5),
];

const any: Option<number> = Option.any(options);

console.log(any); // Some(1)
```

### Error Handling

The `tryCatch` function allows you to safely execute a function that might throw an error, converting the result into an `Option`.

```ts
let someCondition = true;
let value = 42;
type Value = number;
const tryCatchResult: Option<Value> = Option.tryCatch(() => {
  if (someCondition) throw new Error("Error message");
  return value;
});
console.log(tryCatchResult.isNone()); // true
```

## Result

The `Result` type is a useful way to handle computations that may error. Instead of callbacks or throw expressions, which are indirect and can cause confusion, the `Result` type enforces handling the presence of an error at the type level. It provides a set of useful methods for working with this form of branching logic.

`Result` can have one of two variants: `Ok` and `Err`. `Ok` represents the result of a computation that has succeeded, while `Err` represents the result of a computation that has failed.

### Methods

- `Result.from` - Converts value to a `Result`.
- `Result.fromPredicate` - Creates a `Result` from a predicate. Can narrow the type of the value.
- `Result.tryCatch` - Converts a value based on a computation that may throw.
- `Result.isOk` - Returns true if the result is `Ok`.
- `Result.isErr` - Returns true if the result is `Err`.
- `Result.Ok` - Creates an `Ok` instance.
- `Result.Err` - Creates an `Err` instance.
- `result.map` - Maps a value.
- `result.flatMap` - Maps the value over a function returning a new Result.
- `result.recover` - Maps the error over a function returning a new Result.
- `result.unwrap` - Unwraps a value. Throws if the result is `Err`.
- `result.unwrapOr` - Unwraps a value, or provides a default.
- `result.unwrapErr` - Unwraps an error. Throws if the result is `Ok`.
- `result.tap` - Executes a side effect.
- `result.tapErr` - Executes a side effect if the result is `Err`.
- `result.settle` - converts a result to a object representing the result of a computation.

```ts
const result: Result<string, number> = Result.Ok<string, number>(42);

// Map a value
const doubled: Result<string, number> = result.map((x) => x * 2);
console.log(doubled.unwrap()); // 84

// FlatMap a value
const flatMapped: Result<string, number> = result.flatMap((x) =>
  Result.Ok(x * 2)
);
console.log(flatMapped.unwrap()); // 84

// Unwrap a value, or provide a default
const defaultValue = 0;
const unwrappedOr: number = result.unwrapOr(defaultValue);
console.log(unwrappedOr); // 42

// better yet - pattern match
const value: number = result.match({
  Ok: (x) => x,
  Err: (x) => 0,
});
```

### Collection Methods

The `Result` type also provides a set of methods for working with arrays of `Result` values:

- `traverse`
- `all`
- `any`
- `coalesce`
- `validate`
- `settle`

#### Traverse

```ts
const values = [1, 2, 3, 4, 5];

const isEven = (x) => x % 2 === 0;
const toEvenResult = (x) =>
  isEven(x)
    ? Result.Ok<string, number>(x)
    : Result.Err<string, number>("Value is not even");

const traversed: Result<string, number[]> = Result.traverse(
  values,
  toEvenResult
);

console.log(traversed); // Err('Value is not even'), since not all values are even
```

In this example, we use the traverse function to apply `toEvenResult` to each value in the values array. Since not all values are even, the result is `Err`.

#### all

```ts
const results = [
  Result.Ok<string, number>(1),
  Result.Ok<string, number>(2),
  Result.Err<string, number>("oops!"),
  Result.Ok<string, number>(4),
  Result.Ok<string, number>(5),
];

const result: Result<string, number[]> = Result.all(results);

console.log(result); // Err('oops!'), since there's an Err value in the array
```

#### Any

`any` is used when you have an array of `Result` values and you want to check if any of the values are `Ok`. It returns the first `Ok` value it finds, or `Err` if none of the values are `Ok`.

Here's an example using `any`:

```ts
import { Result } from "ftld";

const results = [
  Result.Ok<string, number>(1),
  Result.Ok<string, number>(2),
  Result.Err<string, number>("oops!"),
  Result.Ok<string, number>(4),
  Result.Ok<string, number>(5),
];

const any: Result<string, number> = Result.any(results);

console.log(any); // Ok(1)
```

#### Coalesce

`coalesce` is used when you have an array of `Result` values and you want to convert them into a single `Result` value while also keeping each error. It aggregates both the errors and the values into a single `Result` value.

Here's an example using `coalesce`:

```ts
import { Result } from "ftld";

const results = [
  Result.Ok<string, number>(1),
  Result.Err<SomeError, number>(new SomeError()),
  Result.Err<OtherError, number>(new OtherError()),
  Result.Ok<string, number>(4),
  Result.Ok<string, number>(5),
];

const coalesced: Result<(SomeError | OtherError | string)[], number[]> =
  Result.coalesce(results);

console.log(coalesced); // Err([new SomeError(), new OtherError()])
```

#### Validate

`validate` is used when you have an array of results with the same Ok value and you want to convert them into a single `Result` value. It aggregates the errors and the first Ok value into a single `Result` value.

It's similar to `coalesce`, but it only returns the first Ok value if there are no errors, rather than aggregating all of them.

Here's an example using `validate`:

```ts
import { Result } from "ftld";

const value = 2;

const isEven = (x) => x % 2 === 0;
const isPositive = (x) => x > 0;

const validations = [
  Result.fromPredicate(value, isEven, (value) => new NotEvenError(value)),
  Result.fromPredicate(
    value,
    isPositive,
    (value) => new NotPositiveError(value)
  ),
];

const validated: Result<(NotEvenError | NotPositiveError)[], number> =
  Result.validate(validations);

console.log(validated); // Ok(2)
```

#### Settle

`settle` is special in that it does not return a Result. Instead it returns a collection of `SettledResult` values, which are either `{type: "Ok", value: T}` or `{type: "Error", error: E}`. This is useful when you want to handle both the Ok and Err cases, but don't want to aggregate them into a single `Result` value.

```ts
import { Result, SettledResult } from "ftld";

const results = [
  Result.Ok<string, number>(1),
  Result.Err<SomeError, number>(new SomeError()),
  Result.Err<OtherError, number>(new OtherError()),
  Result.Ok<string, number>(4),
  Result.Ok<string, number>(5),
];

const settled: SettledResult<SomeError | OtherError, number>[] =
  Result.settle(results); // [{type: "Ok", value: 1}, {type: "Err", error: new SomeError()}, {type: "Err", error: new OtherError()}, {type: "Ok", value: 4}, {type: "Ok", value: 5}]
```

### Error Handling

The `tryCatch` function allows you to safely execute a function that might throw an error, converting the result into an `Result`.

```ts
const tryCatchResult: Result<Error, never> = Result.tryCatch(() => {
  throw new Error('Error message');
}, (error) => error as Error));
console.log(tryCatchResult.isErr()); // true
```

## Task

`Task` represents a lazy computation that may fail. It will always return a `Result` value, either `Ok` or `Err`. If the computation is asynchronous, running it (`.run`) will return a `Promise` that resolves to a `Result` value. This means a task can be synchronous or asynchronous.

> Key differences to `Promise`:
>
> - `Task` is lazy, meaning it won't start executing until you call `run` or await it.
> - `Task` will never throw an error, instead it will return an `Err` value.

### Usage

Here are some examples of how to use the `Task` type and its utility functions:

```typescript
import { Task, unknown } from "ftld";

const task: AsyncTask<unknown, number> = Task.from(async () => {
  return 42;
});
console.log(await task.run()); // Result.Ok(42)

const errTask: SyncTask<string, never> = Result.Err("oops");

const res: Result<string, never> = errTask.run();

console.log(res.isErr()); // true
```

### Methods

- `Task.from` - Creates a `Task` from a `Promise` or a function that returns a `Promise`.
- `Task.fromPredicate` - Creates a `Task` from a predicate function. Can narrow the type of the value.
- Task.sleep - Creates a `Task` that resolves after a specified number of milliseconds.
- `task.map` - Maps the value of a `Task` to a new value.
- `task.mapErr` - Maps the error of a `Task` to a new error.
- `task.flatMap` - Maps the value of a `Task` to a new `Task`.
- `task.recover` - Maps the error of a `Task` to a new `Task`.
- `task.tap` - Runs a function on the value of a `Task` without changing the value.
- `task.tapErr` - Runs a function on the error of a `Task` without changing the error.
- `task.run` - Runs the `Task` and returns a `Promise` that resolves to a `Result`.
- `task.match` - Runs an object of cases against the `Result` value of a `Task`.
- `task.schedule` - Schedules the `Task` by the provided options. This always returns an asynchronous `Task`.

```ts
const someValue: Result<unknown, number> = await Task.from(
  async () => 42
).run();
const someOtherValue: Result<unknown, number> = await Task.from(
  async () => 84
).run();

// Map a value
const doubled: SyncTask<unknown, number> = Task.from(42).map((x) => x * 2);
// you can also call .run() to get the Promise as well
console.log(doubled.run()); // Result.Ok(84)

const flatMapped: SyncTask<unknown, number> = Task.from(42).flatMap((x) =>
  Task.from(x * 2)
);
console.log(flatMapped.run()); // 84

// if the task is syncronous - you can use unwrap like you would with a Result
const result: SyncTask<unknown, number> = Task.from(42);
console.log(result); // Result.Ok(42)
console.log(result.unwrap()); // 42
```

### Scheduling

The `Task` instance also allows for managing the scheduling of the computation.
The result of a scheduled task is always asynchronous.
It provides the following options:

- `timeout`: The number of milliseconds to wait before timing out the task.
- `delay`: The number of milliseconds to delay the execution of the task.
- `retry`: The number of times to retry the task if it fails.
- `repeat`: The number of times to repeat the task if it succeeds.

Each option (except `timeout`) can be a number, boolean, or a function that returns a number or boolean or even a promise that resolves to a number or boolean.

```ts
import { Task, TaskTimeoutError, TaskSchedulingError } from "ftld";

const task: SyncTask<Error, number> = Task.from(() => {
  if (Math.random() > 0.5) {
    return 42;
  } else {
    throw new Error("oops");
  }
});

const delayed: AsyncTask<Error, number> = task.schedule({
  delay: 1000,
});

const timedOut: AsyncTask<Error | TaskTimeoutError, number> = task.schedule({
  timeout: 1000,
});

const retried: AsyncTask<Error, number> = task.schedule({
  retry: 3,
});

const customRetry: AsyncTask<Error | TaskSchedulingError, number> = task.schedule({
  retry: (attempt, err) => {
    if (err instanceof Error) {
      return 3;
    }
    return 0;
  },
});

const exponentialBackoff: AsyncTask<Error | TaskSchedulingError, number> = task.schedule({
  retry: 5,
  delay: (retryAttempt) => 2 ** retryAttempt * 1000,
});

const repeated: AsyncTask<Error, number> = task.schedule({
  repeat: 3,
});

const customRepeat: AsyncTask<Error | TaskSchedulingError, number> = task.schedule({
  repeat: (attempt, value) => {
    if (value === 42) {
      return 3;
    }
    return false;
  },
});

// both repeat/retry can take a promise as well
const repeatUntil: AsyncTask<Error | TaskSchedulingError, number> = task.schedule({
  retry: async (attempt, err) => {
    retrun await shouldRetry();
  },
  repeat: async (attempt, value) => {
    return await jobIsDone();
  },
});
```

### Collection Methods

The `Task` type provides several methods for working with arrays of `Task` values:

- `traverse`
- `traversePar`
- `any`
- `sequential`
- `parallel`
- `race`
- `coalesce`
- `coalescePar`
- `settle`
- `settlePar`

#### Parallel

`parallel` allows you to run multiple tasks in parallel and combine the results into a single `Task` containing an array of the unwrapped values, if all the tasks were successful. If any of the tasks fail, the result will be a `Err`. This is always asynchronous.

Here's an example using parallel:

```ts
const tasks = [
  Task.sleep(1000).map(() => 1),
  Task.sleep(1000).map(() => 2),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const parallel: AsyncTask<unknown, number[]> = Task.parallel(tasks);

console.log(await parallel.run()); // Result.Ok([1, 2, 3, 4, 5])
```

in this example, we use the `parallel` function to run all tasks in parallel and combine the results into a single `Task`. Since all tasks are successful, the result is `Ok`.

#### Sequential

`sequential` allows you to run multiple tasks sequentially and combine the results into a single `Task` containing an array of the unwrapped values, if all the tasks were successful. If any of the tasks fail, the result will be a `Err`. This is synchronous if all tasks are synchronous.

Here's an example using sequential:

```ts
const syncTasks = [
  Task.from(() => 1),
  Task.from(() => 2),
  Task.from(() => 3),
  Task.from(() => 4),
  Task.from(() => 5),
];
const asyncTasks = [
  Task.sleep(1000).map(() => 1),
  Task.sleep(1000).map(() => 2),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const sync: SyncTask<unknown, number[]> = Task.sequential(syncTasks);
const async: AsyncTask<unknown, number[]> = Task.sequential(asyncTasks);

console.log(sync.run()); // Result.Ok([1, 2, 3, 4, 5])
console.log(await async.run()); // Result.Ok([1, 2, 3, 4, 5])
```

#### Race

`race` allows you to run multiple tasks in parallel and combine the results into a single `Task` containing the unwrapped value of the first settled task. This is always asynchronous.

```ts
const tasks = [
  Task.sleep(1000).map(() => 1),
  Task.sleep(500).map(() => 2),
  Task.sleep(2000).map(() => 3),
  Task.sleep(10).flatMap(() => Result.Err(new Error("oops"))),
];

const res: AsycTask<Error, number> = Task.race(tasks);

console.log(await res.run()); // Result.Err(Error('oops!'))
```

#### Traverse

`traverse` allows you convert items in a collection into a collection of tasks sequentially and combine the results into a single `Task` containing an array of the unwrapped values, if all the tasks were successful. If any of the tasks fail, the result will be a `Err`. This is synchronous if all tasks are synchronous.

```ts
const makeAsyncTask = (x: number) => Task.sleep(x * 2).map(() => x * 2);
const makeSyncTask = (x: number) => Task.from(() => x * 2);
const async: AsyncTask<unknown, number[]> = Task.traverse(
  [1, 2, 3, 4, 5],
  makeAsyncTask
);
const sync: SyncTask<unknown, number[]> = Task.traverse(
  [1, 2, 3, 4, 5],
  makeSyncTask
);

console.log(await async.run()); // Result.Ok([2, 4, 6, 8, 10])
console.log(sync.run()); // Result.Ok([2, 4, 6, 8, 10])
```

#### TraversePar

The parallel version of `traverse`. This is always asynchronous.

```ts
const traversePar: AsyncTask<unknown, number[]> = Task.traversePar(
  [1, 2, 3, 4, 5],
  (x) => Task.sleep(x * 2).map(() => x * 2)
);

console.log(await traversePar.run()); // Result.Ok([2, 4, 6, 8, 10])
```

#### Any

`any` allows you to take a collection of tasks and find the first successful task. If all tasks fail, the result will be a `Err`. This is synchronous if all tasks are synchronous.

```ts
const syncTasks = [
  Task.from(() => Result.Err(new Error("oops"))),
  Task.from(() => Result.Err(new Error("oops"))),
  Task.from(() => 3),
  Task.from(() => 4),
  Task.from(() => 5),
];
const asyncTasks = [
  Task.sleep(1000).flatMap(() => Result.Err(new Error("oops"))),
  Task.sleep(1000).flatMap(() => Result.Err(new Error("oops"))),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const asyncAny: AsyncTask<Error, number> = Task.any(asyncTasks);
const syncAny: SyncTask<Error, number> = Task.any(syncTasks);

console.log(await asyncAny.run()); // Result.Ok(3)
console.log(sync.run()); // Result.Ok(3)
```

#### Coalesce

`coalesce` allows you to take a collection of tasks and aggregate the results into a single Task. If any tasks fail, the result will be a `Err`, with a collection of all the errors. This is synchronous if all tasks are synchronous.

```ts
const syncTasks = [
  Task.from(() => Result.Err(new SomeError())),
  Task.from(() => Result.Err(new OtherError())),
  Task.from(() => 3),
  Task.from(() => 4),
  Task.from(() => 5),
];
const asyncTasks = [
  Task.sleep(1000).flatMap(() => Result.Err(new SomeError())),
  Task.sleep(1000).flatMap(() => Result.Err(new OtherError())),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const asyncCoalesce: AsyncTask<(SomeError | OtherError)[], number[]> =
  Task.coalesce(asyncTasks);
const syncCoalesce: SyncTask<(SomeError | OtherError)[], number[]> =
  Task.coalesce(syncTasks);

console.log(await coalesce.run()); // Result.Err([SomeError, OtherError])
console.log(sync.run()); // Result.Err([SomeError, OtherError])
```

#### CoalescePar

The parallel version of `coalesce`. This is always asynchronous.

```ts
const tasks = [
  Task.sleep(1000).flatMap(() => Result.Err(new SomeError())),
  Task.sleep(1000).flatMap(() => Result.Err(new OtherError())),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const coalescePar: AsyncTask<(SomeError | OtherError)[], number[]> =
  Task.coalescePar(tasks);

console.log(await coalescePar.run()); // Result.Err([SomeError, OtherError])
```

#### Settle

`settle` allows you to take a collection of tasks and aggregate the results into a `SettledTask`, similar to the `Result` type. This is synchronous if all tasks are synchronous.

```ts
import { Task, SettledResult } from "ftld";

const syncTasks = [
  Task.from(() => Result.Err(new SomeError())),
  Task.from(() => Result.Err(new OtherError())),
  Task.from(() => 3),
  Task.from(() => 4),
  Task.from(() => 5),
];
const asyncTasks = [
  Task.sleep(1000).flatMap(() => Result.Err(new SomeError())),
  Task.sleep(1000).flatMap(() => Result.Err(new OtherError())),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const asyncSettled: SettledResult<SomeError | OtherError | Error, number>[] =
  await Task.settle(asyncTasks);
const syncSettled: SettledResult<SomeError | OtherError | Error, number>[] =
  Task.settle(syncTasks);
```

#### SettlePar

The parallel version of `settle`. This is always asynchronous.

```ts
import { Task, SettledResult } from "ftld";

const tasks = [
  Task.sleep(1000).flatMap(() => Result.Err(new SomeError())),
  Task.sleep(1000).flatMap(() => Result.Err(new OtherError())),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const settle: SettledResult<SomeError | OtherError | Error, number>[] =
  await Task.settlePar(tasks);
```

## Do

`Do` is a utility that allows you to unwrap monadic values in a synchronous manner. Provides the same benefits as async/await but for all types in ftld, albeit with a more cumbersome syntax.

It handles `Task`, `Result`, `Option`, and even `Promise` types. It always returns a `Task`, which will be synchronous if all the computations are synchronous, or asynchronous if any of the computations are asynchronous.

```ts
import { Do, Task, Result, UnwrapNoneError, unknown } from "ftld";

// without Do you get nesting hell
function doSomething(): SyncTask<unknown, unknown> {
  return Task.from(() => {
    //...
  }).flatMap(() => {
    //...
    return Task.from().flatMap(() => {
      //...
      return Task.flatMap(() => {
        //...
        return Task.from().flatMap(() => {
          //...
        });
      });
    });
  });
}

// if there are any async computations, it will return an Async Task
function doSomething(): AsyncTask<
  SomeError | OtherError | UnwrapNoneError, // <-- notice how the Option type has an error type
  number
> {
  return Do(function* () {
    const a: number = yield* Result.from(
      () => 1,
      () => new SomeError()
    );

    // async!
    const b: number = yield* Task.from(
      async () => 2,
      () => new OtherError()
    );

    const c: number = yield* Option.from(3 as number | null);

    return a + b + c;
  });
}

// if there are no async computations, it will return a sync Task
function doSomething(): SyncTask<
  SomeError | OtherError | UnwrapNoneError,
  number
> {
  return Do(function* ($) {
    const a: number = yield* Result.from(
      () => 1,
      () => new SomeError()
    );

    const b: number = yield* Result.from(
      () => 2,
      () => new OtherError()
    );

    const c: number = yield* Option.from(3 as number | null);

    return a + b + c;
  });
}
```

## Recipes

Here's a list of useful utilities, but don't justify an increase in bundle size.

### Wrapping Zod

It's common to want to wrap a validation library like Zod in a Result type. Here's an example of how to do that:

```ts
import { Result } from "ftld";
import { z } from "zod";

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

const emailSchema = wrapZod(z.string().email());

const email: Result<z.ZodIssue[], string> = emailSchema("test");
const emailWithCustomError: Result<CustomError, string> = emailSchema(
  "test",
  () => new CustomError()
);
```

### Taskify

You might have an API (like node:fs) that uses promises, but you want to use Tasks instead. You can create a `taskify` function to convert a promise-based API into a Task-based API.

```ts
import { Task } from "ftld";
import * as fs from "fs/promises";

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

// usage
const readFile = taskify(fs.readFile);
// overloads preserved!
readFile("path", "utf8")
  .map((content) => {
    return content.toUpperCase();
  })
  .run();
const taskFs = taskify(fs);
// overloads preserved!
taskFs
  .readFile("path", "utf8")
  .map((string) => string.toUpperCase())
  .run();
```

### Brand

The `Brand` type is a wrapper around a value that allows you to create a new type from an existing type. It's useful for creating new types that are more specific than the original type, such as `Email` or `Password`.

```ts
// credit to EffectTs/Data/Brand
import { Result } from "./result";

// @ts-expect-error
export const Brand: {
  /**
   * Create a validated brand constructor that checks the value using the provided validation function.
   */
  <E, TBrand>(
    validate: (value: Unbrand<TBrand>) => boolean,
    onErr: (value: Unbrand<TBrand>) => E
  ): ValidatedBrandConstructor<E, TBrand>;

  /**
   * Create a nominal brand constructor.
   */
  <TBrand>(): NominalBrandConstructor<TBrand>;

  /**
   * Compose multiple brand constructors into a single brand constructor.
   */
  compose<
    TBrands extends readonly [
      BrandConstructor<any, any>,
      ...BrandConstructor<any, any>[]
    ]
  >(
    ...brands: EnsureCommonBase<TBrands>
  ): ComposedBrandConstructor<
    {
      [B in keyof TBrands]: PickErrorFromBrandConstructor<TBrands[B]>;
    }[number],
    UnionToIntersection<
      { [B in keyof TBrands]: PickBrandFromConstructor<TBrands[B]> }[number]
    > extends infer X extends Brand<any>
      ? X
      : Brand<any>
  >;
} = (validate, onErr) => (value) => {
  if (validate) {
    return Result.fromPredicate(value, validate, onErr);
  }
  return value;
};

Brand.compose =
  (...brands) =>
  (value) => {
    const results = brands.map((brand) => brand(value));

    return Result.validate(results as any) as any;
  };

type EnsureCommonBase<
  TBrands extends readonly [
    BrandConstructor<any, any>,
    ...BrandConstructor<any, any>[]
  ]
> = {
  [B in keyof TBrands]: Unbrand<
    PickBrandFromConstructor<TBrands[0]>
  > extends Unbrand<PickBrandFromConstructor<TBrands[B]>>
    ? Unbrand<PickBrandFromConstructor<TBrands[B]>> extends Unbrand<
        PickBrandFromConstructor<TBrands[0]>
      >
      ? TBrands[B]
      : TBrands[B]
    : "ERROR: All brands should have the same base type";
};

declare const BrandSymbol: unique symbol;

type BrandId = typeof BrandSymbol;

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never;

type Brands<P> = P extends Brander<any>
  ? UnionToIntersection<
      {
        [k in keyof P[BrandId]]: k extends string | symbol ? Brander<k> : never;
      }[keyof P[BrandId]]
    >
  : never;

export type Unbrand<P> = P extends infer Q & Brands<P> ? Q : P;

export type Brand<A, K extends string | symbol = typeof BrandSymbol> = A &
  Brander<K>;

export namespace Brand {
  export type Infer<A> = A extends Brand<infer B>
    ? B
    : A extends BrandConstructor<unknown, infer B>
    ? B
    : never;
}

interface Brander<in out K extends string | symbol> {
  readonly [BrandSymbol]: {
    readonly [k in K]: K;
  };
}

type NominalBrandConstructor<A> = (value: Unbrand<A>) => A;

type ValidatedBrandConstructor<E, A> = (value: Unbrand<A>) => Result<E, A>;

type ComposedBrandConstructor<E, A> = (value: Unbrand<A>) => Result<E[], A>;

type BrandConstructor<E, A> =
  | NominalBrandConstructor<A>
  | ValidatedBrandConstructor<E, A>
  | ComposedBrandConstructor<E, A>;

type PickErrorFromBrandConstructor<BC> = BC extends BrandConstructor<
  infer E,
  infer _A
>
  ? E
  : never;

type PickBrandFromConstructor<BC> = BC extends BrandConstructor<
  infer _E,
  infer A
>
  ? A
  : never;
```

```ts
import { Brand } from "./brand";

type Email = Brand<string, "Email">;

const Email = Brand<Email>();

const email: Email = Email("email@provider.com");
```

You can go further by refining the type to only allow valid email addresses:

```ts
type Email = Brand<string, "Email">;

const Email = Brand<Error, Email>(
  (value) => {
    return value.includes("@");
  },
  (value) => {
    return new Error(`Invalid email address: ${value}`);
  }
);

const email: Result<Error, Email> = Email("test@provider.com");
```

It is also composable, meaning you can create brands as the result of other brands:

```ts
type Int = Brand<number, "Int">;
type PositiveNumber = Brand<number, "PositiveNumber">;

class InvalidIntegerError extends Error {
  constructor(value: number) {
    super(`Invalid integer: ${value}`);
  }
}

const Int = Brand<InvalidIntegerError, Int>(
  (value) => {
    return Number.isInteger(value);
  },
  (value) => {
    return new InvalidIntegerError(value);
  }
);

class InvalidPositiveNumberError extends Error {
  constructor(value: number) {
    super(`Invalid positive number: ${value}`);
  }
}

const PositiveNumber = Brand<InvalidPositiveNumberError, PositiveNumber>(
  (value) => {
    return value > 0;
  },
  (value) => {
    return new InvalidPositiveNumberError(value);
  }
);

type PositiveInt = Int & PositiveNumber;

const PositiveInt = Brand.compose(Int, PositiveNumber);

const positiveInt: Result<
  (InvalidIntegerError | InvalidPositiveNumberError)[],
  PositiveInt
> = PositiveInt(42);
```
