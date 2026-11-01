import { isGeoAdminStaff } from "../../../shared/geoadmin-access-policy";

export type SubscriberLoginOutcome =
  /** Admin, moderator, owner and TSR accounts never finish on the Subscriber tab. */
  | { kind: "staff-needs-code"; hasServerSession: boolean }
  | { kind: "signed-in"; token: string }
  /** `message` is the server's wording, or null when it sent none. */
  | { kind: "error"; message: string | null };

interface LoginResponse {
  success?: unknown;
  requiresOtp?: unknown;
  token?: unknown;
  message?: unknown;
  user?: { role?: unknown; isAdmin?: unknown } | null;
}

/**
 * Decide what the GeoAdmin Subscriber tab does with a `/auth/login` answer.
 *
 * Staff must use their personal access code (the server only opens the Admin
 * Panel for code-authenticated sessions), so a staff login is never completed
 * here and never sent on to the general sign-in page, which asked for the same
 * credentials a second time.
 */
export function classifySubscriberLogin(data: unknown): SubscriberLoginOutcome {
  const body: LoginResponse =
    data && typeof data === "object" ? (data as LoginResponse) : {};

  if (body.requiresOtp) {
    return { kind: "staff-needs-code", hasServerSession: false };
  }

  if (body.success === true && typeof body.token === "string" && body.token) {
    const role = typeof body.user?.role === "string" ? body.user.role : null;
    if (isGeoAdminStaff({ role, isAdmin: body.user?.isAdmin === true })) {
      return { kind: "staff-needs-code", hasServerSession: true };
    }
    return { kind: "signed-in", token: body.token };
  }

  return {
    kind: "error",
    message:
      typeof body.message === "string" && body.message ? body.message : null,
  };
}

/**
 * The `geoadmin_session` marker in localStorage outlives the server session, so
 * it cannot prove that staff entered their access code. `/auth/session` reports
 * the real answer; only an explicit `false` overrules the marker, and an absent
 * value (older server, or a response that has not arrived yet) leaves it alone.
 */
export function staffSessionLacksAccessCode(
  isStaff: boolean,
  serverReportedCodeAuthenticated: boolean | undefined,
): boolean {
  return isStaff && serverReportedCodeAuthenticated === false;
}

interface PageGuard {
  roles?: readonly string[];
  ownerOnly?: boolean;
}

function isStaffOnlyGuard({ roles, ownerOnly }: PageGuard): boolean {
  if (ownerOnly) return true;
  return (
    Boolean(roles?.length) &&
    (roles ?? []).every((role) => isGeoAdminStaff({ role }))
  );
}

/**
 * Where a guarded page sends a signed-out visitor. Staff-only pages go to the
 * GeoAdmin gate, which asks for the personal access code in the same step; the
 * general sign-in opens a session the Admin Panel then refuses, so staff had to
 * sign in twice.
 */
export function getSignedOutGuardPath(
  returnTo: string,
  guard: PageGuard,
): string {
  const target = encodeURIComponent(returnTo);
  return isStaffOnlyGuard(guard)
    ? `/geo-admin?redirect=${target}`
    : `/auth/signin?redirect=${target}`;
}

/**
 * The staff page the GeoAdmin gate should return to once the access code is
 * accepted. Only same-site staff areas qualify, and never the gate itself.
 */
export function getStaffReturnPath(search: string): string | null {
  const requested = new URLSearchParams(search).get("redirect");
  if (
    !requested ||
    !requested.startsWith("/") ||
    requested.startsWith("//") ||
    requested.includes("\\") ||
    /[\r\n]/.test(requested)
  ) {
    return null;
  }
  const pathname = requested.split(/[?#]/)[0];
  const inStaffArea =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/geo-admin/");
  return inStaffArea ? requested : null;
}
