export const GEOADMIN_STAFF_ROLES = new Set([
  "admin",
  "superuser",
  "moderator",
  "tsr",
]);

const PAID_SUBSCRIPTION_TIERS = new Set([
  "essential",
  "verified",
  "max",
  "enterprise",
]);

export interface GeoAdminAccessState {
  role: string | null | undefined;
  subscriptionTier: string | null | undefined;
  subscriptionStatus: string | null | undefined;
  subscriptionExpiresAt: Date | string | null | undefined;
  addonStatus: string | null | undefined;
  addonBaseTier: string | null | undefined;
  addonExpiresAt: Date | string | null | undefined;
}

function isAfterNow(value: Date | string | null | undefined, now: Date) {
  return value == null || new Date(value).getTime() > now.getTime();
}

export function hasActivePaidSubscription(
  state: Pick<
    GeoAdminAccessState,
    "subscriptionTier" | "subscriptionStatus" | "subscriptionExpiresAt"
  >,
  now = new Date(),
) {
  return (
    PAID_SUBSCRIPTION_TIERS.has(state.subscriptionTier ?? "") &&
    state.subscriptionStatus === "active" &&
    isAfterNow(state.subscriptionExpiresAt, now)
  );
}

export function hasGeoAdminAccess(
  state: GeoAdminAccessState,
  now = new Date(),
) {
  if (GEOADMIN_STAFF_ROLES.has(state.role ?? "")) return true;

  return (
    hasActivePaidSubscription(state, now) &&
    state.addonStatus === "active" &&
    state.addonBaseTier === state.subscriptionTier &&
    state.addonExpiresAt != null &&
    isAfterNow(state.addonExpiresAt, now)
  );
}
