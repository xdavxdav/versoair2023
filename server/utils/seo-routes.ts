// Single source of truth for public, indexable static routes. Used by the sitemap,
// robots.txt and the prerender route generator so they cannot drift apart.
export const PUBLIC_STATIC_ROUTES: ReadonlyArray<{
  path: string;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  priority: string;
}> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/businesses-directory", changefreq: "daily", priority: "0.9" },
  { path: "/commerce", changefreq: "weekly", priority: "0.8" },
  { path: "/hotellerie", changefreq: "weekly", priority: "0.8" },
  { path: "/batiment", changefreq: "weekly", priority: "0.8" },
  { path: "/automobile", changefreq: "weekly", priority: "0.8" },
  { path: "/finances", changefreq: "weekly", priority: "0.8" },
  { path: "/divertissement", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/get-involved", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/marketing/journal", changefreq: "weekly", priority: "0.7" },
  { path: "/marketing/print", changefreq: "monthly", priority: "0.6" },
  { path: "/marketing/newsletters", changefreq: "weekly", priority: "0.6" },
];

// Path prefixes that must never appear in the sitemap or be crawlable.
export const PRIVATE_PATH_PREFIXES = [
  "/api",
  "/auth",
  "/admin",
  "/dashboard",
  "/profile",
  "/geo-admin",
  "/account",
  "/payments",
  "/contracts",
  "/signin",
  "/login",
  "/signup",
] as const;
