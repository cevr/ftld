`ftld` is a small, focused, library that provides a set of functional primitives for building robust and resilient applications in TypeScript.

# Why

Functional programming is a style of programming that emphasizes safety and composability. It's a powerful paradigm that can help you write more concise, readable, and maintainable code. However, it can be difficult to get started with functional programming in TypeScript. There are many libraries that provide functional programming primitives, but they often have a large API surface area and can be difficult to learn.

`ftld` on the other hand is:

- 🟢 tiny (less than 2kb minified and gzipped)
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

`ftld` provides the following types:

- `Option`
- `Result`
- `Task`
- `Brand`

## Option

The `Option` type is a useful way to handle values that might be absent. Instead of using `null` or `undefined`, which can lead to runtime errors, the `Option` type enforces handling the absence of a value at the type level. It provides a set of useful methods for working with optional values.

`Option` can have one of two variants: `Some` and `None`. `Some` represents a value that exists, while `None` represents an absence of value.

The provided code defines the `Option` type and its variants, along with several utility functions for working with optional values.

Here are some examples of how to use the `Option` type and its utility functions:

```ts
import { Option } from "./option";

// Creating a Some instance
const someValue: Option<number> = Option.Some(42);
console.log(someValue.unwrap()); // 42

// Creating a None instance
const noneValue: Option<number> = Option.None<number>();
console.log(noneValue.isNone()); // true

// Converting a nullable value to an Option
const nullableValue = null as number | null;
const fromNullable: Option<number> = Option.from(nullableValue);
console.log(fromNullable.isNone()); // true

// Converting a value based on a predicate
const fromPredicate: Option<number> = Option.fromPredicate((x) => x > 0, 42);
console.log(fromPredicate.isSome()); // true
```

### Methods

`Option` provides several methods for working with optional values, such as `map`, `flatMap`, `unwrap`, `unwrapOr`, and more. These methods allow you to transform and extract values safely, without having to worry about runtime errors due to accessing `null` or `undefined`.

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
```

### List Methods

- `traverse`
- `sequence`
- `any`

#### Traverse

`traverse` is used when you have an array of values and a function that transforms each value into an `Option`. It applies the function to each element of the array and combines the resulting `Option` values into a single `Option` containing an array of the transformed values, if all the values were `Some`. If any of the values are `None`, the result will be a `None`.

Here's an example using traverse:

```ts
import { Option } from "./option";

const values = [1, 2, 3, 4, 5];

const isEven = (x) => x % 2 === 0;
const toEvenOption = (x) => (isEven(x) ? Option.Some(x) : Option.None());

const traversed: Option<number[]> = Option.traverse(values, toEvenOption);

console.log(traversed); // None, since not all values are even
```

In this example, we use the traverse function to apply toEvenOption to each value in the values array. Since not all values are even, the result is None.

#### Sequence

`sequence` is used when you have an array of `Option` values and you want to combine them into a single `Option` containing an array of the unwrapped values, if all the values are `Some`. If any of the values are `None`, the result will be a `None`.

Here's an example using sequence:

```ts
import { Option } from "./option";

const options = [
  Option.Some(1),
  Option.Some(2),
  Option.None(),
  Option.Some(4),
  Option.Some(5),
];

const sequenced: Option<number[]> = Option.sequence(options);

console.log(sequenced); // None, since there's a None value in the array
```

In this example, we use the `sequence` function to combine the options array into a single `Option`. Since there's a `None` value in the array, the result is `None`.

In summary, `traverse` is used when you have an array of values and a function that turns each value into an `Option`, whereas `sequence` is used when you already have an array of `Option` values. Both functions return an `Option` containing an array of unwrapped values if all values are `Some`, or a `None` if any of the values are None.

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

The `Result` type is a useful way to handle computations that may error. Instead of callbacks or throw expressions, which are indirect and cause confusion, the `Result` type enforces handling the presence of an error at the type level. It provides a set of useful methods for working with this form of branching logic.

`Result` can have one of two variants: `Ok` and `Err`. `Ok` represents the result of a computation that has succeeded, while `Err` represents the result of a computation that has failed.

Here are some examples of how to use the `Result` type and its utility functions:

```javascript
import { Result } from "ftld";

// Creating an Ok instance
const someValue: Result<string, number> = Result.Ok<string, number>(42);
console.log(someValue.unwrap()); // 42

// Creating an Err instance
const noneValue: Result<string, number>  = Result.Err<string, number>("oops");
console.log(noneValue.isErr()); // true

// Converting a value based on a predicate
const fromPredicate: Result<string, number> = Result.fromPredicate(
  (x) => x > 0,
  42,
  () => "not greater than 0"
);
console.log(fromPredicate.isOk()); // true

