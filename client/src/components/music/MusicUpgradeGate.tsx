/**
 * MusicUpgradeGate — Premium blur overlay with visible benefits
 * Shows aspirational locked content, not just a tooltip
 */
import { motion } from "framer-motion";
import { Lock, Sparkles, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface MusicUpgradeGateProps {
  title?: string;
  description?: string;
  benefits?: string[];
  requiredTier?: "supporter" | "champion" | "patron" | "artist";
  ctaText?: string;
  ctaHref?: string;
  children?: React.ReactNode;
  variant?: "overlay" | "card";
}

const tierInfo = {
  supporter: {
    name: "Supporter",
    icon: Sparkles,
    color: "text-blue-400",
    bg: "from-blue-500",
  },
  champion: {
    name: "Champion",
    icon: Crown,
    color: "text-purple-400",
    bg: "from-purple-500",
  },
  patron: {
    name: "Patron",
    icon: Crown,
    color: "text-amber-400",
    bg: "from-amber-500",
  },
  artist: {
    name: "Artist",
    icon: Sparkles,
    color: "text-pink-400",
    bg: "from-pink-500",
  },
};

export function MusicUpgradeGate({
  title = "Premium Feature",
  description = "Unlock this feature with an upgraded subscription",
  benefits = ["Unlimited requests", "Priority queue", "Direct producer access"],
  requiredTier = "supporter",
  ctaText = "Upgrade Now",
  ctaHref = "/music/settings?tab=subscription",
  children,
  variant = "overlay",
}: MusicUpgradeGateProps) {
  const tier = tierInfo[requiredTier];
  const TierIcon = tier.icon;

  if (variant === "card") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-900/30 via-fuchsia-900/20 to-pink-900/30 p-6"
      >
        {/* Glow border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 via-transparent to-pink-500/20 opacity-50" />

        {/* Content */}
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tier.bg} to-transparent flex items-center justify-center`}
            >
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-white/60">{description}</p>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2 py-3 border-y border-white/5">
            <p className="text-xs text-white/40 uppercase tracking-wider">
              What you'll get
            </p>
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-2">
                <Sparkles className={`w-3.5 h-3.5 ${tier.color}`} />
                <span className="text-sm text-white/80">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link href={ctaHref}>
            <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white group">
              <TierIcon className="w-4 h-4 mr-2" />
              {ctaText}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>

          <p className="text-center text-xs text-white/40">
            Requires <span className={tier.color}>{tier.name}</span> tier or
            higher
          </p>
        </div>
      </motion.div>
    );
  }

  // Overlay variant
  return (
    <div className="relative">
      {/* Blurred content behind */}
      <div className="blur-sm opacity-50 pointer-events-none select-none">
        {children}
      </div>

      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-[#06020f]/80 to-[#06020f]/95 rounded-xl backdrop-blur-[2px]"
      >
        <div className="text-center p-6 max-w-sm">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center"
          >
            <Lock className="w-8 h-8 text-purple-400" />
          </motion.div>

          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-white/60 mb-4">{description}</p>

          {/* Mini benefits */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {benefits.slice(0, 3).map((benefit, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 text-xs text-white/70"
              >
                <Sparkles className={`w-3 h-3 ${tier.color}`} />
                {benefit}
              </span>
            ))}
          </div>

          <Link href={ctaHref}>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
              <TierIcon className="w-4 h-4 mr-2" />
              {ctaText}
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default MusicUpgradeGate;
