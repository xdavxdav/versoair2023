/**
 * In-memory stand-in for the tables behind recurring plan billing. Like
 * FakeDb it understands only the exact statements the code under test issues,
 * so a renamed column or an unexpected query fails loudly instead of passing.
 * Transactions are real enough to matter: ROLLBACK undoes every change made
 * since BEGIN, including the ledger claim.
 */
type Row = Record<string, any>;

const squash = (sql: string) => sql.replace(/\s+/g, " ").trim();
const result = (rows: Row[] = []) => ({ rows, rowCount: rows.length });
const later = (a: Date | null, b: Date | null) =>
  a && b ? (a > b ? a : b) : (a ?? b);

export interface FakeUser {
  subscription_tier: string;
  subscription_status: string;
  premium_expires_at: Date | null;
}

export interface FakeSubscription {
  user_id: number;
  stripe_subscription_id: string;
  stripe_customer_id: string | null;
  tier: string;
  billing_cycle: string;
  status: string;
  current_period_end: Date | null;
}

export class FakePlanDb {
  users = new Map<number, FakeUser>();
  subscriptions = new Map<string, FakeSubscription>();
  transactions: Row[] = [];
  notifications: Row[] = [];
  statements: string[] = [];
  connects = 0;
  releases = 0;
  failWhen: ((sql: string) => boolean) | null = null;
  /** Behave like a database where the optional plan_subscriptions repair never ran. */
  missingTable = false;

  private transactionSeq = 0;

  addUser(id: number, overrides: Partial<FakeUser> = {}): FakeUser {
    const user: FakeUser = {
      subscription_tier: "free",
      subscription_status: "active",
      premium_expires_at: null,
      ...overrides,
    };
    this.users.set(id, user);
    return user;
  }

