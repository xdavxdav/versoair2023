import React, { useEffect, useState } from "react";
import { Link } from "wouter";

type Business = {
  id: number | string;
  name?: string;
  category_name?: string;
  country_code?: string;
};

export default function BusinessesTab() {
  const [rows, setRows] = useState<Business[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/businesses?limit=30&page=1&sortBy=created_at&order=DESC");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setRows(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        setError(e?.message || "Failed to load businesses");
      }
    };
    load();
  }, []);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
      <h2 className="text-slate-100 font-medium mb-4">Recent Businesses</h2>
      {error && <p className="text-sm text-red-300 mb-3">{error}</p>}
      <div className="space-y-2">
        {rows.map((b) => (
          <div
            key={b.id}
            className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm text-slate-200 truncate">{b.name || `Business #${b.id}`}</p>
              <p className="text-xs text-slate-400">
                {b.category_name || "General"} {b.country_code ? `• ${String(b.country_code).toUpperCase()}` : ""}
              </p>
            </div>
            <Link href={`/business/${b.id}`} className="text-xs text-sky-300 hover:text-sky-200">
              Open
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
