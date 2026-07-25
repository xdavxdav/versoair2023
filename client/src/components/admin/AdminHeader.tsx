import React from "react";
import { Menu, RefreshCw } from "lucide-react";

interface AdminHeaderProps {
  toggleSidebar: () => void;
  dbConnected: boolean | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function AdminHeader({
  toggleSidebar,
  dbConnected,
  onRefresh,
  isRefreshing,
}: AdminHeaderProps) {
  return (
    <header className="h-16 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between bg-[#0B0F19]/95 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="hidden md:inline-flex p-2 rounded-lg hover:bg-slate-800 text-slate-300"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-slate-100 font-semibold">Admin Portal</h1>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`text-xs px-2 py-1 rounded-full border ${
            dbConnected === null
              ? "text-slate-300 border-slate-600"
              : dbConnected
                ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"
                : "text-red-300 border-red-500/40 bg-red-500/10"
          }`}
        >
          {dbConnected === null
            ? "DB: Checking..."
            : dbConnected
              ? "DB: Connected"
              : "DB: Disconnected"}
        </span>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </header>
  );
}
