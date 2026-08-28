/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSO AIR — GEO SEO ROUTES (AI Crawler Dominance Strategy)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * GET /api/seo/json-ld/business/:id     — JSON-LD for a single business
 * GET /api/seo/json-ld/organization     — JSON-LD for Verso Air organization
 * GET /api/seo/json-ld/search           — JSON-LD for search results page
 * GET /api/seo/json-ld/website          — WebSite schema (Google Sitelinks)
 * GET /api/seo/sitemap.xml              — Dynamic XML sitemap for all businesses
 * GET /api/seo/robots.txt               — Robots.txt with sitemap reference
 */

import { Router, Request, Response } from "express";
import { pool } from "../db";
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

// ─── Dynamic XML Sitemap ─────────────────────────────────────────────────────

router.get("/sitemap.xml", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, updated_at FROM businesses WHERE is_active = true ORDER BY updated_at DESC LIMIT 50000`,
    );

    const baseUrl = "https://verso-air.com";
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/businesses-directory</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/commerce</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/hotellerie</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/batiment</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/automobile</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/finances</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/divertissement</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

    for (const biz of result.rows) {
      const lastmod = biz.updated_at
        ? new Date(biz.updated_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      xml += `
  <url>
    <loc>${baseUrl}/businesses/${biz.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    xml += "\n</urlset>";

    res.setHeader("Content-Type", "application/xml");
    return res.send(xml);
  } catch (err: any) {
    res.setHeader("Content-Type", "application/xml");
    return res
      .status(500)
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      );
  }
});

// ─── Robots.txt ──────────────────────────────────────────────────────────────

export function robotsTxtHandler(req: Request, res: Response) {
  const configuredUrl = (
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PRODUCTION_URL ||
    process.env.APP_PUBLIC_URL ||
    process.env.VERSOAIR_URL
  )?.trim();
  const origin = (configuredUrl || req.protocol + "://" + req.get("host")).replace(/\/+$/, "");
  const robots = "User-agent: *\n" +
    "Allow: /\n" +
    "Allow: /businesses-directory\n" +
    "Allow: /commerce\n" +
    "Allow: /hotellerie\n" +
    "Allow: /batiment\n" +
    "Allow: /automobile\n" +
    "Allow: /finances\n" +
    "Allow: /divertissement\n" +
    "Disallow: /api/\n" +
    "Allow: /api/seo/sitemap.xml\n" +
    "Disallow: /auth/\n" +
    "Disallow: /admin/\n" +
    "Disallow: /dashboard\n" +
    "Disallow: /profile\n" +
    "Disallow: /geo-admin\n" +
    "Disallow: /account/\n" +
    "Disallow: /payments/\n" +
    "Disallow: /contracts\n" +
    "\nSitemap: " + origin + "/api/seo/sitemap.xml\n";

  res.setHeader("Content-Type", "text/plain");
  return res.send(robots);
}

router.get("/robots.txt", robotsTxtHandler);

export default router;