  addSubscription(
    stripeSubscriptionId: string,
    overrides: Partial<FakeSubscription> & { user_id: number },
  ): FakeSubscription {
    const row: FakeSubscription = {
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: "cus_1",
      tier: "verified",
      billing_cycle: "monthly",
      status: "active",
      current_period_end: null,
      ...overrides,
    };
    this.subscriptions.set(stripeSubscriptionId, row);
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
    if (this.missingTable && sql.includes("plan_subscriptions")) {
      throw Object.assign(
        new Error('relation "plan_subscriptions" does not exist'),
        { code: "42P01" },
      );
    }

    if (
      sql ===
      "SELECT user_id, tier, billing_cycle FROM plan_subscriptions WHERE stripe_subscription_id = $1"
    ) {
      const row = this.subscriptions.get(p[0]);
      return result(
        row
          ? [
              {
                user_id: row.user_id,
                tier: row.tier,
                billing_cycle: row.billing_cycle,
              },
            ]
          : [],
      );
    }

    if (
      sql ===
      "INSERT INTO transactions (business_id, user_id, amount, currency, type, status, reference) VALUES (NULL, $1, $2, $3, $4, 'completed', $5) ON CONFLICT DO NOTHING RETURNING id"
    ) {
      if (this.transactions.some((t) => t.reference === p[4])) return result();
      const row = {
        id: ++this.transactionSeq,
        user_id: p[0],
        amount: p[1],
        currency: p[2],
        type: p[3],
        reference: p[4],
      };
      this.transactions.push(row);
      undo?.push(() => {
        this.transactions = this.transactions.filter((t) => t !== row);
      });
      return result([{ id: row.id }]);
    }

    if (
      sql ===
      "INSERT INTO plan_subscriptions (user_id, stripe_subscription_id, stripe_customer_id, tier, billing_cycle, status, current_period_end) VALUES ($1, $2, $3, $4, $5, 'active', $6) ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = 'active', current_period_end = GREATEST(plan_subscriptions.current_period_end, EXCLUDED.current_period_end), updated_at = NOW()"
    ) {
      const existing = this.subscriptions.get(p[1]);
      const periodEnd = new Date(p[5]);
      if (existing) {
        const before = { ...existing };
        existing.status = "active";
        existing.current_period_end = later(
          existing.current_period_end,
          periodEnd,
        );
        undo?.push(() => Object.assign(existing, before));
      } else {
        this.subscriptions.set(p[1], {
          user_id: p[0],
          stripe_subscription_id: p[1],
          stripe_customer_id: p[2],
          tier: p[3],
          billing_cycle: p[4],
          status: "active",
          current_period_end: periodEnd,
        });
        undo?.push(() => this.subscriptions.delete(p[1]));
      }
      return result();
    }

    if (
      sql ===
      "UPDATE users SET subscription_tier = $1, subscription_status = 'active', premium_expires_at = GREATEST(premium_expires_at, $2::timestamp) WHERE id = $3"
    ) {
      const user = this.users.get(Number(p[2]));
      if (!user) return result();
      const before = { ...user };
      user.subscription_tier = p[0];
      user.subscription_status = "active";
      user.premium_expires_at = later(user.premium_expires_at, new Date(p[1]));
      undo?.push(() => Object.assign(user, before));
      return result([{}]);
    }

    if (
      sql ===
      "UPDATE plan_subscriptions SET status = 'past_due', updated_at = NOW() WHERE stripe_subscription_id = $1 AND status = 'active' RETURNING user_id"
    ) {
      const row = this.subscriptions.get(p[0]);
      if (!row || row.status !== "active") return result();
      row.status = "past_due";
      undo?.push(() => {
        row.status = "active";
      });
      return result([{ user_id: row.user_id }]);
    }

    if (
      sql ===
      "UPDATE users SET subscription_status = 'past_due' WHERE id = $1 AND subscription_status = 'active' AND subscription_tier != 'free'"
    ) {
      const user = this.users.get(Number(p[0]));
      if (
        !user ||
        user.subscription_status !== "active" ||
        user.subscription_tier === "free"
      ) {
        return result();
      }
      user.subscription_status = "past_due";
      undo?.push(() => {
        user.subscription_status = "active";
      });
      return result([{}]);
    }

    if (
      sql ===
      "UPDATE plan_subscriptions SET status = 'cancelled', updated_at = NOW() WHERE stripe_subscription_id = $1 AND status <> 'cancelled' RETURNING user_id"
    ) {
      const row = this.subscriptions.get(p[0]);
      if (!row || row.status === "cancelled") return result();
      const before = row.status;
      row.status = "cancelled";
      undo?.push(() => {
        row.status = before;
      });
      return result([{ user_id: row.user_id }]);
    }

    if (
      sql ===
      "INSERT INTO notifications (user_id, type, title, message, created_at) VALUES ($1, 'subscription', $2, $3, NOW())"
    ) {
      this.notifications.push({ user_id: p[0], title: p[1], message: p[2] });
      return result();
    }

    if (
      sql ===
      "SELECT tier, billing_cycle, status FROM plan_subscriptions WHERE user_id = $1 AND status IN ('active', 'past_due') ORDER BY id DESC LIMIT 1"
    ) {
      const rows = [...this.subscriptions.values()]
        .filter(
          (s) =>
            String(s.user_id) === String(p[0]) &&
            (s.status === "active" || s.status === "past_due"),
        )
        .reverse()
        .slice(0, 1)
        .map(({ tier, billing_cycle, status }) => ({
          tier,
          billing_cycle,
          status,
        }));
      return result(rows);
    }

    throw new Error(`FakePlanDb: unexpected SQL: ${sql}`);
  }
}

/** A Stripe invoice as an endpoint on an older API version (2025-02-24.acacia) sends it. */
export function invoiceEvent(
  overrides: {
    id?: string;
    subscription?: string | null;
    amountPaid?: number;
    periodEnd?: number | null;
    customer?: any;
    metadata?: Record<string, string> | null;
    shape?: "acacia" | "basil";
  } = {},
): Record<string, any> {
  const {
    id = "in_1",
    subscription = "sub_1",
    amountPaid = 9600,
    periodEnd = 1_800_000_000,
    customer = "cus_1",
    metadata = {
      userId: "7",
      targetTier: "verified",
      billingCycle: "monthly",
      type: "subscription_fee",
    },
    shape = "acacia",
  } = overrides;
  const base: Record<string, any> = {
    id,
    object: "invoice",
    customer,
    amount_paid: amountPaid,
    lines: {
      data:
        periodEnd === null
          ? []
          : [{ period: { start: periodEnd - 2_592_000, end: periodEnd } }],
    },
  };
  if (!subscription) return base;
  if (shape === "basil") {
    return {
      ...base,
      parent: {
        type: "subscription_details",
        subscription_details: {
          subscription,
          ...(metadata ? { metadata } : {}),
        },
      },
    };
  }
  return {
    ...base,
    subscription,
    ...(metadata ? { subscription_details: { metadata } } : {}),
  };
}
