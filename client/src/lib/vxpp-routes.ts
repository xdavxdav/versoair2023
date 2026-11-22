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
