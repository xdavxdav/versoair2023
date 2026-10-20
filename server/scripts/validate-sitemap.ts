import { PRIVATE_PATH_PREFIXES } from "../utils/seo-routes";

// Usage: npm run seo:validate-sitemap -- [baseUrl] [--sample=25]
const args = process.argv.slice(2);
const baseUrl = (args.find((a) => !a.startsWith("--")) ?? "https://www.versoair.com").replace(/\/+$/, "");
const sampleSize = Number(args.find((a) => a.startsWith("--sample="))?.split("=")[1] ?? 10);
const MAX_URLS_PER_FILE = 50_000;
const BUSINESS_URL = /^\/business\/\d+$/;

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);
const ok = (msg: string) => console.log(`✓ ${msg}`);

async function get(url: string) {
  const res = await fetch(url, { redirect: "manual", headers: { "User-Agent": "versoair-seo-validator" } });
  return { res, body: await res.text() };
}

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]);
}

function parseTags(html: string, tag: string): Array<Record<string, string>> {
  const tagRe = new RegExp(`<${tag}\\b([^>]*)>`, "gi");
  const attrRe = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  return [...html.matchAll(tagRe)].map((match) => {
    const attrs: Record<string, string> = {};
    for (const attr of match[1].matchAll(attrRe)) {
      attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3] ?? attr[4] ?? "";
    }
    return attrs;
  });
}

async function fetchXml(url: string, rootTag: "sitemapindex" | "urlset") {
  const { res, body } = await get(url);
  const type = res.headers.get("content-type") ?? "";
  if (res.status !== 200) {
    fail(`${url} returned HTTP ${res.status} (expected 200)`);
    return null;
  }
  if (!/^(application|text)\/xml/i.test(type)) {
    fail(`${url} Content-Type is "${type}" (expected application/xml)`);
  }
  if (!new RegExp(`<${rootTag}[\\s>]`).test(body)) {
    fail(`${url} is not a <${rootTag}> document`);
    return null;
  }
  return body;
}

