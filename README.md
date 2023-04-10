`ftld` is a library for working with functional types in TypeScript. It provides a set of useful types and utility functions for working with functional programming concepts.

It provides the following types:

- `Option`
- `Result`
- `Task`

These types are useful for working with optional values, error handling, and asynchronous computations that encode branching logic.

## Why

Functional programming is a style of programming that emphasizes the use of functions and immutable data structures. It's a powerful paradigm that can help you write more concise, readable, and maintainable code.

## Option

The `Option` type is a useful way to handle values that might be absent. Instead of using `null` or `undefined`, which can lead to runtime errors, the `Option` type enforces handling the absence of a value at the type level. It provides a set of useful methods for working with optional values.

`Option` can have one of two variants: `Some` and `None`. `Some` represents a value that exists, while `None` represents an absence of value.

The provided code defines the `Option` type and its variants, along with several utility functions for working with optional values.

### Usage

Here are some examples of how to use the `Option` type and its utility functions:

```javascript
import { Option } from './option';

// Creating a Some instance
const someValue = Option.Some(42);
console.log(someValue.unwrap()); // 42

// Creating a None instance
const noneValue = Option.None();
console.log(noneValue.isNone()); // true

// Converting a nullable value to an Option
const nullableValue = null;
const fromNullable = Option.fromNullable(nullableValue);
console.log(fromNullable.isNone()); // true

// Converting a value based on a predicate
const fromPredicate = Option.fromPredicate((x) => x > 0, 42);
console.log(fromPredicate.isSome()); // true
```

### Methods

`Option` provides several methods for working with optional values, such as `map`, `flatMap`, `unwrap`, `unwrapOr`, and more. These methods allow you to transform and extract values safely, without having to worry about runtime errors due to accessing `null` or `undefined`.

```js
const someValue = Option.Some(42);

// Map a value
const doubled = someValue.map((x) => x * 2);
console.log(doubled.unwrap()); // 84

// FlatMap a value
const flatMapped = someValue.flatMap((x) => Option.Some(x * 2));
console.log(flatMapped.unwrap()); // 84

// Unwrap a value, or provide a default
const defaultValue = 0;
const unwrappedOr = someValue.unwrapOr(defaultValue);
console.log(unwrappedOr); // 42
```

### Traversing and Sequencing

`traverse` and `sequence` are two related functions that help you work with arrays of optional values (`Option`). Both of these functions allow you to combine multiple `Option` values into a single Option, but they serve different purposes and are used in different situations.

#### Traverse

`traverse` is used when you have an array of values and a function that transforms each value into an `Option`. It applies the function to each element of the array and combines the resulting `Option` values into a single `Option` containing an array of the transformed values, if all the values were `Some`. If any of the values are `None`, the result will be a `None`.

Here's an example using traverse:

```js
import { Option } from './option';

const values = [1, 2, 3, 4, 5];

const isEven = (x) => x % 2 === 0;
const toEvenOption = (x) => (isEven(x) ? Option.Some(x) : Option.None());

const traversed = Option.traverse(values, toEvenOption);

console.log(traversed); // None, since not all values are even
```

In this example, we use the traverse function to apply toEvenOption to each value in the values array. Since not all values are even, the result is None.

#### Sequence

`sequence` is used when you have an array of `Option` values and you want to combine them into a single `Option` containing an array of the unwrapped values, if all the values are `Some`. If any of the values are `None`, the result will be a `None`.

Here's an example using sequence:

```js
import { Option } from './option';

const options = [Option.Some(1), Option.Some(2), Option.None(), Option.Some(4), Option.Some(5)];

const sequenced = Option.sequence(options);

console.log(sequenced); // None, since there's a None value in the array
```

In this example, we use the `sequence` function to combine the options array into a single `Option`. Since there's a `None` value in the array, the result is `None`.

In summary, `traverse` is used when you have an array of values and a function that turns each value into an `Option`, whereas `sequence` is used when you already have an array of `Option` values. Both functions return an `Option` containing an array of unwrapped values if all values are `Some`, or a `None` if any of the values are None.

