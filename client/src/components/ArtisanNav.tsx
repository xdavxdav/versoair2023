import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  User,
  Image,
  Users,
  MessageSquare,
  Settings,
  BookOpen,
  Home,
  Star,
  ShoppingBag,
  Palette,
  Award,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/artisans-portal", label: "Mon Profil", icon: User },
  { href: "/artisans-portal?tab=portfolio", label: "Portfolio", icon: Image },
  {
    href: "/artisans-portal?tab=orders",
    label: "Commandes",
    icon: ShoppingBag,
    badge: "Nouveau",
  },
  { href: "/communities", label: "Communautés", icon: Users },
  { href: "/artisans-portal?tab=reviews", label: "Avis", icon: Star },
  {
    href: "/artisans-portal?tab=settings",
    label: "Paramètres",
    icon: Settings,
  },
];

export default function ArtisanNav() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href.includes("?tab=")) {
      const tab = new URLSearchParams(href.split("?")[1]).get("tab");
      const currentTab = new URLSearchParams(window.location.search).get("tab");
      return location.startsWith("/artisans-portal") && currentTab === tab;
    }
    return (
      location === href ||
      (href === "/artisans-portal" &&
        location === "/artisans-portal" &&
        !window.location.search)
    );
  };

  return (
    <nav className="sticky top-0 z-40 bg-gradient-to-r from-emerald-900/95 via-emerald-800/95 to-emerald-900/95 backdrop-blur-xl border-b border-emerald-500/20">
      <div className="max-w-[95vw] mx-auto px-4">
        {/* Top bar with logo and passerelle */}
        <div className="flex items-center justify-between py-3 border-b border-emerald-500/10">
          {/* Logo */}
          <Link href="/artisans-portal">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 transition-shadow">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  Portail <span className="text-emerald-400">Artisans</span>
                </h1>
                <p className="text-[10px] text-emerald-300/60 -mt-0.5">
                  Verso Air™ Community
                </p>
              </div>
            </div>
          </Link>

          {/* Passerelle to Blog */}
          <div className="flex items-center gap-3">
            <Link href="/blog">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600/80 to-violet-600/80 hover:from-purple-500 hover:to-violet-500 text-white text-sm font-medium transition-all shadow-md hover:shadow-purple-500/25"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Vers le Blog</span>
                <span className="sm:hidden">Blog</span>
              </motion.button>
            </Link>

            <Link href="/">
              <button className="p-2 rounded-lg bg-emerald-700/50 hover:bg-emerald-600/50 text-emerald-200 transition-colors">
                <Home className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link key={item.href} href={item.href}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    active
                      ? "bg-emerald-500/20 text-emerald-300 shadow-inner"
                      : "text-emerald-100/70 hover:text-emerald-100 hover:bg-emerald-700/30"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}

                  {/* Badge */}
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500 text-amber-950">
                      {item.badge}
                    </span>
                  )}

                  {/* Active indicator */}
                  {active && (
                    <motion.div
                      layoutId="artisan-nav-indicator"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-emerald-400"
                    />
                  )}
                </motion.button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
