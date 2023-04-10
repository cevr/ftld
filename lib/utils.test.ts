import { toOption, toResult, toTask } from './utils';

describe('toResult', () => {
  it('should create an Ok result when value is not null or undefined', () => {
    const res = toResult('error', 42);
    expect(res.isOk()).toBe(true);
    expect(res.unwrap()).toBe(42);
  });

  it('should create an Err result when value is null or undefined', () => {
    const res1 = toResult('error', null);
    expect(res1.isErr()).toBe(true);
    expect(res1.unwrapErr()).toBe('error');

    const res2 = toResult('error', undefined);
    expect(res2.isErr()).toBe(true);
    expect(res2.unwrapErr()).toBe('error');
  });
});

describe('toOption', () => {
  it('should create a Some instance when value is not null or undefined', () => {
    const some = toOption(42);
    expect(some.isSome()).toBe(true);
    expect(some.unwrap()).toBe(42);
  });

  it('should create a None instance when value is null or undefined', () => {
    const none1 = toOption(null);
    expect(none1.isNone()).toBe(true);

    const none2 = toOption(undefined);
    expect(none2.isNone()).toBe(true);
  });
});

describe('toTask', () => {
  it('should create a Task resolving to the value when value is not null or undefined', async () => {
    const task = toTask(42, 'error');
    const res = await task.run();
    expect(res.isOk()).toBe(true);
    expect(res.unwrap()).toBe(42);
  });

  it('should create a Task resolving to the error when value is null or undefined', async () => {
    const task1 = toTask(null, 'error');
    const res1 = await task1.run();
    expect(res1.isErr()).toBe(true);
    expect(res1.unwrapErr()).toBe('error');

    const task2 = toTask(undefined, 'error');
    const res2 = await task2.run();
    expect(res2.isErr()).toBe(true);
    expect(res2.unwrapErr()).toBe('error');
  });
});
