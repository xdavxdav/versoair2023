import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { countryCode, limit = "50" } = req.query;
    const limitNum = Math.min(100, parseInt(String(limit), 10) || 50);

    const result =
      countryCode && String(countryCode) !== "all"
        ? await db.execute(
            sql`SELECT ac.*, b.name AS business_name, b.country_code
                FROM ad_campaigns ac
                INNER JOIN businesses b ON b.id = ac.business_id
                  AND UPPER(b.country_code) = UPPER(${String(countryCode)})
                ORDER BY ac.created_at DESC NULLS LAST
                LIMIT ${limitNum}`,
          )
        : await db.execute(
            sql`SELECT ac.*, b.name AS business_name, b.country_code
                FROM ad_campaigns ac
                LEFT JOIN businesses b ON b.id = ac.business_id
                ORDER BY ac.created_at DESC NULLS LAST
                LIMIT ${limitNum}`,
          );

    const campaigns = (result.rows || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      daily_budget: r.budget || r.daily_budget || "0",
      objective: r.description || r.name || "Campaign",
      status: r.status || "active",
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
