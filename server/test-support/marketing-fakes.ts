/**
 * In-memory stand-ins for Postgres and Stripe used by the marketing checkout
 * and webhook tests. Nothing here touches the network or a real database.
 * The fake database only understands the exact statements the code under test
 * issues, so an unexpected or renamed column fails loudly instead of passing.
 */
import Stripe from "stripe";

type Row = Record<string, any>;

export interface FakeProduct {
  id: number;
  name: string;
  price_cents: number;
  active: boolean;
}

const squash = (sql: string) => sql.replace(/\s+/g, " ").trim();
const result = (rows: Row[] = []) => ({ rows, rowCount: rows.length });

export class FakeDb {
  packs = new Map<number, FakeProduct>();
  printProducts = new Map<number, FakeProduct>();
  cart: Row[] = [];
  orders: Row[] = [];
  orderItems: Row[] = [];
  transactions: Row[] = [];
  userTiers = new Map<number, string>();
  userExpiries = new Map<number, string>();
  statements: string[] = [];
  connects = 0;
  releases = 0;
  failWhen: ((sql: string) => boolean) | null = null;

  private orderSeq = 0;
  private orderItemSeq = 0;
  private transactionSeq = 0;
  private cartSeq = 0;

  addPack(product: Partial<FakeProduct> & { id: number }): FakeProduct {
    const row = {
      name: `Pack ${product.id}`,
      price_cents: 500,
      active: true,
      ...product,
    };
    this.packs.set(row.id, row);
    return row;
  }

  addCartItem(
    userId: number,
    itemType: string,
    itemId: number,
    quantity = 1,
    snapshotCents = 1,
  ): Row {
    const row = {
      id: ++this.cartSeq,
      user_id: userId,
      item_type: itemType,
      item_id: itemId,
      quantity,
      price_snapshot_cents: snapshotCents,
    };
    this.cart.push(row);
    return row;
  }

  query = async (text: string, params: any[] = []) =>
    this.exec(squash(text), params, null);

  connect = async () => {
    this.connects++;
    let undo: Array<() => void> | null = null;
    return {
      query: async (text: string, params: any[] = []) => {
        const sql = squash(text);
        if (sql === "BEGIN") {
          undo = [];
          return result();
        }
        if (sql === "COMMIT") {
          undo = null;
          return result();
        }
        if (sql === "ROLLBACK") {
          for (const revert of (undo ?? []).reverse()) revert();
          undo = null;
          return result();
        }
        return this.exec(sql, params, undo);
      },
      release: () => {
        this.releases++;
      },
    };
  };

