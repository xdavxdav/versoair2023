/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSO AIR — MARKET RAIDER MIGRATION ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/migrate/scrape   — Scrape a competitor URL for business listings
 * POST /api/migrate/import   — Import scraped businesses into the database
 * GET  /api/migrate/history  — View past migration jobs
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { pool } from "../db";
import { scrapeDirectoryUrl } from "../services/web-scraper";

const router = Router();

// Only admin/superuser can use migration tools
router.use(requireAuth);

// ─── POST /api/migrate/scrape — Scrape competitor URL ────────────────────────

const scrapeSchema = z.object({
  url: z.string().url().max(500),
});

router.post("/scrape", async (req: Request, res: Response) => {
  if (!req.user || !["admin", "superuser"].includes(req.user.role)) {
    return res
      .status(403)
      .json({ success: false, error: "Admin access required" });
  }

  const parsed = scrapeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid URL: " + parsed.error.issues[0]?.message,
    });
  }

  try {
    const result = await scrapeDirectoryUrl(parsed.data.url);

    return res.json({
      success: result.success,
      source: result.source,
      totalFound: result.totalFound,
      businesses: result.businesses,
      errors: result.errors,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: "Scrape failed: " + (err.message || "Unknown error"),
    });
  }
});

// ─── POST /api/migrate/import — Import scraped businesses into DB ────────────

const importSchema = z.object({
  businesses: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        phone: z.string().max(50).optional().default(""),
        address: z.string().max(500).optional().default(""),
        city: z.string().max(100).optional().default(""),
        category: z.string().max(100).optional().default(""),
        website: z.string().max(500).optional().default(""),
        description: z.string().max(2000).optional().default(""),
        source: z.string().max(50).optional().default("import"),
        sourceUrl: z.string().max(500).optional().default(""),
      }),
    )
    .min(1)
    .max(100),
  countryCode: z.string().length(2).optional(),
  categoryId: z.number().optional(),
});

router.post("/import", async (req: Request, res: Response) => {
  if (!req.user || !["admin", "superuser"].includes(req.user.role)) {
    return res
      .status(403)
      .json({ success: false, error: "Admin access required" });
  }

  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid import data: " + parsed.error.issues[0]?.message,
    });
  }

  const { businesses, countryCode, categoryId } = parsed.data;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const biz of businesses) {
    try {
      // Check for duplicate by name
      const existing = await pool.query(
        `SELECT id FROM businesses WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [biz.name],
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO businesses (name, phone, address, city, description, website, country_code, category_id, is_active, source, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, NOW())`,
        [
          biz.name,
          biz.phone || null,
          biz.address || null,
          biz.city || null,
          biz.description || null,
          biz.website || null,
          countryCode || null,
          categoryId || null,
          biz.source || "market_raider",
        ],
      );
      imported++;
    } catch (err: any) {
      errors.push(`${biz.name}: ${err.message}`);
    }
  }

  return res.json({
    success: true,
    message: `Import complete: ${imported} added, ${skipped} duplicates skipped`,
    imported,
    skipped,
    errors,
  });
});

// ─── GET /api/migrate/history — View migration history ───────────────────────

router.get("/history", async (req: Request, res: Response) => {
  if (!req.user || !["admin", "superuser"].includes(req.user.role)) {
    return res
      .status(403)
      .json({ success: false, error: "Admin access required" });
  }

  try {
    const result = await pool.query(
      `SELECT source, COUNT(*) as count, MAX(created_at) as last_imported
       FROM businesses
       WHERE source IN ('market_raider', 'yellowpages', 'pagesjaunes', 'goafricaonline', 'import')
       GROUP BY source
       ORDER BY last_imported DESC`,
    );

    return res.json({
      success: true,
      migrations: result.rows,
    });
  } catch (err: any) {
    return res.json({
      success: true,
      migrations: [],
      note: "Migration history not available (source column may not exist)",
    });
  }
});

export default router;
