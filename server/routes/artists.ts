import { Router } from "express";
import { pool } from "../db";

const router = Router();

// ─── ARTIST DIRECTORY (PUBLIC) ───
// Mounted at /api/artists

// Check if country_code column exists (cached after first query)
let hasCountryCodeColumn: boolean | null = null;
async function checkCountryCodeColumn(): Promise<boolean> {
  if (hasCountryCodeColumn !== null) return hasCountryCodeColumn;
  try {
    await pool.query("SELECT country_code FROM artists LIMIT 0");
    hasCountryCodeColumn = true;
  } catch {
    hasCountryCodeColumn = false;
  }
  return hasCountryCodeColumn;
}

// GET /api/artists/search
router.get("/search", async (req, res) => {
  try {
    const {
      query = "",
      genre = "",
      countryCode = "",
      sort_by = "name_asc",
      page = "1",
      limit = "12",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
    const offset = (pageNum - 1) * limitNum;

    const hasCC = await checkCountryCodeColumn();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (query.trim()) {
      conditions.push(
        `(a.stage_name ILIKE $${paramIdx} OR a.genre ILIKE $${paramIdx})`,
      );
      params.push(`${query.trim()}%`);
      paramIdx++;
    }
    if (genre.trim()) {
      conditions.push(`a.genre = $${paramIdx}`);
      params.push(genre.trim());
      paramIdx++;
    }
    if (hasCC && countryCode.trim() && countryCode !== "all") {
      conditions.push(`a.country_code = $${paramIdx}`);
      params.push(countryCode.trim().toUpperCase());
      paramIdx++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let orderClause = "ORDER BY a.stage_name ASC";
    switch (sort_by) {
      case "name_desc":
        orderClause = "ORDER BY a.stage_name DESC";
        break;
      case "recent":
        orderClause = "ORDER BY a.id DESC";
        break;
      case "genre_asc":
        orderClause = "ORDER BY a.genre ASC NULLS LAST, a.stage_name ASC";
        break;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM artists a ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.total || "0");

    const ccSelect = hasCC ? ", a.country_code" : "";
    const dataResult = await pool.query(
      `SELECT a.id, a.stage_name AS name, a.genre, a.label_status, a.spotify_url, a.business_id, a.user_id${ccSelect}
       FROM artists a ${whereClause} ${orderClause}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offset],
    );

    res.json({
      success: true,
      data: dataResult.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    console.error("❌ Artist search error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search artists",
      details: error.message,
    });
  }
});

// GET /api/artists/genres
router.get("/genres", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT genre FROM artists WHERE genre IS NOT NULL AND genre != '' ORDER BY genre ASC",
    );
    res.json({ success: true, data: result.rows.map((r: any) => r.genre) });
  } catch (error: any) {
    console.error("❌ Get genres error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch genres" });
  }
});

// GET /api/artists/countries
router.get("/countries", async (_req, res) => {
  try {
    const hasCC = await checkCountryCodeColumn();
    if (!hasCC) {
      return res.json({ success: true, data: [] });
    }
    const result = await pool.query(
      "SELECT DISTINCT country_code FROM artists WHERE country_code IS NOT NULL AND country_code != '' ORDER BY country_code ASC",
    );
    res.json({
      success: true,
      data: result.rows.map((r: any) => r.country_code),
    });
  } catch (error: any) {
    console.error("❌ Get artist countries error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch artist countries" });
  }
});

// GET /api/artists/:id/details
router.get("/:id/details", async (req, res) => {
  try {
    const { id } = req.params;
    const artistResult = await pool.query(
      `SELECT id, stage_name AS name, genre, label_status, spotify_url, business_id, user_id
       FROM artists WHERE id = $1`,
      [parseInt(id)],
    );

    if (artistResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Artist not found" });
    }
    res.json({ success: true, data: artistResult.rows[0] });
  } catch (error: any) {
    console.error("❌ Artist details error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch artist details",
      details: error.message,
    });
  }
});

export default router;
