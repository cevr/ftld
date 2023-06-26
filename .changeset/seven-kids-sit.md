---
"ftld": minor
---

Add ability to cancel Tasks by providing a RunContext that contains an AbortSignal to `.run`

```ts
import { Task } from 'ftld';

const task = Task.sleep(2000);

const controller = new AbortController();

const result = await task.run({ signal: controller.signal });
```