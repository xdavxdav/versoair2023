import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import { setStripeClientFactory } from "../utils/stripe-client";

const router = (await import("./marketing")).default;

const saved = {
  marketing: process.env.MARKETING_CHECKOUT_ENABLED,
  payments: process.env.ONLINE_PAYMENTS_ENABLED,
};

beforeEach(() => {
  process.env.MARKETING_CHECKOUT_ENABLED = "true";
  // No Stripe client: checkout answers 503 before it touches the database,
  // which lets these tests count requests without any other setup.
  setStripeClientFactory(() => null);
});

afterEach(() => {
  setStripeClientFactory(null);
  process.env.MARKETING_CHECKOUT_ENABLED = saved.marketing;
  process.env.ONLINE_PAYMENTS_ENABLED = saved.payments;
});

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(router, fn, { path: "/api/marketing" });

test("marketing checkout is limited per signed-in user", async () => {
  await serve(async (origin) => {
    const first = signIn({ id: 701, role: "user" });
    for (let attempt = 1; attempt <= 10; attempt++) {
      const response = await call(origin, "POST", "/api/marketing/cart/checkout", {
        headers: first,
      });
      assert.equal(response.status, 503, `attempt ${attempt} reaches the handler`);
      assert.equal(response.body.code, "STRIPE_NOT_CONFIGURED");
    }

    const blocked = await call(origin, "POST", "/api/marketing/cart/checkout", {
      headers: first,
    });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.code, "PAYMENT_RATE_LIMITED");
    assert.equal(blocked.body.success, false);

    const second = signIn({ id: 702, role: "user" });
    const other = await call(origin, "POST", "/api/marketing/cart/checkout", {
      headers: second,
    });
    assert.equal(other.status, 503, "another user has their own allowance");
  });
});

test("the limiter runs after authentication and the payments gate", async () => {
  await serve(async (origin) => {
    process.env.MARKETING_CHECKOUT_ENABLED = "false";
    process.env.ONLINE_PAYMENTS_ENABLED = "false";
    signIn({ id: 703, role: "user" });

    for (let attempt = 0; attempt < 12; attempt++) {
      const closed = await call(origin, "POST", "/api/marketing/cart/checkout");
      assert.equal(closed.status, 503, "a closed gate never consumes the allowance");
      assert.equal(closed.body.code, "ONLINE_PAYMENTS_UNAVAILABLE");
    }

    process.env.MARKETING_CHECKOUT_ENABLED = "true";
    for (let attempt = 0; attempt < 12; attempt++) {
      const anonymous = await call(origin, "POST", "/api/marketing/cart/checkout");
      assert.equal(anonymous.status, 401, "anonymous callers are refused by auth");
    }
  });
});

type OrderRow = { id: number; status: string };

// Applies the guarded UPDATE the way Postgres would, so the route's choice of
// permitted starting statuses is what decides the outcome.
function ordersDb(orders: OrderRow[]) {
  return scriptPool((sql, params) => {
    if (sql.startsWith("UPDATE orders SET status = $1")) {
      const [status, id, from] = params as [string, number, string[]];
      const order = orders.find((o) => o.id === id && from.includes(o.status));
      if (!order) return { rows: [] };
      order.status = status;
      return { rows: [{ ...order }] };
    }
    if (sql === "SELECT * FROM orders WHERE id = $1") {
      const order = orders.find((o) => o.id === params[0]);
      return { rows: order ? [{ ...order }] : [] };
    }
    return undefined;
  });
}

const patchStatus = (
  origin: string,
  id: string | number,
  body: unknown,
  headers: Record<string, string>,
) =>
  call(origin, "PATCH", `/api/marketing/orders/${id}/status`, {
    headers,
    body,
  });

test("an order only moves forward through its lifecycle", async () => {
  const orders: OrderRow[] = [{ id: 11, status: "paid" }];
  ordersDb(orders);

  await serve(async (origin) => {
    const admin = signIn({ id: 901, role: "admin" });
    for (const next of ["processing", "shipped", "completed", "refunded"]) {
      const response = await patchStatus(origin, 11, { status: next }, admin);
      assert.equal(response.status, 200, `paid chain reaches ${next}`);
      assert.equal(response.body.data.status, next);
    }
    assert.equal(orders[0]?.status, "refunded");
  });
});

