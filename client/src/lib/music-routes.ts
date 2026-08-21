/**
 * Music Routes — Single source of truth for Musical Universe navigation
 */

export const MUSIC_ROUTE_PREFIXES = [
  "/music",
  "/artist-portal",
  "/stream",
  "/streamer-portal",
  "/arcade",
  "/beatmaker",
  "/arena",
  "/listener-portal",
] as const;

export const MUSIC_ROUTES = {
  // Main entry
  home: "/music",
  dashboard: "/music/dashboard",

  // Core features
  studio: "/music/studio",
  vault: "/music/vault",
  insights: "/music/insights",
  live: "/music/live",
  settings: "/music/settings",

  // Dashboard sections
  projects: "/music/projects",
  releasePipeline: "/music/releases",
  releasePlanner: "/music/planner",
  releaseMarketing: "/music/marketing",
  artists: "/music/artists",
  arDashboard: "/music/a-and-r",

  // Legacy/alternate paths (redirects)
  artistPortal: "/artist-portal",
  artistPortalWelcome: "/artist-portal/welcome",
  stream: "/stream",
  streamerPortal: "/streamer-portal",
  arcade: "/arcade",
  arena: "/arena",
  listenerPortal: "/listener-portal",
} as const;

export const MUSIC_NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: MUSIC_ROUTES.dashboard,
    icon: "LayoutDashboard",
    description: "Your command center",
  },
  {
    id: "studio",
    label: "Studio",
    href: MUSIC_ROUTES.studio,
    icon: "Disc3",
    description: "Request production & sessions",
  },
  {
    id: "vault",
    label: "Vault",
    href: MUSIC_ROUTES.vault,
    icon: "Library",
    description: "Your music library",
  },
  {
    id: "insights",
    label: "Insights",
    href: MUSIC_ROUTES.insights,
    icon: "BarChart3",
    description: "Analytics & performance",
  },
  {
    id: "social",
    label: "Community",
    href: "/music/social",
    icon: "Users",
    description: "Share tracks with the community",
  },
  {
    id: "live",
    label: "Royale",
    href: MUSIC_ROUTES.live,
    icon: "Flame",
    description: "Competitions & streaming",
  },
] as const;

/** Sidebar navigation items — two sections: core tools + management */
export const MUSIC_SIDEBAR_ITEMS = [
  // ─── Core ───
  {
    id: "home",
    label: "Home",
    href: MUSIC_ROUTES.dashboard,
    icon: "Home",
    section: "CORE",
  },
  {
    id: "studio",
    label: "Studio",
    href: MUSIC_ROUTES.studio,
    icon: "Disc3",
    section: "CORE",
  },
  {
    id: "vault",
    label: "Vault",
    href: MUSIC_ROUTES.vault,
    icon: "Library",
    section: "CORE",
  },
  {
    id: "insights",
    label: "Analytics",
    href: MUSIC_ROUTES.insights,
    icon: "BarChart3",
    section: "CORE",
  },
  {
    id: "royalties",
    label: "Royalties",
    href: "/music/royalties",
    icon: "DollarSign",
    section: "CORE",
  },
  {
    id: "live",
    label: "Royale",
    href: MUSIC_ROUTES.live,
    icon: "Flame",
    section: "CORE",
  },
  // ─── Manage ───
  {
    id: "projects",
    label: "Projects",
    href: MUSIC_ROUTES.projects,
    icon: "FolderKanban",
    section: "MANAGE",
  },
  {
    id: "release-pipeline",
    label: "Release Pipeline",
    href: MUSIC_ROUTES.releasePipeline,
    icon: "GitBranch",
    section: "MANAGE",
  },
  {
    id: "release-planner",
    label: "Release Planner",
    href: MUSIC_ROUTES.releasePlanner,
    icon: "CalendarDays",
    section: "MANAGE",
  },
  {
    id: "artists",
    label: "Artists",
    href: MUSIC_ROUTES.artists,
    icon: "Users",
    section: "MANAGE",
  },
  {
    id: "ar-dashboard",
    label: "A&R Dashboard",
    href: MUSIC_ROUTES.arDashboard,
    icon: "Music",
    section: "MANAGE",
  },
] as const;

export const MUSIC_MOBILE_NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Home",
    href: MUSIC_ROUTES.dashboard,
    icon: "Home",
  },
  { id: "studio", label: "Studio", href: MUSIC_ROUTES.studio, icon: "Disc3" },
  { id: "vault", label: "Vault", href: MUSIC_ROUTES.vault, icon: "Library" },
  { id: "live", label: "Royale", href: MUSIC_ROUTES.live, icon: "Flame" },
  {
    id: "profile",
    label: "Profile",
    href: MUSIC_ROUTES.settings,
    icon: "User",
  },
] as const;

/**
 * Check if a pathname belongs to the Musical Universe
 */
export function isMusicRoute(pathname: string): boolean {
  return MUSIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Get the active nav item based on current path
 */
export function getActiveNavItem(pathname: string): string | null {
  for (const item of MUSIC_NAV_ITEMS) {
    if (pathname.startsWith(item.href)) {
      return item.id;
    }
  }
  // Map legacy routes
  if (pathname.startsWith("/artist-portal")) return "dashboard";
  if (pathname.startsWith("/stream")) return "live";
  if (pathname.startsWith("/arcade")) return "live";
  if (pathname.startsWith("/arena")) return "live";
  return null;
}