// converting a value based on a computation that may throw
const fromTryCatch: Result<Error, never> = Result.tryCatch(
  () => {
    throw new Error("Error message");
  },
  (e) => e as Error
);

console.log(fromTryCatch.isErr()); // true
```

### Methods

`Result` provides several methods for working with the potentially failing computations, such as `map`, `flatMap`, `unwrap`, `unwrapOr`, and more. These methods allow you to follow the happy path of successful computations easily, while also forcing you to consider the error case.

```ts
const someValue: Result<string, number> = Result.Ok<string, number>(42);

// Map a value
const doubled: Result<string, number> = someValue.map((x) => x * 2);
console.log(doubled.unwrap()); // 84

// FlatMap a value
const flatMapped: Result<string, number> = someValue.flatMap((x) =>
  Result.Ok(x * 2)
);
console.log(flatMapped.unwrap()); // 84

// Unwrap a value, or provide a default
const defaultValue = 0;
const unwrappedOr: number = someValue.unwrapOr(defaultValue);
console.log(unwrappedOr); // 42
```

### List Methods

The result type also provides a set of methods for working with arrays of `Result` values:

- `traverse`
- `sequence`
- `any`
- `coalesce`
- `validate`

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

#### Sequence

```ts
const results = [
  Result.Ok<string, number>(1),
  Result.Ok<string, number>(2),
  Result.Err<string, number>("oops!"),
  Result.Ok<string, number>(4),
  Result.Ok<string, number>(5),
];

const sequenced: Result<string, number[]> = Result.sequence(results);

console.log(sequenced); // Err('oops!'), since there's an Err value in the array
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
  Result.fromPredicate(isEven, value, (value) => new NotEvenError(value)),
  Result.fromPredicate(
    isPositive,
    value,
    (value) => new NotPositiveError(value)
  ),
];

const validated: Result<(NotEvenError | NotPositiveError)[], number> =
  Result.validate(validations);

console.log(validated); // Ok(2)
```

### Error Handling

The `tryCatch` function allows you to safely execute a function that might throw an error, converting the result into an `Result`.

```ts
const tryCatchResult: Result<Error, never> = Result.tryCatch(() => {
  throw new Error('Error message');
}, (error) => error.message));
console.log(tryCatchResult.isErr()); // true
```

## Task

The `Task` is an alternative to the `Promise` constructor that allows you to encode the error type in the return type. It provides a set of useful methods for working with asynchronous computations in a synchronous manner while also being lazy. Since it encodes the notion of failure into the type system, you can't forget to handle errors. It resolves to a `Result` type, which can be either `Ok` or `Err`.

### Usage

Here are some examples of how to use the `Task` type and its utility functions:

```javascript
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

`Task` provides several methods for working with lazy asynchronous computations, such as `map`, `flatMap`, `run`, and more. These methods allow you to follow the happy path of successful computations easily, while also forcing you to consider the error case.

It also provides some utility functions like `parallel`, `sequential`, and `race` that allow you to combine multiple `Task` values into a single `Task`.

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

### List Methods

The `Task` type provides several methods for working with arrays of `Task` values:

- `traverse`
- `traversePar`
- `any`
- `sequential`
- `parallel`
- `race`
- `coalesce`
- `coalescePar`

#### Parallel

`parallel` allows you to run multiple tasks in parallel and combine the results into a single `Task` containing an array of the unwrapped values, if all the tasks were successful. If any of the tasks fail, the result will be a `Err`.

Here's an example using parallel:

```ts
const tasks = [
  Task.from(async () => {
    await sleep(1000);
    return 1;
  }),
  Task.from(async () => {
    await sleep(1000);
    return 2;
  }),
  Task.from(async () => {
    await sleep(1000);
    return 3;
  }),
  Task.from(async () => {
    await sleep(1000);
    return 4;
  }),
  Task.from(async () => {
    await sleep(1000);
    return 5;
  }),
];

const parallel: Task<unknown, number[]> = Task.parallel(tasks);

console.log(await parallel.run()); // Result.Ok([1, 2, 3, 4, 5])
```

in this example, we use the `parallel` function to run all tasks in parallel and combine the results into a single `Task`. Since all tasks are successful, the result is `Ok`.

#### Sequential

`sequential` allows you to run multiple tasks in sequence and combine the results into a single `Task` containing an array of the unwrapped values, if all the tasks were successful. If any of the tasks fail, the result will be a `Err`.

Here's an example using sequential:

