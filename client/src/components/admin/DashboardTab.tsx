import React from "react";
import { BarChart3, Building2, Music2, Tags } from "lucide-react";

interface DashboardTabProps {
  stats: {
    categories: string;
    businesses: string;
    artists: string;
    active: string;
  };
  setActiveTab: (tab: "categories" | "businesses" | "artists" | "activity") => void;
  dbConnected: boolean | null;
}

export default function DashboardTab({
  stats,
  setActiveTab,
  dbConnected,
}: DashboardTabProps) {
  const cards = [
    {
      key: "categories",
      label: "Categories",
      value: stats.categories,
      icon: <Tags className="h-5 w-5 text-sky-300" />,
    },
    {
      key: "businesses",
      label: "Businesses",
      value: stats.businesses,
      icon: <Building2 className="h-5 w-5 text-violet-300" />,
    },
    {
      key: "artists",
      label: "Artists",
      value: stats.artists,
      icon: <Music2 className="h-5 w-5 text-emerald-300" />,
    },
    {
      key: "activity",
      label: "Active Listings",
      value: stats.active,
      icon: <BarChart3 className="h-5 w-5 text-amber-300" />,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <button
            key={card.key}
            onClick={() => setActiveTab(card.key)}
            className="text-left rounded-xl border border-slate-800 bg-[#101827] p-5 hover:border-sky-500/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-400">{card.label}</span>
              {card.icon}
            </div>
            <div className="text-2xl font-semibold text-slate-100">{card.value}</div>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
        <h2 className="text-slate-100 font-medium mb-2">System health</h2>
        <p className="text-sm text-slate-400">
          Database status:{" "}
          <span className={dbConnected ? "text-emerald-300" : "text-red-300"}>
            {dbConnected === null
              ? "Checking..."
              : dbConnected
                ? "Connected"
                : "Disconnected"}
          </span>
        </p>
      </div>
    </div>
  );
}
