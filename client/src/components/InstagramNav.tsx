/**
 * Instagram-style navigation:
 * • Mobile  → bottom tab bar (5 icons)
 * • Desktop → slim left side-rail with icon tooltips
 *
 * Replaces the old Navbar + MobileMenuBubble + BlogNavbar.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  Search,
  LayoutGrid,
  Bell,
  User,
  LogIn,
  LogOut,
  Store,
  Hotel,
  HardHat,
  Car,
  Landmark,
  Gamepad2,
  Stethoscope,
  ShoppingCart,
  Wrench,
  Calendar,
  Megaphone,
  Globe,
  Info,
  Headphones,
  Sparkles,
  Building2,
  Heart,
  Newspaper,
  Package,
  Printer,
  Mail,
  ChevronRight,
  X,
  ShoppingBag,
  Music,
  MapPin,
  Settings,
  CreditCard,
  Wallet,
  Shield,
  KeyRound,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import SearchModal from "@/components/SearchModal";
import { motion, AnimatePresence } from "framer-motion";

// ─── Navigation data ────────────────────────────────────────

type NavGroup = {
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
};

const sectorGroup: NavGroup = {
  label: "Sectors",
  items: [
    { href: "/commerce", label: "Commerce", icon: ShoppingCart },
    { href: "/hotellerie", label: "Hôtellerie", icon: Hotel },
    { href: "/batiment", label: "Bâtiment", icon: HardHat },
    { href: "/automobile", label: "Automobile", icon: Car },
    { href: "/finances", label: "Finances", icon: Landmark },
    { href: "/divertissement", label: "Divertissement", icon: Gamepad2 },
    { href: "/sante", label: "Santé", icon: Stethoscope },
    { href: "/logement", label: "Logement", icon: Home },
  ],
};

const serviceGroup: NavGroup = {
  label: "Services",
  items: [
    { href: "/services", label: "Services", icon: Wrench },
    { href: "/services/careers", label: "Careers", icon: Building2 },
    { href: "/services/contractors", label: "Contractors", icon: HardHat },
    { href: "/reservations", label: "Réservations", icon: Calendar },
    { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  ],
};

const marketingGroup: NavGroup = {
  label: "Marketing",
  items: [
    { href: "/marketing", label: "Marketing Hub", icon: Megaphone },
    { href: "/marketing/journal", label: "Free Ad Journal", icon: Newspaper },
    { href: "/marketing/packs", label: "Marketing Packs", icon: Package },
    { href: "/marketing/print", label: "Print Services", icon: Printer },
    { href: "/marketing/newsletters", label: "Newsletter", icon: Mail },
  ],
};

const moreGroup: NavGroup = {
  label: "More",
  items: [
    { href: "/about", label: "About Us", icon: Info },
    { href: "/businesses-directory", label: "Annuaire", icon: Store },
    { href: "/geo-admin", label: "Geo Admin", icon: Globe },
    { href: "/sav", label: "SAV 24/7", icon: Headphones },
    { href: "/versoai", label: "VersoAI", icon: Sparkles },
    { href: "/blog", label: "Blog", icon: Newspaper },
    { href: "/artistes", label: "Artists", icon: Music },
    { href: "/artist-portal", label: "Artist Portal", icon: Music },
  ],
};

const allGroups = [sectorGroup, serviceGroup, marketingGroup, moreGroup];

// ─── Helper: is a path active? ────────────────────────────

function isActive(currentPath: string, href: string) {
  if (href === "/") return currentPath === "/" || currentPath === "";
  return currentPath.startsWith(href);
}

function isSectorActive(currentPath: string) {
  return sectorGroup.items.some((s) => isActive(currentPath, s.href));
}

// ─── Drawer (shared between mobile & desktop) ─────────────

function NavDrawer({
  open,
  onClose,
  origin,
}: {
  open: boolean;
  onClose: () => void;
  origin: "bottom" | "left";
}) {
  const [currentPath, navigate] = useLocation();
  const { user, logout } = useAuthContext();
  const { isAuthenticated, tier } = useSubscription();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const slideVariants =
    origin === "bottom"
      ? { hidden: { y: "100%" }, visible: { y: 0 }, exit: { y: "100%" } }
      : { hidden: { x: "-100%" }, visible: { x: 0 }, exit: { x: "-100%" } };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            ref={drawerRef}
            className={`fixed z-[101] bg-gray-950/95 backdrop-blur-xl border-gray-800 overflow-y-auto overscroll-contain ${
              origin === "bottom"
                ? "inset-x-0 bottom-0 rounded-t-2xl border-t max-h-[85vh]"
                : "top-0 left-0 bottom-0 w-80 border-r"
            }`}
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-lg px-5 py-4 flex items-center justify-between border-b border-gray-800/60">
              <span className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent notranslate">
                Verso Air
              </span>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drag handle (mobile only) */}
            {origin === "bottom" && (
              <div className="flex justify-center -mt-8 mb-2 pt-2">
                <div className="w-10 h-1 rounded-full bg-gray-600" />
              </div>
            )}

            {/* Auth section */}
            {user ? (
              <div className="px-5 py-3 border-b border-gray-800/40">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {user.role || "member"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Navigation groups */}
            <div className="px-3 py-3 space-y-4">
              {allGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-2 mb-1.5">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(currentPath, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                            active
                              ? "bg-amber-500/15 text-amber-400 font-medium"
                              : "text-gray-300 hover:bg-gray-800/60 hover:text-white"
                          }`}
                        >
                          <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {active && (
                            <div className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Account actions */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-2 mb-1.5">
                  Account
                </p>
                <div className="space-y-0.5">
                  {user ? (
                    <>
                      <Link
                        href="/profile"
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                          isActive(currentPath, "/profile")
                            ? "bg-amber-500/15 text-amber-400 font-medium"
                            : "text-gray-300 hover:bg-gray-800/60 hover:text-white"
                        }`}
                      >
                        <Settings className="h-[18px] w-[18px]" />
                        <span>Account Settings</span>
                      </Link>
                      <Link
                        href="/account/billing"
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-gray-300 hover:bg-gray-800/60 hover:text-white"
                      >
                        <Wallet className="h-[18px] w-[18px]" />
                        <span>Billing</span>
                      </Link>
                      {(user.role === "admin" || user.role === "superuser") && (
                        <Link
                          href="/dashboard"
                          onClick={onClose}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-gray-300 hover:bg-gray-800/60 hover:text-white"
                        >
                          <Shield className="h-[18px] w-[18px]" />
                          <span>Admin Dashboard</span>
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          onClose();
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 w-full"
                      >
                        <LogOut className="h-[18px] w-[18px]" />
                        <span>Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/auth/signin"
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-amber-400 hover:bg-amber-500/15"
                    >
                      <LogIn className="h-[18px] w-[18px]" />
                      <span>Sign In</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom safe-area spacer (mobile) */}
            {origin === "bottom" && <div className="h-8" />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Tooltip (desktop side-rail only) ─────────────────────

function IconButton({
  href,
  icon: Icon,
  label,
  active,
  onClick,
  badge,
  className,
}: {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
  className?: string;
}) {
  const content = (
    <div className="group/tip relative">
      <div
        className={`relative flex items-center justify-center h-12 w-12 rounded-xl transition-all duration-200 ${
          active
            ? "bg-amber-500/15 text-amber-400"
            : "text-gray-400 hover:text-white hover:bg-gray-800/60"
        } ${className || ""}`}
      >
        <Icon className="h-[22px] w-[22px]" />
        {badge != null && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center px-1 font-bold">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      {/* Tooltip */}
      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 scale-95 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-150 border border-gray-700/60 shadow-lg z-50">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="outline-none">
        {content}
      </button>
    );
  }

  return <Link href={href || "/"}>{content}</Link>;
}

// ─── MAIN EXPORT ──────────────────────────────────────────

interface InstagramNavProps {
  onMusicPortalToggle: () => void;
  onLocationPanelToggle: () => void;
}

export default function InstagramNav({
  onMusicPortalToggle,
  onLocationPanelToggle,
}: InstagramNavProps) {
  const [currentPath] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user } = useAuthContext();

  const toggleDrawer = useCallback(() => setDrawerOpen((p) => !p), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [currentPath]);

  const isHome = currentPath === "/" || currentPath === "";
  const profileActive =
    isActive(currentPath, "/profile") || isActive(currentPath, "/auth");
  const sectorsActive = isSectorActive(currentPath);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          DESKTOP: Slim left side-rail (hidden on mobile)
          ═══════════════════════════════════════════════════════ */}
      <nav
        className="hidden md:flex fixed top-0 left-0 bottom-0 w-[72px] bg-gray-950/90 backdrop-blur-xl border-r border-gray-800/60 flex-col items-center py-4 z-[70] transition-all"
        aria-label="Side navigation"
      >
        {/* Logo */}
        <Link href="/" className="mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-amber-500/20">
            V
          </div>
        </Link>

        {/* Primary nav icons */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <IconButton href="/" icon={Home} label="Home" active={isHome} />
          <IconButton
            icon={Search}
            label="Search"
            onClick={() => setIsSearchOpen(true)}
          />
          <IconButton
            icon={LayoutGrid}
            label="Menu"
            active={drawerOpen || sectorsActive}
            onClick={toggleDrawer}
          />
          <IconButton
            href="/marketplace"
            icon={ShoppingBag}
            label="Marketplace"
            active={isActive(currentPath, "/marketplace")}
          />
          <IconButton
            href="/reservations"
            icon={Calendar}
            label="Reservations"
            active={isActive(currentPath, "/reservations")}
          />

          {/* Divider */}
          <div className="w-8 h-px bg-gray-700/50 my-2" />

          <IconButton
            icon={Music}
            label="Verso Air Stream"
            onClick={onMusicPortalToggle}
          />
          <IconButton
            icon={MapPin}
            label="GPS Services"
            onClick={onLocationPanelToggle}
          />
        </div>

        {/* Bottom: profile / auth */}
        <div className="flex flex-col items-center gap-1 mt-auto pt-4 border-t border-gray-800/40">
          {user ? (
            <Link href="/profile">
              <div className="group/tip relative">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ring-2 ${
                    profileActive
                      ? "ring-amber-400 bg-gradient-to-br from-amber-500 to-orange-600 text-white"
                      : "ring-transparent hover:ring-gray-600 bg-gray-800 text-gray-300"
                  }`}
                >
                  {(user.name || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 scale-95 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-150 border border-gray-700/60 shadow-lg z-50">
                  Profile
                </div>
              </div>
            </Link>
          ) : (
            <IconButton href="/auth/signin" icon={LogIn} label="Sign In" />
          )}
        </div>
      </nav>

      {/* Desktop content push — offset the main content by the side-rail width */}
      {/* This is handled in App.tsx via a left margin */}

      {/* ═══════════════════════════════════════════════════════
          MOBILE: Bottom tab bar (hidden on desktop)
          ═══════════════════════════════════════════════════════ */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[70] bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Bottom navigation"
      >
        <div className="flex items-center justify-around h-14 px-1">
          {/* Home */}
          <Link href="/">
            <div className="flex flex-col items-center gap-0.5 px-3 py-1">
              <Home
                className={`h-6 w-6 transition-colors ${isHome ? "text-amber-400" : "text-gray-400"}`}
              />
              <span
                className={`text-[10px] ${isHome ? "text-amber-400 font-semibold" : "text-gray-500"}`}
              >
                Home
              </span>
            </div>
          </Link>

          {/* Search */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1"
          >
            <Search className="h-6 w-6 text-gray-400" />
            <span className="text-[10px] text-gray-500">Search</span>
          </button>

          {/* Menu (sectors/services/more) */}
          <button
            onClick={toggleDrawer}
            className="flex flex-col items-center gap-0.5 px-3 py-1"
          >
            <LayoutGrid
              className={`h-6 w-6 transition-colors ${
                drawerOpen || sectorsActive ? "text-amber-400" : "text-gray-400"
              }`}
            />
            <span
              className={`text-[10px] ${
                drawerOpen || sectorsActive
                  ? "text-amber-400 font-semibold"
                  : "text-gray-500"
              }`}
            >
              Menu
            </span>
          </button>

          {/* Marketplace */}
          <Link href="/marketplace">
            <div className="flex flex-col items-center gap-0.5 px-3 py-1">
              <ShoppingBag
                className={`h-6 w-6 transition-colors ${
                  isActive(currentPath, "/marketplace")
                    ? "text-amber-400"
                    : "text-gray-400"
                }`}
              />
              <span
                className={`text-[10px] ${
                  isActive(currentPath, "/marketplace")
                    ? "text-amber-400 font-semibold"
                    : "text-gray-500"
                }`}
              >
                Shop
              </span>
            </div>
          </Link>

          {/* Profile */}
          <Link href={user ? "/profile" : "/auth/signin"}>
            <div className="flex flex-col items-center gap-0.5 px-3 py-1">
              {user ? (
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ${
                    profileActive
                      ? "ring-amber-400 bg-gradient-to-br from-amber-500 to-orange-600 text-white"
                      : "ring-transparent bg-gray-700 text-gray-300"
                  }`}
                >
                  {(user.name || user.email || "U").charAt(0).toUpperCase()}
                </div>
              ) : (
                <User
                  className={`h-6 w-6 transition-colors ${
                    profileActive ? "text-amber-400" : "text-gray-400"
                  }`}
                />
              )}
              <span
                className={`text-[10px] ${
                  profileActive
                    ? "text-amber-400 font-semibold"
                    : "text-gray-500"
                }`}
              >
                {user ? "Profile" : "Sign In"}
              </span>
            </div>
          </Link>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          DRAWER — Full navigation drawer (both breakpoints)
          ═══════════════════════════════════════════════════════ */}
      {/* Mobile: slides up from bottom */}
      <div className="md:hidden">
        <NavDrawer open={drawerOpen} onClose={closeDrawer} origin="bottom" />
      </div>
      {/* Desktop: slides out from left */}
      <div className="hidden md:block">
        <NavDrawer open={drawerOpen} onClose={closeDrawer} origin="left" />
      </div>

      {/* Search modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
