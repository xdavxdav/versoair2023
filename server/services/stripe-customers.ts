import { createHash } from "node:crypto";
import type { Queryable } from "./marketing-checkout";

export interface StripeCustomerRecord {
  id: string;
  metadata?: Record<string, string> | null;
}

/** The slice of the Stripe client this service uses, so tests can stub it. */
export interface StripeCustomersClient {
  customers: {
    list(params: {
      email: string;
      limit: number;
    }): Promise<{ data: StripeCustomerRecord[] }>;
    create(
      params: {
        email: string;
        name?: string;
        metadata: Record<string, string>;
      },
      options?: { idempotencyKey: string },
    ): Promise<{ id: string }>;
  };
}

export interface EnsureCustomerUser {
  userId: number;
  email: string;
  name?: string | null;
  /** Recorded in the customer's metadata to show which flow created it. */
  source: string;
}

/**
 * Returns the Stripe customer for a user, creating one when none exists.
 *
 * The stored `users.stripe_customer_id` wins. Otherwise only a Stripe customer
 * already tagged with this user's id is adopted. Matching on email alone is not
 * safe: the Stripe account also holds customers made for other people or by
 * hand, and handing one of those to the wrong account would expose its saved
 * cards, invoices and subscriptions through the billing portal.
 */
export async function ensureStripeCustomer(
  deps: { stripe: StripeCustomersClient; db: Queryable },
  user: EnsureCustomerUser,
): Promise<string> {
  const { stripe, db } = deps;

  const stored = await readStoredCustomerId(db, user.userId);
  if (stored) return stored;

  const matches = await stripe.customers.list({ email: user.email, limit: 10 });
  const owned = matches.data.find(
    (customer) => customer.metadata?.userId === String(user.userId),
  );

  let customerId = owned?.id;
  if (!customerId) {
    const params = {
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: String(user.userId), source: user.source },
    };
    // The key covers the parameters, so a retry after a failed save returns
    // the same customer instead of making a second one.
    const digest = createHash("sha256")
      .update(JSON.stringify(params))
      .digest("hex")
      .slice(0, 16);
    const created = await stripe.customers.create(params, {
      idempotencyKey: `customer-${user.userId}-${digest}`,
    });
    customerId = created.id;
  }

  // First writer wins, so two simultaneous requests settle on one customer.
  const saved = await db.query(
    `UPDATE users SET stripe_customer_id = $1
      WHERE id = $2 AND (stripe_customer_id IS NULL OR stripe_customer_id = '')
      RETURNING stripe_customer_id`,
    [customerId, user.userId],
  );
  if (saved.rows[0]?.stripe_customer_id) return saved.rows[0].stripe_customer_id;

  return (await readStoredCustomerId(db, user.userId)) || customerId;
}

async function readStoredCustomerId(
  db: Queryable,
  userId: number,
): Promise<string | null> {
  const result = await db.query(
    `SELECT stripe_customer_id FROM users WHERE id = $1`,
    [userId],
  );
  return result.rows[0]?.stripe_customer_id || null;
}
