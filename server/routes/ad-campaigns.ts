import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get(
  "/",
  requireAuth(["admin", "superuser", "business_owner"]),
  asyncHandler(async (req, res) => {
    const { countryCode, limit = "50" } = req.query;
    const limitNum = Math.min(100, parseInt(String(limit), 10) || 50);
    const ownerId = Number(req.user?.userId);
    const isBusinessOwner = req.user?.role === "business_owner";
    if (isBusinessOwner && (!Number.isSafeInteger(ownerId) || ownerId <= 0)) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_AUTHENTICATED_USER",
          message: "Please sign in again.",
        },
      });
    }
    const ownerFilter =
      isBusinessOwner
        ? sql` AND b.owner_id = ${ownerId}`
        : sql``;
    const countryFilter =
      countryCode && String(countryCode) !== "all"
        ? sql` AND UPPER(b.country_code) = UPPER(${String(countryCode)})`
        : sql``;

    const result = await db.execute(
      sql`SELECT ac.*, b.name AS business_name, b.country_code
          FROM ad_campaigns ac
          INNER JOIN businesses b ON b.id = ac.business_id
          WHERE TRUE${countryFilter}${ownerFilter}
          ORDER BY ac.created_at DESC NULLS LAST
          LIMIT ${limitNum}`,
    );

    const campaigns = (result.rows || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      daily_budget: r.budget || r.daily_budget || "0",
      objective: r.description || r.name || "Campaign",
      status: r.status || "draft",
      start_date: r.start_date,
      end_date: r.end_date,
      impressions: r.impressions || 0,
      clicks: r.clicks || 0,
      conversions: r.conversions || 0,
      business_id: r.business_id,
      business_name: r.business_name,
      country_code: r.country_code,
      created_at: r.created_at,
    }));

    res.json({ success: true, data: campaigns });
  }),
);

export default router;
