import { z } from "zod";

/**
 * Invite-only GeoAdmin access: shared validation and pure policy helpers.
 * Server routes and the client form both rely on these rules, so they must
 * stay free of Node-only or database dependencies.
 */

export const GEOADMIN_INVITABLE_ROLES = ["admin", "moderator"] as const;
export type GeoAdminInvitableRole = (typeof GEOADMIN_INVITABLE_ROLES)[number];

export const GEOADMIN_INVITATION_TTL_MS = 72 * 60 * 60 * 1000;
export const GEOADMIN_INVITATION_ACCEPT_PATH = "/geo-admin/accept-invitation";

export function buildGeoAdminInvitationUrl(appUrl: string, token: string) {
  return `${appUrl.replace(/\/+$/, "")}${GEOADMIN_INVITATION_ACCEPT_PATH}?token=${encodeURIComponent(token)}`;
}

export const GEOADMIN_INVITATION_STATUSES = [
  "pending",
  "accepted",
  "revoked",
  "expired",
  "delivery_failed",
] as const;
export type GeoAdminInvitationStatus =
  (typeof GEOADMIN_INVITATION_STATUSES)[number];

const RESERVED_TLDS = new Set([
  "test",
  "example",
  "invalid",
  "localhost",
  "local",
  "localdomain",
  "internal",
  "lan",
  "home",
  "corp",
  "intranet",
  "onion",
]);

const RESERVED_DOMAINS = new Set(["example.com", "example.net", "example.org"]);

const RESERVED_GATE_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "superuser",
  "superadmin",
  "system",
  "support",
  "owner",
  "joel_007",
]);

