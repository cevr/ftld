`ftld` is a small, focused, library that provides a set of functional primitives for building robust and resilient applications in TypeScript.

[![ftld's badge](https://deno.bundlejs.com/?q=ftld&badge=simple)](https://bundlejs.com/?q=ftld)

# Why

Functional programming is a style of programming that emphasizes safety and composability. It's a powerful paradigm that can help you write more concise, readable, and maintainable code. However, it can be difficult to get started with functional programming in TypeScript. There are many libraries that provide functional programming primitives, but they often have a large API surface area and can be difficult to learn.

`ftld` on the other hand is:

- 🟢 tiny (3kb minified and gzipped)
- 📦 tree-shakeable
- 🕺 pragmatic
- 🔍 focused (it provides a small set of primitives)
- 🧠 easy to learn (it has a small API surface area)
- 🎯 easy to use (it's written in TypeScript and has first-class support for TypeScript)
- 🤝 easy to integrate
- 🎉 provides all around great DX

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

- `Option`
- `Result`
- `Task`
- `Brand`
- `Do`

> Note: every collection method can take both an array and an object as input. The output type will be inferred based on the input type.

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
- `option.result` - Converts an `Option` to a `Result`.
- `option.task` - Converts an `Option` to a `Task`.
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

- `traverse`
- `all`
- `any`

#### Traverse

`traverse` is used when you have a collection of values and a function that transforms each value into an `Option`. It applies the function to each element of the array and combines the resulting `Option` values into a single `Option` containing an array of the transformed values, if all the values were `Some`. If any of the values are `None`, the result will be a `None`.

Here's an example using traverse:

```ts
import { Option } from "./option";

const values = [1, 2, 3, 4, 5];
const recordValues = {
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
};

const isEven = (x) => x % 2 === 0;
const toEvenOption = (x) => (isEven(x) ? Option.Some(x) : Option.None());

const traversed: Option<number[]> = Option.traverse(values, toEvenOption);
const traversedRecord: Option<Record<string, number>> = Option.traverse(
  recordValues,
  toEvenOption
);

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
- `result.task` - Converts a result to a task.
- `result.option` - Converts a result to an option.
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

The result type also provides a set of methods for working with arrays of `Result` values:

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

The `Task` is an alternative to the `Promise` constructor that allows you to encode the error type in the return type. It provides a set of useful methods for working with asynchronous computations in a synchronous manner while also being lazy. Since it encodes the notion of failure into the type system, you can't forget to handle errors. It resolves to a `Result` type, which can be either `Ok` or `Err`.

> Key differences to `Promise`:
>
> - `Task` is lazy, meaning it won't start executing until you call `run` or await it.
> - `Task` will never throw an error, instead it will return an `Err` value.

### Usage

Here are some examples of how to use the `Task` type and its utility functions:

```typescript
import { Task } from "ftld";

const task: Task<unknown, number> = Task.from(async () => {
  return 42;
});
console.log(await task.run()); // Result.Ok(42)

const errTask: Task<string, unknown> = Task.Err("oops");

const res = await errTask.run();

console.log(res.isErr()); // true
```

### Methods

- `Task.from` - Creates a `Task` from a `Promise` or a function that returns a `Promise`.
- `Task.fromPredicate` - Creates a `Task` from a predicate function. Can narrow the type of the value.
- `Task.Ok` - Creates a `Task` that resolves to an `Ok` value.
- `Task.Err` - Creates a `Task` that resolves to an `Err` value.
- `task.map` - Maps the value of a `Task` to a new value.
- `task.mapErr` - Maps the error of a `Task` to a new error.
- `task.flatMap` - Maps the value of a `Task` to a new `Task`.
- `task.recover` - Maps the error of a `Task` to a new `Task`.
- `task.mapResult` - Maps the inner `Result` value of a `Task` to a new `Result` or `Task`.
- `task.tap` - Runs a function on the value of a `Task` without changing the value.
- `task.tapErr` - Runs a function on the error of a `Task` without changing the error.
- `task.tapResult` - Runs a function on the inner `Result` value of a `Task` without changing the value.
- `task.run` - Runs the `Task` and returns a `Promise` that resolves to a `Result`.
- `task.match` - Runs an object of cases against the `Result` value of a `Task`.
- `task.schedule` - Schedules the `Task` by the provided options.

```ts
// you can await a Task like a Promise
const someValue: Task<unknown, number> = await Task.from(42);
const someOtherValue: Task<unknown, number> = await Task.from(84);

// Map a value
const doubled: Task<unknown, number> = Task.from(42).map((x) => x * 2);
// you can also call .run() to get the Promise as well
console.log(await doubled.run()); // 84

const flatMapped: Task<unknown, number> = Task.from(42).flatMap((x) =>
  Task.from(x * 2)
);
console.log(await flatMapped.run()); // 84

// unwrap a value by awaiting the Task
const result: Task<unknown, number> = await Task.from(42);
console.log(result); // Result.Ok(42)
console.log(result.unwrap()); // 42
```

### Scheduling

The `Task` instance also allows for managing the scheduling of the computation.
It provides the following options:

- `timeout`: The number of milliseconds to wait before timing out the task.
- `delay`: The number of milliseconds to delay the execution of the task.
- `retry`: The number of times to retry the task if it fails.
- `repeat`: The number of times to repeat the task if it succeeds.

Each option (except `timeout`) can be a number, boolean, or a function that returns a number or boolean or even a promise that resolves to a number or boolean.

```ts
import { Task, TaskTimeoutError, TaskSchedulingError } from "ftld";

const task: Task<Error, number> = Task.from(() => {
  if (Math.random() > 0.5) {
    return 42;
  } else {
    throw new Error("oops");
  }
});

const delayed: Task<Error, number> = task.schedule({
  delay: 1000,
});

const timedOut: Task<Error | TaskTimeoutError, number> = task.schedule({
  timeout: 1000,
});

const retried: Task<Error, number> = task.schedule({
  retry: 3,
});

const customRetry: Task<Error | TaskSchedulingError, number> = task.schedule({
  retry: (attempt, err) => {
    if (err instanceof Error) {
      return 3;
    }
    return 0;
  },
});

const exponentialBackoff: Task<Error | TaskSchedulingError, number> = task.schedule({
  retry: 5,
  delay: (retryAttempt) => 2 ** retryAttempt * 1000,
});

const repeated: Task<Error, number> = task.schedule({
  repeat: 3,
});

const customRepeat: Task<Error | TaskSchedulingError, number> = task.schedule({
  repeat: (attempt, value) => {
    if (value === 42) {
      return 3;
    }
    return false;
  },
});

// both repeat/retry can take a promise as well
const repeatUntil: Task<Error | TaskSchedulingError, number> = task.schedule({
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

`parallel` allows you to run multiple tasks in parallel and combine the results into a single `Task` containing an array of the unwrapped values, if all the tasks were successful. If any of the tasks fail, the result will be a `Err`.

Here's an example using parallel:

```ts
const tasks = [
  Task.sleep(1000).map(() => 1),
  Task.sleep(1000).map(() => 2),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const parallel: Task<unknown, number[]> = Task.parallel(tasks);

console.log(await parallel.run()); // Result.Ok([1, 2, 3, 4, 5])
```

in this example, we use the `parallel` function to run all tasks in parallel and combine the results into a single `Task`. Since all tasks are successful, the result is `Ok`.

#### Sequential

`sequential` allows you to run multiple tasks sequentially and combine the results into a single `Task` containing an array of the unwrapped values, if all the tasks were successful. If any of the tasks fail, the result will be a `Err`.

Here's an example using sequential:

```ts
const tasks = [
  Task.sleep(1000).map(() => 1),
  Task.sleep(1000).map(() => 2),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const sequential: Task<unknown, number[]> = Task.sequential(tasks);

console.log(await sequential.run()); // Result.Ok([1, 2, 3, 4, 5])
```

#### Race

`race` allows you to run multiple tasks in parallel and combine the results into a single `Task` containing the unwrapped value of the first settled task.

```ts
const tasks = [
  Task.sleep(1000).map(() => 1),
  Task.sleep(500).map(() => 2),
  Task.sleep(2000).map(() => 3),
  Task.sleep(10).flatMap(() => Task.Err(new Error("oops"))),
];

const res: Task<Error, number> = Task.race(tasks);

console.log(await res.run()); // Result.Err(Error('oops!'))
```

#### Traverse

`traverse` allows you convert items in a collection into a collection of tasks sequentially and combine the results into a single `Task` containing an array of the unwrapped values, if all the tasks were successful. If any of the tasks fail, the result will be a `Err`.

```ts
const traverse: Task<unknown, number[]> = Task.traverse([1, 2, 3, 4, 5], (x) =>
  Task.sleep(x * 2).map(() => x * 2)
);

console.log(await traverse.run()); // Result.Ok([2, 4, 6, 8, 10])
```

#### TraversePar

The parallel version of `traverse`.

```ts
const traversePar: Task<unknown, number[]> = Task.traversePar(
  [1, 2, 3, 4, 5],
  (x) => Task.sleep(x * 2).map(() => x * 2)
);

console.log(await traversePar.run()); // Result.Ok([2, 4, 6, 8, 10])
```

#### Any

`any` allows you to take a collection of tasks and find the first successful task. If all tasks fail, the result will be a `Err`.

```ts
const tasks = [
  Task.sleep(1000).flatMap(() => Task.Err(new Error("oops"))),
  Task.sleep(1000).flatMap(() => Task.Err(new Error("oops"))),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const any: Task<Error, number> = Task.any(tasks);

console.log(await any.run()); // Result.Ok(3)
```

#### Coalesce

`coalesce` allows you to take a collection of tasks and aggregate the results into a single Task. If any tasks fail, the result will be a `Err`, with a collection of all the errors.

```ts
const tasks = [
  Task.sleep(1000).flatMap(() => Task.Err(new SomeError())),
  Task.sleep(1000).flatMap(() => Task.Err(new OtherError())),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const coalesce: Task<(SomeError | OtherError)[], number[]> =
  Task.coalesce(tasks);

console.log(await coalesce.run()); // Result.Err([SomeError, OtherError])
```

#### CoalescePar

The parallel version of `coalesce`.

```ts
const tasks = [
  Task.sleep(1000).flatMap(() => Task.Err(new SomeError())),
  Task.sleep(1000).flatMap(() => Task.Err(new OtherError())),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const coalescePar: Task<(SomeError | OtherError)[], number[]> =
  Task.coalescePar(tasks);

console.log(await coalescePar.run()); // Result.Err([SomeError, OtherError])
```

#### Settle

`settle` allows you to take a collection of tasks and aggregate the results into a `SettledTask`, similar to the `Result` type.

```ts
import { Task, SettledResult } from "ftld";

const tasks = [
  Task.sleep(1000).flatMap(() => Task.Err(new SomeError())),
  Task.sleep(1000).flatMap(() => Task.Err(new OtherError())),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const settle: SettledResult<SomeError | OtherError | Error, number>[] =
  await Task.settle(tasks);
```

#### SettlePar

The parallel version of `settle`.

```ts
import { Task, SettledResult } from "ftld";

const tasks = [
  Task.sleep(1000).flatMap(() => Task.Errnew SomeError())),
  Task.sleep(1000).flatMap(() => Task.Errnew OtherError())),
  Task.sleep(1000).map(() => 3),
  Task.sleep(1000).map(() => 4),
  Task.sleep(1000).map(() => 5),
];

const settle: SettledResult<SomeError | OtherError | Error, number>[] =
  await Task.settle(tasks);
```

## Do

`Do` is a utility that allows you to unwrap monadic values in a synchronous manner. It's useful for working with `Task` and `Result` types, but can be used with any monadic type. Provides the same benefits as async/await, albeit with a more cumbersome syntax.

```ts
import { Do, Task, Result } from "ftld";
// non Do

function doSomething() {
  return Task.from(() => {
    //...
  })
    .flatMap(() => {
      //...
    })
    .flatMap(() => {
      //...
    })
    .flatMap(() => {
      //...
    });
}

// Do
function doSomething() {
  return Do(async function* ($) {
    const a = yield* $(
      Task.from(() => {
        //...
      })
    );

    const b = yield* $(
      Task.from(() => {
        //...
      })
    );

    const c = yield* $(
      Task.from(() => {
        //...
      })
    );

    return Task.from(() => {
      //...
    });
  });
}

// non async Do

function doSomething() {
  return Do(function* ($) {
    const a = yield* $(
      Result.from(() => {
        //...
      })
    );

    const b = yield* $(
      Result.from(() => {
        //...
      })
    );

    const c = yield* $(
      Result.from(() => {
        //...
      })
    );

    return a + b + c;
  });
}
```

## Brand

The `Brand` type is a wrapper around a value that allows you to create a new type from an existing type. It's useful for creating new types that are more specific than the original type, such as `Email` or `Password`.

```ts
import { Brand } from "ftld";

type Email = Brand<string, "Email">;

const Email = Brand<Email>();

const email: Email = Email("email@provider.com");
```

You can go further by refining the type to only allow valid email addresses:

```ts
import { Brand } from "ftld";

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
import { Brand } from "ftld";

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
