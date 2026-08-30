import type { AuthUser } from "@/contexts/AuthContext";

export interface DashboardDestination {
  path: string;
  label: string;
}

const STAFF_ROLES = new Set(["admin", "moderator", "superuser", "tsr"]);

export function getDashboardDestination(
  user: AuthUser | null | undefined,
): DashboardDestination {
  const role = user?.role?.toLowerCase();
  const portals = (user?.portals || []).map((portal) => portal.toLowerCase());

  if (role && STAFF_ROLES.has(role)) {
    return { path: "/geo-admin/dashboard", label: "GeoAdmin Dashboard" };
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
