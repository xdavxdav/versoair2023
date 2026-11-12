import { publicBusinessVisibilitySql } from "./business-visibility";
import { getSiteOrigin } from "./site-origin";

const MAX_INT4 = 2147483647;
const MAX_DESCRIPTION_LENGTH = 160;
const DEFAULT_DESCRIPTION =
  "Discover business details, contact information, and service highlights on VersoAir.";

export type BusinessSeoRow = {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  rating: string | number | null;
  reviews_count: number | null;
};

export type BusinessSeoRecord = {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  rating: number;
  reviewCount: number;
};

export type BusinessSeoPath =
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "id"; id: number };

// Inside app.use("*") req.path is always "/", so callers pass originalUrl.
export function parseBusinessSeoPath(url: string): BusinessSeoPath {
  const match = url.split("?")[0].split("#")[0].match(/^\/business\/([^/]+)\/?$/);
  if (!match || !/^\d+$/.test(match[1])) return { kind: "none" };

  const id = Number(match[1]);
  if (!Number.isSafeInteger(id) || id < 1 || id > MAX_INT4) {
    return { kind: "invalid" };
  }
  return { kind: "id", id };
}

export function buildBusinessSeoQuery(id: number) {
  return {
    text: `SELECT b.id, b.name, b.description, b.address, b.location, b.phone, b.email,
                  b.rating, b.reviews_count
           FROM businesses b
           WHERE b.id = $1 AND (${publicBusinessVisibilitySql("b")})`,
    values: [id],
  };
}

export function businessSeoRecordFromRow(row: BusinessSeoRow): BusinessSeoRecord {
  const rating = row.rating == null ? 0 : Number(row.rating);
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    address: row.address,
    location: row.location,
    phone: row.phone,
    email: row.email,
    rating: Number.isFinite(rating) ? rating : 0,
    reviewCount: Number(row.reviews_count) || 0,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Keeps a business name from closing the JSON-LD script tag.
function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

function descriptionFor(business: BusinessSeoRecord): string {
  const base = business.description?.trim() || DEFAULT_DESCRIPTION;
  const locationHint = [business.location, business.address].filter(Boolean).join(" • ");
  const combined = locationHint ? `${base} ${locationHint}` : base;
  return combined.slice(0, MAX_DESCRIPTION_LENGTH);
}

function localBusinessJsonLd(business: BusinessSeoRecord, url: string) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.description || undefined,
    url,
    telephone: business.phone || undefined,
    email: business.email || undefined,
  };
  if (business.address) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: business.address,
      addressLocality: business.location || undefined,
    };
  }
  // Only stored reviews: the client's fallback count of 1 would be invented.
  if (business.rating > 0 && business.reviewCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(business.rating.toFixed(1)),
      reviewCount: business.reviewCount,
    };
  }
  return jsonLd;
}

// Function replacers keep "$&"-style sequences in names literal.
function withHead(html: string, title: string, tags: string[]): string {
  return html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`)
    .replace("</head>", () => `    ${tags.join("\n    ")}\n  </head>`);
}

export function injectBusinessRouteSeoMeta(html: string, business: BusinessSeoRecord): string {
  const origin = getSiteOrigin();
  const canonical = `${origin}/business/${business.id}`;
  const image = `${origin}/Logo-page.png`;
  const title = business.name ? `${business.name} | VersoAir` : "Business Profile | VersoAir";
  const description = descriptionFor(business);
  const jsonLd = localBusinessJsonLd(business, canonical);

  return withHead(html, title, [
    `<meta name="description" content="${escapeHtml(description)}" data-rh="true">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" data-rh="true">`,
    `<meta property="og:type" content="website" data-rh="true">`,
    `<meta property="og:site_name" content="VersoAir" data-rh="true">`,
    `<meta property="og:title" content="${escapeHtml(title)}" data-rh="true">`,
    `<meta property="og:description" content="${escapeHtml(description)}" data-rh="true">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" data-rh="true">`,
    `<meta property="og:image" content="${escapeHtml(image)}" data-rh="true">`,
    `<meta name="twitter:card" content="summary_large_image" data-rh="true">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" data-rh="true">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" data-rh="true">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" data-rh="true">`,
    `<script type="application/ld+json" data-rh="true">${jsonForScript(jsonLd)}</script>`,
  ]);
}

export function injectBusinessNotFoundSeoMeta(html: string): string {
  const title = "Business Not Found | VersoAir";
  const description =
    "The requested business profile is unavailable or no longer listed on VersoAir.";
  const image = `${getSiteOrigin()}/Logo-page.png`;

  return withHead(html, title, [
    `<meta name="description" content="${escapeHtml(description)}" data-rh="true">`,
    `<meta property="og:type" content="website" data-rh="true">`,
    `<meta property="og:site_name" content="VersoAir" data-rh="true">`,
    `<meta property="og:title" content="${escapeHtml(title)}" data-rh="true">`,
    `<meta property="og:description" content="${escapeHtml(description)}" data-rh="true">`,
    `<meta property="og:image" content="${escapeHtml(image)}" data-rh="true">`,
    `<meta name="twitter:card" content="summary_large_image" data-rh="true">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" data-rh="true">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" data-rh="true">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" data-rh="true">`,
  ]);
}
