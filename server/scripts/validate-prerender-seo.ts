import fs from "node:fs/promises";
import path from "node:path";

const SITE_ORIGIN = "https://www.versoair.com";
const DIST_PUBLIC = path.join(process.cwd(), "dist", "public");
const ROUTES_FILE = path.join(DIST_PUBLIC, "prerender-routes.json");
const CONCURRENCY = 64;
const VERBOSE_LIMIT = 50;

const BUSINESS_ROUTE = /^\/business\/[^/]+$/;
const LOCAL_BUSINESS_TYPES = new Set([
  "LocalBusiness",
  "Store",
  "Restaurant",
  "Hotel",
  "LodgingBusiness",
  "AutoDealer",
  "AutoRepair",
  "AutomotiveBusiness",
  "FinancialService",
  "BankOrCreditUnion",
  "HomeAndConstructionBusiness",
  "GeneralContractor",
  "EntertainmentBusiness",
  "ProfessionalService",
  "RealEstateAgent",
  "HealthAndBeautyBusiness",
  "FoodEstablishment",
]);

type Attrs = Record<string, string>;

type Check = { label: string; ok: boolean; detail?: string };

type RouteResult = {
  route: string;
  filePath: string;
  checks: Check[];
  title: string | null;
  canonical: string | null;
};

function normalizeRoute(route: string): string {
  return route.startsWith("/") ? route : `/${route}`;
}

function expectedCanonical(route: string): string {
  const normalized = route === "/" ? "/" : route.replace(/\/+$/, "");
  return `${SITE_ORIGIN}${normalized}`;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Attribute order and extras (e.g. Helmet's data-rh) must not matter.
function parseTags(html: string, tag: string): Attrs[] {
  const tagRe = new RegExp(`<${tag}\\b([^>]*)>`, "gi");
  const attrRe = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  const out: Attrs[] = [];
  for (const m of html.matchAll(tagRe)) {
    const attrs: Attrs = {};
    for (const a of m[1].matchAll(attrRe)) {
      attrs[a[1].toLowerCase()] = decodeEntities(a[2] ?? a[3] ?? a[4] ?? "");
    }
    out.push(attrs);
  }
  return out;
}

function metaValues(metas: Attrs[], key: "name" | "property", value: string) {
  return metas
    .filter((m) => m[key]?.toLowerCase() === value)
    .map((m) => (m.content ?? "").trim())
    .filter(Boolean);
}

function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    if (/type\s*=\s*["']?application\/ld\+json/i.test(m[1])) {
      blocks.push(m[2].trim());
    }
  }
  return blocks;
}

function flattenJsonLd(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Array.isArray(obj["@graph"])
      ? flattenJsonLd(obj["@graph"])
      : [obj];
  }
  return [];
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
      // try next candidate
    }
  }
  return null;
}

function validateJsonLd(html: string): Check {
  const blocks = extractJsonLdBlocks(html);
  if (blocks.length === 0) {
    return { label: "JSON-LD", ok: false, detail: "missing" };
  }

  const nodes: Record<string, unknown>[] = [];
  for (const block of blocks) {
    try {
      nodes.push(...flattenJsonLd(JSON.parse(block)));
    } catch {
      return { label: "JSON-LD", ok: false, detail: "invalid JSON" };
    }
  }

  const business = nodes.find((node) => {
    const types = ([] as unknown[]).concat(node["@type"] ?? []);
    return types.some(
      (t) => typeof t === "string" && LOCAL_BUSINESS_TYPES.has(t),
    );
  });

  if (!business) {
    const hasType = nodes.some((n) => n["@type"]);
    return {
      label: "JSON-LD",
      ok: false,
      detail: hasType
        ? "@type is not LocalBusiness or a known subtype"
        : "missing @type",
    };
  }
  if (typeof business.name !== "string" || !business.name.trim()) {
    return { label: "JSON-LD", ok: false, detail: "missing name" };
  }
  if (typeof business.url !== "string" || !business.url.trim()) {
    return { label: "JSON-LD", ok: false, detail: "missing url" };
  }
  return { label: "JSON-LD", ok: true };
}

