/**
 * Order lifecycle rules for staff status changes.
 *
 * An order becomes "paid" only through the Stripe webhook, which checks the
 * amount that was actually collected; staff can never mark an unpaid order as
 * paid or move an order back to pending. "cancelled" is only for orders that
 * were never paid (a paid order is refunded instead), and both cancelled and
 * refunded are final.
 */
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["cancelled"],
  paid: ["processing", "shipped", "completed", "refunded"],
  processing: ["shipped", "completed", "refunded"],
  shipped: ["completed", "refunded"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

/** Statuses an order in `from` may move to; empty for a final or unknown status. */
export function allowedNextStatuses(from: unknown): readonly OrderStatus[] {
  return isOrderStatus(from) ? TRANSITIONS[from] : [];
}

/** Statuses from which an order may move to `to`. */
export function statusesThatCanMoveTo(to: OrderStatus): OrderStatus[] {
  return ORDER_STATUSES.filter((from) => TRANSITIONS[from].includes(to));
}
