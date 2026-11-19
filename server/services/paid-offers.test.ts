import assert from "node:assert/strict";
import test from "node:test";
import { validateOfferUpdate } from "./paid-offers";

test("accepts a whole-cent amount in range", () => {
  assert.deepEqual(validateOfferUpdate({ amountCents: 750 }), {
    ok: true,
    amountCents: 750,
  });
});

test("rejects fractional, tiny, huge and non-numeric amounts", () => {
  for (const amountCents of [7.5, 99, 50_001, "500", NaN]) {
    assert.equal(validateOfferUpdate({ amountCents }).ok, false);
  }
});

test("rejects empty updates and non-boolean active", () => {
  assert.equal(validateOfferUpdate({}).ok, false);
  assert.equal(validateOfferUpdate({ active: "yes" }).ok, false);
  assert.equal(validateOfferUpdate({ active: false }).ok, true);
});