async function validateRoute(route: string): Promise<RouteResult> {
  const htmlFile = await resolveHtmlFile(route);
  if (!htmlFile) {
    return {
      route,
      filePath: "(missing)",
      checks: [{ label: "HTML file", ok: false, detail: "not found" }],
      title: null,
      canonical: null,
    };
  }

  const html = await fs.readFile(htmlFile, "utf8");
  const checks: Check[] = [];
  const metas = parseTags(html, "meta");
  const links = parseTags(html, "link");

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : null;
  if (!title) {
    checks.push({ label: "title", ok: false, detail: "missing" });
  } else if (/𝕍𝕖𝕣𝕤𝕠𝔸𝕚𝕣|\bONLINE\b/i.test(title) || /^versoair$/i.test(title)) {
    checks.push({ label: "title", ok: false, detail: `generic title "${title}"` });
  } else {
    checks.push({ label: "title", ok: true });
  }

  checks.push({
    label: "description",
    ok: metaValues(metas, "name", "description").length > 0,
    detail: "missing",
  });

  const canonicals = links
    .filter((l) => l.rel?.toLowerCase().split(/\s+/).includes("canonical"))
    .map((l) => (l.href ?? "").trim())
    .filter(Boolean);
  const canonical = canonicals[0] ?? null;
  const expected = expectedCanonical(route);
  if (canonicals.length === 0) {
    checks.push({ label: "canonical", ok: false, detail: "missing" });
  } else if (new Set(canonicals).size > 1) {
    checks.push({
      label: "canonical",
      ok: false,
      detail: `conflicting canonicals: ${canonicals.join(", ")}`,
    });
  } else if (canonical !== expected) {
    checks.push({
      label: "canonical",
      ok: false,
      detail: `expected ${expected}, got ${canonical}`,
    });
  } else {
    checks.push({ label: "canonical", ok: true });
  }

  const ogTitle = metaValues(metas, "property", "og:title").length > 0;
  const ogDescription = metaValues(metas, "property", "og:description").length > 0;
  const ogUrl = metaValues(metas, "property", "og:url")[0];
  const ogMissing = [
    !ogTitle && "og:title",
    !ogDescription && "og:description",
    !ogUrl && "og:url",
  ].filter(Boolean);
  if (ogMissing.length > 0) {
    checks.push({ label: "OG", ok: false, detail: `missing ${ogMissing.join(", ")}` });
  } else if (ogUrl !== expected) {
    checks.push({
      label: "OG",
      ok: false,
      detail: `og:url expected ${expected}, got ${ogUrl}`,
    });
  } else {
    checks.push({ label: "OG", ok: true });
  }

  checks.push({
    label: "Twitter",
    ok: metaValues(metas, "name", "twitter:card").length > 0,
    detail: "missing twitter:card",
  });

  if (BUSINESS_ROUTE.test(route)) {
    checks.push(validateJsonLd(html));
  }

  return {
    route,
    filePath: path.relative(process.cwd(), htmlFile),
    checks,
    title,
    canonical,
  };
}

// Duplicates are reported on every route involved so each one shows up in the output.
function flagDuplicates(results: RouteResult[], field: "title" | "canonical") {
  const groups = new Map<string, RouteResult[]>();
  for (const r of results) {
    const value = r[field];
    if (!value) continue;
    const key = value.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const r of group) {
      const others = group.filter((g) => g !== r).map((g) => g.route);
      const sample = others.slice(0, 3).join(", ");
      r.checks.push({
        label: `duplicate ${field}`,
        ok: false,
        detail: `shared with ${sample}${others.length > 3 ? ` (+${others.length - 3} more)` : ""}`,
      });
    }
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

function printResult(r: RouteResult) {
  const failed = r.checks.some((c) => !c.ok);
  const log = failed ? console.error : console.log;
  log(`\n${failed ? "✗" : "✓"} ${r.route}`);
  for (const c of r.checks) {
    log(`  ${c.label} ${c.ok ? "✓" : `✗${c.detail ? ` ${c.detail}` : ""}`}`);
  }
}

async function main() {
  const raw = await fs.readFile(ROUTES_FILE, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      `Invalid or empty route list in ${path.relative(process.cwd(), ROUTES_FILE)}`,
    );
  }

  const routes = parsed
    .filter((r): r is string => typeof r === "string")
    .map(normalizeRoute);

  const results = await mapWithConcurrency(routes, CONCURRENCY, validateRoute);
  flagDuplicates(results, "title");
  flagDuplicates(results, "canonical");

  const failed = results.filter((r) => r.checks.some((c) => !c.ok));
  const verbose = results.length <= VERBOSE_LIMIT || process.argv.includes("--verbose");

  console.log("SEO PRERENDER VALIDATION");
  for (const r of verbose ? results : failed) printResult(r);

  console.log(
    `\nChecked ${results.length} routes. Passed: ${results.length - failed.length}, Failed: ${failed.length}`,
  );
  if (!verbose && failed.length === 0) {
    console.log("(pass --verbose to list every route)");
  }

  if (failed.length > 0) {
    console.error("\nSEO validation failed. Blocking the build.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[seo:validate] Failed:", error);
  process.exitCode = 1;
});
