export interface PageReadinessConfig {
  version: number;
  eligiblePaths: string[];
  blockedPaths: string[];
}

export const PAGE_READINESS_CONFIG_VERSION = 6;

export const LOCAL_PREVIEW_ONLY_PATHS = [
  "/get-involved",
  "/ong-culturelle",
  "/vheartz",
  "/vheatrz",
  "/artihuman-foundation",
  "/programs",
  "/partners",
  "/sponsorship",
  "/businesses-directory",
  "/commerce",
  "/hotellerie",
  "/batiment",
  "/automobile",
  "/finances",
  "/divertissement",
] as const;

export const PAGE_READINESS_CANDIDATES = [
  "/hub",
  "/about",
  "/contact",
  "/demo",
  "/preview",
  "/tour",
  "/industries",
  "/pricing",
  "/for-artists",
  "/for-businesses",
  "/for-listeners",
  "/blog",
  "/faq",
  "/marketplace",
  "/art-and-artisanat",
  "/user",
  "/profiles",
  "/import-business",
  "/status",
  "/partners",
  "/get-involved",
  "/ong-culturelle",
  "/vheartz",
  "/vheatrz",
  "/artihuman-foundation",
  "/impact",
  "/tickets",
  "/ad-campaigns",
  "/commerce",
  "/hotellerie",
  "/batiment",
  "/automobile",
  "/finances",
  "/divertissement",
  "/sante",
  "/logement",
  "/reservations",
  "/businesses-directory",
  "/business",
  "/category",
  "/annuaire-tv",
  "/database-results",
  "/services",
  "/services/news",
  "/services/careers",
  "/services/contractors",
  "/contracts",
  "/artisans",
  "/artistes",
  "/programs",
  "/communities",
  "/community",
  "/artisan-workshops",
  "/events",
  "/sponsor",
  "/sponsorship",
  "/sav",
  "/versoai",
  "/help",
  "/help/account",
  "/help/payments",
  "/help/delivery",
  "/help/product",
  "/help/returns",
  "/help/guarantee",
  "/privacy",
  "/terms",
  "/cookies",
  "/gdpr",
  "/information",
] as const;

export const DEFAULT_PAGE_READINESS_CONFIG: PageReadinessConfig = {
  version: PAGE_READINESS_CONFIG_VERSION,
  eligiblePaths: [...LOCAL_PREVIEW_ONLY_PATHS],
  blockedPaths: [...LOCAL_PREVIEW_ONLY_PATHS],
};

export function migratePageReadinessConfig(
  config: PageReadinessConfig,
): PageReadinessConfig {
  if (config.version >= PAGE_READINESS_CONFIG_VERSION) return config;
  return {
    version: PAGE_READINESS_CONFIG_VERSION,
    eligiblePaths: [
      ...new Set([
        ...config.eligiblePaths.filter((path) => path !== "/docs"),
        ...LOCAL_PREVIEW_ONLY_PATHS,
      ]),
    ],
    blockedPaths: [
      ...new Set([
        ...config.blockedPaths.filter((path) => path !== "/docs"),
        ...LOCAL_PREVIEW_ONLY_PATHS,
      ]),
    ],
  };
}

const RESERVED_PAGE_PATHS = [
  "/account",
  "/admin",
  "/api",
  "/auth",
  "/dashboard",
  "/geo-admin",
  "/messages",
  "/profile",
  "/sys",
];

export function normalizePublicPagePath(path: string): string | null {
  const normalized = path.trim().toLowerCase().replace(/\/+$/, "") || "/";
  if (
    normalized === "/" ||
    !/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(normalized) ||
    RESERVED_PAGE_PATHS.some(
      (reserved) =>
        normalized === reserved || normalized.startsWith(`${reserved}/`),
    )
  ) {
    return null;
  }
  return normalized;
}

export function isPageReadinessCandidate(path: string): boolean {
  return (PAGE_READINESS_CANDIDATES as readonly string[]).includes(path);
}

export function isLocalPreviewOnlyPath(pathname: string): boolean {
  const normalizedPath =
    pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "").toLowerCase() || "/";
  return LOCAL_PREVIEW_ONLY_PATHS.some(
    (previewPath) =>
      normalizedPath === previewPath ||
      normalizedPath.startsWith(`${previewPath}/`),
  );
}

export function isLocalDevelopmentHost(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "::1"].includes(
    hostname.replace(/^\[|\]$/g, "").toLowerCase(),
  );
}

export function getEffectiveBlockedPaths(
  blockedPaths: readonly string[],
  isLocalPreview: boolean,
): string[] {
  return isLocalPreview
    ? blockedPaths.filter((path) => !isLocalPreviewOnlyPath(path))
    : [...blockedPaths];
}

export function enforceProductionPreviewGates(
  config: PageReadinessConfig,
  isProduction: boolean,
): PageReadinessConfig {
  if (!isProduction) return config;
  return {
    ...config,
    eligiblePaths: [
      ...new Set([...config.eligiblePaths, ...LOCAL_PREVIEW_ONLY_PATHS]),
    ],
    blockedPaths: [
      ...new Set([...config.blockedPaths, ...LOCAL_PREVIEW_ONLY_PATHS]),
    ],
  };
}

export function isPageBlocked(
  pathname: string,
  blockedPaths: readonly string[],
): boolean {
  const normalizedPath = (pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/")
    .toLowerCase();

  return blockedPaths.some((blockedPath) => {
    const normalizedBlockedPath =
      blockedPath.replace(/\/+$/, "").toLowerCase() || "/";
    return (
      normalizedPath === normalizedBlockedPath ||
      normalizedPath.startsWith(`${normalizedBlockedPath}/`)
    );
  });
}
