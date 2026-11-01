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
