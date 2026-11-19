import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import {
  applyCheckoutSessionCompleted,
  applyPaymentReversal,
} from "./stripe-webhook";

type Row = Record<string, any>;

// Just enough of the ledger, purchase and attendee tables for the paid-offer paths.
class OfferDb {
  transactions: Row[] = [];
  purchases: Row[] = [];
  attendees: Row[] = [];
  tablesReady = false;

  query = (text: string, params: any[] = []) =>
    this.run(text.replace(/\s+/g, " ").trim(), params);

  connect = async () => ({
    query: this.query,
    release: () => undefined,
  });

  private async run(sql: string, p: any[]): Promise<{ rows: Row[] }> {
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rows: [] };
    if (sql.startsWith("CREATE TABLE IF NOT EXISTS")) {
      this.tablesReady = true;
      return { rows: [] };
    }
    if (sql.startsWith("INSERT INTO paid_offers")) return { rows: [] };

    if (sql.startsWith("INSERT INTO transactions")) {
      const [userId, amount, currency, type, reference] = p;
      if (this.transactions.some((t) => t.reference === reference)) {
        return { rows: [] };
      }
      this.transactions.push({ user_id: userId, amount, currency, type, reference });
      return { rows: [{ id: this.transactions.length }] };
    }
    if (sql.startsWith("SELECT user_id, currency, type FROM transactions")) {
      return {
        rows: this.transactions
          .filter((t) => t.reference === p[0])
          .map(({ user_id, currency, type }) => ({ user_id, currency, type })),
      };
    }
    if (sql.startsWith("UPDATE orders")) return { rows: [] };

    if (sql.includes("paid_offer_purchases") && !this.tablesReady) {
      throw new Error('relation "paid_offer_purchases" does not exist');
    }
    if (sql.startsWith("SELECT 1 FROM paid_offer_purchases")) {
      const [userId, offerKey, eventId] = p;
      return {
        rows: this.purchases
          .filter(
            (r) =>
              r.user_id === userId &&
              r.offer_key === offerKey &&
              (r.event_id ?? null) === (eventId ?? null),
          )
          .map(() => ({})),
      };
    }
    if (sql.startsWith("INSERT INTO paid_offer_purchases")) {
      const [userId, offerKey, eventId, sessionId, amount] = p;
      if (!this.purchases.some((r) => r.stripe_session_id === sessionId)) {
        this.purchases.push({
          user_id: userId,
          offer_key: offerKey,
          event_id: eventId,
          stripe_session_id: sessionId,
          amount_cents: amount,
        });
      }
      return { rows: [] };
    }
    if (sql.startsWith("INSERT INTO event_attendees")) {
      const [eventId, userId] = p;
      const row = this.attendees.find(
        (a) => a.event_id === eventId && a.user_id === userId,
      );
      if (row) row.status = "GOING";
      else this.attendees.push({ event_id: eventId, user_id: userId, status: "GOING" });
      return { rows: [] };
    }
    if (sql.startsWith("DELETE FROM paid_offer_purchases")) {
      const removed = this.purchases.filter((r) => r.stripe_session_id === p[0]);
      this.purchases = this.purchases.filter((r) => r.stripe_session_id !== p[0]);
      return { rows: removed };
    }
    if (sql.startsWith("UPDATE event_attendees SET status = 'CANCELLED'")) {
      const [eventId, userId] = p;
      const stillCovered = this.purchases.some(
        (r) =>
          r.user_id === userId &&
          r.offer_key === "activity_ticket" &&
          r.event_id === eventId,
      );
      for (const a of this.attendees) {
        if (
          a.event_id === eventId &&
          a.user_id === userId &&
          a.status === "GOING" &&
          !stillCovered
        ) {
          a.status = "CANCELLED";
        }
      }
      return { rows: [] };
    }
    throw new Error(`Unexpected statement: ${sql}`);
  }
}

function offerSession(
  id: string,
  metadata: Record<string, string>,
  amountTotal = 1000,
): Stripe.Checkout.Session {
  return {
    id,
    payment_status: "paid",
    amount_total: amountTotal,
    currency: "cad",
    metadata: { userId: "7", type: "paid_offer", ...metadata },
  } as Stripe.Checkout.Session;
}

const ticket = (id: string, eventId = "9") =>
  offerSession(id, { offerKey: "activity_ticket", eventId });
const membership = (id: string) =>
  offerSession(id, { offerKey: "community_join" }, 500);

