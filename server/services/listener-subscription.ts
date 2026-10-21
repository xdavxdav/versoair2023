import { pool } from "../db";

export type ListenerTier = "guest" | "supporter" | "champion" | "patron";

export function normalizeListenerTier(
  planName: string | null | undefined,
): ListenerTier {
  switch (planName?.trim().toLowerCase()) {
    case "gratuit":
    case "free":
    case "guest":
      return "guest";
    case "supporter":
      return "supporter";
    case "champion":
      return "champion";
    case "patron":
      return "patron";
    default:
      throw new Error(`Unknown listener subscription plan: ${planName}`);
  }
}

export async function getActiveListenerSubscription(userId: number) {
  const result = await pool.query(
    `SELECT ls.id, ls.plan_id, ls.status, ls.stripe_subscription_id,
            ls.current_period_start, ls.current_period_end,
            sp.name AS plan_name, sp.monthly_fee
     FROM listener_subscriptions ls
     JOIN streaming_plans sp ON sp.id = ls.plan_id
     WHERE ls.user_id = $1 AND ls.status = 'active'
     ORDER BY sp.monthly_fee DESC, ls.created_at DESC
     LIMIT 1`,
    [userId],
  );

  const subscription = result.rows[0];
  if (!subscription) return null;

  return {
    ...subscription,
    tier: normalizeListenerTier(subscription.plan_name),
  };
}
