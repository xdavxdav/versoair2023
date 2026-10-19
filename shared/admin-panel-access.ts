/**
 * GeoAdmin Admin Panel delegation policy.
 *
 * Invited Admins operate the business/content sections. Account, security,
 * configuration, database and implementation-tracking areas stay with the owner.
 */

export const DELEGATED_ADMIN_PANEL_SECTIONS = [
  "dashboard",
  "businesses",
  "categories",
  "jobs",
  "advertising",
  "marketplace",
  "artists",
  "analytics",
  "cms",
  "contractor-apps",
  "community-ops",
  "events",
  "geo-queue",
  "contractor-assign",
] as const;

export const OWNER_ONLY_ADMIN_PANEL_SECTIONS = [
  "users",
  "roles",
  "security",
  "smtp",
  "tsr-whitelist",
  "artisan-profiles",
] as const;

/** Audit entities an invited Admin manages and may therefore see in the activity log. */
export const DELEGATED_ADMIN_AUDIT_ENTITIES = [
  "artist",
  "business",
  "campaign",
  "category",
  "job",
] as const;

export function canUseAdminPanel(
  user: { role?: string | null } | null | undefined,
  isOwner: boolean,
): boolean {
  return isOwner || user?.role === "admin";
}

export function canAccessAdminPanelSection(
  section: string,
  isOwner: boolean,
): boolean {
  if (isOwner) {
    return (
      (DELEGATED_ADMIN_PANEL_SECTIONS as readonly string[]).includes(section) ||
      (OWNER_ONLY_ADMIN_PANEL_SECTIONS as readonly string[]).includes(section)
    );
  }
  return (DELEGATED_ADMIN_PANEL_SECTIONS as readonly string[]).includes(section);
}
