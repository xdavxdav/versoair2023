import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { and, desc, eq, inArray, isNotNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  activeSessions,
  auditLogs,
  geoAdminInvitations,
  users,
} from "@shared/schema";
import {
  acceptExistingGeoAdminInvitationSchema,
  acceptGeoAdminInvitationSchema,
  buildGeoAdminRevocationUpdate,
  canLinkExistingUserToGeoAdmin,
  createGeoAdminInvitationSchema,
  formatGeoAdminAccessId,
  GEOADMIN_INVITABLE_ROLES,
  getGeoAdminManagedRevocationBlocker,
  getGeoAdminManagedStaffRole,
  parseGeoAdminAccessId,
  type GeoAdminInvitableRole,
} from "@shared/geoadmin-invitation";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireOwner } from "../middleware/auth";
import { invitationAcceptLimiter } from "../middleware/rate-limiter";
import { sendGeoAdminInvitationEmail } from "../services/email-service";
import {
  acceptGeoAdminInvitation,
  createDrizzleGeoAdminInvitationStore,
  generateGeoAdminInvitationToken,
  getGeoAdminInvitationExpiry,
} from "../services/geoadmin-invitations";
import { isUniqueConstraintViolation } from "../utils/postgres-errors";
import { createGeoAdminCredentialRouter } from "./geoadmin-credentials";
import {
  GEOADMIN_HISTORY_ACTIONS,
  geoAdminHistoryQuerySchema,
  toGeoAdminHistoryEntry,
} from "@shared/geoadmin-access-history";

// Mounted inside the /auth router. Management endpoints are superuser-only
// (requireAuth re-reads the role from the DB); only the exact accept path is
// listed in PUBLIC_PATHS.
const router = Router();

const PASSWORD_SALT_ROUNDS = 12;
const superuserOnly = requireOwner;

type GeoAdminAccessEntry = {
  id: string;
  email: string;
  gateUsername: string;
  role: GeoAdminInvitableRole;
  status: "pending" | "active";
};

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
) {
  return res
    .status(status)
    .json({ success: false, message, error: { code, message } });
}

function requestMeta(req: Request) {
  return {
    ipAddress: String(req.ip ?? req.socket?.remoteAddress ?? "unknown"),
    userAgent: req.get("user-agent") ?? null,
  };
}

async function writeAudit(
  req: Request,
  entry: {
    userId: number | null;
    action: string;
    entityType: string;
    entityId: string;
    changes: Record<string, unknown>;
  },
) {
  await db
    .insert(auditLogs)
    .values({ ...entry, ...requestMeta(req) })
    .catch((error) =>
      console.error(`[AUDIT] Failed to record ${entry.action}:`, error),
    );
}

router.use(createGeoAdminCredentialRouter({
  authorizeOwner: superuserOnly,
  audit: async (req, kind) => {
    await db.insert(auditLogs).values({
      userId: Number(req.user!.userId),
      action: "GEOADMIN_OWNER_CREDENTIAL_DRAFT_GENERATED",
      entityType: "user",
      entityId: String(req.user!.userId),
      changes: { kind, activated: false, email: req.user!.email },
      ...requestMeta(req),
    });
  },
}));

class GeoAdminAccessChangedError extends Error {
  constructor() {
    super("GeoAdmin access changed during revocation");
  }
}

function isInvitableRole(role: unknown): role is GeoAdminInvitableRole {
  return (GEOADMIN_INVITABLE_ROLES as readonly unknown[]).includes(role);
}

async function expireStalePendingInvitations() {
  await db.transaction(async (tx) => {
    const expired = await tx
      .update(geoAdminInvitations)
      .set({ status: "expired" })
      .where(
        and(
          eq(geoAdminInvitations.status, "pending"),
          lte(geoAdminInvitations.expiresAt, new Date()),
        ),
      )
      .returning({
        id: geoAdminInvitations.id,
        email: geoAdminInvitations.email,
        role: geoAdminInvitations.role,
        gateUsername: geoAdminInvitations.gateUsername,
        expiresAt: geoAdminInvitations.expiresAt,
      });
    if (expired.length) {
      await tx.insert(auditLogs).values(expired.map((invitation) => ({
        userId: null,
        action: "GEOADMIN_INVITATION_EXPIRED",
        entityType: "geo_admin_invitation",
        entityId: String(invitation.id),
        changes: { email: invitation.email, role: invitation.role, gateUsername: invitation.gateUsername },
        createdAt: invitation.expiresAt,
      })));
    }
  });
}

