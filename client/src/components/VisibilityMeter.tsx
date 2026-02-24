import React, { useEffect, useRef } from "react";
import { TIERS, TIER_ORDER, type TierKey } from "@/lib/tiers";

interface VisibilityMeterProps {
  currentTier: TierKey;
  onBoostClick?: () => void;
  className?: string;
}

/**
 * 🛸 Visibility Gauge – Dynamic progress meter
 * Red zone (Free) → Yellow (Essential) → Green (Verified) → Purple (Max/Enterprise)
 */
export const VisibilityMeter: React.FC<VisibilityMeterProps> = ({
  currentTier,
  onBoostClick,
  className = "",
}) => {
  const tierDef = TIERS[currentTier];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw the gauge arc
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h - 20;
    const radius = Math.min(cx, cy) - 20;

    ctx.clearRect(0, 0, w, h);

    // Draw zone arcs (background)
    const zones = [
      { start: 0, end: 0.2, color: "#FCA5A5" }, // Red zone
      { start: 0.2, end: 0.4, color: "#FDE68A" }, // Yellow zone
      { start: 0.4, end: 0.7, color: "#6EE7B7" }, // Green zone
      { start: 0.7, end: 1.0, color: "#C4B5FD" }, // Purple zone
    ];

    zones.forEach((zone) => {
      const startAngle = Math.PI + zone.start * Math.PI;
      const endAngle = Math.PI + zone.end * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.lineWidth = 24;
      ctx.strokeStyle = zone.color;
      ctx.lineCap = "butt";
      ctx.stroke();
    });

    // Draw active arc (filled portion)
    const activeColors: Record<string, string> = {
      red: "#EF4444",
      yellow: "#F59E0B",
      green: "#10B981",
      purple: "#8B5CF6",
    };
    const activeEnd = tierDef.meterPercent / 100;
    const activeColor = activeColors[tierDef.meterZone];

    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, Math.PI + activeEnd * Math.PI);
    ctx.lineWidth = 24;
    ctx.strokeStyle = activeColor;
    ctx.lineCap = "round";
    ctx.stroke();

    // Draw needle
    const needleAngle = Math.PI + activeEnd * Math.PI;
    const needleLen = radius - 10;
    const nx = cx + needleLen * Math.cos(needleAngle);
    const ny = cy + needleLen * Math.sin(needleAngle);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#1F2937";
    ctx.lineCap = "round";
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#1F2937";
    ctx.fill();
  }, [currentTier, tierDef]);

  const zoneLabels: Record<string, { label: string; color: string }> = {
    red: { label: "Base Visibility", color: "text-red-600" },
    yellow: { label: "Getting Noticed", color: "text-yellow-600" },
    green: { label: "Competitive", color: "text-emerald-600" },
    purple: { label: "Market Leader", color: "text-purple-600" },
  };

  const zone = zoneLabels[tierDef.meterZone];

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Visibility Score
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl">{tierDef.icon}</span>
            <span className={`text-lg font-bold ${zone.color}`}>
              {zone.label}
            </span>
          </div>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold border ${tierDef.badgeColor}`}
        >
          {tierDef.name} Plan
        </div>
      </div>

      {/* Gauge Canvas */}
      <div className="flex justify-center my-4">
        <canvas
          ref={canvasRef}
          width={280}
          height={160}
          className="max-w-full"
        />
      </div>

      {/* Multiplier */}
      <div className="text-center mb-4">
        <span className="text-4xl font-black text-gray-900">
          {tierDef.rankingPower}x
        </span>
        <p className="text-sm text-gray-500 mt-1">
          {tierDef.visibilityNarrative}
        </p>
      </div>

      {/* Zone Legend */}
      <div className="flex justify-between text-xs text-gray-400 mb-4 px-2">
        <span>🔴 Base</span>
        <span>🟡 Noticed</span>
        <span>🟢 Competitive</span>
        <span>🟣 Leader</span>
      </div>

      {/* Boost CTA */}
      {currentTier !== "enterprise" && (
        <button
          onClick={onBoostClick}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
        >
          <span>⚡</span>
          <span>Boost Search Rank</span>
        </button>
      )}
    </div>
  );
};

// ─── TIER BADGE (Compact) ────────────────────────────────────────────────────────

interface TierBadgeProps {
  tier: TierKey;
  size?: "sm" | "md" | "lg";
}

export const TierBadge: React.FC<TierBadgeProps> = ({ tier, size = "md" }) => {
  const tierDef = TIERS[tier];
  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold border ${tierDef.badgeColor} ${sizes[size]}`}
    >
      <span>{tierDef.icon}</span>
      <span>{tierDef.name}</span>
    </span>
  );
};

// ─── RANK SCORE DISPLAY ──────────────────────────────────────────────────────────

interface RankScoreProps {
  score: number; // 0-100
  tier: TierKey;
  onUpgradeClick?: () => void;
}

export const RankScoreDisplay: React.FC<RankScoreProps> = ({
  score,
  tier,
  onUpgradeClick,
}) => {
  const nextTier =
    TIER_ORDER[Math.min(TIER_ORDER.indexOf(tier) + 1, TIER_ORDER.length - 1)];
  const nextTierDef = TIERS[nextTier];
  const potentialScore = Math.min(score + nextTierDef.rankingPower * 10, 100);

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-purple-600";
    if (s >= 60) return "text-emerald-600";
    if (s >= 40) return "text-yellow-600";
    return "text-red-500";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Rank Score
        </h4>
        <span className="text-xs text-gray-400">out of 100</span>
      </div>

      {/* Score Bar */}
      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-400 via-yellow-400 via-emerald-400 to-purple-500 transition-all duration-1000"
          style={{ width: `${score}%` }}
        />
        {/* Potential score indicator */}
        {tier !== "enterprise" && (
          <div
            className="absolute top-0 h-full border-r-2 border-dashed border-purple-400"
            style={{ left: `${potentialScore}%` }}
            title={`Potential with ${nextTierDef.name}: ${potentialScore}/100`}
          />
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <span className={`text-3xl font-black ${getScoreColor(score)}`}>
            {score}
          </span>
          <span className="text-gray-400 text-lg">/100</span>
        </div>
        {tier !== "enterprise" && (
          <button
            onClick={onUpgradeClick}
            className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
          >
            Upgrade to {nextTierDef.name} → reach {potentialScore}/100
          </button>
        )}
      </div>
    </div>
  );
};
