import assert from "node:assert/strict";
import test from "node:test";

import {
  type AdvisoryLockSession,
  withAdvisoryLock,
} from "./advisory-lock.ts";

function createSession(options: {
  acquired?: boolean;
  unlockError?: Error;
  closed?: Array<Error | undefined>;
  calls?: string[];
} = {}): AdvisoryLockSession {
  return {
    async tryLock(lockKey) {
      options.calls?.push(`try:${lockKey}`);
      return options.acquired ?? true;
    },
    async unlock(lockKey) {
      options.calls?.push(`unlock:${lockKey}`);
      if (options.unlockError) throw options.unlockError;
    },
    close(error) {
      options.calls?.push("close");
      options.closed?.push(error);
    },
  };
}

test("runs the task under the acquired lock and releases it afterward", async () => {
  const calls: string[] = [];
  const result = await withAdvisoryLock(
    42,
    async () => createSession({ calls }),
    async () => "done",
  );

  assert.deepEqual(result, { acquired: true, result: "done" });
  assert.deepEqual(calls, ["try:42", "unlock:42", "close"]);
});

test("skips the task when another process holds the lock", async () => {
  const calls: string[] = [];
  let taskRan = false;
  const result = await withAdvisoryLock(
    42,
    async () => createSession({ acquired: false, calls }),
    async () => {
      taskRan = true;
    },
  );

  assert.deepEqual(result, { acquired: false });
  assert.equal(taskRan, false);
  assert.deepEqual(calls, ["try:42", "close"]);
});

test("releases the lock and preserves task failures", async () => {
  const calls: string[] = [];
  const taskError = new Error("task failed");

  await assert.rejects(
    withAdvisoryLock(
      42,
      async () => createSession({ calls }),
      async () => {
        throw taskError;
      },
    ),
    taskError,
  );

  assert.deepEqual(calls, ["try:42", "unlock:42", "close"]);
});

test("discards a connection when its advisory lock cannot be released", async () => {
  const closed: Array<Error | undefined> = [];
  const unlockError = new Error("unlock failed");

  await assert.rejects(
    withAdvisoryLock(
      42,
      async () => createSession({ unlockError, closed }),
      async () => "done",
    ),
    unlockError,
  );

  assert.deepEqual(closed, [unlockError]);
});