router.get(
  "/geoadmin-access/history",
  superuserOnly,
  asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const parsed = geoAdminHistoryQuerySchema.safeParse(req.query);
    if (!parsed.success) return sendError(res, 400, "VALIDATION_ERROR", "Invalid history page.");
    await expireStalePendingInvitations();
    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        changes: auditLogs.changes,
        createdAt: auditLogs.createdAt,
        actorEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(inArray(auditLogs.action, [...GEOADMIN_HISTORY_ACTIONS]))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(51)
      .offset(parsed.data.offset);
    return res.json({
      events: rows.slice(0, 50).map(toGeoAdminHistoryEntry),
      hasMore: rows.length > 50,
    });
  }),
);

// ─── GET /auth/geoadmin-access ───────────────────────────────────────────────

router.get(
  "/geoadmin-access",
  superuserOnly,
  asyncHandler(async (_req: Request, res: Response) => {
    await expireStalePendingInvitations();

    const pending = await db
      .select({
        id: geoAdminInvitations.id,
        email: geoAdminInvitations.email,
        gateUsername: geoAdminInvitations.gateUsername,
        role: geoAdminInvitations.role,
      })
      .from(geoAdminInvitations)
      .where(eq(geoAdminInvitations.status, "pending"))
      .orderBy(geoAdminInvitations.createdAt);

    const staffRoles = [...GEOADMIN_INVITABLE_ROLES];
    // Invite-only: an active entry must be an account created by an accepted
    // invitation that still matches that invitation's email and role.
    const active = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        gateUsername: users.gateUsername,
        role: users.role,
        previousRole: users.previousRole,
        portalAccess: users.portalAccess,
        invitationStatus: geoAdminInvitations.status,
        invitationAcceptedUserId: geoAdminInvitations.acceptedUserId,
        invitationEmail: geoAdminInvitations.email,
        invitationRole: geoAdminInvitations.role,
      })
      .from(users)
      .innerJoin(
        geoAdminInvitations,
        and(
          eq(geoAdminInvitations.acceptedUserId, users.id),
          eq(geoAdminInvitations.status, "accepted"),
          sql`lower(${geoAdminInvitations.email}) = lower(${users.email})`,
          or(
            eq(users.role, geoAdminInvitations.role),
            and(
              eq(users.role, "artist"),
              eq(users.previousRole, geoAdminInvitations.role),
            ),
          ),
        ),
      )
      .where(
        and(
          isNotNull(users.gateUsername),
          or(
            inArray(users.role, staffRoles),
            and(
              eq(users.role, "artist"),
              inArray(users.previousRole, staffRoles),
            ),
          ),
          sql`${users.portalAccess} @> '["geo-admin"]'::jsonb`,
        ),
      )
      .orderBy(users.id);

    const ownerEmail = process.env.SUPERADMIN_EMAIL;
    const seenUserIds = new Set<number>();
    const entries: GeoAdminAccessEntry[] = [
      ...pending.flatMap((inv) =>
        isInvitableRole(inv.role)
          ? [
              {
                id: formatGeoAdminAccessId({ kind: "invitation", id: inv.id }),
                email: inv.email,
                gateUsername: inv.gateUsername,
                role: inv.role,
                status: "pending" as const,
              },
            ]
          : [],
      ),
      ...active.flatMap((user) => {
        if (seenUserIds.has(user.id)) return [];
        seenUserIds.add(user.id);
        const staffRole = getGeoAdminManagedStaffRole(user);
        // Re-applies the full managed policy (owner/superuser exclusion and
        // invitation link) on top of the SQL join.
        const blocker = getGeoAdminManagedRevocationBlocker(
          user,
          {
            status: user.invitationStatus,
            acceptedUserId: user.invitationAcceptedUserId,
            email: user.invitationEmail,
            role: user.invitationRole,
          },
          { id: -1 },
          ownerEmail,
        );
        if (!staffRole || blocker || !user.gateUsername) {
          return [];
        }
        return [
          {
            id: formatGeoAdminAccessId({ kind: "user", id: user.id }),
            email: user.email,
            gateUsername: user.gateUsername,
            role: staffRole,
            status: "active" as const,
          },
        ];
      }),
    ];

    res.json({ success: true, users: entries });
  }),
);

// ─── POST /auth/geoadmin-access ──────────────────────────────────────────────

