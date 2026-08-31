import type { AuthUser } from "@/contexts/AuthContext";

export interface DashboardDestination {
  path: string;
  label: string;
}

export interface DashboardTheme {
  shell: string;
  accent: string;
  primary: string;
  secondary: string;
  label: string;
}

const STAFF_ROLES = new Set(["admin", "moderator", "superuser", "tsr"]);

export function getDashboardTheme(user: AuthUser | null | undefined): DashboardTheme {
  const role = normalizeAccountRoleFromEmail(
    user?.email,
    user?.role,
  ).toLowerCase();
  const portals = (user?.portals || []).map((portal) => portal.toLowerCase());

  if (STAFF_ROLES.has(role) || role === "geo-admin") {
    return {
      shell: "bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50",
      accent: "from-amber-500 to-orange-500",
      primary: "text-amber-700",
      secondary: "text-orange-600",
      label: "Geo Admin",
    };
  }

  if (role === "creator" || role === "artist" || user?.hasArtistProfile || portals.includes("artist")) {
    return {
      shell: "bg-gradient-to-br from-rose-950 via-fuchsia-950 to-amber-950",
      accent: "from-rose-500 to-amber-400",
      primary: "text-rose-200",
      secondary: "text-amber-200",
      label: "Artist Portal",
    };
  }

  if (role === "contractor" || user?.isContractor || portals.includes("contractor")) {
    return {
      shell: "bg-gradient-to-br from-emerald-950 via-teal-900 to-amber-900",
      accent: "from-emerald-500 to-amber-400",
      primary: "text-emerald-200",
      secondary: "text-amber-200",
      label: "Contractor Portal",
    };
  }

  if (role === "creator" || portals.includes("music") || portals.includes("streamer")) {
    return {
      shell: "bg-gradient-to-br from-violet-950 via-purple-950 to-fuchsia-950",
      accent: "from-violet-500 to-fuchsia-500",
      primary: "text-violet-200",
      secondary: "text-fuchsia-200",
      label: "Musical Universe",
    };
  }

  return {
    shell: "bg-gradient-to-br from-sky-50 via-white to-cyan-50",
    accent: "from-sky-500 to-cyan-500",
    primary: "text-sky-700",
    secondary: "text-cyan-600",
    label: "General Account",
  };
}

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
