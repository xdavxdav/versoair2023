import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { geoAdminInvitations, users } from "@shared/schema";
import {
  GEOADMIN_INVITATION_TTL_MS,
  getInvitationClaimFailure,
  type GeoAdminInvitableRole,
  type InvitationClaimFailure,
} from "@shared/geoadmin-invitation";
// Type-only import keeps this module loadable in tests without DATABASE_URL.
import type { db as Database } from "../db";

// ─── Tokens ──────────────────────────────────────────────────────────────────

const TOKEN_PREFIX = "gai_";
const TOKEN_PATTERN = /^gai_[A-Za-z0-9_-]{43}$/;
// Purpose-binding the hash means a token minted for another flow (e.g. a
// password reset) can never match a stored invitation hash.
const TOKEN_HASH_PURPOSE = "geoadmin-invitation:v1:";

export function isWellFormedGeoAdminInvitationToken(token: unknown) {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

export function hashGeoAdminInvitationToken(token: string): string {
  return createHash("sha256")
    .update(`${TOKEN_HASH_PURPOSE}${token}`)
    .digest("hex");
}

export function generateGeoAdminInvitationToken() {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { token, tokenHash: hashGeoAdminInvitationToken(token) };
}

export function invitationTokenMatchesHash(token: string, tokenHash: string) {
  const expected = Buffer.from(hashGeoAdminInvitationToken(token), "hex");
  const actual = Buffer.from(tokenHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function getGeoAdminInvitationExpiry(now = new Date()) {
  return new Date(now.getTime() + GEOADMIN_INVITATION_TTL_MS);
}

// ─── Acceptance ──────────────────────────────────────────────────────────────

export interface ClaimedGeoAdminInvitation {
  id: number;
  email: string;
  gateUsername: string;
  role: GeoAdminInvitableRole;
  invitedBy: number | null;
}

export interface GeoAdminInvitationTxStore {
  /** Atomically flips a live pending invitation to accepted; null if none. */
  claimPendingInvitation(
    tokenHash: string,
    now: Date,
  ): Promise<ClaimedGeoAdminInvitation | null>;
  findInvitationByTokenHash(
    tokenHash: string,
  ): Promise<{ status: string; expiresAt: Date } | null>;
  findUserConflict(
    email: string,
    gateUsername: string,
  ): Promise<"email" | "gate_username" | null>;
  isUsernameTaken(username: string): Promise<boolean>;
  createStaffUser(data: {
    username: string;
    email: string;
    passwordHash: string;
    role: GeoAdminInvitableRole;
    gateUsername: string;
    verifiedAt: Date;
  }): Promise<{ id: number }>;
  linkAcceptedUser(invitationId: number, userId: number): Promise<void>;
}

export interface GeoAdminInvitationStore {
  transaction<T>(fn: (tx: GeoAdminInvitationTxStore) => Promise<T>): Promise<T>;
}

export type AcceptGeoAdminInvitationResult =
  | {
      ok: true;
      userId: number;
      invitation: ClaimedGeoAdminInvitation;
    }
  | { ok: false; status: number; code: string; message: string };

const CLAIM_FAILURES: Record<
  InvitationClaimFailure,
  { status: number; code: string; message: string }
> = {
  not_found: {
    status: 400,
    code: "INVITATION_INVALID",
    message: "This invitation link is invalid.",
  },
  already_used: {
    status: 410,
    code: "INVITATION_ALREADY_USED",
    message: "This invitation has already been used.",
  },
  revoked: {
    status: 410,
    code: "INVITATION_REVOKED",
    message: "This invitation has been revoked.",
  },
  expired: {
    status: 410,
    code: "INVITATION_EXPIRED",
    message: "This invitation has expired. Ask a superuser for a new one.",
  },
};

class AcceptConflict extends Error {
  constructor(readonly field: "email" | "gate_username" | "username") {
    super(`GeoAdmin invitation acceptance conflict: ${field}`);
  }
}

async function allocateUsername(
  tx: GeoAdminInvitationTxStore,
  gateUsername: string,
) {
  const base = gateUsername.slice(0, 50) || "geoadmin";
  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const suffixText = suffix === 1 ? "" : `_${suffix}`;
    const candidate = base.slice(0, 50 - suffixText.length) + suffixText;
    if (!(await tx.isUsernameTaken(candidate))) return candidate;
  }
  throw new AcceptConflict("username");
}

/**
 * Accepts an invitation exactly once. The claim, conflict checks, user
 * creation and link happen in one transaction; any conflict rolls the claim
 * back so the invitation stays pending and no account is created.
 */
export async function acceptGeoAdminInvitation(
  input: { token: string; password: string },
  deps: {
    store: GeoAdminInvitationStore;
    hashPassword: (password: string) => Promise<string>;
    isUniqueViolation?: (error: unknown) => boolean;
    now?: () => Date;
  },
): Promise<AcceptGeoAdminInvitationResult> {
  if (!isWellFormedGeoAdminInvitationToken(input.token)) {
    return { ok: false, ...CLAIM_FAILURES.not_found };
  }

  const tokenHash = hashGeoAdminInvitationToken(input.token);
  const now = deps.now?.() ?? new Date();
  const passwordHash = await deps.hashPassword(input.password);

  try {
    return await deps.store.transaction(async (tx) => {
      const invitation = await tx.claimPendingInvitation(tokenHash, now);
      if (!invitation) {
        const existing = await tx.findInvitationByTokenHash(tokenHash);
        const failure = getInvitationClaimFailure(existing, now) ?? "not_found";
        return { ok: false as const, ...CLAIM_FAILURES[failure] };
      }

      const conflict = await tx.findUserConflict(
        invitation.email,
        invitation.gateUsername,
      );
      if (conflict) throw new AcceptConflict(conflict);

      const username = await allocateUsername(tx, invitation.gateUsername);
      const user = await tx.createStaffUser({
        username,
        email: invitation.email,
        passwordHash,
        role: invitation.role,
        gateUsername: invitation.gateUsername,
        verifiedAt: now,
      });
      await tx.linkAcceptedUser(invitation.id, user.id);

      return { ok: true as const, userId: user.id, invitation };
    });
  } catch (error) {
    if (error instanceof AcceptConflict || deps.isUniqueViolation?.(error)) {
      return {
        ok: false,
        status: 409,
        code: "ACCOUNT_CONFLICT",
        message:
          "An account with this email or gate username already exists. Contact a superuser.",
      };
    }
    throw error;
  }
}

// ─── Drizzle store ───────────────────────────────────────────────────────────

type Db = typeof Database;
type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

function createTxStore(executor: DbOrTx): GeoAdminInvitationTxStore {
  return {
    async claimPendingInvitation(tokenHash, now) {
      const [row] = await executor
        .update(geoAdminInvitations)
        .set({ status: "accepted", acceptedAt: now })
        .where(
          and(
            eq(geoAdminInvitations.tokenHash, tokenHash),
            eq(geoAdminInvitations.status, "pending"),
            gt(geoAdminInvitations.expiresAt, now),
          ),
        )
        .returning({
          id: geoAdminInvitations.id,
          email: geoAdminInvitations.email,
          gateUsername: geoAdminInvitations.gateUsername,
          role: geoAdminInvitations.role,
          invitedBy: geoAdminInvitations.invitedBy,
        });
      if (!row) return null;
      if (row.role !== "admin" && row.role !== "moderator") {
        throw new Error(`Invalid GeoAdmin invitation role: ${row.role}`);
      }
      return { ...row, role: row.role };
    },

    async findInvitationByTokenHash(tokenHash) {
      const [row] = await executor
        .select({
          status: geoAdminInvitations.status,
          expiresAt: geoAdminInvitations.expiresAt,
        })
        .from(geoAdminInvitations)
        .where(eq(geoAdminInvitations.tokenHash, tokenHash))
        .limit(1);
      return row ?? null;
    },

    async findUserConflict(email, gateUsername) {
      const [byEmail] = await executor
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1);
      if (byEmail) return "email";
      const [byGate] = await executor
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.gateUsername}) = ${gateUsername}`)
        .limit(1);
      return byGate ? "gate_username" : null;
    },

    async isUsernameTaken(username) {
      const [row] = await executor
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = ${username}`)
        .limit(1);
      return !!row;
    },

    async createStaffUser(data) {
      // subscriptionTier is intentionally left at its default ('free'):
      // staff access never grants a paid plan.
      const [row] = await executor
        .insert(users)
        .values({
          username: data.username,
          email: data.email,
          password: data.passwordHash,
          role: data.role,
          isVerified: true,
          verifiedAt: data.verifiedAt,
          gateUsername: data.gateUsername,
          portalAccess: ["general", "geo-admin"],
          mustChangePassword: false,
        })
        .returning({ id: users.id });
      return row;
    },

    async linkAcceptedUser(invitationId, userId) {
      await executor
        .update(geoAdminInvitations)
        .set({ acceptedUserId: userId })
        .where(eq(geoAdminInvitations.id, invitationId));
    },
  };
}

export function createDrizzleGeoAdminInvitationStore(
  database: Db,
): GeoAdminInvitationStore {
  return {
    transaction: (fn) => database.transaction((tx) => fn(createTxStore(tx))),
  };
}