router.post(
  "/geoadmin-access",
  superuserOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createGeoAdminInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid invitation request",
      );
    }

    const { email, gateUsername, role } = parsed.data;
    const actorId = Number(req.user!.userId);

    const [emailOwner] = await db
      .select({
        id: users.id,
        role: users.role,
        previousRole: users.previousRole,
        gateUsername: users.gateUsername,
        portalAccess: users.portalAccess,
        isVerified: users.isVerified,
      })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    if (
      emailOwner &&
      !canLinkExistingUserToGeoAdmin(emailOwner)
    ) {
      return sendError(
        res,
        409,
        "ACCOUNT_NOT_ELIGIBLE",
        "This existing account cannot be linked to Geo Admin. It must be verified and must not already have staff access.",
      );
    }

    const [gateOwner] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          or(
            sql`lower(${users.gateUsername}) = ${gateUsername}`,
            sql`lower(${users.username}) = ${gateUsername}`,
          ),
          emailOwner ? ne(users.id, emailOwner.id) : undefined,
        ),
      )
      .limit(1);
    if (gateOwner) {
      return sendError(
        res,
        409,
        "GATE_USERNAME_CONFLICT",
        "This gate username is already in use.",
      );
    }

    await expireStalePendingInvitations();

    const { token, tokenHash } = generateGeoAdminInvitationToken();
    const expiresAt = getGeoAdminInvitationExpiry();

    let invitationId: number;
    try {
      const [created] = await db
        .insert(geoAdminInvitations)
        .values({
          email,
          gateUsername,
          role,
          tokenHash,
          status: "pending",
          invitedBy: actorId,
          expiresAt,
        })
        .returning({ id: geoAdminInvitations.id });
      invitationId = created.id;
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return sendError(
          res,
          409,
          "INVITATION_PENDING",
          "A pending invitation already exists for this email or gate username. Revoke it before re-inviting.",
        );
      }
      throw error;
    }

    let delivered = false;
    try {
      delivered = await sendGeoAdminInvitationEmail(email, {
        token,
        role,
        gateUsername,
        expiresAt,
      });
    } catch (error) {
      console.error("[GEOADMIN] Invitation email threw:", error);
    }

    if (!delivered) {
      // The token was never delivered, so it must never become usable.
      await db
        .update(geoAdminInvitations)
        .set({ status: "delivery_failed" })
        .where(eq(geoAdminInvitations.id, invitationId));
      await writeAudit(req, {
        userId: actorId,
        action: "GEOADMIN_INVITATION_DELIVERY_FAILED",
        entityType: "geo_admin_invitation",
        entityId: String(invitationId),
        changes: { email, gateUsername, role },
      });
      console.warn(
        `[ADMIN] GeoAdmin invitation #${invitationId} for ${email} could not be delivered`,
      );
      return sendError(
        res,
        502,
        "EMAIL_DELIVERY_FAILED",
        "The invitation email could not be delivered. No access was granted; please try again.",
      );
    }

    await writeAudit(req, {
      userId: actorId,
      action: "GEOADMIN_INVITATION_CREATED",
      entityType: "geo_admin_invitation",
      entityId: String(invitationId),
      changes: {
        email,
        gateUsername,
        role,
        expiresAt: expiresAt.toISOString(),
      },
    });
    console.log(
      `[ADMIN] Superuser #${actorId} invited ${email} as GeoAdmin ${role} (invitation #${invitationId})`,
    );

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${email}.`,
      user: {
        id: formatGeoAdminAccessId({ kind: "invitation", id: invitationId }),
        email,
        gateUsername,
        role,
        status: "pending",
      } satisfies GeoAdminAccessEntry,
    });
  }),
);

// ─── DELETE /auth/geoadmin-access/:id ────────────────────────────────────────

router.delete(
  "/geoadmin-access/:id",
  superuserOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const ref = parseGeoAdminAccessId(String(req.params.id ?? ""));
    if (!ref) {
      return sendError(res, 400, "INVALID_ID", "Invalid GeoAdmin access id.");
    }
    const actorId = Number(req.user!.userId);

    if (ref.kind === "invitation") {
      const [revoked] = await db
        .update(geoAdminInvitations)
        .set({ status: "revoked", revokedAt: new Date(), revokedBy: actorId })
        .where(
          and(
            eq(geoAdminInvitations.id, ref.id),
            eq(geoAdminInvitations.status, "pending"),
          ),
        )
        .returning({
          id: geoAdminInvitations.id,
          email: geoAdminInvitations.email,
          gateUsername: geoAdminInvitations.gateUsername,
          role: geoAdminInvitations.role,
        });

      if (!revoked) {
        const [existing] = await db
          .select({ status: geoAdminInvitations.status })
          .from(geoAdminInvitations)
          .where(eq(geoAdminInvitations.id, ref.id))
          .limit(1);
        return existing
          ? sendError(
              res,
              409,
              "INVITATION_NOT_PENDING",
              `This invitation is no longer pending (status: ${existing.status}).`,
            )
          : sendError(
              res,
              404,
              "INVITATION_NOT_FOUND",
              "Invitation not found.",
            );
      }

      await writeAudit(req, {
        userId: actorId,
        action: "GEOADMIN_INVITATION_REVOKED",
        entityType: "geo_admin_invitation",
        entityId: String(revoked.id),
        changes: {
          email: revoked.email,
          gateUsername: revoked.gateUsername,
          role: revoked.role,
        },
      });
      console.log(
        `[ADMIN] Superuser #${actorId} cancelled GeoAdmin invitation #${revoked.id} (${revoked.email})`,
      );
      return res.json({
        success: true,
        message: `Pending invitation for ${revoked.email} cancelled.`,
      });
    }

    const [target] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        previousRole: users.previousRole,
        gateUsername: users.gateUsername,
        portalAccess: users.portalAccess,
      })
      .from(users)
      .where(eq(users.id, ref.id))
      .limit(1);

    if (!target) {
      return sendError(
        res,
        404,
        "GEOADMIN_ACCESS_NOT_FOUND",
        "No active GeoAdmin admin/moderator access found for this id.",
      );
    }

    // Only accounts created by an accepted invitation are managed here, so an
    // unrelated pre-existing admin/moderator can never be downgraded.
    const [invitation] = await db
      .select({
        id: geoAdminInvitations.id,
        status: geoAdminInvitations.status,
        acceptedUserId: geoAdminInvitations.acceptedUserId,
        email: geoAdminInvitations.email,
        role: geoAdminInvitations.role,
      })
      .from(geoAdminInvitations)
      .where(
        and(
          eq(geoAdminInvitations.acceptedUserId, target.id),
          eq(geoAdminInvitations.status, "accepted"),
        ),
      )
      .orderBy(desc(geoAdminInvitations.id))
      .limit(1);

    const blocker = getGeoAdminManagedRevocationBlocker(
      target,
      invitation,
      { id: actorId },
      process.env.SUPERADMIN_EMAIL,
    );
    if (blocker || !invitation) {
      const denial = blocker ?? {
        status: 404,
        code: "GEOADMIN_ACCESS_NOT_FOUND",
        message: "No active GeoAdmin admin/moderator access found for this id.",
      };
      return sendError(res, denial.status, denial.code, denial.message);
    }

    const update = buildGeoAdminRevocationUpdate(target);
    const now = new Date();

    const result = await db
      .transaction(async (tx) => {
        // Consume the invitation link first: a concurrent revocation (or a link
        // that changed since the read) leaves nothing to revoke.
        const [unlinked] = await tx
          .update(geoAdminInvitations)
          .set({ status: "revoked", revokedAt: now, revokedBy: actorId })
          .where(
            and(
              eq(geoAdminInvitations.id, invitation.id),
              eq(geoAdminInvitations.status, "accepted"),
              eq(geoAdminInvitations.acceptedUserId, target.id),
            ),
          )
          .returning({ id: geoAdminInvitations.id });
        if (!unlinked) return null;

        // Re-check the fields the policy depends on inside the write so a
        // concurrent promotion (e.g. to superuser) or email change between read
        // and write cannot be downgraded here.
        const [updated] = await tx
          .update(users)
          .set(update)
          .where(
            and(
              eq(users.id, target.id),
              eq(users.email, target.email),
              target.role === null
                ? sql`${users.role} IS NULL`
                : eq(users.role, target.role),
              target.previousRole == null
                ? sql`${users.previousRole} IS NULL`
                : eq(users.previousRole, target.previousRole),
            ),
          )
          .returning({ id: users.id });
        if (!updated) {
          // Undo the unlink above together with this transaction.
          throw new GeoAdminAccessChangedError();
        }

        const sessions = await tx
          .update(activeSessions)
          .set({
            isRevoked: true,
            revokedAt: now,
            revokedReason: "geoadmin_revoked",
          })
          .where(
            and(
              eq(activeSessions.userId, target.id),
              eq(activeSessions.isRevoked, false),
            ),
          )
          .returning({ id: activeSessions.id });

        await tx
          .update(geoAdminInvitations)
          .set({ status: "revoked", revokedAt: now, revokedBy: actorId })
          .where(
            and(
              eq(geoAdminInvitations.status, "pending"),
              sql`lower(${geoAdminInvitations.email}) = ${target.email.toLowerCase()}`,
            ),
          );

        return { revokedSessions: sessions.length };
      })
      .catch((error) => {
        if (error instanceof GeoAdminAccessChangedError) return null;
        throw error;
      });

    if (!result) {
      return sendError(
        res,
        409,
        "GEOADMIN_ACCESS_CHANGED",
        "This account changed while revoking access. Refresh and try again.",
      );
    }

    await writeAudit(req, {
      userId: actorId,
      action: "GEOADMIN_ACCESS_REVOKED",
      entityType: "user",
      entityId: String(target.id),
      changes: {
        email: target.email,
        before: {
          role: target.role,
          previousRole: target.previousRole,
          gateUsername: target.gateUsername,
          portalAccess: target.portalAccess,
        },
        after: update,
        revokedSessions: result.revokedSessions,
      },
    });
    console.log(
      `[ADMIN] Superuser #${actorId} revoked GeoAdmin access for user #${target.id} (${target.email}); ${result.revokedSessions} session(s) revoked`,
    );

    return res.json({
      success: true,
      message: `GeoAdmin access revoked for ${target.email}.`,
    });
  }),
);

