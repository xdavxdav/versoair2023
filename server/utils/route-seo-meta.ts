// Per-route SEO metadata injected into index.html at request time so crawlers get
// route-specific tags without a headless-browser prerender step. Keep in sync with
// the <SeoHead> usages on each page. Tags carry data-rh so react-helmet-async
// replaces them (rather than duplicating them) once the client mounts.
const SITE_ORIGIN = "https://www.versoair.com";
const DEFAULT_IMAGE = "/Logo-page.png";

type RouteMeta = { title: string; description: string };

export const ROUTE_SEO_META: Readonly<Record<string, RouteMeta>> = {
  "/": {
    title: "VersoAir | Business Directory & Advertising Platform",
    description:
      "Verso Air Inc. is preparing a Toronto-focused platform for business visibility and creative projects. Directory listings and metrics will be published as they become available and verified.",
  },
  "/businesses-directory": {
    title: "Businesses Directory | VersoAir",
    description:
      "The Verso Air business directory is preparing its first market. Listings and expansion depend on verified local availability.",
  },
  "/commerce": {
    title: "Commerce Directory | VersoAir",
    description:
      "Browse commerce businesses, retailers, and service providers on VersoAir with category insights and verified listings.",
  },
  "/hotellerie": {
    title: "Hospitality Directory | VersoAir",
    description:
      "Find hotels, hospitality services, and food businesses on VersoAir with verified profiles and sector analytics.",
  },
  "/batiment": {
    title: "Construction Directory | VersoAir",
    description:
      "Discover construction contractors, building services, and infrastructure businesses on VersoAir.",
  },
  "/automobile": {
    title: "Automobile Directory | VersoAir",
    description:
      "Browse automobile businesses, dealerships, repair services, and mobility providers listed on VersoAir.",
  },
  "/finances": {
    title: "Finance Directory | VersoAir",
    description:
      "Explore banks, fintech, insurance, and financial services businesses on VersoAir.",
  },
  "/divertissement": {
    title: "Entertainment Directory | VersoAir",
    description:
      "Find entertainment, media, music, and events businesses across markets on VersoAir.",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizePath(requestPath: string): string {
  const trimmed = requestPath.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function injectRouteSeoMeta(html: string, requestPath: string): string {
  const routePath = normalizePath(requestPath);
  const meta = ROUTE_SEO_META[routePath];
  if (!meta) return html;

  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const canonical = `${SITE_ORIGIN}${routePath}`;
  const image = `${SITE_ORIGIN}${DEFAULT_IMAGE}`;

  const tags = [
    `<meta name="description" content="${description}" data-rh="true">`,
    `<link rel="canonical" href="${canonical}" data-rh="true">`,
    `<meta property="og:type" content="website" data-rh="true">`,
    `<meta property="og:site_name" content="VersoAir" data-rh="true">`,
    `<meta property="og:title" content="${title}" data-rh="true">`,
    `<meta property="og:description" content="${description}" data-rh="true">`,
    `<meta property="og:url" content="${canonical}" data-rh="true">`,
    `<meta property="og:image" content="${image}" data-rh="true">`,
    `<meta name="twitter:card" content="summary_large_image" data-rh="true">`,
    `<meta name="twitter:title" content="${title}" data-rh="true">`,
    `<meta name="twitter:description" content="${description}" data-rh="true">`,
    `<meta name="twitter:image" content="${image}" data-rh="true">`,
  ].join("\n    ");

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace("</head>", `    ${tags}\n  </head>`);
}
