import type { AuthUser } from "@/contexts/AuthContext";

export interface DashboardDestination {
  path: string;
  label: string;
}

const STAFF_ROLES = new Set(["admin", "moderator", "superuser", "tsr"]);

export function normalizeAccountRoleFromEmail(
  email?: string,
  fallbackRole?: string,
): string {
  const normalizedEmail = (email || "").toLowerCase();
  const normalizedRole = (fallbackRole || "").toLowerCase();

  if (
    normalizedEmail.includes("@versoair-gu") ||
    normalizedEmail.includes("@versoair.gu") ||
    normalizedEmail.includes("@versoair-general") ||
    normalizedEmail.includes("@versoair-generaluser")
  ) {
    return "user";
  }

  if (
    normalizedEmail.includes("@versoair-geoa") ||
    normalizedEmail.includes("@versoair.geoa") ||
    normalizedEmail.includes("@versoair-geo-admin") ||
    normalizedEmail.includes("@versoair-geoa") ||
    normalizedEmail.includes("@versoair-geo")
  ) {
    return "geo-admin";
  }

  if (
    normalizedEmail.includes("@versoair-supa") ||
    normalizedEmail.includes("@versoair.supa") ||
    normalizedEmail.includes("@versoair-superadmin") ||
    normalizedEmail.includes("@versoair-admin")
  ) {
    return "superuser";
  }

  if (
    normalizedEmail.includes("@versoair-art") ||
    normalizedEmail.includes("@versoair.art") ||
    normalizedEmail.includes("@versoair-artist")
  ) {
    return "artist";
  }

  if (
    normalizedEmail.includes("@versoair-cr") ||
    normalizedEmail.includes("@versoair.cr") ||
    normalizedEmail.includes("@versoair-creator") ||
    normalizedEmail.includes("@versoair-creator-user")
  ) {
    return "creator";
  }

  if (
    normalizedRole &&
    [
      "admin",
      "moderator",
      "superuser",
      "tsr",
      "artist",
      "creator",
      "geo-admin",
      "contractor",
      "user",
    ].includes(normalizedRole)
  ) {
    return normalizedRole;
  }

  return normalizedRole || "user";
}

export function getDashboardDestination(
  user: AuthUser | null | undefined,
): DashboardDestination {
  const role = normalizeAccountRoleFromEmail(
    user?.email,
    user?.role,
  ).toLowerCase();
  const portals = (user?.portals || []).map((portal) => portal.toLowerCase());

  if (STAFF_ROLES.has(role)) {
    return { path: "/geo-admin/dashboard", label: "GeoAdmin Dashboard" };
  }

  if (role === "geo-admin") {
    return { path: "/geo-admin/dashboard", label: "GeoAdmin Dashboard" };
  }

  if (role === "creator") {
    return { path: "/music/dashboard", label: "Music Dashboard" };
  }

  if (
    role === "artist" ||
    user?.hasArtistProfile ||
    portals.includes("artist")
  ) {
    return { path: "/artist-portal/dashboard", label: "Artist Dashboard" };
  }

  if (
    role === "contractor" ||
    user?.isContractor ||
    portals.includes("contractor")
  ) {
    return { path: "/contracts", label: "Contractor Dashboard" };
  }

  return { path: "/dashboard", label: "Dashboard" };
}
