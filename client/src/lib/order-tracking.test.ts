import assert from "node:assert/strict";
import test from "node:test";
import {
  ORDER_POLL_INTERVAL_MS,
  checkoutBanner,
  findOrder,
  nextOrderPoll,
} from "./order-tracking";

const back = { returnedFromCheckout: true, waitedLong: false };

test("no banner unless the customer came back from checkout", () => {
  for (const orderStatus of ["paid", "pending", undefined]) {
    assert.equal(
      checkoutBanner({
        returnedFromCheckout: false,
        orderStatus,
        waitedLong: false,
      }),
      null,
    );
  }
});

test("success is only announced once the order is recorded as paid", () => {
  for (const orderStatus of ["paid", "processing", "shipped", "completed"]) {
    assert.equal(checkoutBanner({ ...back, orderStatus }), "confirmed", orderStatus);
  }
  for (const orderStatus of ["pending", undefined, null, ""]) {
    assert.equal(checkoutBanner({ ...back, orderStatus }), "confirming", String(orderStatus));
  }
});

test("a payment that is slow to confirm is called slow, not successful", () => {
  for (const orderStatus of ["pending", undefined]) {
    assert.equal(
      checkoutBanner({ ...back, orderStatus, waitedLong: true }),
      "delayed",
    );
  }
  assert.equal(
    checkoutBanner({ ...back, orderStatus: "paid", waitedLong: true }),
    "confirmed",
    "a late confirmation still shows as confirmed",
  );
});

test("cancelled and refunded orders are reported as such", () => {
  assert.equal(checkoutBanner({ ...back, orderStatus: "cancelled" }), "cancelled");
  assert.equal(checkoutBanner({ ...back, orderStatus: "REFUNDED" }), "refunded");
});

test("an order under dispute is never described as awaiting confirmation", () => {
  for (const orderStatus of ["disputed", "chargeback"]) {
    for (const waitedLong of [false, true]) {
      assert.equal(checkoutBanner({ ...back, orderStatus, waitedLong }), null, orderStatus);
    }
    assert.equal(
      nextOrderPoll({
        ...back,
        orderId: "42",
        orders: [{ id: 42, status: orderStatus }],
      }),
      false,
      "nothing to wait for",
    );
  }
});

test("orders are matched to the URL's order id as text", () => {
  const orders = [{ id: 41, status: "paid" }, { id: 42, status: "pending" }];
  assert.equal(findOrder(orders, "42")?.status, "pending");
  assert.equal(findOrder(orders, "43"), undefined);
  assert.equal(findOrder(orders, null), undefined);
  assert.equal(findOrder(undefined, "42"), undefined);
});

test("the page keeps checking only while the order is unsettled", () => {
  const pending = [{ id: 42, status: "pending" }];
  const paid = [{ id: 42, status: "paid" }];
  const base = { ...back, orderId: "42" };

  assert.equal(nextOrderPoll({ ...base, orders: pending }), ORDER_POLL_INTERVAL_MS);
  assert.equal(
    nextOrderPoll({ ...base, orders: [] }),
    ORDER_POLL_INTERVAL_MS,
    "an order that has not appeared yet is still awaited",
  );
  assert.equal(nextOrderPoll({ ...base, orders: undefined }), ORDER_POLL_INTERVAL_MS);

  assert.equal(nextOrderPoll({ ...base, orders: paid }), false);
  assert.equal(
    nextOrderPoll({ ...base, orders: [{ id: 42, status: "cancelled" }] }),
    false,
  );
});

test("polling stops after the wait window and never starts for ordinary visits", () => {
  const pending = [{ id: 42, status: "pending" }];

  assert.equal(
    nextOrderPoll({ ...back, waitedLong: true, orderId: "42", orders: pending }),
    false,
  );
  assert.equal(
    nextOrderPoll({
      returnedFromCheckout: false,
      waitedLong: false,
      orderId: "42",
      orders: pending,
    }),
    false,
  );
});
