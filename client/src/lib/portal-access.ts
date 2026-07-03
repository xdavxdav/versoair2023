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
  | "geo-admin"
  | "community"
  | "contractor"
  | "admin";

/** Map of every portal → boolean access */
export type PortalAccess = Record<PortalId, boolean>;

// ─── Universal base portals (every authenticated user) ─────────────────────

const BASE_PORTALS: PortalId[] = ["general", "streamer"];

// ─── Admin / elevated roles that unlock everything ─────────────────────────

const ADMIN_ROLES = new Set(["admin", "moderator", "superuser"]);

// ─── Unlock-reason text for locked portals ─────────────────────────────────

export const UNLOCK_REASONS: Record<string, string> = {
  artist: "Create an artist profile to unlock",
  "geo-admin": "Upgrade to Premium to unlock",
  community: "Join the community to unlock",
  contractor: "Register as a contractor to unlock",
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
      "geo-admin": false,
      community: false,
      contractor: false,
      admin: false,
    };
  }

  const role = capabilities?.role || user.role || "user";

  // Admin override — everything open
  if (ADMIN_ROLES.has(role)) {
    return {
      general: true,
      streamer: true,
      artist: true,
      "geo-admin": true,
      community: true,
      contractor: true,
      admin: true,
    };
  }

  // Start with server portals array if available
  const serverPortals = capabilities?.portals ?? user.portals ?? [];

  // Base: every authenticated user gets general + streamer
  const access: PortalAccess = {
    general: true,
    streamer: true,
    artist: false,
    "geo-admin": false,
    community: false,
    contractor: false,
    admin: false,
  };

  // Trust server portals first
  for (const p of serverPortals) {
    if (p in access) {
      access[p as PortalId] = true;
    }
  }

  // Client-side derivation fallback (if server hasn't computed yet)
  if (capabilities) {
    if (capabilities.hasArtistProfile) access.artist = true;
    if (capabilities.isContractor) access.contractor = true;
    if (capabilities.canAccessBlog) access.community = true;
    if (
      capabilities.subscriptionTier &&
      capabilities.subscriptionTier !== "free"
    ) {
      access["geo-admin"] = true;
    }
  } else {
    // Derive from AuthUser fields
    if (user.hasArtistProfile) access.artist = true;
    if (user.isContractor) access.contractor = true;
    if (user.canAccessBlog) access.community = true;
    const tier = user.subscriptionTier || user.subscription_tier || "free";
    if (tier !== "free") access["geo-admin"] = true;
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
  return (Object.keys(access) as PortalId[]).filter((id) => access[id]);
}
