import { and, desc, eq, gt, lte, or, sql } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import * as schema from "@shared/schema";
import { hasActivePaidSubscription } from "@shared/geoadmin-access";
import { GEOADMIN_PROPOSED_FEE_PERCENTAGES } from "@shared/geoadmin-pricing";
import { getGeoAdminEntitlement } from "../services/geoadmin-entitlement";

const router = Router();
const MARKET_CURRENCY = { CA: "CAD", FR: "EUR", CI: "XOF" } as const;
const proposedFeePercentSchema = z
  .union([
    z.literal(GEOADMIN_PROPOSED_FEE_PERCENTAGES[0]),
    z.literal(GEOADMIN_PROPOSED_FEE_PERCENTAGES[1]),
    z.literal(GEOADMIN_PROPOSED_FEE_PERCENTAGES[2]),
  ])
  .nullable()
  .optional();

const requestSchema = z.object({
  marketCode: z.enum(["CA", "FR", "CI"]),
  businessName: z.string().trim().max(200).optional(),
  businessType: z.string().trim().min(2).max(160),
  studyPriorities: z
    .array(z.string().trim().min(1).max(120))
    .max(12)
    .optional(),
  proposedFeePercent: proposedFeePercentSchema,
});

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    agreedAnnualAmount: z.number().positive().max(1_000_000_000),
    agreedCurrency: z.enum(["CAD", "EUR", "XOF"]),
    reviewNotes: z.string().trim().max(2000).optional(),
  }),
  z.object({
    decision: z.literal("reject"),
    reviewNotes: z.string().trim().max(2000).optional(),
  }),
  z.object({
    decision: z.literal("revoke"),
    reviewNotes: z.string().trim().max(2000).optional(),
  }),
]);

function sendConflict(res: Response, message: string) {
  return res.status(409).json({ success: false, message });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

router.get(
  "/access",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const access = await getGeoAdminEntitlement(Number(req.user!.userId));
    if (!access) {
      res.status(404).json({ success: false, message: "Account not found" });
      return;
    }
    res.json({ success: true, access });
  }),
);

router.get(
  "/requests/mine",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const requests = await db
      .select({
        id: schema.geoAdminAddons.id,
        baseTier: schema.geoAdminAddons.baseTier,
        marketCode: schema.geoAdminAddons.marketCode,
        businessName: schema.geoAdminAddons.businessName,
        businessType: schema.geoAdminAddons.businessType,
        studyPriorities: schema.geoAdminAddons.studyPriorities,
        proposedFeePercent: schema.geoAdminAddons.proposedFeePercent,
        status: schema.geoAdminAddons.status,
        agreedAnnualAmount: schema.geoAdminAddons.agreedAnnualAmount,
        agreedCurrency: schema.geoAdminAddons.agreedCurrency,
        requestedAt: schema.geoAdminAddons.requestedAt,
        startsAt: schema.geoAdminAddons.startsAt,
        expiresAt: schema.geoAdminAddons.expiresAt,
        reviewNotes: schema.geoAdminAddons.reviewNotes,
      })
      .from(schema.geoAdminAddons)
      .where(eq(schema.geoAdminAddons.userId, Number(req.user!.userId)))
      .orderBy(desc(schema.geoAdminAddons.requestedAt));
    res.json({ success: true, requests });
  }),
);

router.post(
  "/requests",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid add-on request",
      });
      return;
    }

    const userId = Number(req.user!.userId);
    const [user] = await db
      .select({
        role: schema.users.role,
        subscriptionTier: schema.users.subscriptionTier,
        subscriptionStatus: schema.users.subscriptionStatus,
        subscriptionExpiresAt: schema.users.premiumExpiresAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user || !hasActivePaidSubscription(user)) {
      res.status(403).json({
        success: false,
        message:
          "An active paid Essential, Pro Verified, Pro Max, or Enterprise subscription is required to request GeoAdmin.",
      });
      return;
    }
    if (["admin", "superuser", "moderator", "tsr"].includes(user.role ?? "")) {
      res.status(400).json({
        success: false,
        message: "Staff accounts do not need a customer add-on request.",
      });
      return;
    }

    const now = new Date();
    try {
      const [created] = await db.transaction(async (tx) => {
        await tx
          .update(schema.geoAdminAddons)
          .set({ status: "expired" })
          .where(
            and(
              eq(schema.geoAdminAddons.userId, userId),
              eq(schema.geoAdminAddons.status, "active"),
              lte(schema.geoAdminAddons.expiresAt, now),
            ),
          );

        const [existing] = await tx
          .select({ id: schema.geoAdminAddons.id })
          .from(schema.geoAdminAddons)
          .where(
            and(
              eq(schema.geoAdminAddons.userId, userId),
              or(
                eq(schema.geoAdminAddons.status, "pending"),
                and(
                  eq(schema.geoAdminAddons.status, "active"),
                  gt(schema.geoAdminAddons.expiresAt, now),
                ),
              ),
            ),
          )
          .limit(1);
        if (existing) return [null];

        return tx
          .insert(schema.geoAdminAddons)
          .values({
            userId,
            baseTier: user.subscriptionTier!,
            marketCode: parsed.data.marketCode,
            businessName: parsed.data.businessName || null,
            businessType: parsed.data.businessType,
            studyPriorities: parsed.data.studyPriorities ?? [],
            proposedFeePercent: parsed.data.proposedFeePercent ?? null,
          })
          .returning({
            id: schema.geoAdminAddons.id,
            status: schema.geoAdminAddons.status,
            baseTier: schema.geoAdminAddons.baseTier,
            marketCode: schema.geoAdminAddons.marketCode,
          });
      });

      if (!created) {
        sendConflict(
          res,
          "An active GeoAdmin add-on or pending request already exists for this account.",
        );
        return;
      }
      res.status(201).json({
        success: true,
        request: created,
        message:
          "Request received. This is not a purchase; the team will confirm scope, annual price, and terms in writing.",
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        sendConflict(
          res,
          "An active GeoAdmin add-on or pending request already exists for this account.",
        );
        return;
      }
      throw error;
    }
  }),
);

