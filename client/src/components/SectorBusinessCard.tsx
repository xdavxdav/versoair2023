import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Business } from "@/lib/business-data";
import VerifiedBadge from "@/components/ui/verified-badge";
import {
  Star,
  Building,
  MapPin,
  Users,
  Tag,
  CheckCircle,
  Heart,
  Phone,
  Sparkles,
  Crown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Color themes for sector pages */
export type SectorTheme = "blue" | "purple" | "emerald" | "amber" | "pink";

const themes: Record<
  SectorTheme,
  {
    hoverBorder: string;
    barGradient: string;
    titleHover: string;
    iconColor: string;
    ratingGradient: string;
    reviewsIcon: string;
    tagBg: string;
    tagText: string;
    tagBorder: string;
    buttonGradient: string;
    buttonHover: string;
  }
> = {
  blue: {
    hoverBorder: "hover:border-blue-500/30",
    barGradient: "from-blue-600 to-teal-600",
    titleHover: "group-hover:text-blue-300",
    iconColor: "text-blue-500",
    ratingGradient: "from-blue-400 to-teal-500",
    reviewsIcon: "text-blue-400",
    tagBg: "bg-blue-900/20",
    tagText: "text-blue-300",
    tagBorder: "border-blue-500/30",
    buttonGradient: "from-blue-600 to-teal-600",
    buttonHover: "hover:from-blue-700 hover:to-teal-700",
  },
  purple: {
    hoverBorder: "hover:border-purple-500/30",
    barGradient: "from-purple-600 to-pink-600",
    titleHover: "group-hover:text-purple-300",
    iconColor: "text-purple-500",
    ratingGradient: "from-purple-400 to-pink-500",
    reviewsIcon: "text-purple-400",
    tagBg: "bg-purple-900/20",
    tagText: "text-purple-300",
    tagBorder: "border-purple-500/30",
    buttonGradient: "from-purple-600 to-pink-600",
    buttonHover: "hover:from-purple-700 hover:to-pink-700",
  },
  emerald: {
    hoverBorder: "hover:border-emerald-500/30",
    barGradient: "from-emerald-600 to-green-600",
    titleHover: "group-hover:text-emerald-300",
    iconColor: "text-emerald-500",
    ratingGradient: "from-emerald-400 to-green-500",
    reviewsIcon: "text-emerald-400",
    tagBg: "bg-emerald-900/20",
    tagText: "text-emerald-300",
    tagBorder: "border-emerald-500/30",
    buttonGradient: "from-emerald-600 to-green-600",
    buttonHover: "hover:from-emerald-700 hover:to-green-700",
  },
  amber: {
    hoverBorder: "hover:border-amber-500/30",
    barGradient: "from-amber-600 to-orange-600",
    titleHover: "group-hover:text-amber-300",
    iconColor: "text-amber-500",
    ratingGradient: "from-amber-400 to-orange-500",
    reviewsIcon: "text-amber-400",
    tagBg: "bg-amber-900/20",
    tagText: "text-amber-300",
    tagBorder: "border-amber-500/30",
    buttonGradient: "from-amber-600 to-orange-600",
    buttonHover: "hover:from-amber-700 hover:to-orange-700",
  },
  pink: {
    hoverBorder: "hover:border-pink-500/30",
    barGradient: "from-pink-600 to-rose-600",
    titleHover: "group-hover:text-pink-300",
    iconColor: "text-pink-500",
    ratingGradient: "from-pink-400 to-rose-500",
    reviewsIcon: "text-pink-400",
    tagBg: "bg-pink-900/20",
    tagText: "text-pink-300",
    tagBorder: "border-pink-500/30",
    buttonGradient: "from-pink-600 to-rose-600",
    buttonHover: "hover:from-pink-700 hover:to-rose-700",
  },
};

interface SectorBusinessCardProps {
  business: Record<string, any>;
  index: number;
  theme: SectorTheme;
  onSelect: (business: any) => void;
  /** Sector-specific icon shown next to reviews (e.g. Store, Hotel, Car) */
  sectorIcon?: LucideIcon;
  /** Label for sectorIcon (e.g. "Retail", "5★ Hotel") */
  sectorLabel?: string | ((b: Record<string, any>) => string);
}

/**
 * Shared business card used across all 6 sector pages.
 * Renders a consistent card with configurable accent colors and optional thumbnail.
 */
export default function SectorBusinessCard({
  business,
  index,
  theme,
  onSelect,
  sectorIcon: SectorIcon,
  sectorLabel,
}: SectorBusinessCardProps) {
  const t = themes[theme];
  const [, setLocation] = useLocation();
  const label =
    typeof sectorLabel === "function"
      ? sectorLabel(business)
      : sectorLabel || business.business_type || "Business";
  const [imageBroken, setImageBroken] = useState(false);
  const hasImage = Boolean(business.imageUrl) && !imageBroken;
  const initials = (business.title || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <motion.div
      key={business.id}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5, scale: 1.01 }}
      onClick={() => setLocation(`/business/${business.id}`)}
      className={`bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-500 border border-gray-700 ${t.hoverBorder} cursor-pointer group`}
    >
      {/* Color bar */}
      <div className={`h-2 bg-gradient-to-r ${t.barGradient}`} />

      {/* Thumbnail — always rendered so card heights stay consistent even without a photo */}
      <div className="relative w-full h-32 overflow-hidden">
        {hasImage ? (
          <img
            src={business.imageUrl}
            alt={business.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageBroken(true)}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${t.barGradient} bg-opacity-20`}
          >
            {SectorIcon ? (
              <SectorIcon className="h-10 w-10 text-white/70" />
            ) : (
              <span className="text-2xl font-bold text-white/70">
                {initials}
              </span>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
      </div>

      <div className="p-[clamp(0.75rem,2vw,2.5rem)]">
        {/* Header: title + rating */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4
              className={`text-sm sm:text-base md:text-lg font-bold text-white ${t.titleHover} transition-colors mb-2 line-clamp-1`}
            >
              {business.title}
            </h4>
            <div className="flex items-center gap-[0.5vw] text-gray-400">
              <Building
                className={`h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] ${t.iconColor}`}
              />
              <span className="text-sm capitalize font-medium">
                {business.address || business.location}
              </span>
              {business.is_verified && (
                <VerifiedBadge
                  size="sm"
                  verifiedAt={business.verified_at}
                  createdAt={business.created_at}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div
              className={`flex items-center gap-[0.5vw] bg-gradient-to-br ${t.ratingGradient} px-3 py-2 rounded-xl shadow-xl`}
            >
              <Star className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-white" />
              <span className="text-sm font-bold text-white">
                {business.rating}
              </span>
            </div>
            {(business.tier === "enterprise" ||
              business.status === "enterprise") && (
              <Badge className="bg-purple-900/30 text-purple-300 border-purple-500/30 text-xs">
                <Crown className="h-[clamp(0.75rem,1vw,1rem)] w-[clamp(0.75rem,1vw,1rem)] mr-1" />
                Enterprise
              </Badge>
            )}
            {(business.tier === "premium" ||
              business.status === "premium" ||
              business.is_premium) && (
              <Badge className="bg-amber-900/30 text-amber-300 border-amber-500/30 text-xs">
                <Crown className="h-[clamp(0.75rem,1vw,1rem)] w-[clamp(0.75rem,1vw,1rem)] mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm mb-4 leading-relaxed line-clamp-2">
          {business.description}
        </p>

        {/* Meta rows */}
        <div className="space-y-[0.75vw] mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-[0.5vw]">
              <Users
                className={`h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] ${t.reviewsIcon}`}
              />
              <span className="text-gray-300">
                {business.reviews?.toLocaleString() || 0} reviews
              </span>
            </div>
            <div className="flex items-center gap-[0.5vw]">
              {SectorIcon ? (
                <SectorIcon className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-pink-400" />
              ) : (
                <Tag className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-pink-400" />
              )}
              <span className="text-gray-300">{label}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-[0.5vw]">
              <MapPin className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-blue-400" />
              <span className="text-gray-300 capitalize">
                {business.location}
              </span>
            </div>
            <div className="flex items-center gap-[0.5vw]">
              <Tag className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-orange-400" />
              <span className="text-gray-300 capitalize">
                {business.category}
              </span>
            </div>
          </div>
          {business.tags && business.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {business.tags.slice(0, 3).map((tag: string, i: number) => (
                <Badge
                  key={i}
                  className={`${t.tagBg} ${t.tagText} ${t.tagBorder} text-xs`}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Footer: revenue + actions */}
        <div className="flex flex-col pt-[1vw] border-t border-gray-700 gap-3">
          <div className="min-w-0">
            {business.revenue && (
              <>
                <span className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-green-300">
                  €{(business.revenue / 1000).toFixed(0)}K
                </span>
                <span className="text-gray-400 text-sm"> / month</span>
              </>
            )}
            {business.employees && (
              <div className="text-sm text-gray-300">
                {business.employees} employees
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Heart className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-gray-400" />
            </Button>
            <Button
              size="sm"
              className={`bg-gradient-to-r ${t.buttonGradient} ${t.buttonHover}`}
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/business/${business.id}`);
              }}
            >
              <Phone className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
              Contact
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
