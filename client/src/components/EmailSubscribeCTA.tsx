/**
 * 📬 EmailSubscribeCTA — Inline subscribe card for Career / Contractor / Reservation pages
 *
 * Displays a branded CTA card that lets authenticated users subscribe to
 * email alerts with one click. Shows current subscription state and allows
 * toggling frequency.
 *
 * Props:
 *   - channelType: which subscription channel (job_alerts, contract_alerts, etc.)
 *   - userId: the current user's ID (null = not authenticated)
 *   - onAuthRequired: callback when user needs to sign in
 *   - compact: smaller variant for sidebars
 */

import React, { useState } from "react";
import {
  useEmailSubscriptions,
  type SubscriptionType,
  type Frequency,
} from "@/hooks/use-email-subscriptions";
import {
  Bell,
  BellOff,
  Check,
  ChevronDown,
  Lock,
  Mail,
  Zap,
} from "lucide-react";

// ─── CHANNEL CONFIG ─────────────────────────────────────────────────────────────

const CHANNEL_CONFIG: Record<
  SubscriptionType,
  {
    label: string;
    description: string;
    icon: string;
    gradient: string;
    accentClass: string;
    bgClass: string;
    borderClass: string;
  }
> = {
  job_alerts: {
    label: "Job Alerts",
    description: "Get notified when new jobs match your preferences",
    icon: "🎯",
    gradient: "from-blue-600 to-blue-500",
    accentClass: "text-blue-600",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200",
  },
  contract_alerts: {
    label: "Contract Alerts",
    description: "Receive alerts for new contracts matching your skills",
    icon: "🔨",
    gradient: "from-amber-600 to-amber-500",
    accentClass: "text-amber-600",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
  },
  reservation_tracking: {
    label: "Reservation Tracking",
    description: "Track your booking status and updates in real-time",
    icon: "📋",
    gradient: "from-emerald-600 to-emerald-500",
    accentClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
  },
  geoadmin_reports: {
    label: "Market Reports",
    description: "Exclusive market study digests and intelligence reports",
    icon: "📊",
    gradient: "from-purple-600 to-purple-500",
    accentClass: "text-purple-600",
    bgClass: "bg-purple-50",
    borderClass: "border-purple-200",
  },
  platform_updates: {
    label: "Platform Updates",
    description: "Stay informed about new features and improvements",
    icon: "🚀",
    gradient: "from-cyan-600 to-cyan-500",
    accentClass: "text-cyan-600",
    bgClass: "bg-cyan-50",
    borderClass: "border-cyan-200",
  },
};

const FREQUENCY_LABELS: Record<
  Frequency,
  { label: string; icon: React.ReactNode }
> = {
  instant: { label: "Instant", icon: <Zap className="w-3.5 h-3.5" /> },
  daily_digest: {
    label: "Daily Digest",
    icon: <Mail className="w-3.5 h-3.5" />,
  },
  weekly_digest: {
    label: "Weekly Digest",
    icon: <Mail className="w-3.5 h-3.5" />,
  },
};

// ─── COMPONENT ──────────────────────────────────────────────────────────────────

interface EmailSubscribeCTAProps {
  channelType: SubscriptionType;
  userId: number | string | null | undefined;
  onAuthRequired?: () => void;
  compact?: boolean;
  className?: string;
}