  private exec(sql: string, p: any[], undo: Array<() => void> | null) {
    this.statements.push(sql);
    if (this.failWhen?.(sql)) {
      throw new Error(`injected failure: ${sql.slice(0, 60)}`);
    }
    let m: RegExpMatchArray | null;

    if (
      sql ===
      "SELECT id, item_type, item_id, quantity FROM cart_items WHERE user_id = $1 ORDER BY id"
    ) {
      return result(
        this.cart
          .filter((r) => String(r.user_id) === String(p[0]))
          .sort((a, b) => a.id - b.id)
          .map(({ id, item_type, item_id, quantity }) => ({
            id,
            item_type,
            item_id,
            quantity,
          })),
      );
    }

    if (
      (m = sql.match(
        /^SELECT t\.id, t\.name, t\.price_cents FROM (marketing_packs|print_products) t WHERE t\.id = \$1 AND COALESCE\(/,
      ))
    ) {
      const table =
        m[1] === "marketing_packs" ? this.packs : this.printProducts;
      const row = table.get(Number(p[0]));
      return result(
        row && row.active
          ? [{ id: row.id, name: row.name, price_cents: row.price_cents }]
          : [],
      );
    }

    if (
      sql ===
      "INSERT INTO orders (user_id, total_cents, currency, status) VALUES ($1, $2, $3, 'pending') RETURNING id"
    ) {
      const row = {
        id: ++this.orderSeq,
        user_id: Number(p[0]),
        total_cents: p[1],
        currency: p[2],
        status: "pending",
        stripe_session_id: null,
        notes: null,
        paid_at: null,
      };
      this.orders.push(row);
      undo?.push(() => {
        this.orders = this.orders.filter((o) => o !== row);
      });
      return result([{ id: row.id }]);
    }

    if (
      sql ===
      "INSERT INTO order_items (order_id, item_type, item_id, item_name, quantity, unit_price_cents) VALUES ($1, $2, $3, $4, $5, $6)"
    ) {
      const row = {
        id: ++this.orderItemSeq,
        order_id: p[0],
        item_type: p[1],
        item_id: p[2],
        item_name: p[3],
        quantity: p[4],
        unit_price_cents: p[5],
      };
      this.orderItems.push(row);
      undo?.push(() => {
        this.orderItems = this.orderItems.filter((o) => o !== row);
      });
      return result();
    }

    if (
      sql ===
      "UPDATE orders SET status = 'cancelled', notes = $2, updated_at = NOW() WHERE id = $1 AND status = 'pending'"
    ) {
      const order = this.orders.find(
        (o) => o.id === Number(p[0]) && o.status === "pending",
      );
      if (order) {
        order.status = "cancelled";
        order.notes = p[1];
      }
      return result();
    }

    if (
      sql ===
      "UPDATE orders SET stripe_session_id = $1, updated_at = NOW() WHERE id = $2"
    ) {
      const order = this.orders.find((o) => o.id === Number(p[1]));
      if (order) order.stripe_session_id = p[0];
      return result();
    }

    if (
      sql ===
      "INSERT INTO transactions (business_id, user_id, amount, type, status, reference) VALUES (NULL, $1, $2, $3, 'completed', $4) ON CONFLICT DO NOTHING RETURNING id"
    ) {
      if (this.transactions.some((t) => t.reference === p[3])) return result();
      const row = {
        id: ++this.transactionSeq,
        user_id: p[0],
        amount: p[1],
        type: p[2],
        reference: p[3],
      };
      this.transactions.push(row);
      undo?.push(() => {
        this.transactions = this.transactions.filter((t) => t !== row);
      });
      return result([{ id: row.id }]);
    }

    if (
      sql ===
      "SELECT status, total_cents, currency FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE"
    ) {
      const order = this.orders.find(
        (o) =>
          o.id === Number(p[0]) && String(o.user_id) === String(p[1]),
      );
      return result(
        order
          ? [
              {
                status: order.status,
                total_cents: order.total_cents,
                currency: order.currency,
              },
            ]
          : [],
      );
    }

    if (
      sql ===
      "UPDATE orders SET status = 'paid', stripe_session_id = $1, paid_at = NOW(), updated_at = NOW() WHERE id = $2"
    ) {
      const order = this.orders.find((o) => o.id === Number(p[1]));
      if (!order) return result();
      const before = { ...order };
      order.status = "paid";
      order.stripe_session_id = p[0];
      order.paid_at = new Date().toISOString();
      undo?.push(() => Object.assign(order, before));
      return result([{ id: order.id }]);
    }

    if (
      sql ===
      "UPDATE orders SET status = 'cancelled', notes = $3, updated_at = NOW() WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING id"
    ) {
      const order = this.orders.find(
        (o) =>
          o.id === Number(p[0]) &&
          String(o.user_id) === String(p[1]) &&
          o.status === "pending",
      );
      if (!order) return result();
      order.status = "cancelled";
      order.notes = p[2];
      return result([{ id: order.id }]);
    }

    if (
      sql ===
      "UPDATE orders SET notes = COALESCE(notes || E'\\n', '') || $2 WHERE id = $1"
    ) {
      const order = this.orders.find((o) => o.id === Number(p[0]));
      if (order) {
        const before = { ...order };
        order.notes = `${order.notes ? `${order.notes}\n` : ""}${p[1]}`;
        undo?.push(() => Object.assign(order, before));
      }
      return result();
    }

    if (sql === "SELECT user_id FROM transactions WHERE reference = $1") {
      return result(
        this.transactions
          .filter((t) => t.reference === p[0])
          .map((t) => ({ user_id: t.user_id })),
      );
    }

    if (
      sql ===
      "UPDATE orders SET notes = COALESCE(notes || E'\\n', '') || $2, updated_at = NOW() WHERE stripe_session_id = $1 RETURNING id"
    ) {
      const rows = this.orders.filter((o) => o.stripe_session_id === p[0]);
      for (const order of rows) {
        const before = { ...order };
        order.notes = `${order.notes ? `${order.notes}\n` : ""}${p[1]}`;
        undo?.push(() => Object.assign(order, before));
      }
      return result(rows.map((o) => ({ id: o.id })));
    }

    if (
      sql ===
      "UPDATE orders SET status = $2, notes = COALESCE(notes || E'\\n', '') || $3, updated_at = NOW() WHERE stripe_session_id = $1 AND status = ANY($4) RETURNING id"
    ) {
      const rows = this.orders.filter(
        (o) => o.stripe_session_id === p[0] && p[3].includes(o.status),
      );
      for (const order of rows) {
        const before = { ...order };
        order.status = p[1];
        order.notes = `${order.notes ? `${order.notes}\n` : ""}${p[2]}`;
        undo?.push(() => Object.assign(order, before));
      }
      return result(rows.map((o) => ({ id: o.id })));
    }

    if (sql === "DELETE FROM cart_items WHERE user_id = $1") {
      const removed = this.cart.filter(
        (r) => String(r.user_id) === String(p[0]),
      );
      this.cart = this.cart.filter((r) => String(r.user_id) !== String(p[0]));
      undo?.push(() => {
        this.cart.push(...removed);
      });
      return result();
    }

    if (
      sql ===
      "UPDATE users SET subscription_tier = $1, subscription_status = 'active', premium_expires_at = $2 WHERE id = $3"
    ) {
      const userId = Number(p[2]);
      const before = this.userTiers.get(userId);
      const beforeExpiry = this.userExpiries.get(userId);
      this.userTiers.set(userId, p[0]);
      this.userExpiries.set(userId, p[1]);
      undo?.push(() => {
        if (before === undefined) this.userTiers.delete(userId);
        else this.userTiers.set(userId, before);
        if (beforeExpiry === undefined) this.userExpiries.delete(userId);
        else this.userExpiries.set(userId, beforeExpiry);
      });
      return result();
    }

    throw new Error(`FakeDb: unexpected SQL: ${sql}`);
  }
}

export interface StubStripeOptions {
  failCreate?: boolean;
  /** Make billingPortal.sessions.create fail like a bad API key. */
  failPortal?: boolean;
  paymentIntentCustomer?: string | null;
  /** payment_intent id -> Checkout Session id, for refund/dispute lookups. */
  sessionsByPaymentIntent?: Record<string, string>;
  /** charge id -> payment_intent id. */
  chargePaymentIntents?: Record<string, string>;
  /** payment_intent id -> invoice id, for payments made by a subscription. */
  paymentIntentInvoices?: Record<string, string>;
  /** Stripe customers returned for an email lookup (customers.list). */
  customersByEmail?: Array<{ id: string; metadata?: Record<string, string> }>;
}

/** A Stripe client whose network-facing calls are recorded and never sent. */
export function createStubStripe(options: StubStripeOptions = {}) {
  const calls = {
    sessionsCreate: [] as Array<{ params: any; options: any }>,
    customersList: [] as any[],
    customersCreate: [] as any[],
    portalSessionsCreate: [] as any[],
    paymentIntentsRetrieve: [] as string[],
    setupIntentsRetrieve: [] as string[],
  };
  let seq = 0;

  const client = {
    customers: {
      list: async (params: any) => {
        calls.customersList.push(params);
        return { data: options.customersByEmail ?? [] };
      },
      create: async (params: any) => {
        calls.customersCreate.push(params);
        return { id: `cus_stub_${++seq}` };
      },
    },
    checkout: {
      sessions: {
        create: async (params: any, requestOptions?: any) => {
          calls.sessionsCreate.push({ params, options: requestOptions });
          if (options.failCreate) {
            const err: any = new Error(
              "Invalid API Key provided: sk_test_" + "x".repeat(6) + "abcd",
            );
            err.type = "StripeAuthenticationError";
            throw err;
          }
          const id = `cs_test_stub_${++seq}`;
          return { id, url: `https://checkout.stripe.test/c/pay/${id}` };
        },
        list: async (params: any) => {
          const id = options.sessionsByPaymentIntent?.[params.payment_intent];
          return { data: id ? [{ id }] : [] };
        },
      },
    },
    charges: {
      retrieve: async (id: string) => ({
        id,
        payment_intent: options.chargePaymentIntents?.[id] ?? null,
      }),
    },
    paymentIntents: {
      retrieve: async (id: string) => {
        calls.paymentIntentsRetrieve.push(id);
        return {
          id,
          payment_method: "pm_stub_1",
          customer: options.paymentIntentCustomer ?? null,
          invoice: options.paymentIntentInvoices?.[id] ?? null,
        };
      },
    },
    billingPortal: {
      sessions: {
        create: async (params: any) => {
          calls.portalSessionsCreate.push(params);
          if (options.failPortal) {
            const err: any = new Error(
              "Invalid API Key provided: sk_test_" + "x".repeat(6) + "abcd",
            );
            err.type = "StripeAuthenticationError";
            throw err;
          }
          return { url: `https://billing.stripe.test/p/session_${++seq}` };
        },
      },
    },
    setupIntents: {
      retrieve: async (id: string) => {
        calls.setupIntentsRetrieve.push(id);
        return { id, payment_method: null, customer: null };
      },
    },
    // Real signature verification: it is pure computation with no network.
    webhooks: Stripe.webhooks,
  };

  return { client: client as unknown as Stripe, calls };
}

export function signWebhook(payload: string, secret: string): string {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret });
}

