import { getDashboardDestination } from "./dashboard-routes";
import type { AuthUser } from "@/contexts/AuthContext";

export interface PortalChoice {
  id: string;
  name: string;
  detail: string;
  path: string;
}

export interface PortalPreferenceIdentity {
  id?: string | number | null;
  userId?: string | number | null;
  email?: string | null;
}

export function getPortalPreferenceStorageKey(
  user: PortalPreferenceIdentity,
): string | null {
  const accountId = user.id ?? user.userId;
  const normalizedEmail = user.email?.trim().toLowerCase();
  const identity =
    accountId !== undefined && accountId !== null
      ? `id:${accountId}`
      : normalizedEmail
        ? `email:${normalizedEmail}`
        : null;

  return identity
    ? `versoair:preferred-portal:${encodeURIComponent(identity)}`
    : null;
}

export function getEligiblePreferredPortal<T extends PortalChoice>(
  choices: readonly T[],
  preferredPortalId: string | null,
): T | null {
  return (
    choices.find((portal) => portal.id === preferredPortalId) ?? null
  );
}

const STAFF_WORKSPACE_PATH = "/geo-admin/workspace";
const STAFF_ONLY_PATHS = [
  "/geo-admin/dashboard",
  "/geo-admin/workspace",
  "/admin",
];

function isStaffOnlyPath(pathname: string | null): boolean {
  return STAFF_ONLY_PATHS.some(
    (path) => pathname === path || pathname?.startsWith(`${path}/`),
  );
}

export function getRoleAwareRedirectPath(
  user: AuthUser,
  requestedPath: string | null,
): string | null {
  const roleHome = getDashboardDestination(user).path;
  const isStaff = roleHome === STAFF_WORKSPACE_PATH;

  if (
    isStaff &&
    (!requestedPath || requestedPath === "/" || requestedPath === "/dashboard")
  ) {
    return roleHome;
  }

  const requestedPathname = requestedPath?.split(/[?#]/)[0] ?? null;
  if (!isStaff && isStaffOnlyPath(requestedPathname)) {
    return roleHome;
  }

  return requestedPath;
}

export function getRecommendedPortalId(
  user: AuthUser,
  choices: readonly PortalChoice[],
): string | null {
  const destination = getDashboardDestination(user).path;
  const portals = (user.portals ?? []).map((portal) => portal.toLowerCase());
  const recommendedPath =
    portals.includes("community") && !portals.includes("artist")
      ? "/blog"
      : destination;
  const matchingChoice = choices.find(
    (portal) => portal.path === recommendedPath,
  );

  return matchingChoice?.id ?? choices[0]?.id ?? null;
}

export function sortPortalChoices<T extends PortalChoice>(
  choices: readonly T[],
  recommendedPortalId: string | null,
): T[] {
  return [...choices].sort((left, right) => {
    if (left.id === recommendedPortalId) return -1;
    if (right.id === recommendedPortalId) return 1;
    return 0;
  });
}