// ─── POST /auth/accept-geoadmin-invitation (public) ──────────────────────────

router.post(
  "/accept-geoadmin-invitation",
  invitationAcceptLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = acceptGeoAdminInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid request",
      );
    }

    const result = await acceptGeoAdminInvitation(parsed.data, {
      store: createDrizzleGeoAdminInvitationStore(db),
      hashPassword: (password) => bcrypt.hash(password, PASSWORD_SALT_ROUNDS),
      isUniqueViolation: (error) => isUniqueConstraintViolation(error),
    });

    if (!result.ok) {
      return sendError(res, result.status, result.code, result.message);
    }

    await writeAudit(req, {
      userId: result.userId,
      action: "GEOADMIN_INVITATION_ACCEPTED",
      entityType: "geo_admin_invitation",
      entityId: String(result.invitation.id),
      changes: {
        email: result.invitation.email,
        gateUsername: result.invitation.gateUsername,
        role: result.invitation.role,
        invitedBy: result.invitation.invitedBy,
        userId: result.userId,
        accessCodeIssued: true,
      },
    });
    console.log(
      `[ADMIN] GeoAdmin invitation #${result.invitation.id} accepted by ${result.invitation.email} (user #${result.userId}, ${result.invitation.role})`,
    );

    res.set("Cache-Control", "no-store");
    return res.status(201).json({
      success: true,
      message:
        "Invitation accepted. Save your one-time GeoAdmin access code; it will not be shown again.",
      geoAdminAccessCode: result.geoAdminAccessCode,
    });
  }),
);

