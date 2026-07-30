import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import { isContentNavPath } from "@/components/ContentNav";
import { LogoutDropdown } from "@/components/ui/logout-dropdown";
import {
  Menu,
  X,
  Home,
  Store,
  Info,
  Wrench,
  Calendar,
  Headphones,
  LogIn,
  Globe,
  Megaphone,
  Newspaper,
  Package,
  Printer,
  Mail,
  Lock,
  Building2,
  ShoppingCart,
  Hotel,
  HardHat,
  Car,
  Landmark,
  Gamepad2,
  Stethoscope,
  Sparkles,
  ChevronRight,
  GripVertical,
  Shield,
  User,
  CreditCard,
  Wallet,
  Receipt,
  Settings,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuthContext } from "@/contexts/AuthContext";
import { AccountSettingsModal } from "@/components/AccountSettingsModal";

// ─── Grouped Navigation ────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
};

const mainNav: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/logement", label: "Logement", icon: Home },
  { href: "/businesses-directory", label: "Annuaire", icon: Store },
];

const geoNav: NavItem[] = [
  { href: "/geo-admin", label: "Geo Admin", icon: Globe, requiresAuth: true },
  {
    href: "/geo-admin/immobilier",
    label: "Immobilier",
    icon: Sparkles,
    requiresAuth: true,
  },
];

const sectorItems: NavItem[] = [
  { href: "/commerce", label: "Commerce", icon: ShoppingCart },
  { href: "/hotellerie", label: "Hôtellerie", icon: Hotel },
  { href: "/batiment", label: "Bâtiment", icon: HardHat },
  { href: "/automobile", label: "Auto", icon: Car },
  { href: "/finances", label: "Finances", icon: Landmark },
  { href: "/divertissement", label: "Loisirs", icon: Gamepad2 },
  { href: "/sante", label: "Santé", icon: Stethoscope },
];

const serviceItems: NavItem[] = [
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/services/careers", label: "Careers", icon: Building2 },
  { href: "/services/contractors", label: "Contractors", icon: HardHat },
  { href: "/reservations", label: "Réservations", icon: Calendar },
];

const marketingItems: NavItem[] = [
  { href: "/marketing", label: "Marketing Hub", icon: Megaphone },
  { href: "/marketing/journal", label: "Free Ad Journal", icon: Newspaper },
  { href: "/marketing/packs", label: "Marketing Packs", icon: Package },
  { href: "/marketing/print", label: "Print Services", icon: Printer },
  { href: "/marketing/newsletters", label: "Newsletter", icon: Mail },
];

const moreItems: NavItem[] = [
  { href: "/about", label: "About", icon: Info },
  { href: "/services/news", label: "News", icon: Info },
  { href: "/sav", label: "SAV 24/7", icon: Headphones },
  { href: "/versoai", label: "VersoAI", icon: Sparkles },
];

// ─── Compact Row Renderer ──────────────────────────────────────

function NavRow({
  item,
  isActive,
  isLocked,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  isLocked: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <button
        onClick={() => !isLocked && onNavigate()}
        disabled={isLocked}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors duration-150 touch-manipulation ${
          isLocked
            ? "text-gray-400 opacity-50 cursor-not-allowed"
            : isActive
              ? "bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white"
              : "text-gray-700 active:bg-gray-100"
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 ${
            isLocked
              ? "text-gray-400"
              : isActive
                ? "text-white"
                : "text-[#bf831c]"
          }`}
        />
        <span className="text-[13px] font-medium truncate">{item.label}</span>
        {isLocked && (
          <Lock className="ml-auto h-3 w-3 text-amber-500 shrink-0" />
        )}
        {!isLocked && !isActive && (
          <ChevronRight className="ml-auto h-3 w-3 text-gray-300 shrink-0" />
        )}
      </button>
    </Link>
  );
}

// ─── Compact Chip Grid (for sectors — minimal footprint) ──────

function ChipGrid({
  items,
  location,
  onNavigate,
}: {
  items: NavItem[];
  location: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <button
              onClick={onNavigate}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 touch-manipulation ${
                isActive
                  ? "bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white"
                  : "bg-gray-50 text-gray-600 border border-gray-200 active:bg-gray-100"
              }`}
            >
              <Icon
                className={`h-3 w-3 ${isActive ? "text-white" : "text-[#bf831c]"}`}
              />
              {item.label}
            </button>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Section Label ─────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1.5">
      {text}
    </p>
  );
}

