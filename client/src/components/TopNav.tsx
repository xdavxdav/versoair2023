import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Home, LogOut } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePortalAccess } from "@/hooks/usePortalAccess";
import { getDashboardDestination } from "@/lib/dashboard-routes";
import type { PortalId } from "@/lib/portal-access";
import MarketLabel from "@/components/MarketLabel";

export const PORTALS: Record<PortalId, { label: string; path: string }> = {
  general: { label: "Dashboard", path: "/dashboard" },
  streamer: { label: "Streamer", path: "/streamer-portal" },
  artist: { label: "Artist", path: "/artist-portal/welcome" },
  artisan: { label: "Artisan", path: "/artisans-portal" },
  "geo-admin": { label: "Geo Admin", path: "/geo-admin" },
  community: { label: "Community", path: "/blog" },
  contractor: { label: "Contractor", path: "/contractor" },
  careers: { label: "Careers", path: "/services/careers/dashboard" },
  admin: { label: "Admin", path: "/admin" },
};

const EXPLORE = [
  { label: "Marketplace", path: "/marketplace" },
  { label: "Blog", path: "/blog" },
  { label: "Reserve a dwelling", path: "/reservations" },
  { label: "Services", path: "/services" },
  { label: "Careers", path: "/services/careers" },
  { label: "Marketing", path: "/marketing" },
];

function Menu({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
      >
        {label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[80] mt-1 min-w-[200px] rounded-xl border border-white/10 bg-black/95 p-1 shadow-xl backdrop-blur">
          {children}
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const { user, logout } = useAuthContext();
  const { accessiblePortals } = usePortalAccess();
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(null), [location]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
  const home = user ? getDashboardDestination(user).path : "/auth/signin";
  const item =
    "block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white";

  return (
    <header className="sticky top-0 z-[70] border-b border-white/10 bg-black/85 backdrop-blur-md">
      <div
        ref={ref}
        className="mx-auto flex h-11 max-w-[1600px] items-center gap-1 px-3"
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
        >
          <Home className="h-4 w-4" /> Home
        </Link>
        {user && (
        <Menu
          label="Portals"
          open={open === "portals"}
          onToggle={() => toggle("portals")}
        >
          {accessiblePortals
            .filter((id) => PORTALS[id])
            .map((id) => (
              <Link key={id} href={PORTALS[id].path} className={item}>
                {PORTALS[id].label}
              </Link>
            ))}
        </Menu>
        )}
        <Menu
          label="Explore"
          open={open === "explore"}
          onToggle={() => toggle("explore")}
        >
          {EXPLORE.map((e) => (
            <Link key={e.path} href={e.path} className={item}>
              {e.path === "/marketplace" ? <MarketLabel /> : e.label}
            </Link>
          ))}
        </Menu>
        <div className="flex-1" />
        <GlobalSearch />
        {user ? (
        <Menu
          label={user?.name || user?.email || "Account"}
          open={open === "account"}
          onToggle={() => toggle("account")}
        >
          <Link href={home} className={item}>
            My dashboard
          </Link>
          <Link href="/messages" className={item}>
            Messages
          </Link>
          <Link href="/profile" className={item}>
            Profile
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
            }}
            className={`${item} flex w-full items-center gap-2 text-left`}
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </Menu>
        ) : (
          <Link
            href="/auth/signin?redirect=/artist-portal"
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
