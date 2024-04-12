export function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}

export type Compute<T> = {
  [K in keyof T]: T[K];
} & {};

export type NoDistribute<T> = [T] extends [infer T] ? T : never;

export const _value = "_value" as const;
export const _tag = "_tag" as const;
export const SOME = Symbol.for("fltd/Some");
export const NONE = Symbol.for("fltd/None");
export const OK = Symbol.for("fltd/Ok");
export const ERR = Symbol.for("fltd/Err");
export const TASK = Symbol.for("fltd/Task");

/// below is the code from p-map: https://github.com/sindresorhus/p-map
type BaseOptions = {
  readonly concurrency?: number;
};

export type Options = BaseOptions & {
  readonly stopOnError?: boolean;
  readonly signal?: AbortSignal;
};

export type IterableOptions = BaseOptions & {
  readonly backpressure?: number;
};

type MaybePromise<T> = T | Promise<T>;

export type Mapper<Element = any, NewElement = unknown> = (
  element: Element,
  index: number
) => MaybePromise<NewElement | typeof pMapSkip>;

export function pMap<Element, NewElement>(
  iterable:
    | AsyncIterable<Element | Promise<Element>>
    | Iterable<Element | Promise<Element>>,
  mapper: Mapper<Element, NewElement>,
  {
    concurrency = Number.POSITIVE_INFINITY,
    stopOnError = true,
    signal,
  }: Options = {}
): Promise<Array<Exclude<NewElement, typeof pMapSkip>>> {
  return new Promise((resolve, reject_) => {
    if (
      //@ts-expect-error
      iterable[Symbol.iterator] === undefined &&
      //@ts-expect-error
      iterable[Symbol.asyncIterator] === undefined
    ) {
      throw new TypeError(
        `Expected \`input\` to be either an \`Iterable\` or \`AsyncIterable\`, got (${typeof iterable})`
      );
    }

    if (typeof mapper !== "function") {
      throw new TypeError("Mapper function is required");
    }

    if (
      !(
        (Number.isSafeInteger(concurrency) && concurrency >= 1) ||
        concurrency === Number.POSITIVE_INFINITY
      )
    ) {
      throw new TypeError(
        `Expected \`concurrency\` to be an integer from 1 and up or \`Infinity\`, got \`${concurrency}\` (${typeof concurrency})`
      );
    }

    const result: any[] = [];
    const errors: any[] = [];
    const skippedIndexesMap = new Map();
    let isRejected = false;
    let isResolved = false;
    let isIterableDone = false;
    let resolvingCount = 0;
    let currentIndex = 0;
    const iterator =
      //@ts-expect-error
      iterable[Symbol.iterator] === undefined
        ? //@ts-expect-error
          iterable[Symbol.asyncIterator]()
        : //@ts-expect-error
          iterable[Symbol.iterator]();

    const reject = (reason: any) => {
      isRejected = true;
      isResolved = true;
      reject_(reason);
    };

    if (signal) {
      if (signal.aborted) {
        reject(signal.reason);
      }

      signal.addEventListener("abort", () => {
        reject(signal.reason);
      });
    }

    const next = async () => {
      if (isResolved) {
        return;
      }

      const nextItem = await iterator.next();

      const index = currentIndex;
      currentIndex++;

      // Note: `iterator.next()` can be called many times in parallel.
      // This can cause multiple calls to this `next()` function to
      // receive a `nextItem` with `done === true`.
      // The shutdown logic that rejects/resolves must be protected
      // so it runs only one time as the `skippedIndex` logic is
      // non-idempotent.
      if (nextItem.done) {
        isIterableDone = true;

        if (resolvingCount === 0 && !isResolved) {
          if (!stopOnError && errors.length > 0) {
            reject(new AggregateError(errors)); // eslint-disable-line unicorn/error-message
            return;
          }

          isResolved = true;

          if (skippedIndexesMap.size === 0) {
            resolve(result);
            return;
          }

          const pureResult = [];

          // Support multiple `pMapSkip`'s.
          for (const [index, value] of result.entries()) {
            if (skippedIndexesMap.get(index) === pMapSkip) {
              continue;
            }

            pureResult.push(value);
          }

          resolve(pureResult);
        }

        return;
      }

      resolvingCount++;

      // Intentionally detached
      (async () => {
        try {
          const element = await nextItem.value;

          if (isResolved) {
            return;
          }

          const value = await mapper(element, index);

          // Use Map to stage the index of the element.
          if (value === pMapSkip) {
            skippedIndexesMap.set(index, value);
          }

          result[index] = value;

          resolvingCount--;
          await next();
        } catch (error) {
          if (stopOnError) {
            reject(error);
          } else {
            errors.push(error);
            resolvingCount--;

            // In that case we can't really continue regardless of `stopOnError` state
            // since an iterable is likely to continue throwing after it throws once.
            // If we continue calling `next()` indefinitely we will likely end up
            // in an infinite loop of failed iteration.
            try {
              await next();
            } catch (error) {
              reject(error);
            }
          }
        }
      })();
    };

    // Create the concurrent runners in a detached (non-awaited)
    // promise. We need this so we can await the `next()` calls
    // to stop creating runners before hitting the concurrency limit
    // if the iterable has already been marked as done.
    // NOTE: We *must* do this for async iterators otherwise we'll spin up
    // infinite `next()` calls by default and never start the event loop.
    (async () => {
      for (let index = 0; index < concurrency; index++) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await next();
        } catch (error) {
          reject(error);
          break;
        }

        if (isIterableDone || isRejected) {
          break;
        }
      }
    })();
  });
}