export function normalizeInvitationEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeGateUsername(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Returns a human-readable reason when an address cannot receive a real
 * invitation (reserved/test TLDs, IP literals) or would be mapped to a
 * privileged role by the legacy email-domain role heuristics.
 */
export function getUndeliverableEmailReason(email: string): string | null {
  const normalized = normalizeInvitationEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return "Invalid email address";

  const domain = normalized.slice(at + 1);
  if (domain.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) {
    return "IP-literal email addresses are not accepted";
  }

  const labels = domain.split(".");
  if (labels.length < 2 || labels.some((label) => label.length === 0)) {
    return "Email domain must be a fully qualified domain";
  }

  const tld = labels[labels.length - 1];
  if (RESERVED_TLDS.has(tld) || RESERVED_DOMAINS.has(domain)) {
    return "Invitations require a real, deliverable email address (test and reserved domains are rejected)";
  }

  // Legacy capability code derives roles (including superuser) from
  // @versoair-* / @versoair.* domains; never let an invite target those.
  if (
    domain !== "versoair.com" &&
    (domain.startsWith("versoair-") || domain.startsWith("versoair."))
  ) {
    return "This email domain is reserved for internal accounts";
  }

  return null;
}

export const geoAdminInvitationEmailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .email("Invalid email address")
  .superRefine((value, ctx) => {
    const reason = getUndeliverableEmailReason(value);
    if (reason) ctx.addIssue({ code: z.ZodIssueCode.custom, message: reason });
  });

export const geoAdminGateUsernameSchema = z
  .string({ required_error: "Gate username is required" })
  .trim()
  .toLowerCase()
  .min(3, "Gate username must be at least 3 characters")
  .max(50, "Gate username must be at most 50 characters")
  .regex(
    /^[a-z0-9_]+$/,
    "Gate username may only contain letters, numbers, and underscores",
  )
  .refine((value) => !RESERVED_GATE_USERNAMES.has(value), {
    message: "This gate username is reserved",
  });

export const geoAdminInvitationRoleSchema = z.enum(GEOADMIN_INVITABLE_ROLES, {
  errorMap: () => ({ message: "Role must be either admin or moderator" }),
});

/** `.strict()` rejects extra keys such as `permissions` or `portalAccess`. */
export const createGeoAdminInvitationSchema = z
  .object({
    email: geoAdminInvitationEmailSchema,
    gateUsername: geoAdminGateUsernameSchema,
    role: geoAdminInvitationRoleSchema,
  })
  .strict();

export type CreateGeoAdminInvitationInput = z.infer<
  typeof createGeoAdminInvitationSchema
>;

export const GEOADMIN_PASSWORD_MIN_LENGTH = 12;

export const geoAdminPasswordSchema = z
  .string({ required_error: "Password is required" })
  .min(
    GEOADMIN_PASSWORD_MIN_LENGTH,
    `Password must be at least ${GEOADMIN_PASSWORD_MIN_LENGTH} characters`,
  )
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a digit");

export const acceptGeoAdminInvitationSchema = z
  .object({
    token: z
      .string({ required_error: "Invitation token is required" })
      .trim()
      .min(1, "Invitation token is required")
      .max(256, "Invalid invitation token"),
    password: geoAdminPasswordSchema,
  })
  .strict();

export const acceptExistingGeoAdminInvitationSchema = z
  .object({
    token: z
      .string({ required_error: "Invitation token is required" })
      .trim()
      .min(1, "Invitation token is required")
      .max(256, "Invalid invitation token"),
  })
  .strict();

// ─── Access-entry identifiers ────────────────────────────────────────────────
// Pending invitations and active accounts live in different tables, so the
// list/revoke contract uses prefixed ids to keep them unambiguous.

export type GeoAdminAccessId =
  { kind: "invitation"; id: number } | { kind: "user"; id: number };

export function formatGeoAdminAccessId(ref: GeoAdminAccessId): string {
  return ref.kind === "invitation" ? `inv_${ref.id}` : `user_${ref.id}`;
}

export function parseGeoAdminAccessId(value: string): GeoAdminAccessId | null {
  const match = /^(inv|user)_([1-9]\d{0,9})$/.exec(value);
  if (!match) return null;
  const id = Number(match[2]);
  if (!Number.isSafeInteger(id) || id > 2_147_483_647) return null;
  return { kind: match[1] === "inv" ? "invitation" : "user", id };
}

// ─── Invitation claim policy ─────────────────────────────────────────────────

export type InvitationClaimFailure =
  "not_found" | "already_used" | "revoked" | "expired";

export function getInvitationClaimFailure(
  invitation: { status: string; expiresAt: Date | string } | null | undefined,
  now = new Date(),
): InvitationClaimFailure | null {
  if (!invitation) return "not_found";
  if (invitation.status === "accepted") return "already_used";
  if (invitation.status === "revoked") return "revoked";
  if (invitation.status === "expired") return "expired";
  if (invitation.status !== "pending") return "not_found";
  if (new Date(invitation.expiresAt).getTime() <= now.getTime()) {
    return "expired";
  }
  return null;
}

// ─── Revocation policy ───────────────────────────────────────────────────────

export interface GeoAdminRevocationTarget {
  id: number;
  email: string;
  username?: string | null;
  role: string | null;
  previousRole?: string | null;
  gateUsername: string | null;
  portalAccess: string[] | null;
}

export function canLinkExistingUserToGeoAdmin(user: {
  role: string | null;
  previousRole?: string | null;
  gateUsername: string | null;
  portalAccess: string[] | null;
  isVerified: boolean | null;
}) {
  return (
    user.isVerified === true &&
    ["user", "business_owner", "artist", "listener"].includes(user.role ?? "") &&
    user.previousRole == null &&
    user.gateUsername == null &&
    !user.portalAccess?.includes("geo-admin")
  );
}

export interface GeoAdminRevocationBlocker {
  status: 403 | 404;
  code: string;
  message: string;
}

const PROTECTED_ROLES = new Set(["superuser", "superadmin"]);
const OWNER_USERNAMES = new Set(["joel_007"]);

function isInvitableRole(role: string | null | undefined) {
  return (GEOADMIN_INVITABLE_ROLES as readonly string[]).includes(role ?? "");
}

export function isGeoAdminStaffAccount(target: GeoAdminRevocationTarget) {
  const holdsStaffRole =
    isInvitableRole(target.role) || isInvitableRole(target.previousRole);
  const hasGeoAdminMarker =
    !!target.gateUsername ||
    (Array.isArray(target.portalAccess) &&
      target.portalAccess.includes("geo-admin"));
  return holdsStaffRole && hasGeoAdminMarker;
}

export function getGeoAdminRevocationBlocker(
  target: GeoAdminRevocationTarget,
  actor: { id: number },
  ownerEmail?: string | null,
): GeoAdminRevocationBlocker | null {
  if (target.id === actor.id) {
    return {
      status: 403,
      code: "SELF_REVOCATION_FORBIDDEN",
      message: "You cannot revoke your own GeoAdmin access.",
    };
  }

  const normalizedOwner = (ownerEmail ?? "").trim().toLowerCase();
  const isOwner =
    (normalizedOwner !== "" &&
      target.email.trim().toLowerCase() === normalizedOwner) ||
    OWNER_USERNAMES.has((target.username ?? "").toLowerCase()) ||
    OWNER_USERNAMES.has((target.gateUsername ?? "").toLowerCase());
  if (
    isOwner ||
    PROTECTED_ROLES.has(target.role ?? "") ||
    PROTECTED_ROLES.has(target.previousRole ?? "")
  ) {
    return {
      status: 403,
      code: "PROTECTED_ACCOUNT",
      message: "Superuser and owner accounts cannot be revoked here.",
    };
  }

  if (!isGeoAdminStaffAccount(target)) {
    return {
      status: 404,
      code: "GEOADMIN_ACCESS_NOT_FOUND",
      message: "No active GeoAdmin admin/moderator access found for this id.",
    };
  }

  return null;
}

/** Accepted invitation linked to a managed GeoAdmin account. */
export interface GeoAdminInvitationLink {
  status: string;
  acceptedUserId: number | null;
  email: string;
  role: string;
}

/**
 * The staff role an account holds for GeoAdmin management purposes; staff in
 * artist mode keep their staff role in previousRole.
 */
export function getGeoAdminManagedStaffRole(
  target: Pick<GeoAdminRevocationTarget, "role" | "previousRole">,
): GeoAdminInvitableRole | null {
  if (isInvitableRole(target.role)) return target.role as GeoAdminInvitableRole;
  if (target.role === "artist" && isInvitableRole(target.previousRole)) {
    return target.previousRole as GeoAdminInvitableRole;
  }
  return null;
}

/**
 * The invite-only manager may only see or revoke accounts linked to an
 * accepted invitation that still matches the invitation's email and role.
 */
export function isInvitationLinkedGeoAdmin(
  target: GeoAdminRevocationTarget,
  invitation: GeoAdminInvitationLink | null | undefined,
): boolean {
  if (!invitation || invitation.status !== "accepted") return false;
  if (invitation.acceptedUserId !== target.id) return false;
  if (
    normalizeInvitationEmail(target.email) !==
    normalizeInvitationEmail(invitation.email)
  ) {
    return false;
  }
  const staffRole = getGeoAdminManagedStaffRole(target);
  return staffRole !== null && staffRole === invitation.role;
}

/** Revocation blocker for the invite-only manager (adds the invitation link). */
export function getGeoAdminManagedRevocationBlocker(
  target: GeoAdminRevocationTarget,
  invitation: GeoAdminInvitationLink | null | undefined,
  actor: { id: number },
  ownerEmail?: string | null,
): GeoAdminRevocationBlocker | null {
  const blocker = getGeoAdminRevocationBlocker(target, actor, ownerEmail);
  if (blocker) return blocker;
  if (!isInvitationLinkedGeoAdmin(target, invitation)) {
    return {
      status: 404,
      code: "GEOADMIN_ACCESS_NOT_FOUND",
      message: "No active GeoAdmin admin/moderator access found for this id.",
    };
  }
  return null;
}

/**
 * Account changes applied when invitation-linked GeoAdmin access is revoked.
 * Existing accounts retain their original role and non-staff portal access.
 */
export function buildGeoAdminRevocationUpdate(
  target: GeoAdminRevocationTarget,
) {
  const wasInvitedFromExistingAccount =
    isInvitableRole(target.role) &&
    target.previousRole != null &&
    !isInvitableRole(target.previousRole);
  const preservedPortals = (target.portalAccess ?? ["general"]).filter(
    (portal) => portal !== "geo-admin",
  );
  return {
    // Restore an existing account's role while stripping staff markers.
    // An artist-mode staff member keeps "artist" but loses its stored staff
    // role so the restore-staff-role endpoint cannot bring it back.
    role: wasInvitedFromExistingAccount
      ? target.previousRole!
      : isInvitableRole(target.role)
        ? "user"
        : (target.role ?? "user"),
    previousRole: null,
    gateUsername: null,
    portalAccess: preservedPortals.length > 0 ? preservedPortals : ["general"],
  };
}
