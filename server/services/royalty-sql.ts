export const isPayingListenerStreamSql = `EXISTS (
  SELECT 1
  FROM listener_subscriptions ls
  JOIN streaming_plans sp ON sp.id = ls.plan_id
  WHERE ls.user_id = se.user_id
    AND ls.status IN ('active', 'cancelled')
    AND sp.monthly_fee > 0
    AND ls.current_period_start IS NOT NULL
    AND ls.current_period_start <= se.created_at
    AND (
      ls.current_period_end > se.created_at
      OR (ls.status = 'active' AND ls.current_period_end IS NULL)
    )
)`;
