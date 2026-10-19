const GEOADMIN_STAFF_ROLES = new Set(["admin", "moderator", "superuser", "tsr"]);
const GEOADMIN_SUBSCRIBER_TIERS = new Set(["max", "enterprise"]);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export interface GeoAdminAccountAccess {
  role?: string | null;
  isAdmin?: boolean | null;
  tier?: string | null;
  subscriptionStatus?: string | null;
}

export function isGeoAdminStaff(account: GeoAdminAccountAccess): boolean {
  return account.isAdmin === true || GEOADMIN_STAFF_ROLES.has(account.role ?? "");
}

export function isReadOnlyGeoAdminSubscriber(
  account: GeoAdminAccountAccess,
): boolean {
  return (
    !isGeoAdminStaff(account) &&
    GEOADMIN_SUBSCRIBER_TIERS.has(account.tier ?? "") &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(account.subscriptionStatus ?? "active")
  );
}