```ts
const tasks = [
  Task.from(async () => {
    await sleep(1000);
    return 1;
  }),
  Task.from(async () => {
    await sleep(1000);
    return 2;
  }),
  Task.from(async () => {
    await sleep(1000);
    return 3;
  }),
  Task.from(async () => {
    await sleep(1000);
    return 4;
  }),
  Task.from(async () => {
    await sleep(1000);
    return 5;
  }),
];

const sequential: Task<unknown, number[]> = Task.sequential(tasks);

console.log(await sequential.run()); // Result.Ok([1, 2, 3, 4, 5])
```

#### Race

`race` allows you to run multiple tasks in parallel and combine the results into a single `Task` containing the unwrapped value of the first settled task.

```ts
const tasks = [
  Task.from(async () => {
    await sleep(1000);
    return 1;
  }),
  Task.from(async () => {
    await sleep(500);
    return 2;
  }),
  Task.from(async () => {
    await sleep(2000);
    return 3;
  }),
  Task.from(async () => {
    await sleep(10);
    throw new Error("oops!");
  }),
];

const res: Task<Error, number> = Task.race(tasks);

console.log(await res.run()); // Result.Err(Error('oops!'))
```

#### Traverse

`traverse` allows you convert items in a list into a list of tasks in sequence and combine the results into a single `Task` containing an array of the unwrapped values, if all the tasks were successful. If any of the tasks fail, the result will be a `Err`.

```ts
const traverse: Task<unknown, number[]> = Task.traverse([1, 2, 3, 4, 5], (x) =>
  Task.from(async () => {
    await sleep(x * 2);
    return x * 2;
  })
);

console.log(await traverse.run()); // Result.Ok([2, 4, 6, 8, 10])
```

#### TraversePar

The parallel version of `traverse`.

```ts
const traversePar: Task<unknown, number[]> = Task.traversePar(
  [1, 2, 3, 4, 5],
  (x) =>
    Task.from(async () => {
      await sleep(x * 2);
      return x * 2;
    })
);

console.log(await traversePar.run()); // Result.Ok([2, 4, 6, 8, 10])
```

#### Any

`any` allows you to take a list of tasks and find the first successful task. If all tasks fail, the result will be a `Err`.

```ts
const tasks = [
  Task.from(
    async () => {
      await sleep(1000);
      throw new Error("oops!");
    },
    (e) => e as Error
  ),
  Task.from(
    async () => {
      await sleep(1000);
      throw new Error("oops!");
    },
    (e) => e as Error
  ),
  Task.from(
    async () => {
      await sleep(1000);
      return 3;
    },
    (e) => e as Error
  ),
  Task.from(
    async () => {
      await sleep(1000);
      return 4;
    },
    (e) => e as Error
  ),
  Task.from(
    async () => {
      await sleep(1000);
      return 5;
    },
    (e) => e as Error
  ),
];

const any: Task<Error, number> = Task.any(tasks);

console.log(await any.run()); // Result.Ok(3)
```

#### Coalesce

`coalesce` allows you to take a list of tasks and aggregate the results into a single Task. If any tasks fail, the result will be a `Err`, with a list of all the errors.

```ts
const tasks = [
  Task.from(
    async () => {
      await sleep(1000);
      throw new Error(new SomeError());
    },
    (e) => e as Error
  ),
  Task.from(
    async () => {
      await sleep(1000);
      throw new Error(new OtherError());
    },
    (e) => e as Error
  ),
  Task.from(
    async () => {
      await sleep(1000);
      return 3;
    },
    (e) => e as Error
  ),
  Task.from(
    async () => {
      await sleep(1000);
      return 4;
    },
    (e) => e as Error
  ),
  Task.from(
    async () => {
      await sleep(1000);
      return 5;
    },
    (e) => e as Error
  ),
];

const coalesce: Task<(SomeError | OtherError)[], number[]> =
  Task.coalesce(tasks);

console.log(await coalesce.run()); // Result.Err([SomeError, OtherError])
```

#### CoalescePar

The parallel version of `coalesce`.

```ts
const tasks = [
  Task.from(
    async () => {
      await sleep(1000);
      throw new Error(new SomeError());
    },
    (e) => e as Error
  ),
  Task.from(
    async () => {
      await sleep(1000);
      throw new Error(new OtherError());
    },
    (e) => e as Error
  ),
  Task.from(
    async () => {
      await sleep(1000);
      return 3;
    },
    (e) => e as Error
  ),
  Task.from(
    async () => {
      await sleep(1000);
      return 4;
    },
    (e) => e as Error
  ),
  Task.from(
    async () => {
      await sleep(1000);
      return 5;
    },
    (e) => e as Error
  ),
];

const coalescePar: Task<(SomeError | OtherError)[], number[]> =
  Task.coalescePar(tasks);

console.log(await coalescePar.run()); // Result.Err([SomeError, OtherError])
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