### Error Handling

The `tryCatch` function allows you to safely execute a function that might throw an error, converting the result into an `Option`.

```js
const tryCatchResult = Option.tryCatch(() => {
  throw new Error('Error message');
});
console.log(tryCatchResult.isNone()); // true
```

## Result

The `Result` type is a useful way to handle computations that may error. Instead of callbacks or throw expressions, which are indirect and cause confusion, the `Result` type enforces handling the presence of an error at the type level. It provides a set of useful methods for working with this form of branching logic.

`Result` can have one of two variants: `Ok` and `Err`. `Ok` represents the result of a computation that has succeeded, while `Err` represents the result of a computation that has failed.

### Usage

Here are some examples of how to use the `Result` type and its utility functions:

```javascript
import { Result } from '@biteinc/common';

// Creating a Some instance
const someValue = Result.Ok(42);
console.log(someValue.unwrap()); // 42

// Creating a None instance
const noneValue = Option.Err('oops');
console.log(noneValue.isErr()); // true

// Converting a nullable value to an Option
const nullableValue = null;
const fromNullable = Result.fromNullable(nullableValue);
console.log(fromNullable.isErr()); // true

// Converting a value based on a predicate
const fromPredicate = Result.fromPredicate((x) => x > 0, 'not greater than 0', 42);
console.log(fromPredicate.isOk()); // true
```

### Methods

`Result` provides several methods for working with the potentially failing computations, such as `map`, `flatMap`, `unwrap`, `unwrapOr`, and more. These methods allow you to follow the happy path of successful computations easily, while also forcing you to consider the error case.

```js
const someValue = Result.Ok(42);

// Map a value
const doubled = someValue.map((x) => x * 2);
console.log(doubled.unwrap()); // 84

// FlatMap a value
const flatMapped = someValue.flatMap((x) => Result.Ok(x * 2));
console.log(flatMapped.unwrap()); // 84

// Unwrap a value, or provide a default
const defaultValue = 0;
const unwrappedOr = someValue.unwrapOr(defaultValue);
console.log(unwrappedOr); // 42
```

### Traversing and Sequencing

`traverse` and `sequence` are two related functions that help you work with arrays of results (`Result`). Both of these functions allow you to combine multiple `Result` values into a single `Result`, but they serve different purposes and are used in different situations.

#### Traverse

`traverse` is used when you have an array of values and a function that transforms each value into an `Result`. It applies the function to each element of the array and combines the resulting `Result` values into a single `Result` containing an array of the transformed values, if all the values were `Ok`. If any of the values are `Err`, the result will be a `Err`.

Here's an example using traverse:

```js
const values = [1, 2, 3, 4, 5];

const isEven = (x) => x % 2 === 0;
const toEvenOption = (x) => (isEven(x) ? Result.Ok(x) : Result.Err('Value is not even'));

const traversed = Option.traverse(values, toEvenOption);

console.log(traversed); // Err('Value is not even'), since not all values are even
```

In this example, we use the traverse function to apply `toEvenOption` to each value in the values array. Since not all values are even, the result is `Err`.

#### Sequence

`sequence` is used when you have an array of `Result` values and you want to combine them into a single `Result` containing an array of the unwrapped values, if all the values are `Ok`. If any of the values are `Err`, the result will be a `Err`.

Here's an example using sequence:

```js
const options = [Result.Ok(1), Result.Ok(2), Result.Err('oops!'), Result.Ok(4), Result.Ok(5)];

const sequenced = Option.sequence(options);

console.log(sequenced); // Err('oops!'), since there's an Err value in the array
```

In this example, we use the `sequence` function to combine the results array into a single `Result`. Since there's a `Err` value in the array, the result is `Err`.

In summary, `traverse` is used when you have an array of values and a function that turns each value into an `Result`, whereas `sequence` is used when you already have an array of `Result` values. Both functions return an `Result` containing an array of unwrapped values if all values are `Ok`, or a `Err` if any of the values are `Err`.

### Error Handling

