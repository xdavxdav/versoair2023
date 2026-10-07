import type { Request, Response } from "express";
import { PRIVATE_PATH_PREFIXES, PUBLIC_STATIC_ROUTES } from "../utils/seo-routes";
import { getSiteOrigin } from "../utils/site-origin";

// Well under the protocol limit of 50,000 URLs / 50 MB per file.
export const BUSINESSES_PER_SITEMAP = 10_000;

// These three values are emitted together only by the retired launch-data
// generator.  Keep the exclusion in the read path as well as in the data
// cleanup migration: production deployments intentionally do not run
// migrations, and synthetic businesses must never re-enter a public index.
const SYNTHETIC_BUSINESS_PREDICATE = `
  NOT (
    COALESCE(email LIKE 'contact+%@versoair.local', false)
    AND COALESCE(website LIKE '%.example.com', false)
    AND COALESCE(phone LIKE '+1-555-%', false)
  )`;

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: Array<Record<string, any>> }>;

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n';
const URLSET_NS = "http://www.sitemaps.org/schemas/sitemap/0.9";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildPagesSitemap(origin: string): string {
  const urls = PUBLIC_STATIC_ROUTES.map(
    (r) =>
      `  <url>\n    <loc>${escapeXml(origin + r.path)}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`,
  ).join("\n");
  return `${XML_HEADER}<urlset xmlns="${URLSET_NS}">\n${urls}\n</urlset>\n`;
}

export function buildBusinessesSitemap(
  origin: string,
  rows: Array<{ id: number | string }>,
): string {
  const urls = rows
    .map(
      (row) =>
        `  <url>\n    <loc>${escapeXml(`${origin}/business/${row.id}`)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`,
    )
    .join("\n");
  return `${XML_HEADER}<urlset xmlns="${URLSET_NS}">${urls ? `\n${urls}\n` : "\n"}</urlset>\n`;
}

export function buildSitemapIndex(
  origin: string,
  businessCount: number,
): string {
  const chunks = Math.ceil(businessCount / BUSINESSES_PER_SITEMAP);
  const locs = [
    `${origin}/sitemap-pages.xml`,
    ...Array.from(
      { length: chunks },
      (_, i) => `${origin}/sitemap-businesses-${i + 1}.xml`,
    ),
  ];
  const entries = locs
    .map(
      (loc) =>
        `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n  </sitemap>`,
    )
    .join("\n");
  return `${XML_HEADER}<sitemapindex xmlns="${URLSET_NS}">\n${entries}\n</sitemapindex>\n`;
}

export function buildRobotsTxt(origin: string): string {
  return (
    [
      "User-agent: *",
      ...PUBLIC_STATIC_ROUTES.map((r) => `Allow: ${r.path}`),
      ...PRIVATE_PATH_PREFIXES.map((p) => `Disallow: ${p}`),
      "",
      `Sitemap: ${origin}/sitemap.xml`,
    ].join("\n") + "\n"
  );
}

function sendXml(res: Response, xml: string) {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(xml);
}

// Only active, verified businesses belong in public search indexes.
export function createSitemapHandlers(query: QueryFn) {
  const fail = (res: Response, err: unknown) => {
    console.error("[sitemap] Failed:", err);
    return res.status(503).type("text/plain").send("Sitemap temporarily unavailable");
  };

  return {
    async index(_req: Request, res: Response) {
      try {
        const { rows } = await query(
          `SELECT COUNT(*)::int AS total
           FROM businesses
           WHERE is_active = true
             AND is_verified = true
             AND ${SYNTHETIC_BUSINESS_PREDICATE}`,
        );
        return sendXml(
          res,
          buildSitemapIndex(
            getSiteOrigin(),
            rows[0]?.total ?? 0,
          ),
        );
      } catch (err) {
        return fail(res, err);
      }
    },

    async pages(_req: Request, res: Response) {
      return sendXml(res, buildPagesSitemap(getSiteOrigin()));
    },

    async businesses(req: Request, res: Response) {
      const page = Number(req.params.page);
      if (!Number.isInteger(page) || page < 1) {
        return res.status(404).type("text/plain").send("Not found");
      }
      try {
        const { rows } = await query(
          `SELECT id FROM businesses
           WHERE is_active = true
             AND is_verified = true
             AND ${SYNTHETIC_BUSINESS_PREDICATE}
           ORDER BY id ASC
           LIMIT $1 OFFSET $2`,
          [BUSINESSES_PER_SITEMAP, (page - 1) * BUSINESSES_PER_SITEMAP],
        );
        // The first chunk may be empty (no businesses yet); later empty chunks don't exist.
        if (rows.length === 0 && page > 1) {
          return res.status(404).type("text/plain").send("Not found");
        }
        return sendXml(
          res,
          buildBusinessesSitemap(
            getSiteOrigin(),
            rows as Array<{ id: number | string }>,
          ),
        );
      } catch (err) {
        return fail(res, err);
      }
    },
  };
}
