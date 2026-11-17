import assert from "node:assert/strict";
import test from "node:test";
import type { Queryable } from "./marketing-checkout";
import {
  ensureStripeCustomer,
  type StripeCustomerRecord,
  type StripeCustomersClient,
} from "./stripe-customers";

type Rows = Map<number, string | null>;

function usersDb(initial: Record<number, string | null>) {
  const rows: Rows = new Map(
    Object.entries(initial).map(([id, value]) => [Number(id), value]),
  );
  const statements: string[] = [];
  const hooks: { failUpdate: boolean } = { failUpdate: false };

  const db: Queryable = {
    async query(text, params = []) {
      const sql = text.replace(/\s+/g, " ").trim();
      statements.push(sql);

      if (sql === "SELECT stripe_customer_id FROM users WHERE id = $1") {
        const id = params[0];
        return {
          rows: rows.has(id) ? [{ stripe_customer_id: rows.get(id) }] : [],
        };
      }
      if (sql.startsWith("UPDATE users SET stripe_customer_id = $1")) {
        if (hooks.failUpdate) throw new Error("connection reset");
        const [customerId, id] = params;
        const current = rows.get(id);
        if (rows.has(id) && (current === null || current === "")) {
          rows.set(id, customerId);
          return { rows: [{ stripe_customer_id: customerId }] };
        }
        return { rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  return { db, rows, statements, hooks };
}

function stripeStub(
  existing: StripeCustomerRecord[] = [],
  onCreate?: () => void,
) {
  const listed: Array<{ email: string; limit: number }> = [];
  const created: Array<{
    params: Parameters<StripeCustomersClient["customers"]["create"]>[0];
    options: { idempotencyKey: string } | undefined;
  }> = [];

  const client: StripeCustomersClient = {
    customers: {
      async list(params) {
        listed.push(params);
        return { data: existing };
      },
      async create(params, options) {
        created.push({ params, options });
        onCreate?.();
        return { id: `cus_new_${created.length}` };
      },
    },
  };

  return { client, listed, created };
}

const user = {
  userId: 7,
  email: "member@example.com",
  name: "member7",
  source: "billing_portal",
};

test("a customer id already saved on the user is used without asking Stripe", async () => {
  const { db, statements } = usersDb({ 7: "cus_saved" });
  const stripe = stripeStub();

  assert.equal(
    await ensureStripeCustomer({ stripe: stripe.client, db }, user),
    "cus_saved",
  );
  assert.equal(stripe.listed.length, 0);
  assert.equal(stripe.created.length, 0);
  assert.equal(statements.length, 1);
});

test("a Stripe customer with the same email but another owner is never adopted", async () => {
  const { db, rows } = usersDb({ 7: null });
  const stripe = stripeStub([
    { id: "cus_someone_else", metadata: { userId: "99" } },
    { id: "cus_made_by_hand", metadata: {} },
    { id: "cus_no_metadata", metadata: null },
  ]);

  const id = await ensureStripeCustomer({ stripe: stripe.client, db }, user);

  assert.equal(id, "cus_new_1");
  assert.equal(rows.get(7), "cus_new_1");
  assert.deepEqual(stripe.created[0]?.params, {
    email: "member@example.com",
    name: "member7",
    metadata: { userId: "7", source: "billing_portal" },
  });
});

test("a customer already tagged with the user's id is adopted and saved", async () => {
  const { db, rows } = usersDb({ 7: null });
  const stripe = stripeStub([
    { id: "cus_other", metadata: { userId: "8" } },
    { id: "cus_mine", metadata: { userId: "7" } },
  ]);

  const id = await ensureStripeCustomer({ stripe: stripe.client, db }, user);

  assert.equal(id, "cus_mine");
  assert.equal(stripe.created.length, 0);
  assert.equal(rows.get(7), "cus_mine");
  assert.deepEqual(stripe.listed, [{ email: "member@example.com", limit: 10 }]);
});

test("an empty saved id counts as no customer", async () => {
  const { db, rows } = usersDb({ 7: "" });
  const stripe = stripeStub();

  assert.equal(
    await ensureStripeCustomer({ stripe: stripe.client, db }, user),
    "cus_new_1",
  );
  assert.equal(rows.get(7), "cus_new_1");
});

test("a missing display name is left off the new customer", async () => {
  const { db } = usersDb({ 7: null });
  const stripe = stripeStub();

  await ensureStripeCustomer(
    { stripe: stripe.client, db },
    { ...user, name: null, source: "ngo_pos" },
  );

  assert.equal(stripe.created[0]?.params.name, undefined);
  assert.equal(stripe.created[0]?.params.metadata.source, "ngo_pos");
});

test("simultaneous requests settle on the customer that was saved first", async () => {
  const { db, rows } = usersDb({ 7: null });
  // The other request finishes saving while this one is still creating.
  const stripe = stripeStub([], () => rows.set(7, "cus_winner"));

  const id = await ensureStripeCustomer({ stripe: stripe.client, db }, user);

  assert.equal(id, "cus_winner");
  assert.equal(rows.get(7), "cus_winner");
});

test("a retry after a failed save asks Stripe for the same customer", async () => {
  const { db, hooks } = usersDb({ 7: null });
  const stripe = stripeStub();

  hooks.failUpdate = true;
  await assert.rejects(
    ensureStripeCustomer({ stripe: stripe.client, db }, user),
    /connection reset/,
  );
  hooks.failUpdate = false;
  await ensureStripeCustomer({ stripe: stripe.client, db }, user);

  assert.equal(stripe.created.length, 2);
  const [first, retry] = stripe.created.map((c) => c.options?.idempotencyKey);
  assert.match(first ?? "", /^customer-7-[0-9a-f]{16}$/);
  assert.equal(retry, first);
});

test("changed details use a different idempotency key", async () => {
  const stripe = stripeStub();

  await ensureStripeCustomer(
    { stripe: stripe.client, db: usersDb({ 7: null }).db },
    user,
  );
  await ensureStripeCustomer(
    { stripe: stripe.client, db: usersDb({ 7: null }).db },
    { ...user, name: "renamed" },
  );

  const [before, after] = stripe.created.map((c) => c.options?.idempotencyKey);
  assert.notEqual(before, after);
});

test("a Stripe failure saves nothing", async () => {
  const { db, rows } = usersDb({ 7: null });
  const failing: StripeCustomersClient = {
    customers: {
      async list() {
        throw new Error("stripe is down");
      },
      async create() {
        throw new Error("not reached");
      },
    },
  };

  await assert.rejects(
    ensureStripeCustomer({ stripe: failing, db }, user),
    /stripe is down/,
  );
  assert.equal(rows.get(7), null);
});
