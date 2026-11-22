/**
 * Canonical route & section definitions for vxpp (VersoAirApp).
 * Keeps legacy URLs intact while mapping them into one unified app shell.
 */

export type VxppSection =
  | "feed"
  | "communities"
  | "messages"
  | "marketplace"
  | "profile"
  | "careers"
  | "contractors";

const VXPP_EXACT_ROUTES = new Set<string>([
  "/vxpp",
  "/blog",
  "/profile",
  "/profile/settings",
  "/messages",
  "/communities",
  "/community",
  "/marketplace",
  "/services/careers",
  "/services/careers/dashboard",
  "/services/contractors",
  "/contracts",
]);

const VXPP_PREFIX_ROUTES = [
  "/vxpp/",
  "/blog/",
  "/profile/",
  "/user/",
  "/messages/",
  "/communities/",
  "/community/",
  "/marketplace/",
  "/services/careers/",
  "/services/contractors/",
  "/contracts/",
];

export function normalizeVxppPath(path: string): string {
  const clean = (path || "/").split("?")[0].split("#")[0].replace(/\/+$/, "");
  return clean || "/";
}

export function isVxppRoute(path: string): boolean {
  const normalized = normalizeVxppPath(path);
  if (VXPP_EXACT_ROUTES.has(normalized)) return true;
  return VXPP_PREFIX_ROUTES.some((prefix) => normalized.startsWith(prefix));
}

export function getVxppSection(path: string): VxppSection | null {
  const p = normalizeVxppPath(path);
  if (p === "/vxpp" || p.startsWith("/vxpp/") || p === "/blog" || p.startsWith("/blog/")) {
    return "feed";
  }
  if (p === "/communities" || p.startsWith("/communities/") || p === "/community" || p.startsWith("/community/")) {
    return "communities";
  }
  if (p === "/messages" || p.startsWith("/messages/")) {
    return "messages";
  }
  if (p === "/marketplace" || p.startsWith("/marketplace/")) {
    return "marketplace";
  }
  if (p === "/profile" || p.startsWith("/profile/") || p.startsWith("/user/")) {
    return "profile";
  }
  if (p === "/services/careers" || p.startsWith("/services/careers/")) {
    return "careers";
  }
  if (p === "/services/contractors" || p.startsWith("/services/contractors/") || p === "/contracts" || p.startsWith("/contracts/")) {
    return "contractors";
  }
  return null;
}

export function getVxppFallbackBack(path: string): string {
  const p = normalizeVxppPath(path);
  if (p.startsWith("/user/")) return "/blog";
  if (p === "/profile/settings") return "/profile";
  if (p === "/services/careers/dashboard") return "/services/careers";
  if (p === "/contracts") return "/services/contractors";
  return "/blog";
}

export interface VxppRoleUser {
  role?: string | null;
  accountType?: string | null;
  isAdmin?: boolean;
  isContractor?: boolean;
  portals?: string[] | null;
}

export interface VxppRoleServices {
  showCareers: boolean;
  showContractors: boolean;
  isEmployer: boolean;
  isContractor: boolean;
  mobileQuickService: "careers" | "contractors";
}

/**
 * Determine which specialized Services links a user sees in vxpp so a
 * contractor sees Contractors (not Careers) and a job seeker / general member
 * sees Careers (not Contractors). Staff and guests can discover both.
 */
export function resolveVxppRoleServices(
  user: VxppRoleUser | null | undefined,
): VxppRoleServices {
  if (!user) {
    return {
      showCareers: true,
      showContractors: true,
      isEmployer: false,
      isContractor: false,
      mobileQuickService: "careers",
    };
  }

  const role = String(user.role || "").toLowerCase();
  const portals = Array.isArray(user.portals) ? user.portals : [];
  const isStaff =
    Boolean(user.isAdmin) ||
    ["admin", "superuser", "moderator"].includes(role);
  const isContractor =
    Boolean(user.isContractor) ||
    role === "contractor" ||
    portals.includes("contractor");
  const isEmployer =
    user.accountType === "business_owner" ||
    role === "business_owner" ||
    portals.includes("careers");

  if (isStaff) {
    return {
      showCareers: true,
      showContractors: true,
      isEmployer: true,
      isContractor,
      mobileQuickService: "careers",
    };
  }

  if (isContractor && !isEmployer) {
    return {
      showCareers: false,
      showContractors: true,
      isEmployer: false,
      isContractor: true,
      mobileQuickService: "contractors",
    };
  }

  if (isContractor && isEmployer) {
    return {
      showCareers: true,
      showContractors: true,
      isEmployer: true,
      isContractor: true,
      mobileQuickService: "careers",
    };
  }

  return {
    showCareers: true,
    showContractors: false,
    isEmployer,
    isContractor: false,
    mobileQuickService: "careers",
  };
}
