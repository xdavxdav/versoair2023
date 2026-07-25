import React from "react";
import { Link } from "wouter";

interface SettingsTabProps {
  dbConnected: boolean | null;
}

export default function SettingsTab({ dbConnected }: SettingsTabProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 space-y-4">
      <h2 className="text-slate-100 font-medium">Settings & Operations</h2>
      <p className="text-sm text-slate-400">
        This section links to existing admin tools to preserve current behavior.
      </p>
      <div className="text-sm text-slate-300">
        Database:{" "}
        <span className={dbConnected ? "text-emerald-300" : "text-red-300"}>
          {dbConnected === null ? "Checking..." : dbConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/database" className="text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800">
          Database Center
        </Link>
        <Link href="/admin/verification" className="text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800">
          Verification
        </Link>
        <Link href="/admin/tickets" className="text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800">
          Ticket Management
        </Link>
      </div>
    </div>
  );
}