export function pMapIterable<Element, NewElement>(
  iterable:
    | AsyncIterable<Element | Promise<Element>>
    | Iterable<Element | Promise<Element>>,
  mapper: Mapper<Element, NewElement>,
  {
    concurrency = Number.POSITIVE_INFINITY,
    backpressure = concurrency,
  }: IterableOptions = {}
): AsyncIterable<Exclude<NewElement, typeof pMapSkip>> {
  if (
    //@ts-expect-error
    iterable[Symbol.iterator] === undefined &&
    //@ts-expect-error
    iterable[Symbol.asyncIterator] === undefined
  ) {
    throw new TypeError(
      `Expected \`input\` to be either an \`Iterable\` or \`AsyncIterable\`, got (${typeof iterable})`
    );
  }

  if (typeof mapper !== "function") {
    throw new TypeError("Mapper function is required");
  }

  if (
    !(
      (Number.isSafeInteger(concurrency) && concurrency >= 1) ||
      concurrency === Number.POSITIVE_INFINITY
    )
  ) {
    throw new TypeError(
      `Expected \`concurrency\` to be an integer from 1 and up or \`Infinity\`, got \`${concurrency}\` (${typeof concurrency})`
    );
  }

  if (
    !(
      (Number.isSafeInteger(backpressure) && backpressure >= concurrency) ||
      backpressure === Number.POSITIVE_INFINITY
    )
  ) {
    throw new TypeError(
      `Expected \`backpressure\` to be an integer from \`concurrency\` (${concurrency}) and up or \`Infinity\`, got \`${backpressure}\` (${typeof backpressure})`
    );
  }

  return {
    async *[Symbol.asyncIterator]() {
      const iterator =
        //@ts-expect-error
        iterable[Symbol.asyncIterator] === undefined
          ? //@ts-expect-error
            iterable[Symbol.iterator]()
          : //@ts-expect-error
            iterable[Symbol.asyncIterator]();

      const promises: any[] = [];
      let runningMappersCount = 0;
      let isDone = false;
      let index = 0;

      function trySpawn() {
        if (
          isDone ||
          !(runningMappersCount < concurrency && promises.length < backpressure)
        ) {
          return;
        }

        const promise = (async () => {
          const { done, value } = await iterator.next();

          if (done) {
            return { done: true };
          }

          runningMappersCount++;

          // Spawn if still below concurrency and backpressure limit
          trySpawn();

          try {
            const returnValue = await mapper(await value, index++);

            runningMappersCount--;

            if (returnValue === pMapSkip) {
              // @ts-expect-error
              const index = promises.indexOf(promise);

              if (index > 0) {
                promises.splice(index, 1);
              }
            }

            // Spawn if still below backpressure limit and just dropped below concurrency limit
            trySpawn();

            return { done: false, value: returnValue };
          } catch (error) {
            isDone = true;
            return { error };
          }
        })();

        promises.push(promise);
      }

      trySpawn();

      while (promises.length > 0) {
        const { error, done, value } = await promises[0]; // eslint-disable-line no-await-in-loop

        promises.shift();

        if (error) {
          throw error;
        }

        if (done) {
          return;
        }

        // Spawn if just dropped below backpressure limit and below the concurrency limit
        trySpawn();

        if (value === pMapSkip) {
          continue;
        }

        yield value;
      }
    },
  };
}

export const pMapSkip = Symbol("skip");
