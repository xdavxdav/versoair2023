import { Router } from "express";
import { pool } from "../db";
import { publicBusinessVisibilitySql } from "../utils/business-visibility";

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
    const bizCountFilter = cc
      ? `WHERE country_code = $1 AND ${publicBusinessVisibilitySql("businesses")}`
      : `WHERE ${publicBusinessVisibilitySql("businesses")}`;

    const [bizRes, artisanRes, catRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count FROM businesses ${bizCountFilter}`,
        bizCountParams,
      ),
      // Artisan count from the unified index (published craft artisans)
      cc
        ? pool.query(
            `SELECT COUNT(*)::int AS count FROM unified_profiles up
             WHERE up.account_type = 'artisan' AND up.status = 'PUBLISHED'
               AND up.is_verified = true AND up.verification_status = 'approved'
               AND up.country_code = $1
               AND NOT EXISTS (
                 SELECT 1 FROM users u
                 WHERE u.id = up.owner_id
                   AND LOWER(u.role) IN ('admin', 'moderator', 'superadmin', 'superuser')
               )`,
            [cc],
          )
        : pool.query(
            `SELECT COUNT(*)::int AS count FROM unified_profiles up
             WHERE up.account_type = 'artisan' AND up.status = 'PUBLISHED'
               AND up.is_verified = true AND up.verification_status = 'approved'
               AND NOT EXISTS (
                 SELECT 1 FROM users u
                 WHERE u.id = up.owner_id
                   AND LOWER(u.role) IN ('admin', 'moderator', 'superadmin', 'superuser')
               )`,
          ),
      pool.query(
        cc
          ? `SELECT COUNT(DISTINCT category_id)::int AS count FROM businesses WHERE country_code = $1 AND ${publicBusinessVisibilitySql("businesses")} AND category_id IS NOT NULL`
          : `SELECT COUNT(DISTINCT category_id)::int AS count FROM businesses WHERE ${publicBusinessVisibilitySql("businesses")} AND category_id IS NOT NULL`,
        bizCountParams,
      ),
    ]);

    const businessCount = bizRes.rows[0]?.count ?? 0;
    const artisanCount = artisanRes.rows[0]?.count ?? 0;
    const categoryCount = catRes.rows[0]?.count ?? 0;

    /* ── only verified public artisan profiles are featured ── */
    const unified = cc
      ? await pool.query(
          `SELECT up.id, up.name, up.category AS genre, up.logo_url, up.city_name
           FROM unified_profiles up
           WHERE up.account_type = 'artisan' AND up.status = 'PUBLISHED'
             AND up.country_code = $1 AND up.is_verified = true
             AND up.verification_status = 'approved'
             AND NOT EXISTS (
               SELECT 1 FROM users u
               WHERE u.id = up.owner_id
                 AND LOWER(u.role) IN ('admin', 'moderator', 'superadmin', 'superuser')
             )
           ORDER BY RANDOM() LIMIT 3`,
          [cc],
        )
      : await pool.query(
          `SELECT up.id, up.name, up.category AS genre, up.logo_url, up.city_name
           FROM unified_profiles up
           WHERE up.account_type = 'artisan' AND up.status = 'PUBLISHED'
             AND up.is_verified = true AND up.verification_status = 'approved'
             AND NOT EXISTS (
               SELECT 1 FROM users u
               WHERE u.id = up.owner_id
                 AND LOWER(u.role) IN ('admin', 'moderator', 'superadmin', 'superuser')
             )
           ORDER BY RANDOM() LIMIT 3`,
        );

    res.json({
      success: true,
      countryCode: cc || "ALL",
      businessCount,
      artisanCount,
      categoryCount,
      featuredArtisans: unified.rows,
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
