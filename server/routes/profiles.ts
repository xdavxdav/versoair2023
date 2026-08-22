/**
 * Unified profile routes — admin approval workflow + public search.
 * GET  /api/profiles/search         → public search (verified + published only)
 * GET  /api/profiles/:slug          → public profile detail
 * GET  /api/admin/profiles          → admin: all profiles (any status)
 * GET  /api/admin/profiles/pending  → admin: pending review queue
 * POST /api/admin/profiles/:id/action → admin: approve/reject/suspend/restore
 * POST /api/admin/profiles/sync     → superadmin: run legacy backfill
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import { unifiedProfiles, profileApprovalActions } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  getPublicProfiles,
  getPublicProfileBySlug,
  getAdminProfiles,
} from "../services/profile-queries";
import { syncLegacyProfiles } from "../services/profile-migration";

const router = Router();

const VALID_ACTIONS = ["approve", "reject", "suspend", "restore"] as const;
type ApprovalAction = typeof VALID_ACTIONS[number];

// Status transitions enforced here — UI cannot bypass these rules
const TRANSITIONS: Record<string, Record<ApprovalAction, string>> = {
  DRAFT:     { approve: "DRAFT",     reject: "DRAFT",    suspend: "SUSPENDED", restore: "DRAFT" },
  PENDING:   { approve: "PUBLISHED", reject: "DRAFT",    suspend: "SUSPENDED", restore: "PENDING" },
  PUBLISHED: { approve: "PUBLISHED", reject: "DRAFT",    suspend: "SUSPENDED", restore: "PUBLISHED" },
  SUSPENDED: { approve: "PUBLISHED", reject: "DRAFT",    suspend: "SUSPENDED", restore: "PUBLISHED" },
};

function requireAdmin(req: Request, res: Response): boolean {
  const user = (req as any).user;
  if (!user || !["admin", "superadmin", "superuser"].includes(user.role)) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

// ── Public: search verified+published profiles ────────────────────────────────
router.get("/api/profiles/search", async (req: Request, res: Response) => {
  try {
    const {
      q,
      category,
      accountType,
      countryCode,
      limit = "20",
      offset = "0",
    } = req.query as Record<string, string>;

    const profiles = await getPublicProfiles({
      query: q,
      category,
      accountType: accountType as any,
      countryCode,
      limit: Math.min(Number(limit) || 20, 100),
      offset: Number(offset) || 0,
    });

    res.json({ success: true, data: profiles, count: profiles.length });
  } catch (err) {
    console.error("[profiles/search]", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// ── Public: profile detail by slug ───────────────────────────────────────────
router.get("/api/profiles/:slug", async (req: Request, res: Response) => {
  try {
    const profile = await getPublicProfileBySlug(req.params.slug);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Increment view count — non-blocking
    db.update(unifiedProfiles)
      .set({ viewCount: (profile.viewCount ?? 0) + 1 })
      .where(eq(unifiedProfiles.id, profile.id))
      .catch(() => {});

    res.json({ success: true, data: profile });
  } catch (err) {
    console.error("[profiles/:slug]", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ── Admin: all profiles ───────────────────────────────────────────────────────
router.get("/api/admin/profiles", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { status, verificationStatus, accountType } = req.query as Record<string, string>;
    const profiles = await getAdminProfiles({ status, verificationStatus, accountType });
    res.json({ success: true, data: profiles, count: profiles.length });
  } catch (err) {
    console.error("[admin/profiles]", err);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

// ── Admin: pending review queue ───────────────────────────────────────────────
router.get("/api/admin/profiles/pending", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const profiles = await getAdminProfiles({ status: "PENDING" });
    res.json({ success: true, data: profiles, count: profiles.length });
  } catch (err) {
    console.error("[admin/profiles/pending]", err);
    res.status(500).json({ error: "Failed to fetch pending profiles" });
  }
});

// ── Admin: approve / reject / suspend / restore ───────────────────────────────
router.post(
  "/api/admin/profiles/:id/action",
  async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;

    const profileId = Number(req.params.id);
    const { action, notes } = req.body as { action: string; notes?: string };
    const adminUser = (req as any).user;

    if (!VALID_ACTIONS.includes(action as ApprovalAction)) {
      return res.status(400).json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` });
    }

    try {
      const [profile] = await db
        .select()
        .from(unifiedProfiles)
        .where(eq(unifiedProfiles.id, profileId))
        .limit(1);

      if (!profile) return res.status(404).json({ error: "Profile not found" });

      const currentStatus = profile.status ?? "DRAFT";
      const nextStatus = TRANSITIONS[currentStatus]?.[action as ApprovalAction];

      if (!nextStatus) {
        return res.status(400).json({
          error: `Transition '${action}' is not valid from status '${currentStatus}'`,
        });
      }

      const isVerified = nextStatus === "PUBLISHED";
      const verificationStatus =
        action === "approve" ? "approved" :
        action === "reject"  ? "rejected" :
        profile.verificationStatus;

      await db
        .update(unifiedProfiles)
        .set({
          status: nextStatus,
          isVerified,
          verificationStatus,
          approvedBy: action === "approve" ? adminUser.id : profile.approvedBy,
          approvalNotes: notes ?? profile.approvalNotes,
          verifiedAt: action === "approve" ? new Date() : profile.verifiedAt,
          updatedAt: new Date(),
        })
        .where(eq(unifiedProfiles.id, profileId));

      // Write audit row
      await db.insert(profileApprovalActions).values({
        profileId,
        action,
        performedBy: adminUser.id,
        notes: notes ?? null,
      });

      res.json({
        success: true,
        profileId,
        previousStatus: currentStatus,
        newStatus: nextStatus,
        action,
      });
    } catch (err) {
      console.error("[admin/profiles/:id/action]", err);
      res.status(500).json({ error: "Action failed" });
    }
  },
);

// ── Superadmin: run legacy backfill ──────────────────────────────────────────
router.post("/api/admin/profiles/sync", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || !["superadmin", "superuser"].includes(user.role)) {
    return res.status(403).json({ error: "Superadmin access required" });
  }

  try {
    const result = await syncLegacyProfiles();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[admin/profiles/sync]", err);
    res.status(500).json({ error: "Sync failed" });
  }
});

export default router;
