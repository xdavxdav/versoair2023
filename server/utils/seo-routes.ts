// Single source of truth for public, indexable static routes. Used by the sitemap,
// robots.txt and the prerender route generator so they cannot drift apart.
export const PUBLIC_STATIC_ROUTES: ReadonlyArray<{
  path: string;
  changefreq: "daily" | "weekly";
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