The `tryCatch` function allows you to safely execute a function that might throw an error, converting the result into an `Result`.

```js
const tryCatchResult = Result.tryCatch(() => {
  throw new Error('Error message');
}, (error) => error.message));
console.log(tryCatchResult.isErr()); // true
```

## Task

The `Task` type is basically a wrapper around a function that returns a `Promise`. It provides a set of useful methods for working with asynchronous computations in a synchronous manner while also being lazy. It encodes the notion of failure into the type system, so you can't forget to handle errors. It resolves to a `Result` type, which can be either `Ok` or `Err`.

### Usage

Here are some examples of how to use the `Task` type and its utility functions:

```javascript
import { Task } from '@biteinc/common';

// Creating a Some instance
const someValue = Task.of(42);
console.log(await someValue.run()); // 42

// Creating a None instance
const noneValue = Option.Err('oops');
console.log(noneValue.isErr()); // true

// Converting a nullable value to an Option
const nullableValue = null;
const fromNullable = Result.fromNullable(nullableValue);
console.log(fromNullable.isErr()); // true

// Converting a value based on a predicate
const fromPredicate = Result.fromPredicate((x) => x > 0, 'not greater than 0', 42);
console.log(fromPredicate.isOk()); // true
```

### Methods

`Task` provides several methods for working with lazy asynchronous computations, such as `map`, `flatMap`, `run`, and more. These methods allow you to follow the happy path of successful computations easily, while also forcing you to consider the error case.

It also provides some utility functions like `parallel`, `sequential`, and `race` that allow you to combine multiple `Task` values into a single `Task`.

```js
// you can await a Task like a Promise
const someValue = await Task.of(42);
const someOtherValue = await Task.of(84);

// Map a value
const doubled = Task.of(42).map((x) => x * 2);
// you can also call .run() to get the Promise as well
console.log(await doubled.run()); // 84

const flatMapped = Task.of(42).flatMap((x) => Task.of(x * 2));
console.log(await flatMapped.run()); // 84

// unwrap a value by awaiting the Task
const result = await Task.of(42);
console.log(result.unwrap()); // Result.Ok(42) -> 42
```

### Parallel, Sequential, and Race

`parallel`, `sequential`, and `race` are three related functions that help you work with arrays of tasks (`Task`). All of these functions allow you to combine multiple `Task` values into a single `Task`, but they serve different purposes and are used in different situations.

#### Parallel

`parallel` allows you to run multiple tasks in parallel and combine the results into a single `Task` containing an array of the unwrapped values, if all the tasks were successful. If any of the tasks fail, the result will be a `Err`.

Here's an example using parallel:

```js
const tasks = [Task.of(1), Task.of(2), Task.of(3), Task.of(4), Task.of(5)];

const parallel = Task.parallel(tasks);

console.log(await parallel.run()); // Result.Ok([1, 2, 3, 4, 5])
```

in this example, we use the `parallel` function to run all tasks in parallel and combine the results into a single `Task`. Since all tasks are successful, the result is `Ok`.

#### Sequential

`sequential` allows you to run multiple tasks in sequence and combine the results into a single `Task` containing an array of the unwrapped values, if all the tasks were successful. If any of the tasks fail, the result will be a `Err`.

Here's an example using sequential:

```js
const tasks = [Task.of(1), Task.of(2), Task.of(3), Task.of(4), Task.of(5)];

const sequential = Task.sequential(tasks);

console.log(await sequential.run()); // Result.Ok([1, 2, 3, 4, 5])
```

#### Race

`race` allows you to run multiple tasks in parallel and combine the results into a single `Task` containing the unwrapped value of the first settled task.

```js
const tasks = [Task.of(async() => {
  await sleep(1000);
  return 1;
},
Task.of(async() => {
  await sleep(500);
  return 2;
},
Task.of(async() => {
  await sleep(2000);
  return 3;
},
Task.of(async() => {
  await sleep(10);
  throw new Error('oops!');
},
];

const res = Task.race(tasks);

console.log(await res.run()); // Result.Err(Error('oops!'))
```
