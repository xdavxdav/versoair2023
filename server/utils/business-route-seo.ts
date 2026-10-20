import { generateBusinessJsonLd } from "../services/json-ld-generator";
import { getSiteOrigin } from "./site-origin";

export type BusinessSeoRecord = {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function injectBusinessRouteSeoMeta(
  html: string,
  business: BusinessSeoRecord,
): string {
  const origin = getSiteOrigin();
  const canonical = `${origin}/business/${business.id}`;
  const location = [business.city, business.country].filter(Boolean).join(", ");
  const category = business.category?.trim();
  const title = `${business.name} | ${category || "Business"}${location ? ` in ${location}` : ""} | VersoAir`;
  const sourceDescription = business.description
    ? plainText(business.description)
    : `Discover ${business.name}${category ? `, a ${category}` : ""}${location ? ` in ${location}` : ""} on VersoAir.`;
  const description = sourceDescription.slice(0, 300);
  const image = business.imageUrl
    ? new URL(business.imageUrl, origin).toString()
    : `${origin}/Logo-page.png`;
  const jsonLd = generateBusinessJsonLd({
    id: business.id,
    name: business.name,
    description: business.description ?? undefined,
    address: business.address ?? undefined,
    city: business.city ?? undefined,
    country: business.country ?? undefined,
    countryCode: business.countryCode ?? undefined,
    phone: business.phone ?? undefined,
    email: business.email ?? undefined,
    website: business.website ?? undefined,
    rating: business.rating ?? undefined,
    reviewCount: business.reviewCount ?? undefined,
    latitude: business.latitude ?? undefined,
    longitude: business.longitude ?? undefined,
    category: business.category ?? undefined,
    imageUrl: business.imageUrl ?? undefined,
  });
  const tags = [
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
    `<script type="application/ld+json" data-rh="true">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");

  return html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace("</head>", `    ${tags}\n  </head>`);
}