test("a paid ticket records the purchase and the attendance, once", async () => {
  const db = new OfferDb();

  const first = await applyCheckoutSessionCompleted(db, ticket("cs_ticket_1"));
  const replay = await applyCheckoutSessionCompleted(db, ticket("cs_ticket_1"));

  assert.deepEqual(first, { status: "processed", kind: "paid_offer" });
  assert.deepEqual(replay, { status: "duplicate" });
  assert.equal(db.purchases.length, 1);
  assert.deepEqual(db.attendees, [{ event_id: 9, user_id: 7, status: "GOING" }]);
});

test("a ticket without a usable event is ignored and records nothing", async () => {
  const db = new OfferDb();

  const result = await applyCheckoutSessionCompleted(
    db,
    offerSession("cs_ticket_bad", { offerKey: "activity_ticket", eventId: "abc" }),
  );

  assert.deepEqual(result, { status: "ignored", reason: "invalid_event_id" });
  assert.equal(db.transactions.length, 0);
  assert.equal(db.purchases.length, 0);
});

test("paying twice for the same offer is recorded and flagged for a refund", async () => {
  const db = new OfferDb();

  const first = await applyCheckoutSessionCompleted(db, membership("cs_member_1"));
  const second = await applyCheckoutSessionCompleted(db, membership("cs_member_2"));
  const otherEvent = await applyCheckoutSessionCompleted(db, ticket("cs_ticket_a", "1"));
  const sameEventTwice = await applyCheckoutSessionCompleted(db, ticket("cs_ticket_b", "1"));

  assert.deepEqual(first, { status: "processed", kind: "paid_offer" });
  assert.deepEqual(second, {
    status: "processed",
    kind: "paid_offer",
    repeatPurchase: true,
  });
  assert.deepEqual(otherEvent, { status: "processed", kind: "paid_offer" });
  assert.deepEqual(sameEventTwice, {
    status: "processed",
    kind: "paid_offer",
    repeatPurchase: true,
  });
  assert.equal(db.purchases.length, 4, "both payments stay on record");
});

test("a full refund withdraws a ticket and its attendance", async () => {
  const db = new OfferDb();
  await applyCheckoutSessionCompleted(db, ticket("cs_ticket_1"));

  const outcome = await applyPaymentReversal(db, "evt_refund", "cs_ticket_1", {
    kind: "refund",
    amountCents: 1000,
    full: true,
  });

  assert.equal(outcome.status, "recorded");
  assert.equal(db.purchases.length, 0);
  assert.equal(db.attendees[0]?.status, "CANCELLED");

  const replay = await applyPaymentReversal(db, "evt_refund", "cs_ticket_1", {
    kind: "refund",
    amountCents: 1000,
    full: true,
  });
  assert.deepEqual(replay, { status: "duplicate" });
});

test("a partial refund keeps the ticket", async () => {
  const db = new OfferDb();
  await applyCheckoutSessionCompleted(db, ticket("cs_ticket_1"));

  await applyPaymentReversal(db, "evt_partial", "cs_ticket_1", {
    kind: "refund",
    amountCents: 300,
    full: false,
  });

  assert.equal(db.purchases.length, 1);
  assert.equal(db.attendees[0]?.status, "GOING");
});

test("a lost dispute withdraws the purchase; an opened one does not", async () => {
  const db = new OfferDb();
  await applyCheckoutSessionCompleted(db, membership("cs_member_1"));

  await applyPaymentReversal(db, "evt_open", "cs_member_1", {
    kind: "dispute_opened",
    amountCents: 500,
  });
  assert.equal(db.purchases.length, 1);

  await applyPaymentReversal(db, "evt_lost", "cs_member_1", {
    kind: "dispute_lost",
    amountCents: 500,
  });
  assert.equal(db.purchases.length, 0);
});

test("refunding one of two payments for a ticket keeps the attendance", async () => {
  const db = new OfferDb();
  await applyCheckoutSessionCompleted(db, ticket("cs_ticket_1"));
  await applyCheckoutSessionCompleted(db, ticket("cs_ticket_2"));

  await applyPaymentReversal(db, "evt_refund_2", "cs_ticket_2", {
    kind: "refund",
    amountCents: 1000,
    full: true,
  });

  assert.equal(db.purchases.length, 1);
  assert.equal(db.attendees[0]?.status, "GOING");
});

test("refunding a payment that is not an offer never touches the offer tables", async () => {
  const db = new OfferDb();
  db.transactions.push({
    user_id: 7,
    amount: "43.00",
    type: "subscription_fee",
    reference: "cs_plan_1",
  });

  const outcome = await applyPaymentReversal(db, "evt_plan", "cs_plan_1", {
    kind: "refund",
    amountCents: 4300,
    full: true,
  });

  assert.equal(outcome.status, "recorded");
  assert.equal(db.tablesReady, false);
});
