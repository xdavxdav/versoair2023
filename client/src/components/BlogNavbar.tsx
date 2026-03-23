import { useState } from "react";
import {
  LogOut,
  Store,
  Headphones,
  ShoppingBag,
  ChevronDown,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";

interface BlogNavbarProps {
  isAuthenticated?: boolean;
  userName?: string;
  onLogout?: () => void;
  onLogin?: () => void;
}

const navLinks = [
  { href: "/", label: "Home", icon: ShoppingBag },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/businesses-directory", label: "Annuaire", icon: Store },
  { href: "/sav", label: "SAV 24/7", icon: Headphones },
];

/* ── shared dropdown style tokens ───────────────────────────── */
const BTN =
  "flex items-center gap-1.5 px-3 py-2 text-[13px] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap font-medium";
const PANEL =
  "absolute top-full bg-slate-950 overflow-hidden shadow-2xl shadow-black/60 rounded-xl pt-2 pb-2.5 opacity-0 invisible transition-all duration-200 z-[9999] border border-cyan-500/20";
const PANEL_OPEN = "opacity-100 !visible";
const ITEM =
  "block px-4 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg mx-1 transition-colors whitespace-nowrap";
const ITEM_HEAD =
  "block px-4 py-2 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg mx-1 font-semibold transition-colors whitespace-nowrap";

export default function BlogNavbar({
  isAuthenticated: isAuthProp,
  userName: userNameProp,
  onLogout: onLogoutProp,
  onLogin,
}: BlogNavbarProps) {
  const { user, logout } = useAuthContext();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const marketplaceAuth =
    localStorage.getItem("blog_community_auth") === "true";
  const marketplaceUser = localStorage.getItem("blog_community_user") || "User";

  const isAuthenticated = isAuthProp ?? (!!user || marketplaceAuth);
  const userName =
    userNameProp ??
    user?.email?.split("@")[0] ??
    (marketplaceAuth ? marketplaceUser : "User");
  const handleLogout = () => {
    if (onLogoutProp) {
      onLogoutProp();
    } else if (user) {
      logout();
    }
    localStorage.removeItem("blog_community_auth");
    localStorage.removeItem("blog_community_user");
    window.location.reload();
  };
  const [currentPath] = useLocation();

  const open = (key: string) => setOpenMenu(key);
  const close = () => setOpenMenu(null);

  return (
    <>
      <nav
        className="hidden md:block bg-slate-950/95 backdrop-blur-xl border-b border-white/10 relative"
        style={{ overflow: "visible" }}
      >
        <div className="max-w-full mx-auto px-3 md:px-5">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo */}
            <Link href="/">
              <a className="flex-shrink-0 group relative">
                <div className="absolute -inset-4 bg-cyan-400/0 group-hover:bg-cyan-400/40 rounded-xl blur-xl transition-all duration-500 pointer-events-none" />
                <img
                  src="https://i.ibb.co/d0PtnHS2/Adobe-Express-file.png"
                  alt="Verso"
                  className="relative h-[clamp(2.4rem,5vw,3.6rem)] w-auto transition-all duration-300 group-hover:scale-105"
                  style={{
                    filter:
                      "brightness(1.1) sepia(1) saturate(5) hue-rotate(155deg)",
                  }}
                />
              </a>
            </Link>

            {/* ── Centered nav ── */}
            <div className="flex items-center gap-1 flex-1 justify-center min-w-0">
              {/* Entreprises */}
              <div
                className="relative"
                onMouseEnter={() => open("ent")}
                onMouseLeave={close}
              >
                <button className={BTN}>
                  <Store className="w-4 h-4" />
                  Entreprises
                  <ChevronDown
                    className={`w-3 h-3 opacity-50 transition-transform duration-200 ${openMenu === "ent" ? "rotate-180" : ""}`}
                  />
                </button>
                {/* invisible hover bridge */}
                <div className="absolute top-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} left-1/2 -translate-x-1/2 w-64 ${openMenu === "ent" ? PANEL_OPEN : ""}`}
                  style={{ marginTop: "8px" }}
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent mb-1 mx-3" />
                  <div className="grid grid-cols-2 gap-0.5 px-0.5">
                    <Link href="/sante">
                      <a className={ITEM}>Santé</a>
                    </Link>
                    <Link href="/finances">
                      <a className={ITEM}>Finance</a>
                    </Link>
                    <Link href="/batiment">
                      <a className={ITEM}>Bâtiment</a>
                    </Link>
                    <Link href="/hotellerie">
                      <a className={ITEM}>Hôtellerie</a>
                    </Link>
                    <Link href="/automobile">
                      <a className={ITEM}>Automobile</a>
                    </Link>
                    <Link href="/commerce">
                      <a className={ITEM}>Commerce</a>
                    </Link>
                    <Link href="/logement">
                      <a className={ITEM}>Logement</a>
                    </Link>
                    <Link href="/divertissement">
                      <a className={ITEM}>Divertissement</a>
                    </Link>
                  </div>
                  <div className="border-t border-cyan-500/10 mt-1.5 pt-1 px-0.5">
                    <Link href="/businesses-directory">
                      <a className={ITEM_HEAD + " text-center"}>Annuaire</a>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div
                className="relative"
                onMouseEnter={() => open("svc")}
                onMouseLeave={close}
              >
                <button className={BTN}>
                  Services
                  <ChevronDown
                    className={`w-3 h-3 opacity-50 transition-transform duration-200 ${openMenu === "svc" ? "rotate-180" : ""}`}
                  />
                </button>
                <div className="absolute top-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} left-1/2 -translate-x-1/2 w-52 ${openMenu === "svc" ? PANEL_OPEN : ""}`}
                  style={{ marginTop: "8px" }}
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent mb-1 mx-3" />
                  <Link href="/services">
                    <a className={ITEM_HEAD}>All Services</a>
                  </Link>
                  <Link href="/services/news">
                    <a className={ITEM}>News & Updates</a>
                  </Link>
                  <Link href="/services/careers">
                    <a className={ITEM}>Careers</a>
                  </Link>
                  <Link href="/services/contractors">
                    <a className={ITEM}>Contractors</a>
                  </Link>
                </div>
              </div>

              {/* Marketing */}
              <div
                className="relative"
                onMouseEnter={() => open("mkt")}
                onMouseLeave={close}
              >
                <button className={BTN}>
                  Marketing
                  <ChevronDown
                    className={`w-3 h-3 opacity-50 transition-transform duration-200 ${openMenu === "mkt" ? "rotate-180" : ""}`}
                  />
                </button>
                <div className="absolute top-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} left-1/2 -translate-x-1/2 w-56 ${openMenu === "mkt" ? PANEL_OPEN : ""}`}
                  style={{ marginTop: "8px" }}
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent mb-1 mx-3" />
                  <Link href="/marketing">
                    <a className={ITEM_HEAD}>Marketing Hub</a>
                  </Link>
                  <div className="border-t border-cyan-500/10 my-1 mx-3" />
                  <Link href="/marketing/journal">
                    <a className={ITEM}>Free Ad Journal</a>
                  </Link>
                  <Link href="/marketing/packs">
                    <a className={ITEM}>Marketing Packs</a>
                  </Link>
                  <Link href="/marketing/print">
                    <a className={ITEM}>Print Services</a>
                  </Link>
                  <Link href="/marketing/newsletters">
                    <a className={ITEM}>Newsletter</a>
                  </Link>
                </div>
              </div>

              {/* Marketplace (direct link) */}
              {currentPath !== "/marketplace" && (
                <Link href="/marketplace">
                  <a className={BTN}>
                    <ShoppingBag className="w-4 h-4" />
                    Marketplace
                  </a>
                </Link>
              )}

              {/* Support */}
              <div
                className="relative"
                onMouseEnter={() => open("help")}
                onMouseLeave={close}
              >
                <button className={BTN}>
                  <Headphones className="w-4 h-4" />
                  Support
                  <ChevronDown
                    className={`w-3 h-3 opacity-50 transition-transform duration-200 ${openMenu === "help" ? "rotate-180" : ""}`}
                  />
                </button>
                <div className="absolute top-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} right-0 w-48 ${openMenu === "help" ? PANEL_OPEN : ""}`}
                  style={{ marginTop: "8px" }}
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent mb-1 mx-3" />
                  <Link href="/sav">
                    <a className={ITEM}>SAV 24/7</a>
                  </Link>
                  <Link href="/versoai">
                    <a className={ITEM}>VersoAI</a>
                  </Link>
                </div>
              </div>
            </div>

            {/* Auth section */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isAuthenticated && (
                <>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg text-[13px]">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    <span className="text-slate-300 truncate max-w-[80px]">
                      {userName}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors text-[13px]"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
