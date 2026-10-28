import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTipRequest, TIP_MAX } from "./tip-request";

const key = "tip-key-12345678";

test("accepts a valid tip", () => {
  const r = validateTipRequest({ artistProfileId: "7", amount: "2.50" }, key);
  assert.deepEqual(r, {
    ok: true,
    value: { artistProfileId: 7, amount: 2.5, idempotencyKey: key },
  });
});

test("rejects bad artist ids", () => {
  for (const id of [undefined, 0, -1, 1.5, "abc"]) {
    assert.equal(
      validateTipRequest({ artistProfileId: id, amount: 1 }, key).ok,
      false,
    );
  }
});

test("rejects out-of-range or malformed amounts", () => {
  for (const amount of [0, 0.49, TIP_MAX + 0.01, "NaN", Infinity, 1.234, -5]) {
    assert.equal(
      validateTipRequest({ artistProfileId: 1, amount }, key).ok,
      false,
    );
  }
});

test("requires an idempotency key from header or body", () => {
  assert.equal(
    validateTipRequest({ artistProfileId: 1, amount: 1 }, undefined).ok,
    false,
  );
  assert.equal(
    validateTipRequest({ artistProfileId: 1, amount: 1 }, "short").ok,
    false,
  );
  assert.equal(
    validateTipRequest(
      { artistProfileId: 1, amount: 1, idempotencyKey: key },
      undefined,
    ).ok,
    true,
  );
});

test("accepts any whole-cent amount despite float rounding", () => {
  for (const amount of [0.57, 1.1, 2.3, 499.99]) {
    assert.equal(
      validateTipRequest({ artistProfileId: 1, amount }, key).ok,
      true,
      String(amount),
    );
  }
});
