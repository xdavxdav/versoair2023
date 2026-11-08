import assert from "node:assert/strict";
import test from "node:test";
import { runOnce } from "./run-once";

test("concurrent callers share a single run", async () => {
  let runs = 0;
  const ensure = runOnce(async () => {
    runs++;
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
  await Promise.all([ensure(), ensure(), ensure()]);
  await ensure();
  assert.equal(runs, 1);
});

test("a failure is reported to the caller and retried on the next call", async () => {
  let runs = 0;
  const ensure = runOnce(async () => {
    runs++;
    if (runs === 1) throw new Error("database is waking up");
  });
  await assert.rejects(ensure(), /database is waking up/);
  await ensure();
  await ensure();
  assert.equal(runs, 2);
});
