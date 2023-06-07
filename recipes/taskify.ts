import { Task, type AsyncTask, type SyncTask } from "../lib";

type Taskify = {
  // this is so we preserve the types of the original api if it includes overloads
  // add more overloads here if you need to for your use case
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

  // add more overloads here if you need to for your use case
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

export const taskify: Taskify = (fnOrRecord: any): any => {
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
