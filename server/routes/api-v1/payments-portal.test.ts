import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import type Stripe from "stripe";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../../test-support/route-harness";
import { setStripeClientFactory } from "../../utils/stripe-client";

const router = (await import("./payments")).default;

afterEach(() => setStripeClientFactory(null));

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(router, fn);

type UserRow = {
  email: string;
  username: string;
  stripe_customer_id: string | null;
};

function usersTable(users: Record<number, UserRow>) {
  return scriptPool((sql, params) => {
    const user = users[params[0] as number];
    if (sql === "SELECT email, username FROM users WHERE id = $1") {
      return {
        rows: user ? [{ email: user.email, username: user.username }] : [],
      };
    }
    if (sql === "SELECT stripe_customer_id FROM users WHERE id = $1") {
      return {
        rows: user ? [{ stripe_customer_id: user.stripe_customer_id }] : [],
      };
    }
    if (sql.startsWith("UPDATE users SET stripe_customer_id = $1")) {
      const row = users[params[1] as number];
      if (row && !row.stripe_customer_id) {
        row.stripe_customer_id = params[0] as string;
        return { rows: [{ stripe_customer_id: row.stripe_customer_id }] };
      }
      return { rows: [] };
    }
    return undefined;
  });
}

function stubStripe(
  existing: Array<{ id: string; metadata?: Record<string, string> }> = [],
) {
  const calls = {
    list: [] as unknown[],
    create: [] as Array<{ params: any; options: any }>,
    portal: [] as any[],
  };
  const client = {
    customers: {
      list: async (params: unknown) => {
        calls.list.push(params);
        return { data: existing };
      },
      create: async (params: any, options: any) => {
        calls.create.push({ params, options });
        return { id: "cus_created" };
      },
    },
    billingPortal: {
      sessions: {
        create: async (params: any) => {
          calls.portal.push(params);
          return { url: `https://billing.stripe.test/${params.customer}` };
        },
      },
    },
  } as unknown as Stripe;
  setStripeClientFactory(() => client);
  return calls;
}

const openPortal = (
  origin: string,
  headers: Record<string, string>,
  body: unknown = {},
) => call(origin, "POST", "/create-portal", { headers, body });

test("the portal opens the customer already saved for the signed-in user", async () => {
  usersTable({
    901: { email: "a@example.com", username: "a", stripe_customer_id: "cus_saved" },
  });
  const stripe = stubStripe();

  await serve(async (origin) => {
    const response = await openPortal(origin, signIn({ id: 901, role: "user" }));

    assert.equal(response.status, 200);
    assert.equal(response.body.data.url, "https://billing.stripe.test/cus_saved");
  });

  assert.equal(stripe.list.length, 0);
  assert.equal(stripe.create.length, 0);
  assert.equal(stripe.portal[0]?.customer, "cus_saved");
  assert.match(stripe.portal[0]?.return_url, /\/pricing$/);
});

test("a customer that belongs to someone else is never opened, even with the same email", async () => {
  const users = {
    902: { email: "shared@example.com", username: "s", stripe_customer_id: null },
  };
  usersTable(users);
  const stripe = stubStripe([
    { id: "cus_other_member", metadata: { userId: "55" } },
    { id: "cus_made_by_hand" },
  ]);

  await serve(async (origin) => {
    const response = await openPortal(origin, signIn({ id: 902, role: "user" }));

    assert.equal(response.status, 200);
    assert.equal(response.body.data.url, "https://billing.stripe.test/cus_created");
  });

  assert.deepEqual(stripe.create[0]?.params.metadata, {
    userId: "902",
    source: "billing_portal",
  });
  assert.equal(users[902].stripe_customer_id, "cus_created");
  assert.equal(stripe.portal.length, 1);
  assert.equal(stripe.portal[0]?.customer, "cus_created");
});

test("a customer already tagged with the user's id is reused and remembered", async () => {
  const users = {
    903: { email: "c@example.com", username: "c", stripe_customer_id: null },
  };
  usersTable(users);
  const stripe = stubStripe([{ id: "cus_mine", metadata: { userId: "903" } }]);

  await serve(async (origin) => {
    const response = await openPortal(origin, signIn({ id: 903, role: "user" }));
    assert.equal(response.status, 200);
  });

  assert.equal(stripe.create.length, 0);
  assert.equal(stripe.portal[0]?.customer, "cus_mine");
  assert.equal(users[903].stripe_customer_id, "cus_mine");
});

test("a portal cannot be opened for another user", async () => {
  const db = usersTable({
    904: { email: "d@example.com", username: "d", stripe_customer_id: "cus_d" },
    905: { email: "e@example.com", username: "e", stripe_customer_id: "cus_e" },
  });
  const stripe = stubStripe();

  await serve(async (origin) => {
    const response = await openPortal(
      origin,
      signIn({ id: 904, role: "user" }),
      { userId: 905 },
    );
    assert.equal(response.status, 403);
  });

  assert.equal(db.log.length, 0);
  assert.equal(stripe.portal.length, 0);
});

test("anonymous callers and unknown users get no portal", async () => {
  usersTable({});
  const stripe = stubStripe();

  await serve(async (origin) => {
    assert.equal((await openPortal(origin, {})).status, 401);
    assert.equal(
      (await openPortal(origin, signIn({ id: 906, role: "user" }))).status,
      404,
    );
  });

  assert.equal(stripe.list.length, 0);
  assert.equal(stripe.create.length, 0);
  assert.equal(stripe.portal.length, 0);
});