export function checkoutCompletedEvent(
  session: Record<string, any>,
  eventId = "evt_test_stub_1",
): string {
  return JSON.stringify({
    id: eventId,
    object: "event",
    type: "checkout.session.completed",
    data: { object: { object: "checkout.session", ...session } },
  });
}

/** Any Stripe event, serialised the way the webhook endpoint receives it. */
export function stripeEventPayload(
  type: string,
  object: Record<string, any>,
  eventId = "evt_test_stub_1",
): string {
  return JSON.stringify({
    id: eventId,
    object: "event",
    type,
    data: { object },
  });
}

export interface FakeAccount {
  email: string;
  role: string;
}

/**
 * Routes the shared pool's queries to a FakeDb. The two drizzle queries that
 * requireAuth issues (session revocation and account lookup) are answered from
 * `accounts`, so real JWT authentication runs without a database.
 * Returns a function that restores the pool.
 */
export function patchPoolWithFakes(
  pool: any,
  db: FakeDb,
  accounts: Map<number, FakeAccount>,
): () => void {
  pool.query = async (first: any, params: any[] = []) => {
    const text: string = typeof first === "string" ? first : first.text;
    if (/^select "is_revoked" from "active_sessions"/i.test(text)) {
      return { rows: [], rowCount: 0 };
    }
    if (
      /^select "email", "role", "subscription_tier", "is_verified" from "users" where "users"\."id" = \$1/i.test(
        text,
      )
    ) {
      const account = accounts.get(Number(params[0]));
      const rows = account ? [[account.email, account.role, "free", true]] : [];
      return { rows, rowCount: rows.length };
    }
    return db.query(text, params);
  };
  pool.connect = db.connect;
  return () => {
    delete pool.query;
    delete pool.connect;
  };
}
