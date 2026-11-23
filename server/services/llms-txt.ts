import type { Request, Response } from "express";
import { publicBusinessVisibilitySql } from "../utils/business-visibility";
import { getSiteOrigin } from "../utils/site-origin";

type ListedBusiness = { id: number | string; name: string };

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: Array<Record<string, any>> }>;

const MAX_LISTED_BUSINESSES = 100;

const KEY_PAGES: ReadonlyArray<{ path: string; label: string; note: string }> = [
  { path: "/", label: "Home", note: "What Verso Air is and where it is launching" },
  { path: "/businesses-directory", label: "Business directory", note: "Verified business listings" },
  { path: "/about", label: "About", note: "Who runs Verso Air Inc." },
  { path: "/contact", label: "Contact", note: "How to reach the team in Toronto" },
  { path: "/news", label: "News", note: "Public platform announcements" },
  { path: "/marketing/journal", label: "Journal", note: "Articles on business visibility" },
  { path: "/privacy", label: "Privacy policy", note: "How personal information is handled" },
  { path: "/terms", label: "Terms of service", note: "Terms governing use of the platform" },
];

export function buildLlmsTxt(origin: string, businesses: ListedBusiness[]): string {
  const lines = [
    "# Verso Air",
    "",
    "> Verso Air Inc. is an Ontario corporation launching a digital platform for business visibility and creative projects, starting in Ontario with the ambition to grow worldwide. Its business directory lists verified businesses, and listings are published only once they are verified.",
    "",
    "## Key pages",
    "",
    ...KEY_PAGES.map((page) => `- [${page.label}](${origin}${page.path}): ${page.note}`),
  ];

  if (businesses.length > 0) {
    lines.push(
      "",
      "## Verified business listings",
      "",
      ...businesses.map(
        (business) =>
          `- [${business.name.replace(/[\[\]\r\n]+/g, " ").replace(/\s+/g, " ").trim()}](${origin}/business/${business.id})`,
      ),
    );
  }

  lines.push(
    "",
    "## Machine-readable",
    "",
    `- [Sitemap](${origin}/sitemap.xml): every public page and verified listing`,
  );
  return `${lines.join("\n")}\n`;
}

export function createLlmsTxtHandler(query: QueryFn) {
  return async function llmsTxtHandler(_req: Request, res: Response) {
    let businesses: ListedBusiness[] = [];
    try {
      const { rows } = await query(
        `SELECT b.id, b.name FROM businesses b
         WHERE ${publicBusinessVisibilitySql("b")}
         ORDER BY b.id ASC
         LIMIT $1`,
        [MAX_LISTED_BUSINESSES],
      );
      businesses = rows as ListedBusiness[];
    } catch (err) {
      // The file is still useful without the listings, so it degrades rather than 5xx.
      console.error("[llms.txt] Failed to load listings:", err);
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(buildLlmsTxt(getSiteOrigin(), businesses));
  };
}
