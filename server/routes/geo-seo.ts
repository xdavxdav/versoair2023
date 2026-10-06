/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSO AIR — GEO SEO ROUTES (AI Crawler Dominance Strategy)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * GET /api/seo/json-ld/business/:id     — JSON-LD for a single business
 * GET /api/seo/json-ld/organization     — JSON-LD for Verso Air organization
 * GET /api/seo/json-ld/search           — JSON-LD for search results page
 * GET /api/seo/json-ld/website          — WebSite schema (Google Sitelinks)
 * GET /sitemap.xml (+ /api/seo alias)   — Sitemap index
 * GET /sitemap-pages.xml                — Public static pages
 * GET /sitemap-businesses-N.xml         — Active businesses, 10k per file
 * GET /robots.txt (+ /api/seo alias)    — Robots.txt with sitemap reference
 */

import { Router, Request, Response } from "express";
import { pool } from "../db";
import { buildRobotsTxt, createSitemapHandlers } from "../services/sitemap";
import { getSiteOrigin } from "../utils/site-origin";
import {
  generateBusinessJsonLd,
  generateOrganizationJsonLd,
  generateSearchResultsJsonLd,
  generateWebsiteJsonLd,
} from "../services/json-ld-generator";

const router = Router();

// ─── JSON-LD for a single business ───────────────────────────────────────────

router.get("/json-ld/business/:id", async (req: Request, res: Response) => {
  const businessId = parseInt(req.params.id);
  if (isNaN(businessId)) {
    return res.status(400).json({ error: "Invalid business ID" });
  }

  try {
    const result = await pool.query(
      `SELECT b.*, bc.name as category_name, c.name as country_name
       FROM businesses b
       LEFT JOIN business_categories bc ON b.category_id = bc.id
       LEFT JOIN countries c ON b.country_code = c.code
       WHERE b.id = $1 AND b.is_active = true`,
      [businessId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Business not found" });
    }

    const biz = result.rows[0];
    const jsonLd = generateBusinessJsonLd({
      id: biz.id,
      name: biz.name,
      description: biz.description,
      address: biz.address,
      city: biz.city,
      country: biz.country_name,
      countryCode: biz.country_code,
      phone: biz.phone,
      email: biz.email,
      website: biz.website,
      rating: parseFloat(biz.rating) || 0,
      reviewCount: parseInt(biz.reviews) || 0,
      latitude: parseFloat(biz.latitude) || undefined,
      longitude: parseFloat(biz.longitude) || undefined,
      category: biz.category_name,
      isVerified: biz.is_verified,
      tier: biz.tier,
    });

    res.setHeader("Content-Type", "application/ld+json");
    return res.json(jsonLd);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── JSON-LD for Verso Air organization ──────────────────────────────────────

router.get("/json-ld/organization", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/ld+json");
  return res.json(generateOrganizationJsonLd());
});

// ─── JSON-LD for WebSite (Google Sitelinks Search Box) ───────────────────────

router.get("/json-ld/website", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/ld+json");
  return res.json(generateWebsiteJsonLd());
});

// ─── JSON-LD for search results page ─────────────────────────────────────────

router.get("/json-ld/search", async (req: Request, res: Response) => {
  const query = (req.query.q as string) || "";
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  try {
    let sqlQuery: string;
    let params: any[];

    if (query) {
      sqlQuery = `SELECT b.*, bc.name as category_name, c.name as country_name
                  FROM businesses b
                  LEFT JOIN business_categories bc ON b.category_id = bc.id
                  LEFT JOIN countries c ON b.country_code = c.code
                  WHERE b.is_active = true AND (b.name ILIKE $1 OR b.description ILIKE $1)
                  ORDER BY b.rating DESC NULLS LAST
                  LIMIT $2`;
      params = [`%${query}%`, limit];
    } else {
      sqlQuery = `SELECT b.*, bc.name as category_name, c.name as country_name
                  FROM businesses b
                  LEFT JOIN business_categories bc ON b.category_id = bc.id
                  LEFT JOIN countries c ON b.country_code = c.code
                  WHERE b.is_active = true
                  ORDER BY b.rating DESC NULLS LAST
                  LIMIT $1`;
      params = [limit];
    }

    const result = await pool.query(sqlQuery, params);
    const businesses = result.rows.map((biz) => ({
      id: biz.id,
      name: biz.name,
      description: biz.description,
      address: biz.address,
      city: biz.city,
      country: biz.country_name,
      countryCode: biz.country_code,
      phone: biz.phone,
      rating: parseFloat(biz.rating) || 0,
      reviewCount: parseInt(biz.reviews) || 0,
      category: biz.category_name,
    }));

    const jsonLd = generateSearchResultsJsonLd(
      businesses,
      query || "top rated",
    );
    res.setHeader("Content-Type", "application/ld+json");
    return res.json(jsonLd);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Sitemaps (index + pages + paginated businesses) ─────────────────────────

const sitemap = createSitemapHandlers((sql, params) => pool.query(sql, params));

export const sitemapXmlHandler = sitemap.index;
export const sitemapPagesHandler = sitemap.pages;
export const sitemapBusinessesHandler = sitemap.businesses;

// Aliases kept under /api/seo for backwards compatibility with previously submitted URLs.
router.get("/sitemap.xml", sitemapXmlHandler);
router.get("/sitemap-pages.xml", sitemapPagesHandler);
router.get("/sitemap-businesses-:page.xml", sitemapBusinessesHandler);

// ─── Robots.txt ──────────────────────────────────────────────────────────────

export function robotsTxtHandler(_req: Request, res: Response) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  return res.send(buildRobotsTxt(getSiteOrigin()));
}

router.get("/robots.txt", robotsTxtHandler);

export default router;
