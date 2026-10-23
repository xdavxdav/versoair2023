/**
 * portal-access.ts — Pure functions for the unified additive portal access system.
 *
 * Architecture:
 *   Account Tier  (free → premium → business → enterprise) = what you pay
 *   Special Roles (artist, geo_admin, contractor, moderator, admin) = what you do
 *   Portal Access: ADDITIVE — every authenticated user gets base portals,
 *                  then unlocks stack on top via tier / role / profile ownership.
 *
 * The server's `computeUserCapabilities()` is the canonical source of truth.
 * These client-side functions mirror the logic so the UI can gate
 * synchronously without waiting for a network round-trip.
 */

import type { UserCapabilities } from "@/hooks/useCapabilities";
import type { AuthUser } from "@/contexts/AuthContext";

// ─── Portal identifiers ────────────────────────────────────────────────────

export type PortalId =
  | "general"
  | "streamer"
  | "artist"
  | "artisan"
  | "geo-admin"
  | "community"
  | "contractor"
  | "careers"
  | "admin";

/** Map of every portal → boolean access */
export type PortalAccess = Record<PortalId, boolean>;

export const PORTAL_ORDER: readonly PortalId[] = [
  "general",
  "artist",
  "geo-admin",
  "community",
  "streamer",
  "contractor",
  "artisan",
  "careers",
  "admin",
];

// ─── Universal base portals (every authenticated user) ─────────────────────

const BASE_PORTALS: PortalId[] = ["general", "streamer"];

// ─── Elevated roles granted broad access by computeUserCapabilities ────────

const ELEVATED_ROLES = new Set(["admin", "moderator", "superuser"]);

// ─── Unlock-reason text for locked portals ─────────────────────────────────

export const UNLOCK_REASONS: Record<string, string> = {
  artist: "Create an artist profile to unlock",
  artisan: "Create an artisan craft profile to unlock",
  "geo-admin": "Upgrade for paid read-only access",
  community: "Join the community to unlock",
  contractor: "Register as a contractor to unlock",
  careers: "Post a job as a business owner to unlock",
  admin: "Staff only",
};

// ─── Core computation ──────────────────────────────────────────────────────

/**
 * Build a full PortalAccess map from server capabilities + AuthContext user.
 *
 * Priority:
 *   1. Server portals[] (capabilities.portals) — authoritative
 *   2. AuthUser.portals (embedded in JWT / session) — fallback
 *   3. Client-side derivation from capability flags — last resort
 */
export function getPortalAccess(
  capabilities: UserCapabilities | null,
  user: AuthUser | null,
): PortalAccess {
  // Not authenticated → everything locked except general (read-only)
  if (!user) {
    return {
      general: false,
      streamer: false,
      artist: false,
      artisan: false,
      "geo-admin": false,
      community: false,
      contractor: false,
      careers: false,
      admin: false,
    };
  }

  const role = capabilities?.role || user.role || "user";

  // Start with server portals array if available
  const serverPortals = capabilities?.portals ?? user.portals ?? [];

  // Base: every authenticated user gets general + streamer
  const access: PortalAccess = {
    general: true,
    streamer: true,
    artist: false,
    artisan: false,
    "geo-admin": false,
    community: false,
    contractor: false,
    careers: false,
    admin: false,
  };

  // Trust server portals first
  for (const p of serverPortals) {
    if (p in access) {
      access[p as PortalId] = true;
    }
  }

  access.admin = role === "admin" || role === "superuser";

  // Server portal grants are authoritative. Derive only while they are not
  // available, and never infer GeoAdmin from a paid tier without its grant.
  if (!capabilities) {
    if (ELEVATED_ROLES.has(role)) {
      access.artist = true;
      access["geo-admin"] = true;
      access.contractor = true;
      access.careers = true;
      access.community = true;
    }
    if (role === "artist") access.artist = true;
    if (user.hasArtistProfile) access.artist = true;
    if (user.isContractor) access.contractor = true;
    if (user.canAccessBlog) access.community = true;
    const tier = String(
      user.subscriptionTier || user.subscription_tier || "free",
    ).toLowerCase();
    if (!ELEVATED_ROLES.has(role) && tier === "free") {
      access["geo-admin"] = true;
    }
  }

  return access;
}

/**
 * Check if a specific portal is accessible.
 */
export function canAccessPortal(
  capabilities: UserCapabilities | null,
  user: AuthUser | null,
  portalId: PortalId,
): boolean {
  return getPortalAccess(capabilities, user)[portalId];
}

/**
 * Return list of portal IDs the user can access.
 */
export function getAccessiblePortalIds(
  capabilities: UserCapabilities | null,
  user: AuthUser | null,
): PortalId[] {
  const access = getPortalAccess(capabilities, user);
  return PORTAL_ORDER.filter((id) => access[id]);
}
