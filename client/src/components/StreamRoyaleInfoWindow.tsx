/**
 * 🎵 StreamRoyale — Animated "How It Works" Transparency Window
 *
 * A beautifully animated overlay that explains the full royalty system.
 * Uses framer-motion for staggered reveals, floating particles, and smooth transitions.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Music,
  DollarSign,
  Shield,
  Trophy,
  Zap,
  Heart,
  ChevronRight,
  Globe,
  Star,
  Crown,
  Flame,
  Sparkles,
  TrendingUp,
  Users,
  PieChart,
  Clock,
} from "lucide-react";

interface StreamRoyaleInfoWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const BADGE_TIERS = [
  {
    tier: 1,
    name: "Initiate",
    threshold: "0",
    icon: "🌱",
    color: "#9CA3AF",
    boost: "—",
  },
  {
    tier: 2,
    name: "Bronze Warrior",
    threshold: "1,000",
    icon: "🥉",
    color: "#CD7F32",
    boost: "—",
  },
  {
    tier: 3,
    name: "Silver Gladiator",
    threshold: "10,000",
    icon: "🥈",
    color: "#C0C0C0",
    boost: "—",
  },
  {
    tier: 4,
    name: "Gold Champion",
    threshold: "50,000",
    icon: "🥇",
    color: "#FFD700",
    boost: "—",
  },
  {
    tier: 5,
    name: "Platinum Conqueror",
    threshold: "250,000",
    icon: "💎",
    color: "#E5E4E2",
    boost: "—",
  },
  {
    tier: 6,
    name: "Diamond Warlord",
    threshold: "1,000,000",
    icon: "👑",
    color: "#B9F2FF",
    boost: "+2%",
  },
  {
    tier: 7,
    name: "Legendary Titan",
    threshold: "5,000,000",
    icon: "⚡",
    color: "#FF6B35",
    boost: "+5%",
  },
];

const POOL_SPLIT = [
  {
    label: "Artists (Guaranteed)",
    percent: 20,
    color: "#22C55E",
    icon: Shield,
  },
  {
    label: "Artists (Performance)",
    percent: 70,
    color: "#A855F7",
    icon: TrendingUp,
  },
  { label: "Platform Operations", percent: 10, color: "#6B7280", icon: Globe },
];

const PLANS = [
  {
    name: "Supporter",
    price: "$4.99/mo",
    streams: "200/week",
    contribution: "70%",
    boosts: "—",
    color: "#3B82F6",
  },
  {
    name: "Champion",
    price: "$9.99/mo",
    streams: "1,000/week",
    contribution: "75%",
    boosts: "5/mo",
    color: "#A855F7",
  },
  {
    name: "Patron",
    price: "$19.99/mo",
    streams: "Unlimited",
    contribution: "80%",
    boosts: "20/mo",
    color: "#F59E0B",
  },
];

export default function StreamRoyaleInfoWindow({
  isOpen,
  onClose,
}: StreamRoyaleInfoWindowProps) {
  const [activeSection, setActiveSection] = useState(0);

  const sections = [
    { title: "How It Works", icon: Music },
    { title: "Pool Split", icon: PieChart },
    { title: "Contracts & Grades", icon: Shield },
    { title: "Listener Plans", icon: Users },
    { title: "Badge System", icon: Trophy },
    { title: "Boost & Tips", icon: Zap },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Window */}
          <motion.div
            className="fixed inset-4 md:inset-12 lg:inset-20 z-[9999] bg-gradient-to-br from-[#0A0618] via-[#0E0824] to-[#120A2E] rounded-3xl border border-purple-500/20 overflow-hidden flex flex-col"
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Floating particles inside the window */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 15 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-purple-500/10"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    fontSize: `${Math.random() * 20 + 10}px`,
                  }}
                  animate={{
                    y: [0, -30, 10, 0],
                    x: [0, 10, -10, 0],
                    opacity: [0.05, 0.15, 0.05],
                  }}
                  transition={{
                    duration: Math.random() * 12 + 8,
                    delay: Math.random() * 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {["♪", "♫", "✦", "◎", "♩", "✧"][i % 6]}
                </motion.div>
              ))}
            </div>

            {/* Header */}
            <div className="relative flex items-center justify-between p-4 md:p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <Sparkles className="w-5 h-5 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    StreamRoyale Transparency
                  </h2>
                  <p className="text-xs text-white/40">
                    How your streams create artist earnings
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="relative flex gap-1 p-2 md:p-3 border-b border-white/5 overflow-x-auto">
              {sections.map((section, idx) => {
                const Icon = section.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveSection(idx)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      activeSection === idx
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "text-white/40 hover:text-white/60 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {section.title}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="relative flex-1 overflow-y-auto p-4 md:p-8">
              <AnimatePresence mode="wait">
                {/* Section 0: How It Works */}
                {activeSection === 0 && (
                  <motion.div
                    key="how"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Music className="w-5 h-5 text-purple-400" />
                      The StreamRoyale Ecosystem
                    </h3>

                    <div className="grid md:grid-cols-3 gap-4">
                      {[
                        {
                          step: 1,
                          title: "Listeners Subscribe",
                          desc: "Choose a plan (Supporter, Champion, or Patron). Your subscription fees fill the weekly royalty pool.",
                          icon: Users,
                          color: "from-blue-500 to-cyan-500",
                        },
                        {
                          step: 2,
                          title: "Streams Are Tracked",
                          desc: "Every valid stream (≥30 seconds) is recorded with a heartbeat system. Self-streams capped at 50/week.",
                          icon: Clock,
                          color: "from-purple-500 to-fuchsia-500",
                        },
                        {
                          step: 3,
                          title: "Weekly Distribution",
                          desc: "Every Monday at 06:00 UTC, the pool is distributed: 20% guaranteed equally, 70% by performance, 10% platform.",
                          icon: DollarSign,
                          color: "from-green-500 to-emerald-500",
                        },
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.15 }}
                          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5"
                        >
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}
                          >
                            <item.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-xs text-purple-400 font-semibold mb-1">
                            Step {item.step}
                          </div>
                          <h4 className="text-white font-semibold mb-1">
                            {item.title}
                          </h4>
                          <p className="text-white/40 text-sm leading-relaxed">
                            {item.desc}
                          </p>
                        </motion.div>
                      ))}
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 border border-purple-500/20 rounded-2xl p-5"
                    >
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-white font-semibold">
                            90% Goes to Artists
                          </h4>
                          <p className="text-white/40 text-sm mt-1">
                            StreamRoyale is built on transparency. 90% of all
                            listener subscription revenue goes directly to
                            artists — split between a guaranteed floor and
                            performance-based rewards. Only 10% sustains the
                            platform itself.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {/* Section 1: Pool Split */}
                {activeSection === 1 && (
                  <motion.div
                    key="pool"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-purple-400" />
                      Weekly Pool Distribution
                    </h3>

                    {/* Visual pool bar */}
                    <div className="rounded-2xl overflow-hidden h-12 flex">
                      {POOL_SPLIT.map((split, i) => (
                        <motion.div
                          key={i}
                          initial={{ width: 0 }}
                          animate={{ width: `${split.percent}%` }}
                          transition={{
                            delay: i * 0.2,
                            duration: 0.6,
                            type: "spring",
                          }}
                          className="h-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: split.color }}
                        >
                          {split.percent}%
                        </motion.div>
                      ))}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      {POOL_SPLIT.map((split, i) => {
                        const Icon = split.icon;
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5"
                          >
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                              style={{ backgroundColor: split.color + "20" }}
                            >
                              <Icon
                                className="w-5 h-5"
                                style={{ color: split.color }}
                              />
                            </div>
                            <h4 className="text-white font-semibold">
                              {split.label}
                            </h4>
                            <p
                              className="text-3xl font-bold mt-1"
                              style={{ color: split.color }}
                            >
                              {split.percent}%
                            </p>
                            <p className="text-white/30 text-xs mt-1">
                              {i === 0 &&
                                "Split equally among all qualifying artists"}
                              {i === 1 &&
                                "Proportional to weighted stream count"}
                              {i === 2 &&
                                "Infrastructure, development & moderation"}
                            </p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Section 2: Contracts & Grades */}
                {activeSection === 2 && (
                  <motion.div
                    key="contracts"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-400" />
                      Artist Contracts & Grade System
                    </h3>

                    <p className="text-white/40 text-sm leading-relaxed">
                      Artists who sign a contract with Verso Air ™️ Music Label
                      unlock higher per-stream rates, featuring privileges, and
                      premium audio access. Contracts are assigned a grade (S,
                      A, B, or C) based on your application, portfolio, and
                      experience.
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        {
                          grade: "S",
                          label: "Elite",
                          share: "85%",
                          perStream: "$0.0085",
                          color: "#FFD700",
                          features:
                            "Featured priority, HD audio, downloads, max revenue share",
                        },
                        {
                          grade: "A",
                          label: "Premier",
                          share: "75%",
                          perStream: "$0.0075",
                          color: "#C0C0C0",
                          features:
                            "Featured eligible, HD audio, good revenue share",
                        },
                        {
                          grade: "B",
                          label: "Standard",
                          share: "65%",
                          perStream: "$0.0065",
                          color: "#CD7F32",
                          features:
                            "Standard featuring, standard audio quality",
                        },
                        {
                          grade: "C",
                          label: "Entry",
                          share: "55%",
                          perStream: "$0.0055",
                          color: "#9CA3AF",
                          features: "Basic access, entry-level revenue share",
                        },
                      ].map((tier, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
                              style={{
                                backgroundColor: tier.color + "20",
                                color: tier.color,
                              }}
                            >
                              {tier.grade}
                            </div>
                            <div>
                              <h4 className="text-white font-semibold">
                                {tier.label}
                              </h4>
                              <p className="text-white/30 text-xs">
                                Grade {tier.grade}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                              <span className="text-white/40">
                                Artist Share
                              </span>
                              <span className="text-white font-bold">
                                {tier.share}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/40">Per Stream</span>
                              <span className="text-green-400 font-medium">
                                {tier.perStream}
                              </span>
                            </div>
                          </div>
                          <p className="text-white/20 text-xs mt-3">
                            {tier.features}
                          </p>
                        </motion.div>
                      ))}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-5"
                      >
                        <div className="flex items-start gap-3">
                          <TrendingUp className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-white font-semibold">
                              How Artists Earn
                            </h4>
                            <p className="text-white/40 text-sm mt-1">
                              Listeners subscribe and stream your music. Every
                              valid play (≥30 seconds) generates revenue. Your
                              contract grade determines your per-stream rate and
                              revenue share percentage.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 border border-purple-500/20 rounded-2xl p-5"
                      >
                        <div className="flex items-start gap-3">
                          <Star className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-white font-semibold">
                              How to Apply
                            </h4>
                            <p className="text-white/40 text-sm mt-1">
                              Visit the Artist Portal Welcome page and submit
                              your application. Include your portfolio, monthly
                              listeners, and motivation. Review takes 5–7
                              business days.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* Section 3: Listener Plans */}
                {activeSection === 3 && (
                  <motion.div
                    key="plans"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Listener Subscription Tiers
                    </h3>

                    <div className="grid md:grid-cols-3 gap-4">
                      {PLANS.map((plan, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.15 }}
                          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden"
                        >
                          {i === 2 && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full">
                              BEST VALUE
                            </div>
                          )}
                          <h4
                            className="text-lg font-bold"
                            style={{ color: plan.color }}
                          >
                            {plan.name}
                          </h4>
                          <p className="text-2xl font-bold text-white mt-2">
                            {plan.price}
                          </p>
                          <div className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-white/40">Streams</span>
                              <span className="text-white">{plan.streams}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/40">
                                Pool Contribution
                              </span>
                              <span className="text-white">
                                {plan.contribution}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/40">
                                Boost Credits
                              </span>
                              <span className="text-white">{plan.boosts}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 text-white/40 text-sm">
                      <strong className="text-white">
                        What's a Boost Credit?
                      </strong>{" "}
                      — During any stream, use a boost to double (2×) the
                      stream's weight in the performance pool PLUS add $0.50
                      directly to the pool. Perfect for supporting your favorite
                      artists.
                    </div>
                  </motion.div>
                )}

                {/* Section 4: Badge System */}
                {activeSection === 4 && (
                  <motion.div
                    key="badges"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-purple-400" />
                      Warrior Badge Progression
                    </h3>

                    <p className="text-white/40 text-sm">
                      Every valid stream builds your lifetime total. Reach
                      milestones to unlock warrior badges — and at Diamond &
                      Legendary tiers, earn permanent revenue boosts on your
                      performance earnings!
                    </p>

                    <div className="space-y-3">
                      {BADGE_TIERS.map((badge, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.04] transition-colors"
                        >
                          <span className="text-2xl w-10 text-center">
                            {badge.icon}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">
                                {badge.name}
                              </span>
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: badge.color + "20",
                                  color: badge.color,
                                }}
                              >
                                Tier {badge.tier}
                              </span>
                            </div>
                            <p className="text-white/30 text-xs">
                              {badge.threshold} lifetime streams
                            </p>
                          </div>
                          <div className="text-right">
                            {badge.boost !== "—" ? (
                              <span className="text-green-400 font-bold text-sm">
                                {badge.boost} revenue
                              </span>
                            ) : (
                              <span className="text-white/20 text-sm">—</span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Section 5: Boost & Tips */}
                {activeSection === 5 && (
                  <motion.div
                    key="boosts"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-400" />
                      Boosts & Tips
                    </h3>

                    <div className="grid md:grid-cols-2 gap-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mb-3">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-white font-semibold text-lg">
                          Stream Boost
                        </h4>
                        <p className="text-white/40 text-sm mt-2">
                          Use a boost credit during any active stream to:
                        </p>
                        <ul className="mt-3 space-y-2">
                          <li className="flex items-center gap-2 text-sm text-white/60">
                            <ChevronRight className="w-3 h-3 text-yellow-400" />
                            <span>
                              Double (2×) the stream's weight in the performance
                              pool
                            </span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-white/60">
                            <ChevronRight className="w-3 h-3 text-yellow-400" />
                            <span>Add $0.50 directly to the weekly pool</span>
                          </li>
                        </ul>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-3">
                          <Heart className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-white font-semibold text-lg">
                          Direct Tips
                        </h4>
                        <p className="text-white/40 text-sm mt-2">
                          Send a tip to any artist ($0.50 minimum):
                        </p>
                        <ul className="mt-3 space-y-2">
                          <li className="flex items-center gap-2 text-sm text-white/60">
                            <ChevronRight className="w-3 h-3 text-pink-400" />
                            <span>
                              50% goes directly to the artist's wallet
                            </span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-white/60">
                            <ChevronRight className="w-3 h-3 text-pink-400" />
                            <span>50% is added to the community pool</span>
                          </li>
                        </ul>
                      </motion.div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5"
                    >
                      <div className="flex items-start gap-3">
                        <Flame className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-white font-semibold">
                            Super Streams (Coming Soon)
                          </h4>
                          <p className="text-white/40 text-sm mt-1">
                            A premium feature where a single stream carries 5×
                            weight. Super Streams will be available as special
                            events and purchasable power-ups.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="relative border-t border-white/5 p-4 md:p-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/20 text-xs">
                <Globe className="w-3.5 h-3.5" />
                <span>
                  5 Regional Leagues: Africa • Americas • Asia-Pacific • Europe
                  • Middle East
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-purple-600/80 hover:bg-purple-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
