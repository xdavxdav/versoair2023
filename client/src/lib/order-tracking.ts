/** Order statuses that mean the payment has been confirmed by the server. */
const PAID_STATUSES = ["paid", "processing", "shipped", "completed"];
/** Set by the Stripe dispute webhook; the order list shows them, the checkout banner has nothing to add. */
const DISPUTE_STATUSES = ["disputed", "chargeback"];

export const ORDER_POLL_INTERVAL_MS = 3_000;
/** How long to keep checking before telling the customer it is taking long. */
export const ORDER_POLL_WINDOW_MS = 60_000;

export type CheckoutBanner =
  | "confirmed"
  | "confirming"
  | "delayed"
  | "cancelled"
  | "refunded";

export interface TrackedOrder {
  id: number | string;
  status?: string | null;
}

export function findOrder(
  orders: readonly TrackedOrder[] | null | undefined,
  orderId: string | null | undefined,
): TrackedOrder | undefined {
  if (!orderId || !Array.isArray(orders)) return undefined;
  return orders.find((order) => String(order.id) === orderId);
}

/**
 * What to tell a customer who has just come back from Stripe Checkout.
 * Returning to the success URL does not prove the payment went through: only
 * the server's own record of the order does, once the Stripe webhook has
 * marked it paid. Until then the customer is told it is being confirmed.
 */
export function checkoutBanner(input: {
  returnedFromCheckout: boolean;
  orderStatus: string | null | undefined;
  waitedLong: boolean;
}): CheckoutBanner | null {
  if (!input.returnedFromCheckout) return null;

  const status = String(input.orderStatus ?? "").toLowerCase();
  if (PAID_STATUSES.includes(status)) return "confirmed";
  if (status === "cancelled") return "cancelled";
  if (status === "refunded") return "refunded";
  if (DISPUTE_STATUSES.includes(status)) return null;
  return input.waitedLong ? "delayed" : "confirming";
}

/** Milliseconds until the next check, or false once there is nothing to wait for. */
export function nextOrderPoll(input: {
  returnedFromCheckout: boolean;
  orders: readonly TrackedOrder[] | null | undefined;
  orderId: string | null | undefined;
  waitedLong: boolean;
}): number | false {
  if (!input.returnedFromCheckout || input.waitedLong) return false;

  const order = findOrder(input.orders, input.orderId);
  const status = String(order?.status ?? "").toLowerCase();
  const settled = Boolean(order) && status !== "pending";
  return settled ? false : ORDER_POLL_INTERVAL_MS;
}