// ─── Main Component ────────────────────────────────────────────

export function MobileMenuBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useSubscription();
  const { user, loading: authLoading } = useAuthContext();
  const isSuperuser = user?.role === "superuser";
  const isAdmin = user?.role === "admin" || user?.role === "moderator";

  // ── Account Settings Modal ──
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountSettingsTab, setAccountSettingsTab] = useState<
    "account" | "preferences"
  >("account");

  // ── Draggable state — default: bottom-right like Messenger ──
  const BUBBLE_SIZE = 48;
  const EDGE_MARGIN = 14;

  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x:
      typeof window !== "undefined"
        ? window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN
        : 300,
    y:
      typeof window !== "undefined"
        ? window.innerHeight - BUBBLE_SIZE - 80
        : 600,
  }));
  const [dragging, setDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const startPointer = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // Edge-snap: after drag release, snap to nearest horizontal edge
  const snapToEdge = useCallback((x: number, y: number) => {
    const W = typeof window !== "undefined" ? window.innerWidth : 400;
    const midX = W / 2;
    const snappedX =
      x + BUBBLE_SIZE / 2 < midX ? EDGE_MARGIN : W - BUBBLE_SIZE - EDGE_MARGIN;
    return { x: snappedX, y };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      isDraggingRef.current = true;
      hasMoved.current = false;
      setDragging(true);
      startPointer.current = { x: e.clientX, y: e.clientY };
      startPos.current = { x: pos.x, y: pos.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [pos.x, pos.y],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - startPointer.current.x;
      const dy = e.clientY - startPointer.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true;
      const W = typeof window !== "undefined" ? window.innerWidth : 400;
      const H = typeof window !== "undefined" ? window.innerHeight : 800;
      setPos({
        x: Math.max(4, Math.min(W - BUBBLE_SIZE - 4, startPos.current.x + dx)),
        y: Math.max(4, Math.min(H - BUBBLE_SIZE - 4, startPos.current.y + dy)),
      });
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    if (isDraggingRef.current && hasMoved.current) {
      // Snap to nearest edge with a smooth transition
      setPos((prev) => snapToEdge(prev.x, prev.y));
    }
    isDraggingRef.current = false;
    setDragging(false);
  }, [snapToEdge]);

  const handleToggle = useCallback(() => {
    if (!hasMoved.current) setIsOpen((o) => !o);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  // ── Panel placement: avoid going offscreen ──────────────────
  const panelPlacement = useMemo(() => {
    if (typeof window === "undefined") return { left: "0px", top: "3.5rem" };
    const W = window.innerWidth;
    const H = window.innerHeight;
    const panelW = Math.min(320, W - 16);

    // Horizontal: align to opposite side of bubble edge
    const isRight = pos.x > W / 2;
    const left = isRight ? `${-panelW + BUBBLE_SIZE}px` : "0px";

    // Vertical: open upward if bubble is in lower 40%
    const openUp = pos.y > H * 0.6;

    return {
      left,
      ...(openUp
        ? { bottom: `${BUBBLE_SIZE + 12}px` }
        : { top: `${BUBBLE_SIZE + 12}px` }),
    };
  }, [pos.x, pos.y]);

  const lockedSet = useMemo(() => {
    // In mobile menu, don't lock geo admin items — allow clicking them for unauthenticated users
    return new Set<string>();
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("mobile-menu-open", isOpen);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mobile-menu-toggle", { detail: { open: isOpen } }),
      );
    }
    return () => {
      document.body.classList.remove("mobile-menu-open");
      window.dispatchEvent(
        new CustomEvent("mobile-menu-toggle", { detail: { open: false } }),
      );
    };
  }, [isOpen]);

  // Keep in viewport on resize
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) =>
        snapToEdge(
          Math.min(prev.x, window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN),
          Math.min(prev.y, window.innerHeight - BUBBLE_SIZE - EDGE_MARGIN),
        ),
      );
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [snapToEdge]);

  // ── Hide bubble when any Radix Dialog/Sheet overlay is open ──
  useEffect(() => {
    const check = () => {
      const overlay = document.querySelector(
        "[data-state='open'][role='dialog'], [data-state='open'].fixed[data-radix-portal]",
      );
      setDialogOpen(!!overlay);
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    check();
    return () => observer.disconnect();
  }, []);

  // Hide bubble on Blog & Musical Universe — they have their own navigation bars
  const isBlogPage = location === "/blog" || location.startsWith("/blog/");
  const isMusicPage =
    location.startsWith("/music") ||
    location.startsWith("/artist-portal") ||
    location.startsWith("/stream") ||
    location.startsWith("/streamer-portal") ||
    location.startsWith("/listener-portal") ||
    location.startsWith("/arcade") ||
    location.startsWith("/arena");

  const isAuth =
    !!user || localStorage.getItem("blog_community_auth") === "true";
  const isContentNavPage = isContentNavPath(location);
  if (isBlogPage || isMusicPage) return null;
  if (isContentNavPage && isAuth) return null;
  if (dialogOpen) return null;

  return (
    <>
      {/* ── Floating draggable bubble — mobile only (hidden on desktop/tablet) ── */}
      <div
        className="fixed z-[90] md:hidden"
        style={{
          left: pos.x,
          top: pos.y,
          transition: dragging
            ? "none"
            : "left 0.3s cubic-bezier(.4,0,.2,1), top 0.05s ease",
        }}
      >
        {/* Bubble button */}
        <Button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={handleToggle}
          style={{
            touchAction: "none",
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
          }}
          className={`relative bg-gradient-to-br from-[#d4941f] to-[#bf831c] text-white rounded-full shadow-lg mobile-compact-btn select-none transition-all duration-200 ${
            dragging
              ? "cursor-grabbing scale-110 shadow-2xl ring-2 ring-amber-300/60"
              : isOpen
                ? "shadow-xl ring-2 ring-amber-400/40"
                : "cursor-grab hover:shadow-xl hover:scale-105"
          }`}
          size="icon"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen && !dragging ? (
            <X className="h-5 w-5" />
          ) : dragging ? (
            <GripVertical className="h-5 w-5 opacity-70" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
          {/* Tiny pulse dot when closed — green=connected, amber=disconnected */}
          {!isOpen && !dragging && (
            <span
              className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white animate-pulse ${
                user ? "bg-green-400" : "bg-amber-400"
              }`}
            />
          )}
        </Button>

        {/* ── Menu panel ── */}
        {isOpen && !dragging && (
          <div
            className="absolute bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.2)] border border-gray-200/60 w-[calc(100vw-1rem)] max-w-[320px] max-h-[calc(100vh-100px)] overflow-hidden"
            style={panelPlacement}
          >
            {/* Panel header */}
            <div className="bg-gradient-to-r from-[#bf831c] to-[#d4941f] px-4 py-2.5 flex items-center justify-between">
              <span className="text-white text-xs font-bold tracking-wide">
                Menu
              </span>
              <button
                onClick={close}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain max-h-[calc(100vh-160px)] px-3 py-3">
              {/* ── Navigation ── */}
              <SectionLabel text="Navigation" />
              <div className="space-y-0.5 mb-3">
                {mainNav.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    isActive={location === item.href}
                    isLocked={false}
                    onNavigate={close}
                  />
                ))}
              </div>

              {/* ── Geo Admin ── */}
              <SectionLabel text="Geo Admin" />
              <div className="space-y-0.5 mb-3">
                {geoNav.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    isActive={location === item.href}
                    isLocked={lockedSet.has(item.href)}
                    onNavigate={close}
                  />
                ))}
              </div>

              <hr className="border-gray-100 my-2" />

              {/* ── Sectors ── */}
              <SectionLabel text="Secteurs" />
              <div className="mb-3">
                <ChipGrid
                  items={sectorItems}
                  location={location}
                  onNavigate={close}
                />
              </div>

              <hr className="border-gray-100 my-2" />

              {/* ── Services ── */}
              <SectionLabel text="Services" />
              <div className="space-y-0.5 mb-3">
                {serviceItems.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    isActive={location === item.href}
                    isLocked={false}
                    onNavigate={close}
                  />
                ))}
              </div>

              {/* ── Marketing ── */}
              <SectionLabel text="Marketing" />
              <div className="space-y-0.5 mb-3">
                {marketingItems.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    isActive={location === item.href}
                    isLocked={false}
                    onNavigate={close}
                  />
                ))}
              </div>

              {/* ── More ── */}
              <SectionLabel text="More" />
              <div className="space-y-0.5 mb-3">
                {moreItems.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    isActive={location === item.href}
                    isLocked={false}
                    onNavigate={close}
                  />
                ))}
              </div>

              <hr className="border-gray-100 my-2" />

              {/* ── Auth Section — adapts to signed-in / signed-out ── */}
              {user ? (
                <div className="space-y-2">
                  {/* User info badge */}
                  <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200/80">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#bf831c] to-[#d4941f] flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">
                        {user.name || user.email}
                      </p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                        Connected
                        {isSuperuser && " • Superuser"}
                        {isAdmin && " • Admin"}
                        {!isSuperuser && !isAdmin && user.role
                          ? ` • ${user.role}`
                          : ""}
                      </p>
                    </div>
                    <Shield
                      className={`h-4 w-4 shrink-0 ${
                        isSuperuser
                          ? "text-amber-500"
                          : isAdmin
                            ? "text-blue-500"
                            : "text-gray-400"
                      }`}
                    />
                  </div>

                  {/* Billing & Card Vault */}
                  <Link href="/account/billing">
                    <button
                      onClick={close}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors duration-150 touch-manipulation ${
                        location === "/account/billing"
                          ? "bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white"
                          : "text-gray-700 active:bg-gray-100"
                      }`}
                    >
                      <Receipt
                        className={`h-4 w-4 shrink-0 ${location === "/account/billing" ? "text-white" : "text-green-600"}`}
                      />
                      <span className="text-[13px] font-medium">Billing</span>
                      <ChevronRight className="ml-auto h-3 w-3 text-gray-300 shrink-0" />
                    </button>
                  </Link>

                  {(isAdmin || isSuperuser || user?.isAdmin) && (
                    <Link href="/account/cards">
                      <button
                        onClick={close}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors duration-150 touch-manipulation ${
                          location === "/account/cards"
                            ? "bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white"
                            : "text-gray-700 active:bg-gray-100"
                        }`}
                      >
                        <CreditCard
                          className={`h-4 w-4 shrink-0 ${location === "/account/cards" ? "text-white" : "text-amber-600"}`}
                        />
                        <span className="text-[13px] font-medium">
                          Card Vault
                        </span>
                        <ChevronRight className="ml-auto h-3 w-3 text-gray-300 shrink-0" />
                      </button>
                    </Link>
                  )}

                  {/* Dashboard link */}
                  <Link href="/geo-admin/dashboard">
                    <button
                      onClick={close}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-gray-700 active:bg-gray-100 transition-colors duration-150 touch-manipulation"
                    >
                      <Globe className="h-4 w-4 shrink-0 text-[#bf831c]" />
                      <span className="text-[13px] font-medium">Dashboard</span>
                      <ChevronRight className="ml-auto h-3 w-3 text-gray-300 shrink-0" />
                    </button>
                  </Link>

                  {/* Account Settings & Preferences */}
                  <button
                    onClick={() => {
                      close();
                      setAccountSettingsTab("account");
                      setShowAccountSettings(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-gray-700 active:bg-gray-100 transition-colors duration-150 touch-manipulation"
                  >
                    <Settings className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="text-[13px] font-medium">
                      Account Settings
                    </span>
                    <ChevronRight className="ml-auto h-3 w-3 text-gray-300 shrink-0" />
                  </button>
                  <button
                    onClick={() => {
                      close();
                      setAccountSettingsTab("preferences");
                      setShowAccountSettings(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-gray-700 active:bg-gray-100 transition-colors duration-150 touch-manipulation"
                  >
                    <Bell className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="text-[13px] font-medium">Preferences</span>
                    <ChevronRight className="ml-auto h-3 w-3 text-gray-300 shrink-0" />
                  </button>

                  {/* Logout */}
                  <LogoutDropdown variant="red-solid" label="Disconnect" />
                </div>
              ) : (
                <Link href="/auth/signin">
                  <button
                    onClick={close}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 touch-manipulation ${
                      location === "/auth/signin"
                        ? "bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white"
                        : "bg-gray-900 text-white active:bg-gray-800"
                    }`}
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Backdrop */}
        {isOpen && !dragging && (
          <div className="fixed inset-0 bg-black/20 -z-10" onClick={close} />
        )}
      </div>

      {/* ═══ ACCOUNT SETTINGS & PREFERENCES MODAL ═══ */}
      <AccountSettingsModal
        open={showAccountSettings}
        onOpenChange={setShowAccountSettings}
        defaultTab={accountSettingsTab}
      />
    </>
  );
}
