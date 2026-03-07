import { Router } from "express";
import { pool } from "../db";

const router = Router();

/**
 * GET /api/home/stats?countryCode=XX
 *
 * Returns country-specific aggregate stats for the home page:
 *   - businessCount, artisanCount, categoryCount
 *   - featuredArtisans (up to 3 random artisans from that country)
 *
 * When countryCode is empty / omitted, returns global totals.
 */
router.get("/stats", async (req, res) => {
  try {
    const { countryCode = "" } = req.query as Record<string, string>;
    const cc = countryCode.trim().toUpperCase();

    /* ── aggregate counts ── */
    const countryFilter = cc ? `WHERE country_code = $1` : "";
    const countParams = cc ? [cc] : [];

    const [bizRes, artistRes, catRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count FROM businesses ${countryFilter}`,
        countParams,
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM artists ${countryFilter}`,
        countParams,
      ),
      // Distinct categories used by businesses in that country
      pool.query(
        cc
          ? `SELECT COUNT(DISTINCT category_id)::int AS count FROM businesses WHERE country_code = $1 AND category_id IS NOT NULL`
          : `SELECT COUNT(DISTINCT category_id)::int AS count FROM businesses WHERE category_id IS NOT NULL`,
        countParams,
      ),
    ]);

    const businessCount = bizRes.rows[0]?.count ?? 0;
    const artisanCount = artistRes.rows[0]?.count ?? 0;
    const categoryCount = catRes.rows[0]?.count ?? 0;

    /* ── featured artisans (up to 3) ── */
    const featuredQuery = cc
      ? `SELECT id, stage_name AS name, genre, label_status, spotify_url
         FROM artists
         WHERE country_code = $1
         ORDER BY RANDOM()
         LIMIT 3`
      : `SELECT id, stage_name AS name, genre, label_status, spotify_url
         FROM artists
         ORDER BY RANDOM()
         LIMIT 3`;

    const featuredRes = await pool.query(featuredQuery, countParams);

    res.json({
      success: true,
      countryCode: cc || "ALL",
      businessCount,
      artisanCount,
      categoryCount,
      featuredArtisans: featuredRes.rows,
    });
  } catch (error: any) {
    console.error("Home stats error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch home stats",
    });
  }
});

export default router;
