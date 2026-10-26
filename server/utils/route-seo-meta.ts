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
      "Verso Air Inc. is launching a digital platform for business visibility and creative projects, starting in Ontario with the ambition to grow worldwide. Directory listings and metrics will be published once verified.",
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
  "/about": {
    title: "About Verso Air | Business Directory and Creative Platform",
    description:
      "Learn about Verso Air Inc., an Ontario corporation launching a platform for business visibility and creative projects, with the ambition to grow worldwide.",
  },
  "/contact": {
    title: "Contact Verso Air | Toronto",
    description:
      "Contact Verso Air Inc. in Toronto for business directory, platform, partnership, and support inquiries.",
  },
  "/get-involved": {
    title: "Get Involved | Verso Air and vHeartz",
    description:
      "Explore future ways to participate in Verso Air and vHeartz community initiatives. Programs are announced when confirmed.",
  },
  "/privacy": {
    title: "Privacy Policy | Verso Air",
    description:
      "Read how Verso Air Inc. collects, uses, protects, and retains personal information on its platform.",
  },
  "/terms": {
    title: "Terms of Service | Verso Air",
    description:
      "Review the terms governing use of Verso Air Inc.'s business directory, platform tools, and creative services.",
  },
  "/cookies": {
    title: "Cookie Policy | Verso Air",
    description:
      "Learn how Verso Air uses essential cookies and optional analytics technologies, and how to manage your consent.",
  },
  "/marketing/journal": {
    title: "Business Journal | Verso Air",
    description:
      "Read Verso Air journal articles and updates on business visibility, community, and creative projects.",
  },
  "/marketing/print": {
    title: "Professional Print Services | Verso Air",
    description:
      "Explore Verso Air professional printing services for business cards, flyers, brochures, posters, and banners.",
  },
  "/marketing/newsletters": {
    title: "Newsletters | Verso Air",
    description:
      "Subscribe to Verso Air updates and browse published newsletters about business visibility and creative projects.",
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
