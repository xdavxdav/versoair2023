/**
 * VxppShell — Unified mobile-first application shell for vxpp (VersoAirApp).
 *
 * - Mobile / Tablet (< lg): compact sticky top header + 5-tab bottom dock
 *   (Feed, Communities, Messages, Market, Me) + slide-over Services & Ecosystem sheet.
 * - Desktop (>= lg): persistent 256px left navigation rail linking all 7 connected
 *   sections (Feed, My Profile, Messages, Communities, Marketplace, Careers, Contractors)
 *   plus ecosystem links (Business Directory, Musical Universe, Events, Verso Air Home)
 *   while preserving role/eligibility boundaries.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Briefcase,
  Building2,
  Calendar,
  HardHat,
  Home,
  LayoutDashboard,
  LogIn,
  Menu,
  MessageCircle,
  Music,
  Newspaper,
  Settings,
  Shield,
  ShoppingBag,
  User,
  Users,
  X,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useInboxSocket } from "@/hooks/use-inbox-socket";
import { useLanguage } from "@/components/LanguageSwitcher";
import { getVxppSection, type VxppSection } from "@/lib/vxpp-routes";

interface VxppShellProps {
  children: React.ReactNode;
  fullBleed?: boolean;
}

const LABELS = {
  en: {
    feed: "Feed",
    communities: "Communities",
    messages: "Messages",
    marketplace: "Marketplace",
    marketShort: "Market",
    profile: "My Profile",
    meShort: "Me",
    careers: "Careers",
    contractors: "Contractors",
    servicesHeading: "Services",
    ecosystemHeading: "Ecosystem",
    directory: "Business Directory",
    music: "Musical Universe",
    events: "Events",
    homeSuffix: "Home",
    dashboard: "Member Dashboard",
    admin: "GeoAdmin",
    settings: "Account Settings",
    signIn: "Sign in",
    join: "Join vxpp",
    menu: "Services & Menu",
    close: "Close menu",
  },
  fr: {
    feed: "Fil social",
    communities: "Communautés",
    messages: "Messages",
    marketplace: "Marché",
    marketShort: "Marché",
    profile: "Mon profil",
    meShort: "Moi",
    careers: "Carrières",
    contractors: "Contractants",
    servicesHeading: "Services",
    ecosystemHeading: "Écosystème",
    directory: "Annuaire d'entreprises",
    music: "Univers Musical",
    events: "Événements",
    homeSuffix: "Accueil",
    dashboard: "Tableau de bord",
    admin: "GeoAdmin",
    settings: "Paramètres",
    signIn: "Connexion",
    join: "Rejoindre vxpp",
    menu: "Services et menu",
    close: "Fermer le menu",
  },
  es: {
    feed: "Inicio",
    communities: "Comunidades",
    messages: "Mensajes",
    marketplace: "Mercado",
    marketShort: "Mercado",
    profile: "Mi perfil",
    meShort: "Yo",
    careers: "Carreras",
    contractors: "Contratistas",
    servicesHeading: "Servicios",
    ecosystemHeading: "Ecosistema",
    directory: "Directorio comercial",
    music: "Universo Musical",
    events: "Eventos",
    homeSuffix: "Inicio",
    dashboard: "Panel personal",
    admin: "GeoAdmin",
    settings: "Configuración",
    signIn: "Iniciar sesión",
    join: "Unirse a vxpp",
    menu: "Servicios y menú",
    close: "Cerrar menú",
  },
} as const;

type CopyLang = keyof typeof LABELS;

function resolveCopyLang(lang: string | undefined): CopyLang {
  if (lang === "fr" || lang === "es") return lang;
  return "en";
}

export default function VxppShell({ children, fullBleed = false }: VxppShellProps) {
  const [currentPath] = useLocation();
  const { user } = useAuthContext();
  const { currentLang } = useLanguage();
  const copy = LABELS[resolveCopyLang(currentLang)];
  const activeSection = getVxppSection(currentPath);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const userAvatar = user?.avatarUrl || user?.avatar || null;
  useEffect(() => {
    setAvatarBroken(false);
  }, [userAvatar]);

  const fetchUnread = useCallback(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    fetch("/api/inbox/conversations", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.success || !Array.isArray(data.conversations)) return;
        const total = data.conversations.reduce(
          (sum: number, c: any) => sum + (Number(c.unreadCount) || 0),
          0,
        );
        setUnreadCount(total);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  // Live unread counter bump — ignore messages sent by the current user
  const handleLiveInboxEvent = useCallback(
    (evt?: { message?: unknown }) => {
      const incoming = evt?.message as { senderId?: string | number } | undefined;
      if (incoming?.senderId && String(incoming.senderId) === String(user?.id)) {
        return;
      }
      fetchUnread();
    },
    [fetchUnread, user?.id],
  );

  useInboxSocket(user ? handleLiveInboxEvent : undefined);

  useEffect(() => {
    setDrawerOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const displayName =
    user?.displayName ||
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Member";
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "VA";

  const isStaff =
    Boolean(user?.isAdmin) ||
    ["admin", "superuser", "moderator"].includes(String(user?.role || ""));

  const primaryItems: Array<{
    key: VxppSection;
    href: string;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { key: "feed", href: "/blog", label: copy.feed, shortLabel: copy.feed, icon: Newspaper },
    {
      key: "communities",
      href: "/communities",
      label: copy.communities,
      shortLabel: copy.communities,
      icon: Users,
    },
    {
      key: "messages",
      href: "/messages",
      label: copy.messages,
      shortLabel: copy.messages,
      icon: MessageCircle,
      badge: unreadCount,
    },
    {
      key: "marketplace",
      href: "/marketplace",
      label: copy.marketplace,
      shortLabel: copy.marketShort,
      icon: ShoppingBag,
    },
    {
      key: "profile",
      href: "/profile",
      label: copy.profile,
      shortLabel: copy.meShort,
      icon: User,
    },
  ];

  const serviceItems: Array<{
    key: VxppSection;
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "careers", href: "/services/careers", label: copy.careers, icon: Briefcase },
    { key: "contractors", href: "/services/contractors", label: copy.contractors, icon: HardHat },
  ];

  const ecosystemItems = [
    { href: "/businesses-directory", label: copy.directory, icon: Building2, isHome: false },
    { href: "/stream", label: copy.music, icon: Music, isHome: false },
    { href: "/events", label: copy.events, icon: Calendar, isHome: false },
    { href: "/", label: copy.homeSuffix, icon: Home, isHome: true },
  ];

  const renderHomeBrandLabel = () =>
    currentLang === "fr" || currentLang === "es" ? (
      <>
        <span>{copy.homeSuffix} </span>
        <span className="notranslate" translate="no">Verso Air</span>
      </>
    ) : (
      <>
        <span className="notranslate" translate="no">Verso Air</span>
        <span> {copy.homeSuffix}</span>
      </>
    );

  const renderEcosystemHeading = () =>
    currentLang === "fr" || currentLang === "es" ? (
      <>
        <span>{copy.ecosystemHeading} </span>
        <span className="notranslate" translate="no">Verso Air</span>
      </>
    ) : (
      <>
        <span className="notranslate" translate="no">Verso Air</span>
        <span> {copy.ecosystemHeading}</span>
      </>
    );

  const navLinkClasses = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
      active
        ? "bg-amber-600/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200 border border-amber-600/25 shadow-sm"
        : "text-slate-700 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-800/70 border border-transparent"
    }`;

  return (
    <div
      data-testid="vxpp-shell"
      className={`min-h-screen w-full bg-[#f6f3ee] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row ${
        fullBleed ? "h-[100dvh] overflow-hidden" : ""
      }`}
    >
      {/* ── Desktop Left Navigation Rail ── */}
      <aside
        aria-label="vxpp navigation"
        className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen border-r border-stone-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-30"
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-stone-200/80 dark:border-slate-800 flex items-center justify-between">
          <Link
            href="/blog"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded-lg"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-white font-black text-base tracking-tight shadow-sm notranslate"
              translate="no"
            >
              vx
            </span>
            <div className="leading-tight">
              <span
                className="block text-lg font-extrabold tracking-tight text-slate-900 dark:text-white notranslate"
                translate="no"
              >
                vxpp
              </span>
              <span
                className="block text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300 notranslate"
                translate="no"
              >
                VersoAirApp
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div className="space-y-1">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={navLinkClasses(isActive)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span
                      className="inline-flex min-w-[20px] h-5 items-center justify-center rounded-full bg-amber-600 px-1.5 text-[11px] font-bold text-white notranslate"
                      translate="no"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {/* Connected Services */}
          <div className="space-y-1">
            <p className="px-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {copy.servicesHeading}
            </p>
            {serviceItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={navLinkClasses(isActive)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Ecosystem */}
          <div className="space-y-1">
            <p className="px-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {renderEcosystemHeading()}
            </p>
            {ecosystemItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={navLinkClasses(false)}>
                  <Icon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                  <span className="truncate">
                    {item.isHome ? renderHomeBrandLabel() : item.label}
                  </span>
                </Link>
              );
            })}
            {user && (
              <Link href="/dashboard" className={navLinkClasses(false)}>
                <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                <span className="truncate">{copy.dashboard}</span>
              </Link>
            )}
            {isStaff && (
              <Link href="/geo-admin" className={navLinkClasses(false)}>
                <Shield className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <span className="truncate">{copy.admin}</span>
              </Link>
            )}
          </div>
        </nav>

        {/* Bottom Identity / Auth Card */}
        <div className="p-3 border-t border-stone-200/80 dark:border-slate-800 space-y-2">
          {user ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-stone-100/90 dark:bg-slate-800/70 p-2.5">
              <Link href="/profile" className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-amber-600 to-amber-800 text-white text-xs font-bold flex items-center justify-center shrink-0 notranslate" translate="no">
                  {userAvatar && !avatarBroken ? (
                    <img
                      src={userAvatar}
                      alt={displayName}
                      onError={() => setAvatarBroken(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0 flex-1 notranslate" translate="no">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    @{user.username || "member"}
                  </p>
                </div>
              </Link>
              <Link
                href="/profile/settings"
                aria-label={copy.settings}
                title={copy.settings}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-slate-700 transition-colors"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link
                href={`/auth/signin?redirect=${encodeURIComponent(currentPath)}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold py-2.5 px-3 transition-colors min-h-[40px]"
              >
                <LogIn className="h-3.5 w-3.5" />
                {copy.signIn}
              </Link>
              <Link
                href="/auth/signin?mode=register"
                className="inline-flex items-center justify-center rounded-xl border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs font-semibold py-2.5 px-3 transition-colors min-h-[40px]"
              >
                {copy.join}
              </Link>
            </div>
          )}
          <p className="text-[10px] text-center text-slate-500 dark:text-slate-500 notranslate" translate="no">
            VERSO AIR INC.
          </p>
        </div>
      </aside>

      {/* ── Mobile / Tablet Sticky Header ── */}
      <header className="lg:hidden sticky top-0 z-40 h-14 px-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-stone-200/90 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={copy.menu}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/blog" className="flex items-center gap-2 min-w-0">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 text-white font-black text-sm shadow-sm shrink-0 notranslate"
              translate="no"
            >
              vx
            </span>
            <span
              className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white notranslate"
              translate="no"
            >
              vxpp
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/services/careers"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold min-h-[36px] ${
              activeSection === "careers"
                ? "bg-amber-600/15 text-amber-900 dark:text-amber-200"
                : "text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span className="hidden min-[380px]:inline">{copy.careers}</span>
          </Link>
          {user ? (
            <Link
              href="/profile"
              aria-label={copy.profile}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full overflow-hidden border border-stone-300 dark:border-slate-700 bg-amber-700 text-white text-xs font-bold shrink-0 notranslate"
              translate="no"
            >
              {userAvatar && !avatarBroken ? (
                <img
                  src={userAvatar}
                  alt={displayName}
                  onError={() => setAvatarBroken(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </Link>
          ) : (
            <Link
              href={`/auth/signin?redirect=${encodeURIComponent(currentPath)}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-3.5 py-2 min-h-[36px]"
            >
              <LogIn className="h-3.5 w-3.5" />
              {copy.signIn}
            </Link>
          )}
        </div>
      </header>

      {/* ── Mobile Slide-Over Services & Ecosystem Drawer ── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label={copy.menu}
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col">
            <div className="px-4 py-3.5 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 text-white font-black text-sm notranslate" translate="no">
                  vx
                </span>
                <div>
                  <span className="block text-sm font-extrabold text-slate-900 dark:text-white notranslate" translate="no">
                    vxpp
                  </span>
                  <span className="block text-[10px] text-slate-500 notranslate" translate="no">
                    VersoAirApp · VERSO AIR INC.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={copy.close}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-5">
              <div className="space-y-1">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {copy.servicesHeading}
                </p>
                {serviceItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={navLinkClasses(activeSection === item.key)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                {user && (
                  <Link href="/profile/settings" className={navLinkClasses(currentPath === "/profile/settings")}>
                    <Settings className="h-4 w-4 shrink-0" />
                    <span>{copy.settings}</span>
                  </Link>
                )}
              </div>

              <div className="space-y-1">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {renderEcosystemHeading()}
                </p>
                {ecosystemItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className={navLinkClasses(false)}>
                      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="truncate">
                        {item.isHome ? renderHomeBrandLabel() : item.label}
                      </span>
                    </Link>
                  );
                })}
                {user && (
                  <Link href="/dashboard" className={navLinkClasses(false)}>
                    <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-500" />
                    <span>{copy.dashboard}</span>
                  </Link>
                )}
                {isStaff && (
                  <Link href="/geo-admin" className={navLinkClasses(false)}>
                    <Shield className="h-4 w-4 shrink-0 text-amber-700" />
                    <span>{copy.admin}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div
        className={`flex-1 min-w-0 min-h-0 flex flex-col ${
          fullBleed ? "h-[calc(100dvh-3.5rem-4rem)] lg:h-[100dvh] overflow-hidden" : "pb-20 lg:pb-6"
        }`}
      >
        {children}
      </div>

      {/* ── Mobile Bottom Navigation Dock (5 primary tabs) ── */}
      <nav
        aria-label="vxpp bottom navigation"
        data-testid="vxpp-bottom-nav"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-stone-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition-colors ${
                  isActive
                    ? "text-amber-800 dark:text-amber-300 font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span className="relative inline-flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 ? (
                    <span
                      className="absolute -top-1.5 -right-2.5 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white notranslate"
                      translate="no"
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="truncate max-w-full px-0.5">{item.shortLabel}</span>
                {isActive && (
                  <span className="absolute bottom-1 h-1 w-6 rounded-full bg-amber-600 dark:bg-amber-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
