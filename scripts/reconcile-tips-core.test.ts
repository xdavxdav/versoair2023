import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileTips } from "./reconcile-tips-core";

test("balanced when artist income is half of wallet debits", () => {
  assert.equal(
    reconcileTips({ debitedTotal: 10, artistTipIncome: 5, legacyCreditedWithoutDebit: 0 }).ok,
    true,
  );
});

test("flags tip income that has no matching debit", () => {
  const r = reconcileTips({ debitedTotal: 10, artistTipIncome: 30, legacyCreditedWithoutDebit: 0 });
  assert.equal(r.ok, false);
  assert.equal(r.difference, 25);
});

test("legacy credits can be declared and excluded", () => {
  assert.equal(
    reconcileTips({ debitedTotal: 10, artistTipIncome: 30, legacyCreditedWithoutDebit: 25 }).ok,
    true,
  );
});
