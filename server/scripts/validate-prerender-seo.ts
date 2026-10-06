import fs from "node:fs/promises";
import path from "node:path";

const SITE_ORIGIN = "https://www.versoair.com";
const DIST_PUBLIC = path.join(process.cwd(), "dist", "public");
const ROUTES_FILE = path.join(DIST_PUBLIC, "prerender-routes.json");

type CheckResult = {
  route: string;
  filePath: string;
  errors: string[];
};

function normalizeRoute(route: string): string {
  if (!route.startsWith("/")) return `/${route}`;
  return route;
}

function expectedCanonical(route: string): string {
  const normalized = route === "/" ? "/" : route.replace(/\/+$/, "");
  return `${SITE_ORIGIN}${normalized}`;
}

async function resolveHtmlFile(route: string): Promise<string | null> {
  const clean = route.replace(/^\/+/, "");
  const candidates =
    route === "/"
      ? [path.join(DIST_PUBLIC, "index.html")]
      : [
          path.join(DIST_PUBLIC, clean, "index.html"),
          path.join(DIST_PUBLIC, `${clean}.html`),
        ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // continue
    }
  }
  return null;
}

function findTagContent(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match?.[1]?.trim() || null;
}

async function validateRoute(route: string): Promise<CheckResult> {
  const normalizedRoute = normalizeRoute(route);
  const htmlFile = await resolveHtmlFile(normalizedRoute);

  if (!htmlFile) {
    return {
      route: normalizedRoute,
      filePath: "(missing)",
      errors: ["No prerendered HTML file found for route"],
    };
  }

  const html = await fs.readFile(htmlFile, "utf8");
  const errors: string[] = [];

  const title = findTagContent(html, /<title>([^<]+)<\/title>/i);
  if (!title) {
    errors.push("Missing <title>");
  } else if (/𝕍𝕖𝕣𝕤𝕠𝔸𝕚𝕣|ONLINE/i.test(title)) {
    errors.push("Fallback stylized title still present");
  }

  const description = findTagContent(
    html,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
  );
  if (!description) {
    errors.push("Missing meta description");
  }

  const canonical = findTagContent(
    html,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i,
  );
  const expected = expectedCanonical(normalizedRoute);
  if (!canonical) {
    errors.push("Missing canonical link");
  } else if (canonical !== expected) {
    errors.push(`Canonical mismatch (expected ${expected}, got ${canonical})`);
  }

  return {
    route: normalizedRoute,
    filePath: path.relative(process.cwd(), htmlFile),
    errors,
  };
}

async function main() {
  const raw = await fs.readFile(ROUTES_FILE, "utf8");
  const routes = JSON.parse(raw) as unknown;

  if (!Array.isArray(routes) || routes.length === 0) {
    throw new Error(
      `Invalid or empty route list in ${path.relative(process.cwd(), ROUTES_FILE)}`,
    );
  }

  const results = await Promise.all(
    routes.filter((r): r is string => typeof r === "string").map(validateRoute),
  );

  const failed = results.filter((r) => r.errors.length > 0);
  const passed = results.length - failed.length;

  console.log(`[seo:validate] Checked ${results.length} prerendered routes.`);
  console.log(`[seo:validate] Passed: ${passed}, Failed: ${failed.length}`);

  if (failed.length > 0) {
    for (const item of failed) {
      console.error(`\n[FAIL] ${item.route} (${item.filePath})`);
      for (const err of item.errors) {
        console.error(`  - ${err}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log("[seo:validate] All prerendered routes contain expected SEO tags.");
}

main().catch((error) => {
  console.error("[seo:validate] Failed:", error);
  process.exitCode = 1;
});