router.post(
  "/accept-geoadmin-invitation-existing",
  requireAuth(),
  invitationAcceptLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = acceptExistingGeoAdminInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid request",
      );
    }

    const result = await acceptGeoAdminInvitation(
      { token: parsed.data.token, existingUserId: Number(req.user!.userId) },
      {
        store: createDrizzleGeoAdminInvitationStore(db),
        isUniqueViolation: (error) => isUniqueConstraintViolation(error),
      },
    );

    if (!result.ok) {
      return sendError(res, result.status, result.code, result.message);
    }

    await writeAudit(req, {
      userId: result.userId,
      action: "GEOADMIN_INVITATION_ACCEPTED",
      entityType: "geo_admin_invitation",
      entityId: String(result.invitation.id),
      changes: {
        email: result.invitation.email,
        gateUsername: result.invitation.gateUsername,
        role: result.invitation.role,
        invitedBy: result.invitation.invitedBy,
        userId: result.userId,
        existingAccount: true,
        accessCodeIssued: true,
      },
    });
    console.log(
      `[ADMIN] GeoAdmin invitation #${result.invitation.id} accepted by existing account ${result.invitation.email} (user #${result.userId}, ${result.invitation.role})`,
    );

    res.set("Cache-Control", "no-store");
    return res.json({
      success: true,
      message:
        "Geo Admin access is linked to your account. Save your one-time GeoAdmin access code; it will not be shown again.",
      geoAdminAccessCode: result.geoAdminAccessCode,
    });
  }),
);

export default router;
