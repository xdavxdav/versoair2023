/**
 * PortalSelector — Shows all portals the user has access to,
 * with "Unlock" badges on locked portals linking to upgrade flows.
 *
 * Used in:
 *  - Post-login redirect (portal picker)
 *  - /profile page "My Portals" section
 */

import { useLocation } from "wouter";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Globe,
  Music,
  Crown,
  MessageSquare,
  Briefcase,
  LayoutDashboard,
  Lock,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface PortalDefinition {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  gradient: string;
  borderColor: string;
  badge?: string;
}

const PORTAL_DEFINITIONS: PortalDefinition[] = [
  {
    id: "general",
    label: "Dashboard",
    description: "Home, directory & business search",
    icon: <Globe className="w-6 h-6" />,
    href: "/",
    gradient: "from-blue-600 to-cyan-500",
    borderColor: "border-blue-500/30",
    badge: "Free",
  },
  {
    id: "artist",
    label: "Artist Portal",
    description: "StreamRoyale, wallet & music analytics",
    icon: <Music className="w-6 h-6" />,
    href: "/artist-portal",
    gradient: "from-purple-600 to-pink-500",
    borderColor: "border-purple-500/30",
    badge: "Creator",
  },
  {
    id: "geo-admin",
    label: "GeoAdmin",
    description: "Subscriber analytics & business verification",
    icon: <Crown className="w-6 h-6" />,
    href: "/geo-admin",
    gradient: "from-amber-600 to-orange-500",
    borderColor: "border-amber-500/30",
    badge: "Premium",
  },
  {
    id: "community",
    label: "Community / Blog",
    description: "Blog posts, discussions & community feed",
    icon: <MessageSquare className="w-6 h-6" />,
    href: "/blog",
    gradient: "from-green-600 to-emerald-500",
    borderColor: "border-green-500/30",
    badge: "Community",
  },
  {
    id: "contractor",
    label: "Contractor Portal",
    description: "Projects, availability & contractor services",
    icon: <Briefcase className="w-6 h-6" />,
    href: "/services/contractors",
    gradient: "from-orange-600 to-red-500",
    borderColor: "border-orange-500/30",
    badge: "Contractor",
  },
];

const ADMIN_PORTAL: PortalDefinition = {
  id: "admin",
  label: "Admin HQ",
  description: "Platform management & moderation",
  icon: <LayoutDashboard className="w-6 h-6" />,
  href: "/dashboard",
  gradient: "from-red-600 to-rose-500",
  borderColor: "border-red-500/30",
  badge: "Admin",
};

interface PortalSelectorProps {
  /** Show heading text */
  showHeading?: boolean;
  /** Compact mode for embedding in profile page */
  compact?: boolean;
  /** CSS class for the container */
  className?: string;
}

export default function PortalSelector({
  showHeading = true,
  compact = false,
  className = "",
}: PortalSelectorProps) {
  const { user } = useAuthContext();
  const { capabilities, isLoading } = useCapabilities();
  const [, setLocation] = useLocation();

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        <span className="ml-2 text-white/50 text-sm">Loading portals...</span>
      </div>
    );
  }

  const userPortals = capabilities?.portals || user.portals || ["general"];
  const isAdmin = ["admin", "moderator", "superuser"].includes(user.role || "");

  // Build portal list: accessible ones first, then locked ones
  const allPortals = [...PORTAL_DEFINITIONS];
  if (isAdmin) allPortals.push(ADMIN_PORTAL);

  const accessiblePortals = allPortals.filter(
    (p) => userPortals.includes(p.id) || (p.id === "admin" && isAdmin),
  );
  const lockedPortals = PORTAL_DEFINITIONS.filter(
    (p) => !userPortals.includes(p.id) && p.id !== "general",
  );

  const unlockHref: Record<string, string> = {
    artist: "/apply",
    "geo-admin": "/apply",
    community: "/apply",
    contractor: "/apply",
  };

  return (
    <div className={className}>
      {showHeading && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">
            {compact ? "My Portals" : "Select a Portal"}
          </h2>
          <p className="text-white/50 text-sm mt-1">
            {compact
              ? "Quick access to your active portals"
              : "Choose where you'd like to go"}
          </p>
        </div>
      )}

      {/* Accessible portals */}
      <div
        className={`grid gap-4 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}
      >
        {accessiblePortals.map((portal) => (
          <button
            key={portal.id}
            onClick={() => setLocation(portal.href)}
            className={`group relative bg-white/[0.04] backdrop-blur-sm border ${portal.borderColor} rounded-xl p-5 text-left hover:bg-white/[0.08] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
          >
            {/* Badge */}
            {portal.badge && (
              <span
                className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${portal.gradient} text-white`}
              >
                {portal.badge}
              </span>
            )}

            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-lg bg-gradient-to-br ${portal.gradient} flex items-center justify-center text-white mb-3 shadow-lg`}
            >
              {portal.icon}
            </div>

            {/* Text */}
            <h3 className="text-white font-semibold text-sm">{portal.label}</h3>
            <p className="text-white/40 text-xs mt-1">{portal.description}</p>

            {/* Arrow */}
            <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
          </button>
        ))}
      </div>

      {/* Locked portals */}
      {lockedPortals.length > 0 && !compact && (
        <>
          <div className="mt-8 mb-4">
            <h3 className="text-sm font-medium text-white/40">
              Available to unlock
            </h3>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {lockedPortals.map((portal) => (
              <button
                key={portal.id}
                onClick={() => setLocation(unlockHref[portal.id] || "/apply")}
                className="group relative bg-white/[0.02] border border-white/5 rounded-xl p-5 text-left hover:bg-white/[0.04] transition-all duration-200 opacity-60 hover:opacity-80"
              >
                {/* Lock badge */}
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-medium text-white/30 px-2 py-0.5 rounded-full border border-white/10">
                  <Lock className="w-3 h-3" />
                  Unlock
                </span>

                {/* Icon (greyed) */}
                <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/30 mb-3">
                  {portal.icon}
                </div>

                {/* Text */}
                <h3 className="text-white/50 font-semibold text-sm">
                  {portal.label}
                </h3>
                <p className="text-white/20 text-xs mt-1">
                  {portal.description}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