async function main() {
  const origin = new URL(baseUrl).origin;
  console.log(`SITEMAP VALIDATION  ${origin}\n`);

  const { res: robotsRes, body: robots } = await get(`${origin}/robots.txt`);
  const declared = [...robots.matchAll(/^Sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  if (robotsRes.status !== 200) fail(`/robots.txt returned HTTP ${robotsRes.status}`);
  if (declared.length === 0) fail("robots.txt has no Sitemap: line");
  for (const url of declared) {
    if (!url.startsWith(`${origin}/`)) fail(`robots.txt Sitemap points off-site: ${url}`);
  }
  if (/^Disallow:\s*\/\s*$/im.test(robots)) fail("robots.txt contains 'Disallow: /'");
  if (declared.length > 0 && errors.length === 0) ok(`robots.txt → ${declared.join(", ")}`);

  const sitemapUrl = declared[0] ?? `${origin}/sitemap.xml`;
  const index = await fetchXml(sitemapUrl, "sitemapindex");
  const children = index ? locs(index) : [];
  if (index) ok(`sitemap index lists ${children.length} sitemap(s)`);

  const pageUrls: string[] = [];
  for (const child of children) {
    if (!child.startsWith(`${origin}/`)) fail(`index entry is off-site: ${child}`);
    const xml = await fetchXml(child, "urlset");
    if (!xml) continue;
    const urls = locs(xml);
    if (urls.length > MAX_URLS_PER_FILE) fail(`${child} has ${urls.length} URLs (max ${MAX_URLS_PER_FILE})`);
    ok(`${child} — ${urls.length} URLs`);
    pageUrls.push(...urls);
  }

  const seen = new Set<string>();
  for (const url of pageUrls) {
    if (seen.has(url)) fail(`duplicate URL: ${url}`);
    seen.add(url);

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      fail(`invalid URL: ${url}`);
      continue;
    }
    if (parsed.origin !== origin) fail(`wrong host: ${url}`);
    if (parsed.search || parsed.hash) fail(`URL has query/fragment: ${url}`);
    if (PRIVATE_PATH_PREFIXES.some((p) => parsed.pathname === p || parsed.pathname.startsWith(`${p}/`))) {
      fail(`private path in sitemap: ${url}`);
    }
    if (parsed.pathname.startsWith("/business/") && !BUSINESS_URL.test(parsed.pathname)) {
      fail(`unexpected business URL shape: ${url}`);
    }
  }

  // Spot-check that listed URLs resolve directly (no redirect, no error).
  const sample = [...seen].slice(0, sampleSize);
  const sampledTitles = new Map<string, string>();
  const sampledDescriptions = new Map<string, string>();
  for (const url of sample) {
    const { res, body } = await get(url);
    if (res.status !== 200) fail(`sampled URL returned HTTP ${res.status}: ${url}`);
    if (res.status !== 200) continue;

    const title = body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    const metas = parseTags(body, "meta");
    const links = parseTags(body, "link");
    const description = metas.find(
      (meta) => meta.name?.toLowerCase() === "description",
    )?.content?.trim();
    const canonicals = links
      .filter((link) => link.rel?.toLowerCase().split(/\s+/).includes("canonical"))
      .map((link) => link.href?.trim())
      .filter((value): value is string => Boolean(value));

    if (!title || /^versoair$/i.test(title)) {
      fail(`${url} has no specific title`);
    } else if (sampledTitles.has(title.toLowerCase())) {
      fail(
        `duplicate title in sampled pages: ${sampledTitles.get(title.toLowerCase())} and ${url}`,
      );
    } else {
      sampledTitles.set(title.toLowerCase(), url);
    }
    if (!description) {
      fail(`${url} has no meta description`);
    } else if (sampledDescriptions.has(description.toLowerCase())) {
      fail(
        `duplicate description in sampled pages: ${sampledDescriptions.get(description.toLowerCase())} and ${url}`,
      );
    } else {
      sampledDescriptions.set(description.toLowerCase(), url);
    }
    if (canonicals.length !== 1 || canonicals[0] !== url) {
      fail(`${url} canonical must appear exactly once and match the sitemap URL`);
    }
    if (
      !metas.some((meta) => meta.property?.toLowerCase() === "og:title" && meta.content) ||
      !metas.some((meta) => meta.property?.toLowerCase() === "og:description" && meta.content) ||
      !metas.some((meta) => meta.property?.toLowerCase() === "og:url" && meta.content === url) ||
      !metas.some((meta) => meta.name?.toLowerCase() === "twitter:card" && meta.content)
    ) {
      fail(`${url} is missing required Open Graph or Twitter metadata`);
    }
    if (BUSINESS_URL.test(new URL(url).pathname)) {
      const hasLocalBusinessJsonLd = [
        ...body.matchAll(
          /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
        ),
      ].some((match) => {
        if (!/type\s*=\s*["']?application\/ld\+json/i.test(match[1])) {
          return false;
        }
        try {
          const json = JSON.parse(match[2]);
          const types = ([] as unknown[]).concat(json["@type"] ?? []);
          return (
            types.includes("LocalBusiness") &&
            typeof json.name === "string" &&
            Boolean(json.name.trim()) &&
            json.url === url
          );
        } catch {
          return false;
        }
      });
      if (!hasLocalBusinessJsonLd) {
        fail(`${url} has no valid LocalBusiness JSON-LD`);
      }
    }
  }
  if (sample.length > 0) ok(`sampled ${sample.length} listed URL(s)`);

  console.log(`\n${seen.size} unique URLs checked.`);
  if (errors.length > 0) {
    console.error(`\n✗ ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exitCode = 1;
  } else {
    console.log("All sitemap checks passed.");
  }
}

main().catch((error) => {
  console.error("[seo:validate-sitemap] Failed:", error);
  process.exitCode = 1;
});
