import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import type Stripe from "stripe";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import { createStubStripe } from "../test-support/marketing-fakes";
import { offerCheckoutLimiter } from "../middleware/rate-limiter";
import { setStripeClientFactory } from "../utils/stripe-client";
import { resetEventArsenalSchemaForTests } from "../services/event-arsenal-schema";
import {
  applyCheckoutSessionCompleted,
  applyPaymentReversal,
} from "../services/stripe-webhook";
import eventsRouter from "./events";
import paymentsRouter from "./api-v1/payments";

const organizer = { id: 14, role: "user" };
const buyer = { id: 22, role: "user" };
const admin = { id: 1, role: "admin" };

const ENV = ["ONLINE_PAYMENTS_ENABLED", "PUBLIC_BASE_URL"] as const;
const saved: Record<string, string | undefined> = {};
let stub: ReturnType<typeof createStubStripe>;

beforeEach(() => {
  for (const name of ENV) saved[name] = process.env[name];
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  process.env.PUBLIC_BASE_URL = "https://www.versoair.com";
  stub = createStubStripe();
  setStripeClientFactory(() => stub.client);
  resetEventArsenalSchemaForTests();
  void offerCheckoutLimiter.resetKey(`pay-offer-checkout-user-${organizer.id}`);
  void offerCheckoutLimiter.resetKey(`pay-offer-checkout-user-${buyer.id}`);
});

afterEach(() => {
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
  setStripeClientFactory(null);
});

test("POST /api/events/:id/submit enforces event_host_fee until paid or waived", async () => {
  let feePaid = false;
  let feeActive = true;
  let submittedStatus = "DRAFT";

  scriptPool((sql) => {
    if (sql.startsWith("UPDATE events") && sql.includes("status IN ('DRAFT', 'REJECTED')")) {
      submittedStatus = "PENDING";
      return { rows: [{ id: 51, status: "PENDING" }], rowCount: 1 };
    }
    if (sql.includes("FROM events") && sql.includes("status IN ('DRAFT', 'REJECTED')")) {
      return { rows: [{ id: 51, status: submittedStatus }], rowCount: 1 };
    }
    if (sql.startsWith("SELECT key, name, description, amount_cents, active FROM paid_offers WHERE key")) {
      return {
        rows: [
          {
            key: "event_host_fee",
            name: "Event hosting fee",
            description: "Host an event",
            amount_cents: 2500,
            active: feeActive,
          },
        ],
      };
    }
    if (sql.startsWith("SELECT 1 FROM paid_offer_purchases")) {
      return { rows: feePaid ? [{}] : [], rowCount: feePaid ? 1 : 0 };
    }
    if (sql.startsWith("INSERT INTO event_audit")) {
      return { rows: [], rowCount: 1 };
    }
    return undefined;
  });

  await withRouter(eventsRouter, async (origin) => {
    // 1. Unpaid organizer gets 402 HOST_FEE_REQUIRED
    const blocked = await call(origin, "POST", "/51/submit", {
      headers: signIn(organizer),
    });
    assert.equal(blocked.status, 402);
    assert.equal(blocked.body.code, "HOST_FEE_REQUIRED");
    assert.equal(blocked.body.amountCents, 2500);

    // 2. Once event_host_fee is paid, organizer can submit
    feePaid = true;
    const allowed = await call(origin, "POST", "/51/submit", {
      headers: signIn(organizer),
    });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.data.status, "PENDING");

    // 3. When Vault disables event_host_fee, unpaid organizer submits directly
    submittedStatus = "DRAFT";
    feePaid = false;
    feeActive = false;
    const waived = await call(origin, "POST", "/51/submit", {
      headers: signIn(organizer),
    });
    assert.equal(waived.status, 200);
    assert.equal(waived.body.data.status, "PENDING");

    // 4. Admin is exempt even when fee is active
    submittedStatus = "DRAFT";
    feeActive = true;
    const adminSubmit = await call(origin, "POST", "/51/submit", {
      headers: signIn(admin),
    });
    assert.equal(adminSubmit.status, 200);
  });
});

