export type SubscriptionOwnerResult =
  | { ok: true; userId: number }
  | { ok: false; status: 401 | 403; error: string };

export function resolveSubscriptionOwner(
  authenticatedUserId: unknown,
  requestedUserId: unknown,
): SubscriptionOwnerResult {
  const userId = Number(authenticatedUserId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return {
      ok: false,
      status: 401,
      error: "Authentication required",
    };
  }
  if (
    requestedUserId !== undefined &&
    requestedUserId !== null &&
    String(requestedUserId) !== String(userId)
  ) {
    return {
      ok: false,
      status: 403,
      error: "Cannot change another user's subscriptions",
    };
  }
  return { ok: true, userId };
}
