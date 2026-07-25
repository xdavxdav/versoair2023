import React from "react";

export default function ActivityTab() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 space-y-3">
      <h2 className="text-slate-100 font-medium">Recent Activity</h2>
      <p className="text-sm text-slate-400">
        Centralized activity stream can be connected later to audit/event endpoints.
      </p>
      <div className="text-sm text-slate-300 bg-slate-900/40 rounded-lg px-3 py-2">
        No unified activity feed configured yet in this lightweight portal.
      </div>
    </div>
  );
}