test("staff cannot mark an order paid, reopen it, or undo a final status", async () => {
  const orders: OrderRow[] = [
    { id: 21, status: "pending" },
    { id: 22, status: "shipped" },
    { id: 23, status: "refunded" },
    { id: 24, status: "cancelled" },
    { id: 25, status: "paid" },
  ];
  ordersDb(orders);

  await serve(async (origin) => {
    const admin = signIn({ id: 902, role: "admin" });
    const attempts: Array<[number, string, string[]]> = [
      [21, "paid", ["cancelled"]],
      [22, "paid", ["completed", "refunded"]],
      [22, "processing", ["completed", "refunded"]],
      [23, "completed", []],
      [24, "pending", []],
      [25, "cancelled", ["processing", "shipped", "completed", "refunded"]],
      [25, "pending", ["processing", "shipped", "completed", "refunded"]],
    ];

    for (const [id, to, allowed] of attempts) {
      const before = orders.find((o) => o.id === id)!.status;
      const response = await patchStatus(origin, id, { status: to }, admin);

      assert.equal(response.status, 409, `${before} → ${to}`);
      assert.equal(response.body.code, "INVALID_ORDER_TRANSITION");
      assert.equal(response.body.from, before);
      assert.equal(response.body.to, to);
      assert.deepEqual(response.body.allowed, allowed);
      assert.equal(orders.find((o) => o.id === id)!.status, before);
    }
  });
});

test("an unpaid order can be cancelled, and repeating the request is harmless", async () => {
  const orders: OrderRow[] = [{ id: 31, status: "pending" }];
  ordersDb(orders);

  await serve(async (origin) => {
    const admin = signIn({ id: 903, role: "superuser" });
    const first = await patchStatus(origin, 31, { status: "cancelled" }, admin);
    assert.equal(first.status, 200);
    assert.equal(first.body.data.status, "cancelled");

    const again = await patchStatus(origin, 31, { status: "cancelled" }, admin);
    assert.equal(again.status, 200);
    assert.equal(again.body.data.status, "cancelled");
  });
});

test("status changes reject bad input before touching the database", async () => {
  const db = ordersDb([{ id: 41, status: "paid" }]);

  await serve(async (origin) => {
    const admin = signIn({ id: 904, role: "admin" });
    // The router's id guard answers these before the handler runs.
    for (const id of ["12abc", "0", "-3", "1e3", "99999999999"]) {
      const response = await patchStatus(origin, id, { status: "shipped" }, admin);
      assert.equal(response.status, 404, `id ${id}`);
    }
    for (const body of [{ status: "delivered" }, { status: 7 }, {}, undefined]) {
      const response = await patchStatus(origin, 41, body, admin);
      assert.equal(response.status, 400, JSON.stringify(body));
      assert.match(response.body.error, /Invalid status/);
    }
  });

  assert.equal(db.log.length, 0);
});

test("an unknown order is a 404, not a transition error", async () => {
  ordersDb([]);

  await serve(async (origin) => {
    const admin = signIn({ id: 905, role: "admin" });
    const response = await patchStatus(origin, 999, { status: "shipped" }, admin);
    assert.equal(response.status, 404);
  });
});

test("only staff can change an order's status", async () => {
  const orders: OrderRow[] = [{ id: 51, status: "paid" }];
  const db = ordersDb(orders);

  await serve(async (origin) => {
    const member = signIn({ id: 906, role: "user" });
    assert.equal(
      (await patchStatus(origin, 51, { status: "shipped" }, member)).status,
      403,
    );
    assert.equal(
      (await patchStatus(origin, 51, { status: "shipped" }, {})).status,
      401,
    );
  });

  assert.equal(db.log.length, 0);
  assert.equal(orders[0]?.status, "paid");
});