export default function EmailSubscribeCTA({
  channelType,
  userId,
  onAuthRequired,
  compact = false,
  className = "",
}: EmailSubscribeCTAProps) {
  const {
    isSubscribed,
    getSubscription,
    canAccess,
    subscribe,
    update,
    unsubscribe,
    isSubscribing,
    isUpdating,
    tierAccess,
  } = useEmailSubscriptions(userId);

  const [showFrequency, setShowFrequency] = useState(false);
  const config = CHANNEL_CONFIG[channelType];
  const numericUserId = userId ? Number(userId) : null;
  const subscribed = isSubscribed(channelType);
  const currentSub = getSubscription(channelType);
  const hasAccess = canAccess(channelType);
  const allowedFrequencies = tierAccess?.allowedFrequencies || [
    "daily_digest",
    "weekly_digest",
  ];

  // ── HANDLERS ──────────────────────────────────────────────────────────

  const handleSubscribe = () => {
    if (!numericUserId) {
      onAuthRequired?.();
      return;
    }
    if (!hasAccess) return;

    subscribe({
      userId: numericUserId,
      type: channelType,
      frequency: allowedFrequencies.includes("daily_digest")
        ? "daily_digest"
        : allowedFrequencies[0],
    });
  };

  const handleUnsubscribe = () => {
    if (!numericUserId || !currentSub) return;
    unsubscribe({ id: currentSub.id, userId: numericUserId });
  };

  const handleFrequencyChange = (freq: Frequency) => {
    if (!numericUserId || !currentSub) return;
    update({ id: currentSub.id, userId: numericUserId, frequency: freq });
    setShowFrequency(false);
  };

  const handleToggle = () => {
    if (!numericUserId || !currentSub) return;
    update({
      id: currentSub.id,
      userId: numericUserId,
      isActive: !currentSub.isActive,
    });
  };

  // ── RENDER: COMPACT VARIANT ───────────────────────────────────────────

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg ${config.bgClass} ${config.borderClass} border ${className}`}
      >
        <span className="text-xl">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${config.accentClass}`}>
            {config.label}
          </p>
          <p className="text-xs text-gray-500 truncate">{config.description}</p>
        </div>
        {subscribed ? (
          <button
            onClick={handleToggle}
            disabled={isUpdating}
            className={`p-2 rounded-full transition-colors ${
              currentSub?.isActive
                ? `${config.bgClass} ${config.accentClass}`
                : "bg-gray-100 text-gray-400"
            }`}
            title={
              currentSub?.isActive
                ? "Pause notifications"
                : "Resume notifications"
            }
          >
            {currentSub?.isActive ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </button>
        ) : !hasAccess ? (
          <span className="p-2 text-gray-400" title="Upgrade to unlock">
            <Lock className="w-4 h-4" />
          </span>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={isSubscribing}
            className={`px-3 py-1.5 text-xs font-semibold text-white rounded-full bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-opacity`}
          >
            {isSubscribing ? "..." : "Subscribe"}
          </button>
        )}
      </div>
    );
  }

  // ── RENDER: FULL CARD VARIANT ─────────────────────────────────────────

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${config.borderClass} ${config.bgClass} ${className}`}
    >
      {/* Header stripe */}
      <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-2xl shadow-sm flex-shrink-0`}
          >
            {config.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900">{config.label}</h3>
              {subscribed && currentSub?.isActive && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
                  <Check className="w-3 h-3" /> Active
                </span>
              )}
              {subscribed && !currentSub?.isActive && (
                <span className="px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                  Paused
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">{config.description}</p>

            {/* Frequency selector (when subscribed) */}
            {subscribed && currentSub && (
              <div className="relative mt-3">
                <button
                  onClick={() => setShowFrequency(!showFrequency)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  {FREQUENCY_LABELS[currentSub.frequency as Frequency]?.icon}
                  {FREQUENCY_LABELS[currentSub.frequency as Frequency]?.label ||
                    currentSub.frequency}
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${showFrequency ? "rotate-180" : ""}`}
                  />
                </button>

                {showFrequency && (
                  <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                    {allowedFrequencies.map((freq) => (
                      <button
                        key={freq}
                        onClick={() => handleFrequencyChange(freq)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                          currentSub.frequency === freq
                            ? `font-semibold ${config.accentClass}`
                            : "text-gray-600"
                        }`}
                      >
                        {FREQUENCY_LABELS[freq]?.icon}
                        {FREQUENCY_LABELS[freq]?.label}
                        {currentSub.frequency === freq && (
                          <Check className="w-3 h-3 ml-auto" />
                        )}
                      </button>
                    ))}
                    {!allowedFrequencies.includes("instant") && (
                      <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Instant: Verified tier+
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="flex-shrink-0">
            {subscribed ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggle}
                  disabled={isUpdating}
                  className={`p-2.5 rounded-xl transition-all ${
                    currentSub?.isActive
                      ? `${config.bgClass} ${config.accentClass} hover:bg-white`
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}
                  title={currentSub?.isActive ? "Pause" : "Resume"}
                >
                  {currentSub?.isActive ? (
                    <Bell className="w-5 h-5" />
                  ) : (
                    <BellOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            ) : !hasAccess ? (
              <div className="flex flex-col items-center gap-1">
                <Lock className="w-5 h-5 text-gray-400" />
                <span className="text-[10px] text-gray-400 font-medium">
                  Upgrade
                </span>
              </div>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-all shadow-sm hover:shadow-md active:scale-95`}
              >
                <Bell className="w-4 h-4" />
                {isSubscribing ? "Subscribing..." : "Subscribe"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
