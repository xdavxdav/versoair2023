import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// ── GET /api/user/history ─────────────────────────────────────────────────────
// Returns the authenticated user's browsing history (most recent first)
router.get(
  "/",
  requireAuth(),
  asyncHandler(async (req: any, res) => {
    const userId = parseInt(req.user.userId ?? req.user.id, 10);
    if (isNaN(userId))
      return res.status(400).json({ success: false, message: "Invalid user" });

    const rows = await db
      .select()
      .from(schema.userBrowsingHistory)
      .where(eq(schema.userBrowsingHistory.userId, userId))
      .orderBy(desc(schema.userBrowsingHistory.visitedAt))
      .limit(100);

    res.json({ success: true, history: rows });
  }),
);

// ── POST /api/user/history ────────────────────────────────────────────────────
// Records a new visit. Deduplicates: if the same businessId was visited in the
// last 30 minutes, it just updates visitedAt instead of adding a new row.
router.post(
  "/",
  requireAuth(),
  asyncHandler(async (req: any, res) => {
    const userId = parseInt(req.user.userId ?? req.user.id, 10);
    if (isNaN(userId))
      return res.status(400).json({ success: false, message: "Invalid user" });

    const { businessId, businessName, sector, pageUrl, metadata } = req.body;

    if (!sector) {
      return res
        .status(400)
        .json({ success: false, message: "sector is required" });
    }

    // Dedup: check for a recent visit to the same business (last 30 min)
    if (businessId) {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      const [existing] = await db
        .select()
        .from(schema.userBrowsingHistory)
        .where(
          and(
            eq(schema.userBrowsingHistory.userId, userId),
            eq(schema.userBrowsingHistory.businessId, businessId),
          ),
        )
        .limit(1);

      if (existing && existing.visitedAt >= thirtyMinAgo) {
        // Just bump the timestamp
        await db
          .update(schema.userBrowsingHistory)
          .set({
            visitedAt: new Date(),
            metadata: metadata ?? existing.metadata,
          })
          .where(eq(schema.userBrowsingHistory.id, existing.id));

        return res.json({ success: true, action: "updated", id: existing.id });
      }
    }

    const [inserted] = await db
      .insert(schema.userBrowsingHistory)
      .values({
        userId,
        businessId: businessId ?? null,
        businessName: businessName ?? null,
        sector,
        pageUrl: pageUrl ?? null,
        visitedAt: new Date(),
        metadata: metadata ?? null,
      })
      .returning({ id: schema.userBrowsingHistory.id });

    res.status(201).json({ success: true, action: "created", id: inserted.id });
  }),
);

// ── DELETE /api/user/history/:id ──────────────────────────────────────────────
// Deletes a single history entry (must belong to the authenticated user).
// Pass id = "all" to clear the full history.
router.delete(
  "/:id",
  requireAuth(),
  asyncHandler(async (req: any, res) => {
    const userId = parseInt(req.user.userId ?? req.user.id, 10);
    if (isNaN(userId))
      return res.status(400).json({ success: false, message: "Invalid user" });

    if (req.params.id === "all") {
      await db
        .delete(schema.userBrowsingHistory)
        .where(eq(schema.userBrowsingHistory.userId, userId));
      return res.json({ success: true, action: "cleared" });
    }

    const entryId = parseInt(req.params.id, 10);
    if (isNaN(entryId))
      return res.status(400).json({ success: false, message: "Invalid id" });

    // Only allow deleting own entries
    const [deleted] = await db
      .delete(schema.userBrowsingHistory)
      .where(
        and(
          eq(schema.userBrowsingHistory.id, entryId),
          eq(schema.userBrowsingHistory.userId, userId),
        ),
      )
      .returning({ id: schema.userBrowsingHistory.id });

    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    res.json({ success: true, action: "deleted", id: deleted.id });
  }),
);

export default router;