router.get(
  "/requests",
  requireAuth(["admin", "moderator", "tsr"]),
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status;
    if (
      status !== undefined &&
      !["pending", "active", "rejected", "cancelled", "expired"].includes(
        String(status),
      )
    ) {
      res.status(400).json({ success: false, message: "Invalid status filter" });
      return;
    }

    const filter = status
      ? sql`AND addon.status = ${String(status)}`
      : sql``;
    const result = await db.execute(sql`
      SELECT addon.id, addon.user_id, users.email, users.username,
        addon.base_tier, addon.market_code, addon.business_name,
        addon.business_type, addon.study_priorities, addon.proposed_fee_percent,
        addon.status, addon.agreed_annual_amount, addon.agreed_currency,
        addon.requested_at, addon.reviewed_by, addon.reviewed_at,
        addon.starts_at, addon.expires_at, addon.review_notes
      FROM geo_admin_addons addon
      JOIN users ON users.id = addon.user_id
      WHERE TRUE ${filter}
      ORDER BY addon.requested_at DESC
      LIMIT 100
    `);
    res.json({ success: true, requests: result.rows });
  }),
);

router.patch(
  "/requests/:id",
  requireAuth(["admin"]),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: "Invalid request ID" });
      return;
    }

    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid decision",
      });
      return;
    }

    const [request] = await db
      .select()
      .from(schema.geoAdminAddons)
      .where(eq(schema.geoAdminAddons.id, id))
      .limit(1);
    if (!request) {
      res.status(404).json({ success: false, message: "Request not found" });
      return;
    }

    const now = new Date();
    if (parsed.data.decision === "approve") {
      if (
        parsed.data.agreedCurrency !==
        MARKET_CURRENCY[request.marketCode as keyof typeof MARKET_CURRENCY]
      ) {
        res.status(400).json({
          success: false,
          message: "The agreed currency must match the requested market.",
        });
        return;
      }

      const [subscriber] = await db
        .select({
          subscriptionTier: schema.users.subscriptionTier,
          subscriptionStatus: schema.users.subscriptionStatus,
          subscriptionExpiresAt: schema.users.premiumExpiresAt,
        })
        .from(schema.users)
        .where(eq(schema.users.id, request.userId))
        .limit(1);
      if (
        !subscriber ||
        subscriber.subscriptionTier !== request.baseTier ||
        !hasActivePaidSubscription(subscriber, now)
      ) {
        sendConflict(
          res,
          "The customer must have the same active paid base tier at approval time.",
        );
        return;
      }
    }

    const expectedStatus =
      parsed.data.decision === "revoke" ? "active" : "pending";
    if (request.status !== expectedStatus) {
      sendConflict(
        res,
        parsed.data.decision === "revoke"
          ? "Only active add-ons can be revoked."
          : `Only pending requests can be ${parsed.data.decision}d.`,
      );
      return;
    }

    const status =
      parsed.data.decision === "approve"
        ? "active"
        : parsed.data.decision === "reject"
          ? "rejected"
          : "cancelled";

    try {
      const updated = await db
        .update(schema.geoAdminAddons)
        .set({
          status,
          reviewedBy: Number(req.user!.userId),
          reviewedAt: now,
          reviewNotes: parsed.data.reviewNotes || null,
          ...(parsed.data.decision === "approve"
            ? {
                agreedAnnualAmount: String(parsed.data.agreedAnnualAmount),
                agreedCurrency: parsed.data.agreedCurrency,
                startsAt: now,
                expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
              }
            : {}),
        })
        .where(
          and(
            eq(schema.geoAdminAddons.id, id),
            eq(schema.geoAdminAddons.status, expectedStatus),
          ),
        )
        .returning({
          id: schema.geoAdminAddons.id,
          status: schema.geoAdminAddons.status,
          userId: schema.geoAdminAddons.userId,
          expiresAt: schema.geoAdminAddons.expiresAt,
        });

      if (!updated.length) {
        sendConflict(res, "This request was changed by another reviewer.");
        return;
      }
      res.json({ success: true, addon: updated[0] });
    } catch (error) {
      if (isUniqueViolation(error)) {
        sendConflict(
          res,
          "The customer already has an active GeoAdmin add-on.",
        );
        return;
      }
      throw error;
    }
  }),
);

export default router;
