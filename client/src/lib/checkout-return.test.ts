import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCheckoutReturn,
  pollUntil,
  withoutCheckoutReturn,
} from "./checkout-return";

test("only Stripe's own return statuses are recognised", () => {
  assert.equal(parseCheckoutReturn(""), null);
  assert.equal(parseCheckoutReturn("?status=success")?.status, "success");
  assert.equal(parseCheckoutReturn("?status=cancelled")?.status, "cancelled");
  assert.equal(parseCheckoutReturn("?status=paid"), null);
  assert.equal(parseCheckoutReturn("?tier=max"), null);
  assert.equal(
    parseCheckoutReturn("?status=success&tier=verified")?.params.get("tier"),
    "verified",
  );
});

test("the return parameters are dropped and everything else is kept", () => {
  assert.equal(withoutCheckoutReturn("?status=success&tier=max"), "");
  assert.equal(withoutCheckoutReturn("?status=cancelled"), "");
  assert.equal(withoutCheckoutReturn("?ref=mail&status=success"), "?ref=mail");
});

function fakeClock() {
  let time = 0;
  const waits: number[] = [];
  return {
    waits,
    now: () => time,
    wait: async (ms: number) => {
      waits.push(ms);
      time += ms;
    },
  };
}

test("polling stops as soon as the purchase shows up", async () => {
  const clock = fakeClock();
  let calls = 0;
  const found = await pollUntil(async () => ++calls === 3, {
    intervalMs: 2_000,
    timeoutMs: 40_000,
    ...clock,
  });
  assert.equal(found, true);
  assert.equal(calls, 3);
  assert.deepEqual(clock.waits, [2_000, 2_000]);
});

test("polling gives up at the deadline instead of waiting forever", async () => {
  const clock = fakeClock();
  let calls = 0;
  const found = await pollUntil(async () => (calls++, false), {
    intervalMs: 2_000,
    timeoutMs: 6_000,
    ...clock,
  });
  assert.equal(found, false);
  assert.equal(calls, 4);
});

test("a failing check is retried rather than ending the wait", async () => {
  const clock = fakeClock();
  let calls = 0;
  const found = await pollUntil(
    async () => {
      if (++calls < 3) throw new Error("network");
      return true;
    },
    { intervalMs: 1_000, timeoutMs: 10_000, ...clock },
  );
  assert.equal(found, true);
});

test("an aborted poll stops checking", async () => {
  const controller = new AbortController();
  let calls = 0;
  const found = await pollUntil(
    async () => {
      calls++;
      controller.abort();
      return false;
    },
    { intervalMs: 1_000, timeoutMs: 10_000, signal: controller.signal },
  );
  assert.equal(found, false);
  assert.equal(calls, 1);
});
