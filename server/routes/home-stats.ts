import { Router } from "express";
import { pool } from "../db";

const router = Router();

/**
 * GET /api/home/stats?countryCode=XX
 *
 * Returns country-specific aggregate stats for the home page:
 *   - businessCount, artisanCount, categoryCount
 *   - featuredArtisans (up to 3 published artisans from unified_profiles)
 *
 * When countryCode is empty / omitted, returns global totals.
 */
router.get("/stats", async (req, res) => {
  try {
    const { countryCode = "" } = req.query as Record<string, string>;
    const cc = countryCode.trim().toUpperCase();

    /* ── aggregate counts ── */
    const bizCountParams = cc ? [cc] : [];
    const bizCountFilter = cc ? `WHERE country_code = $1` : "";

    const [bizRes, artisanRes, catRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count FROM businesses ${bizCountFilter}`,
        bizCountParams,
      ),
      // Artisan count from the unified index (published craft artisans)
      cc
        ? pool.query(
            `SELECT COUNT(*)::int AS count FROM unified_profiles WHERE account_type = 'artisan' AND status = 'PUBLISHED' AND country_code = $1`,
            [cc],
          )
        : pool.query(
            `SELECT COUNT(*)::int AS count FROM unified_profiles WHERE account_type = 'artisan' AND status = 'PUBLISHED'`,
          ),
      pool.query(
        cc
          ? `SELECT COUNT(DISTINCT category_id)::int AS count FROM businesses WHERE country_code = $1 AND category_id IS NOT NULL`
          : `SELECT COUNT(DISTINCT category_id)::int AS count FROM businesses WHERE category_id IS NOT NULL`,
        bizCountParams,
      ),
    ]);

    const businessCount = bizRes.rows[0]?.count ?? 0;
    const artisanCount = artisanRes.rows[0]?.count ?? 0;
    const categoryCount = catRes.rows[0]?.count ?? 0;

    /* ── featured artisans: prefer unified_profiles, fall back to music artists ── */
    let featuredArtisans: any[] = [];
    try {
      const unified = cc
        ? await pool.query(
            `SELECT id, name, category AS genre, logo_url, city_name FROM unified_profiles
             WHERE account_type = 'artisan' AND status = 'PUBLISHED' AND country_code = $1
             ORDER BY RANDOM() LIMIT 3`,
            [cc],
          )
        : await pool.query(
            `SELECT id, name, category AS genre, logo_url, city_name FROM unified_profiles
             WHERE account_type = 'artisan' AND status = 'PUBLISHED'
             ORDER BY RANDOM() LIMIT 3`,
          );

      if (unified.rows.length > 0) {
        featuredArtisans = unified.rows;
      } else {
        // Fallback: legacy music artists table
        const fallback = cc
          ? await pool.query(
              `SELECT id, stage_name AS name, genre FROM artists WHERE country_code = $1 ORDER BY RANDOM() LIMIT 3`,
              [cc],
            )
          : await pool.query(
              `SELECT id, stage_name AS name, genre FROM artists ORDER BY RANDOM() LIMIT 3`,
            );
        featuredArtisans = fallback.rows;
      }
    } catch (_) {
      // unified_profiles may not exist on first boot — safe to ignore
    }

    res.json({
      success: true,
      countryCode: cc || "ALL",
      businessCount,
      artisanCount,
      categoryCount,
      featuredArtisans,
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
