// While the beta scope is frozen, App.tsx sends every path outside this list to the home page.
export const BETA_SCOPE_FREEZE = true;

const BETA_ROUTE_PREFIXES = [
  "/dashboard",
  "/admin",
  "/account/billing",
  "/account/cards",
  "/account/paypal",
  "/geo-admin",
  "/artist-portal",
  "/music",
  "/stream",
  "/track/",
  "/artist-catalogue/",
  "/library",
  "/analytics",
  "/arena",
  "/arcade",
  "/listener-portal",
  "/streamer-portal",
  "/auth/",
  "/profile",
  "/messages",
  "/apply",
  "/marketplace",
  "/art-and-artisanat",
  "/profiles/",
  "/status",
  "/pricing",
  "/blog",
  "/faq",
  "/id-guide",
  "/sav",
  "/versoai",
  "/ai",
  "/help",
  "/privacy",
  "/terms",
  "/cookies",
  "/gdpr",
  "/information",
  "/team/",
  "/sponsor",
  "/sponsorship",
  "/about",
  "/hub",
  "/contact",
  "/demo",
  "/industries",
  "/partners",
  "/import-business",
  "/get-involved",
  "/ong-culturelle",
  "/artihuman-foundation",
  "/vheatrz",
  "/vheartz",
  "/impact",
  "/tickets",
  "/business/",
  "/businesses-directory",
  "/category/",
  "/annuaire-tv",
  "/database-results",
  "/commerce",
  "/hotellerie",
  "/batiment",
  "/automobile",
  "/finances",
  "/divertissement",
  "/sante",
  "/logement",
  "/reservations",
  "/services",
  "/artisans",
  "/artisans-portal",
  "/artistes",
  "/programs",
  "/events",
  "/event/",
  "/communities",
  "/community",
  "/artisan-workshops",
  "/marketing",
  "/signin",
  "/jobs",
  "/contracts",
  "/",
] as const;

// Short or retired URLs that App.tsx redirects to a beta page. They are matched exactly and
// must pass the freeze, otherwise the redirect never runs and visitors land on the home page.
const BETA_ALIAS_PATHS: ReadonlySet<string> = new Set([
  "/account",
  "/artisan",
  "/artist-directory",
  "/beatmaker",
  "/billing",
  "/careers",
  "/contractor",
  "/explore",
  "/finance",
  "/orders",
  "/podcast",
  "/royale",
  "/sectors",
  "/sell",
  "/signin-simple",
  "/signup",
  "/streamroyale",
  "/streamroyale-admin",
  "/support",
]);

export function isBetaRoute(pathname: string): boolean {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (BETA_ALIAS_PATHS.has(path)) return true;

  return BETA_ROUTE_PREFIXES.some((prefix) => {
    if (prefix === "/") return path === "/";
    const normalizedPrefix = prefix.replace(/\/+$/, "");
    return (
      path === normalizedPrefix ||
      path.startsWith(`${normalizedPrefix}/`)
    );
  });
}

// For links: false means the page is outside the frozen beta and a click would land on the home page.
export function isRouteReachable(pathname: string): boolean {
  return !BETA_SCOPE_FREEZE || isBetaRoute(pathname);
}
