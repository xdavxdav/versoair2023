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

export type AccountFamily =
  | "general"
  | "geo-admin"
  | "artist"
  | "artisan"
  | "streamer"
  | "contractor"
  | "staff";

const STAFF_ROLES = new Set(["admin", "moderator", "superuser", "tsr"]);
const STREAMER_ALIASES = new Set([
  "streamer",
  "listener",
  "creator",
  "music",
  "musical",
  "musical-universe",
  "streaming",
]);

export function getAccountFamily(
  user: AuthUser | null | undefined,
): AccountFamily {
  const role = normalizeAccountRoleFromEmail(
    user?.email,
    user?.role,
  ).toLowerCase();
  const portals = (user?.portals || []).map((portal) => portal.toLowerCase());

  if (STAFF_ROLES.has(role)) return "staff";
  if (role === "geo-admin" || portals.includes("geo-admin")) return "geo-admin";
  if (role === "artist" || user?.hasArtistProfile || portals.includes("artist"))
    return "artist";
  if (portals.includes("artisan")) return "artisan";
  if (
    role === "contractor" ||
    user?.isContractor ||
    portals.includes("contractor")
  )
    return "contractor";
  if (portals.includes("community")) return "general";
  if (
    STREAMER_ALIASES.has(role) ||
    portals.includes("music") ||
    portals.includes("musical")
  )
    return "streamer";

  return "general";
}

export function getDashboardTheme(
  user: AuthUser | null | undefined,
): DashboardTheme {
  const family = getAccountFamily(user);

  switch (family) {
    case "staff":
      return {
        shell: "bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50",
        accent: "from-amber-500 to-orange-500",
        primary: "text-amber-700",
        secondary: "text-orange-600",
        label: "Staff Portal",
      };
    case "geo-admin":
      return {
        shell: "bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-50",
        accent: "from-yellow-500 to-amber-500",
        primary: "text-yellow-700",
        secondary: "text-orange-600",
        label: "Geo Admin",
      };
    case "artist":
      return {
        shell: "bg-gradient-to-br from-rose-950 via-fuchsia-950 to-amber-950",
        accent: "from-rose-500 to-amber-400",
        primary: "text-rose-200",
        secondary: "text-amber-200",
        label: "Artist Portal",
      };
    case "artisan":
      return {
        shell: "bg-gradient-to-br from-emerald-50 via-white to-teal-50",
        accent: "from-emerald-600 to-teal-600",
        primary: "text-emerald-800",
        secondary: "text-teal-700",
        label: "Artisan Portal",
      };
    case "streamer":
      return {
        shell: "bg-gradient-to-br from-slate-50 via-white to-fuchsia-50",
        accent: "from-violet-600 to-fuchsia-600",
        primary: "text-violet-800",
        secondary: "text-fuchsia-700",
        label: "Musical Universe",
      };
    case "contractor":
      return {
        shell: "bg-gradient-to-br from-emerald-950 via-teal-900 to-amber-900",
        accent: "from-emerald-500 to-amber-400",
        primary: "text-emerald-200",
        secondary: "text-amber-200",
        label: "Contractor Portal",
      };
    case "general":
    default:
      return {
        shell: "bg-gradient-to-br from-sky-50 via-white to-cyan-50",
        accent: "from-sky-500 to-cyan-500",
        primary: "text-sky-700",
        secondary: "text-cyan-600",
        label: "General Account",
      };
  }
}

export function normalizeAccountRoleFromEmail(
  _email?: string,
  fallbackRole?: string,
): string {
  const normalizedRole = (fallbackRole || "").toLowerCase();

  if (
    normalizedRole &&
    [
      "admin",
      "moderator",
      "superuser",
      "tsr",
      "artist",
      "creator",
      "streamer",
      "music",
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
  const family = getAccountFamily(user);

  switch (family) {
    case "staff":
      return { path: "/geo-admin/workspace", label: "Staff Dashboard" };
    case "geo-admin":
      return { path: "/geo-admin/dashboard", label: "GeoAdmin Dashboard" };
    case "artist":
      return { path: "/artist-portal/dashboard", label: "Artist Dashboard" };
    case "streamer":
      return { path: "/stream", label: "Musical Universe" };
    case "contractor":
      return { path: "/contracts", label: "Contractor Dashboard" };
    case "general":
    default:
      return { path: "/dashboard", label: "Dashboard" };
  }
}
