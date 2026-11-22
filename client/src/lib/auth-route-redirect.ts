export function getLegacySignInRedirect(search: string, hash: string): string {
  return `/auth/signin${renameReturnTo(search)}${hash}`;
}

const AUTH_REQUIRED_ROUTE_FALLBACKS: ReadonlyArray<{
  match: (pathname: string) => boolean;
  fallback: string;
}> = [
  {
    match: (p) =>
      p === "/messages" ||
      p.startsWith("/messages/") ||
      p === "/profile" ||
      p.startsWith("/profile/"),
    fallback: "/blog",
  },
  {
    match: (p) => p === "/services/careers/dashboard",
    fallback: "/services/careers",
  },
  {
    match: (p) => p === "/contracts" || p.startsWith("/contracts/"),
    fallback: "/services/contractors",
  },
  {
    match: (p) => p === "/artisans-portal" || p.startsWith("/artisans-portal/"),
    fallback: "/artisans",
  },
  {
    match: (p) =>
      p === "/library" ||
      p === "/analytics" ||
      p === "/my-live-sessions" ||
      p === "/versavids" ||
      p.startsWith("/music/"),
    fallback: "/stream",
  },
  {
    match: (p) => p === "/marketing/order-tracking",
    fallback: "/marketing",
  },
  {
    match: (p) =>
      p === "/dashboard" ||
      p.startsWith("/dashboard/") ||
      p === "/tickets" ||
      p.startsWith("/account/") ||
      p === "/ad-campaigns" ||
      p === "/apply/business" ||
      p === "/inventory" ||
      p === "/admin" ||
      p.startsWith("/admin/") ||
      p.startsWith("/sys/") ||
      p === "/geo-admin/dashboard" ||
      p === "/geo-admin/workspace" ||
      p === "/geo-admin/business-verification",
    fallback: "/",
  },
];

export function isAuthRequiredPath(pathname: string): boolean {
  const normalized = (pathname || "/").replace(/\/+$/, "") || "/";
  return AUTH_REQUIRED_ROUTE_FALLBACKS.some((entry) => entry.match(normalized));
}

/**
 * Resolve a safe non-bouncing Back destination for a signed-out visitor on /auth/signin.
 * If `redirect` points to an auth-gated route (e.g. /messages or /profile), going back
 * directly to it would immediately bounce back to /auth/signin; map it to its safe
 * public parent instead.
 */
export function getSafeSignInBackTarget(
  target: string | null,
  origin: string,
): string | null {
  const safe = getSafeReturnPath(target, origin);
  if (!safe) return null;
  try {
    const url = new URL(safe, origin);
    const normalized = url.pathname.replace(/\/+$/, "") || "/";
    for (const entry of AUTH_REQUIRED_ROUTE_FALLBACKS) {
      if (entry.match(normalized)) {
        return entry.fallback;
      }
    }
    return safe;
  } catch {
    return null;
  }
}

export function getSafeReturnPath(
  target: string | null,
  origin: string,
): string | null {
  if (
    !target?.startsWith("/") ||
    target.startsWith("//") ||
    target.includes("\\")
  ) {
    return null;
  }

  try {
    const url = new URL(target, origin);
    if (url.origin !== origin || url.pathname === "/auth/signin") {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

// Older links carry the destination as `returnTo`, but the sign-in page only reads `redirect`.
function renameReturnTo(search: string): string {
  if (!search.startsWith("?")) return search;

  const parts = search.slice(1).split("&");
  const keyOf = (part: string) => part.split("=", 1)[0];
  if (parts.some((part) => keyOf(part) === "redirect")) return search;

  const index = parts.findIndex((part) => keyOf(part) === "returnTo");
  if (index === -1) return search;

  parts[index] = `redirect${parts[index].slice("returnTo".length)}`;
  return `?${parts.join("&")}`;
}