test("create-offer-checkout for event_host_fee builds CAD session and webhook auto-submits draft", async () => {
  scriptPool((sql, params) => {
    if (sql.startsWith("SELECT key, name, description, amount_cents, active FROM paid_offers WHERE key")) {
      return {
        rows: [
          {
            key: String(params[0]),
            name: "Event hosting fee",
            description: "Host and publish an event",
            amount_cents: 2500,
            active: true,
          },
        ],
      };
    }
    if (sql.startsWith("SELECT id, organizer_id, status FROM events")) {
      return { rows: [{ id: 51, organizer_id: organizer.id, status: "DRAFT" }] };
    }
    if (sql.startsWith("SELECT 1 FROM paid_offer_purchases")) {
      return { rows: [] };
    }
    if (sql === "SELECT id, email, username FROM users WHERE id = $1") {
      return { rows: [{ id: organizer.id, email: "host@versoair.com", username: "host" }] };
    }
    if (sql === "SELECT stripe_customer_id FROM users WHERE id = $1") {
      return { rows: [{ stripe_customer_id: "cus_host_14" }] };
    }
    return undefined;
  });

  await withRouter(paymentsRouter, async (origin) => {
    const res = await call(origin, "POST", "/create-offer-checkout", {
      headers: signIn(organizer),
      body: { offerKey: "event_host_fee", eventId: 51 },
    });
    assert.equal(res.status, 200);
    const created = stub.calls.sessionsCreate[0]!.params;
    assert.equal(created.line_items?.[0]?.price_data?.unit_amount, 2500);
    assert.equal(created.metadata?.offerKey, "event_host_fee");
    assert.equal(created.metadata?.eventId, "51");
    assert.equal(
      created.success_url,
      "https://www.versoair.com/events?hostedEvent=51&status=success",
    );
  });

  // Verify webhook auto-transitions DRAFT -> PENDING and full refund reverts to DRAFT
  let eventStatus = "DRAFT";
  let purchaseStored = false;
  const txQueries: string[] = [];
  const fakePool = {
    async connect() {
      return {
        async query(sql: string) {
          const trimmed = sql.trim();
          txQueries.push(trimmed);
          if (trimmed.startsWith("INSERT INTO transactions")) {
            return { rows: [{ id: 901 }], rowCount: 1 };
          }
          if (trimmed.startsWith("SELECT 1 FROM paid_offer_purchases")) {
            return { rows: purchaseStored ? [{}] : [] };
          }
          if (trimmed.startsWith("INSERT INTO paid_offer_purchases")) {
            purchaseStored = true;
            return { rows: [], rowCount: 1 };
          }
          if (trimmed.startsWith("UPDATE events")) {
            eventStatus = trimmed.includes("'PENDING'") && purchaseStored ? "PENDING" : "DRAFT";
            return { rows: [{ id: 51 }], rowCount: 1 };
          }
          if (trimmed.startsWith("SELECT user_id, type FROM transactions")) {
            return {
              rows: [{ user_id: organizer.id, type: "paid_offer" }],
            };
          }
          if (trimmed.startsWith("DELETE FROM paid_offer_purchases")) {
            purchaseStored = false;
            return {
              rows: [{ user_id: organizer.id, offer_key: "event_host_fee", event_id: 51 }],
            };
          }
          return { rows: [], rowCount: 0 };
        },
        release() {},
      };
    },
  };

  const completed = await applyCheckoutSessionCompleted(fakePool as any, {
    id: "cs_host_51",
    amount_total: 2500,
    metadata: {
      userId: String(organizer.id),
      type: "paid_offer",
      offerKey: "event_host_fee",
      eventId: "51",
    },
  } as unknown as Stripe.Checkout.Session);

  assert.equal(completed.status, "processed");
  assert.equal(eventStatus, "PENDING");

  const reversed = await applyPaymentReversal(
    fakePool as any,
    "evt_refund_host_51",
    "cs_host_51",
    { kind: "refund", amountCents: 2500, full: true },
  );
  assert.equal(reversed.status, "recorded");
  assert.equal(purchaseStored, false);
  assert.equal(eventStatus, "DRAFT");
});

