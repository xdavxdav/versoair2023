import assert from "node:assert/strict";
import test from "node:test";
import {
  ORDER_STATUSES,
  allowedNextStatuses,
  isOrderStatus,
  statusesThatCanMoveTo,
} from "./order-status";

test("staff can never mark an order paid or move one back to pending", () => {
  assert.deepEqual(statusesThatCanMoveTo("paid"), []);
  assert.deepEqual(statusesThatCanMoveTo("pending"), []);
});

test("only an unpaid order can be cancelled, and a paid one is refunded instead", () => {
  assert.deepEqual(statusesThatCanMoveTo("cancelled"), ["pending"]);
  assert.ok(!allowedNextStatuses("paid").includes("cancelled"));
  assert.ok(allowedNextStatuses("paid").includes("refunded"));
});

test("fulfilment only moves forward", () => {
  assert.deepEqual(allowedNextStatuses("paid"), [
    "processing",
    "shipped",
    "completed",
    "refunded",
  ]);
  assert.deepEqual(allowedNextStatuses("processing"), [
    "shipped",
    "completed",
    "refunded",
  ]);
  assert.deepEqual(allowedNextStatuses("shipped"), ["completed", "refunded"]);
  assert.deepEqual(allowedNextStatuses("completed"), ["refunded"]);
});

test("cancelled and refunded orders are final", () => {
  assert.deepEqual(allowedNextStatuses("cancelled"), []);
  assert.deepEqual(allowedNextStatuses("refunded"), []);
});

test("an order under dispute cannot be moved by staff until the dispute webhook settles it", () => {
  for (const status of ["disputed", "chargeback"]) {
    assert.equal(isOrderStatus(status), false);
    assert.deepEqual(allowedNextStatuses(status), []);
  }
  for (const to of ORDER_STATUSES) {
    assert.ok(!statusesThatCanMoveTo(to).includes("disputed" as never));
    assert.ok(!statusesThatCanMoveTo(to).includes("chargeback" as never));
  }
});

test("no status can reach itself or an earlier stage", () => {
  const rank = new Map(ORDER_STATUSES.map((status, index) => [status, index]));
  for (const from of ORDER_STATUSES) {
    for (const to of allowedNextStatuses(from)) {
      if (to === "cancelled" || to === "refunded") continue;
      assert.ok(
        rank.get(to)! > rank.get(from)!,
        `${from} → ${to} must move forward`,
      );
    }
    assert.ok(!allowedNextStatuses(from).includes(from));
  }
});

test("unknown values are rejected rather than treated as a status", () => {
  assert.equal(isOrderStatus("shipped"), true);
  for (const value of ["", "SHIPPED", "delivered", null, undefined, 3, {}]) {
    assert.equal(isOrderStatus(value), false);
  }
  assert.deepEqual(allowedNextStatuses("delivered"), []);
  assert.deepEqual(allowedNextStatuses(undefined), []);
});
