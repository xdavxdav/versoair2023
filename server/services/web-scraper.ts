/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSO AIR — MARKET RAIDER: Web Scraping & Business Migration Tool
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Parses competitor directory URLs (YellowPages, PagesJaunes, GoAfricaOnline)
 * and extracts business data for import into Verso Air.
 *
 * Approach: Fetch HTML, parse with regex (no external dependency like cheerio).
 * Returns structured business data ready for DB insert.
 */

interface ScrapedBusiness {
  name: string;
  phone: string;
  address: string;
  city: string;
  category: string;
  website: string;
  description: string;
  source: string;
  sourceUrl: string;
  scrapedAt: string;
}

interface ScrapeResult {
  success: boolean;
  businesses: ScrapedBusiness[];
  totalFound: number;
  source: string;
  errors: string[];
}

// ─── HTML entity decoder ─────────────────────────────────────────────────────
function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/<[^>]+>/g, "") // Strip remaining HTML tags
    .trim();
}

// ─── Detect source type from URL ─────────────────────────────────────────────
function detectSource(
  url: string,
): "yellowpages" | "pagesjaunes" | "goafricaonline" | "generic" {
  const lower = url.toLowerCase();
  if (lower.includes("yellowpages.c")) return "yellowpages";
  if (lower.includes("pagesjaunes.")) return "pagesjaunes";
  if (lower.includes("goafricaonline.")) return "goafricaonline";
  return "generic";
}

// ─── Generic JSON-LD extractor (works on many modern directories) ────────────
function extractJsonLdBusinesses(
  html: string,
  sourceUrl: string,
): ScrapedBusiness[] {
  const results: ScrapedBusiness[] = [];
  const jsonLdRegex =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (
          item["@type"] === "LocalBusiness" ||
          item["@type"] === "Organization" ||
          item["@type"]?.includes?.("LocalBusiness")
        ) {
          results.push({
            name: item.name || "",
            phone: item.telephone || "",
            address:
              typeof item.address === "string"
                ? item.address
                : item.address?.streetAddress || "",
            city:
              typeof item.address === "object"
                ? item.address?.addressLocality || ""
                : "",
            category: item.category || item["@type"] || "",
            website: item.url || "",
            description: item.description || "",
            source: detectSource(sourceUrl),
            sourceUrl,
            scrapedAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Invalid JSON-LD — skip
    }
  }

  return results;
}

// ─── Structured data extractor using common patterns ─────────────────────────
function extractFromListingPatterns(
  html: string,
  sourceUrl: string,
): ScrapedBusiness[] {
  const results: ScrapedBusiness[] = [];
  const source = detectSource(sourceUrl);

  // Pattern: <h2 class="listing-name"> or data-business-name
  const namePattern =
    /(?:class="(?:listing-name|business-name|company-name|biz-name)[^"]*"|data-business-name="([^"]*)")[\s\S]*?(?:<a[^>]*>|>)([^<]+)/gi;
  const phonePattern = /(?:tel:|phone:|téléphone:?)[\s]*([+\d\s()-]{7,20})/gi;
  const addressPattern =
    /(?:class="(?:listing-address|address|street-address)[^"]*")[\s\S]*?>([^<]+)/gi;

  // Collect all names
  const names: string[] = [];
  let m;
  while ((m = namePattern.exec(html)) !== null) {
    const name = decodeEntities(m[1] || m[2]);
    if (name.length > 2 && name.length < 150) names.push(name);
  }

  // Collect all phones
  const phones: string[] = [];
  while ((m = phonePattern.exec(html)) !== null) {
    phones.push(m[1].trim());
  }

  // Collect all addresses
  const addresses: string[] = [];
  while ((m = addressPattern.exec(html)) !== null) {
    addresses.push(decodeEntities(m[1]));
  }

  // Build business objects (best effort matching by index)
  for (let i = 0; i < names.length; i++) {
    results.push({
      name: names[i],
      phone: phones[i] || "",
      address: addresses[i] || "",
      city: "",
      category: "",
      website: "",
      description: "",
      source,
      sourceUrl,
      scrapedAt: new Date().toISOString(),
    });
  }

  return results;
}

// ─── Main scrape function ────────────────────────────────────────────────────
export async function scrapeDirectoryUrl(url: string): Promise<ScrapeResult> {
  const errors: string[] = [];
  const source = detectSource(url);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        success: false,
        businesses: [],
        totalFound: 0,
        source,
        errors: [`HTTP ${response.status} — ${response.statusText}`],
      };
    }

    const html = await response.text();

    // Try JSON-LD first (highest quality)
    let businesses = extractJsonLdBusinesses(html, url);

    // If no JSON-LD, try HTML patterns
    if (businesses.length === 0) {
      businesses = extractFromListingPatterns(html, url);
    }

    // Deduplicate by name
    const seen = new Set<string>();
    businesses = businesses.filter((b) => {
      const key = b.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      success: true,
      businesses,
      totalFound: businesses.length,
      source,
      errors,
    };
  } catch (err: any) {
    return {
      success: false,
      businesses: [],
      totalFound: 0,
      source,
      errors: [err.message || "Scrape failed"],
    };
  }
}