test("create-arsenal-checkout handles free passes, paid multi-item merch variants, fulfilment, and check-in", async () => {
  const catalogItems = new Map<number, any>([
    [
      101,
      {
        id: 101,
        event_id: 77,
        kind: "TICKET",
        name: "General Admission",
        description: "Door pass",
        price_cents: 3000,
        stock_limit: 50,
        sold_count: 2,
        max_per_order: 4,
        variants: [],
        fulfillment_note: "Instant Door Pass",
        sort_order: 0,
        active: true,
      },
    ],
    [
      102,
      {
        id: 102,
        event_id: 77,
        kind: "MERCH",
        name: "Tour Tee",
        description: "Heavyweight tee",
        price_cents: 4000,
        stock_limit: 10,
        sold_count: 1,
        max_per_order: 4,
        variants: ["S", "M", "L", "XL"],
        fulfillment_note: "Pickup at Merch Booth",
        sort_order: 1,
        active: true,
      },
    ],
    [
      103,
      {
        id: 103,
        event_id: 77,
        kind: "TICKET",
        name: "Free RSVP",
        description: "Free before 11 PM",
        price_cents: 0,
        stock_limit: 20,
        sold_count: 0,
        max_per_order: 2,
        variants: [],
        fulfillment_note: "Instant Door Pass",
        sort_order: 2,
        active: true,
      },
    ],
  ]);

  const orders = new Map<number, any>();
  const orderLines = new Map<number, any[]>();
  let nextOrderId = 500;
  let attendeeGoing = false;

  scriptPool((sql, params) => {
    const trimmed = sql.trim();
    if (
      trimmed.startsWith("BEGIN") ||
      trimmed.startsWith("COMMIT") ||
      trimmed.startsWith("ROLLBACK") ||
      trimmed.startsWith("SELECT pg_advisory_xact_lock") ||
      trimmed.startsWith("ALTER TABLE") ||
      trimmed.startsWith("CREATE TABLE") ||
      trimmed.startsWith("CREATE INDEX")
    ) {
      return { rows: [] };
    }
    if (trimmed.includes("FROM events") && trimmed.includes("WHERE id = $1 AND status = 'PUBLISHED'")) {
      return {
        rows: [
          {
            id: 77,
            slug: "neon-rooftop-party",
            title: "Neon Rooftop Party",
            capacity: 100,
            ended: false,
            attendee_count: 12,
          },
        ],
      };
    }
    if (trimmed.startsWith("SELECT id, organizer_id, title, slug, status, capacity, theme_accent")) {
      return {
        rows: [
          {
            id: 77,
            organizer_id: organizer.id,
            title: "Neon Rooftop Party",
            slug: "neon-rooftop-party",
            status: "PUBLISHED",
            capacity: 100,
            theme_accent: "violet",
          },
        ],
      };
    }
    if (trimmed.startsWith("SELECT * FROM event_arsenal_items")) {
      const requestedIds: number[] = Array.isArray(params[1]) ? (params[1] as number[]) : [];
      const rows = requestedIds.length
        ? requestedIds.map((id) => catalogItems.get(Number(id))).filter(Boolean)
        : [...catalogItems.values()];
      return { rows };
    }
    if (trimmed.startsWith("SELECT 1 FROM event_arsenal_orders")) {
      const hasFree = [...orders.values()].some(
        (o) => o.user_id === Number(params[1]) && o.status === "paid" && o.total_cents === 0,
      );
      return { rows: hasFree ? [{}] : [] };
    }
    if (trimmed.startsWith("INSERT INTO event_arsenal_orders")) {
      const id = ++nextOrderId;
      const isFree = trimmed.includes("'paid', 0");
      const row = isFree
        ? {
            id,
            event_id: params[0],
            user_id: params[1],
            pass_code: params[2],
            status: "paid",
            total_cents: 0,
            currency: "CAD",
            has_ticket: params[3],
            ticket_qty: params[4],
            merch_qty: params[5],
            paid_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          }
        : {
            id,
            event_id: params[0],
            user_id: params[1],
            pass_code: params[2],
            status: "pending",
            total_cents: params[3],
            currency: "CAD",
            has_ticket: params[4],
            ticket_qty: params[5],
            merch_qty: params[6],
            paid_at: null,
            created_at: new Date().toISOString(),
          };
      orders.set(id, row);
      orderLines.set(id, []);
      return { rows: [row] };
    }
    if (trimmed.startsWith("INSERT INTO event_arsenal_order_items")) {
      const oid = Number(params[0]);
      const arr = orderLines.get(oid) ?? [];
      const line = {
        id: arr.length + 1,
        order_id: oid,
        item_id: params[1],
        kind: params[2],
        item_name: params[3],
        variant: params[4],
        quantity: params[5],
        unit_price_cents: params[6],
        line_total_cents: params[7],
      };
      arr.push(line);
      orderLines.set(oid, arr);
      return { rows: [line] };
    }
    if (trimmed.startsWith("UPDATE event_arsenal_items")) {
      const delta = Number(params[0]);
      const itemId = Number(params[1]);
      const item = catalogItems.get(itemId);
      if (item) {
        if (trimmed.includes("GREATEST")) {
          item.sold_count = Math.max(0, item.sold_count - delta);
        } else {
          item.sold_count += delta;
        }
      }
      return { rows: [] };
    }
    if (trimmed.startsWith("INSERT INTO event_attendees")) {
      attendeeGoing = true;
      return { rows: [] };
    }
    if (trimmed === "SELECT id, email, username FROM users WHERE id = $1") {
      return { rows: [{ id: buyer.id, email: "guest@versoair.com", username: "guest" }] };
    }
    if (trimmed === "SELECT stripe_customer_id FROM users WHERE id = $1") {
      return { rows: [{ stripe_customer_id: "cus_guest_22" }] };
    }
    if (trimmed.startsWith("UPDATE event_arsenal_orders") && trimmed.includes("SET stripe_session_id = $1, updated_at = NOW()")) {
      const ord = orders.get(Number(params[1]));
      if (ord) ord.stripe_session_id = params[0];
      return { rows: [] };
    }
    if (trimmed.startsWith("UPDATE event_arsenal_orders") && trimmed.includes("RETURNING id, pass_code")) {
      const ord = orders.get(Number(params[0]));
      if (!ord || ord.status !== "paid") return { rows: [] };
      if (trimmed.includes("checked_in_at = COALESCE")) ord.checked_in_at = new Date().toISOString();
      if (trimmed.includes("merch_fulfilled_at = COALESCE")) ord.merch_fulfilled_at = new Date().toISOString();
      return { rows: [ord] };
    }
    return undefined;
  });

  let paidOrderId = 0;
  await withRouter(paymentsRouter, async (origin) => {
      // 1. Missing size variant on Merch item 102 is rejected with 400
      const missingVariant = await call(origin, "POST", "/create-arsenal-checkout", {
        headers: signIn(buyer),
        body: {
          eventId: 77,
          lines: [{ itemId: 102, quantity: 1 }],
        },
      });
      assert.equal(missingVariant.status, 400);

      // 2. Free RSVP tier completes immediately and issues VA-EVT pass
      const freeClaim = await call(origin, "POST", "/create-arsenal-checkout", {
        headers: signIn(buyer),
        body: {
          eventId: 77,
          lines: [{ itemId: 103, quantity: 1 }],
        },
      });
      assert.equal(freeClaim.status, 200);
      assert.equal(freeClaim.body.data.mode, "free_completed");
      assert.match(freeClaim.body.data.order.passCode, /^VA-EVT-[A-Z0-9]{6}$/);
      assert.equal(attendeeGoing, true);
      assert.equal(catalogItems.get(103)!.sold_count, 1);

      // 3. Paid bundle (2x GA Ticket + 1x Tour Tee size L = CA$100.00) creates Stripe session
      const paidCheckout = await call(origin, "POST", "/create-arsenal-checkout", {
        headers: signIn(buyer),
        body: {
          eventId: 77,
          lines: [
            { itemId: 101, quantity: 2 },
            { itemId: 102, quantity: 1, variant: "L" },
          ],
        },
      });
      assert.equal(paidCheckout.status, 200);
      assert.equal(paidCheckout.body.data.mode, "stripe_checkout");
      paidOrderId = Number(paidCheckout.body.data.orderId);
      const stripeParams = stub.calls.sessionsCreate[0]!.params;
      assert.equal(stripeParams.metadata?.type, "event_arsenal_order");
      assert.equal(stripeParams.metadata?.arsenalOrderId, String(paidOrderId));
      assert.equal(stripeParams.line_items?.length, 2);
      assert.equal(
        stripeParams.success_url,
        `https://www.versoair.com/events/neon-rooftop-party?arsenalOrder=${paidOrderId}&status=success`,
      );
    });

    // 4. Fulfil paid arsenal order through Stripe webhook
    const webhookPool = {
      async connect() {
        return {
          async query(sql: string, params: unknown[] = []) {
            const trimmed = sql.trim();
            if (trimmed.startsWith("INSERT INTO transactions")) {
              return { rows: [{ id: 950 }], rowCount: 1 };
            }
            if (trimmed.startsWith("SELECT id, event_id, status, total_cents, has_ticket")) {
              const ord = orders.get(Number(params[0]));
              return { rows: ord ? [ord] : [] };
            }
            if (trimmed.startsWith("UPDATE event_arsenal_orders") && trimmed.includes("SET status = 'paid'")) {
              const ord = orders.get(Number(params[1]));
              if (ord) {
                ord.status = "paid";
                ord.stripe_session_id = params[0];
                ord.paid_at = new Date().toISOString();
              }
              return { rows: [] };
            }
            if (trimmed.startsWith("SELECT item_id, quantity FROM event_arsenal_order_items")) {
              return { rows: orderLines.get(Number(params[0])) ?? [] };
            }
            if (trimmed.startsWith("UPDATE event_arsenal_items")) {
              const item = catalogItems.get(Number(params[1]));
              if (item) item.sold_count += Number(params[0]);
              return { rows: [] };
            }
            if (trimmed.startsWith("INSERT INTO event_attendees")) {
              attendeeGoing = true;
              return { rows: [] };
            }
            return { rows: [] };
          },
          release() {},
        };
      },
    };

    const fulfilled = await applyCheckoutSessionCompleted(webhookPool as any, {
      id: "cs_arsenal_502",
      amount_total: 10000,
      metadata: {
        userId: String(buyer.id),
        type: "event_arsenal_order",
        eventId: "77",
        arsenalOrderId: String(paidOrderId),
      },
    } as unknown as Stripe.Checkout.Session);

    assert.equal(fulfilled.status, "processed");
    assert.equal(orders.get(paidOrderId)!.status, "paid");
    assert.equal(catalogItems.get(101)!.sold_count, 4); // 2 prior + 2 new
    assert.equal(catalogItems.get(102)!.sold_count, 2); // 1 prior + 1 new

    // 5. Organizer checks in guest & marks merch picked up; non-organizer gets 403
    await withRouter(eventsRouter, async (origin) => {
      const forbidden = await call(
        origin,
        "POST",
        `/77/orders/${paidOrderId}/check-in`,
        {
          headers: signIn(buyer),
          body: { checkedIn: true },
        },
      );
      assert.equal(forbidden.status, 403);

      const checkedIn = await call(
        origin,
        "POST",
        `/77/orders/${paidOrderId}/check-in`,
        {
          headers: signIn(organizer),
          body: { checkedIn: true, merchFulfilled: true },
        },
      );
      assert.equal(checkedIn.status, 200);
      assert.ok(checkedIn.body.data.checked_in_at);
      assert.ok(checkedIn.body.data.merch_fulfilled_at);
    });
});
