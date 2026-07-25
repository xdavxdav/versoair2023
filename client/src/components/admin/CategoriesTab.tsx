import React, { useEffect, useState } from "react";

type CategoryData = { id: number; name: string };

export default function CategoriesTab() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/business/categories");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const rows = Array.isArray(json.categoryData) ? json.categoryData : [];
        setCategories(
          rows
            .map((r: any) => ({ id: Number(r.id), name: String(r.name || "") }))
            .filter((r: CategoryData) => Number.isFinite(r.id) && r.name),
        );
      } catch (e: any) {
        setError(e?.message || "Failed to load categories");
      }
    };
    load();
  }, []);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
      <h2 className="text-slate-100 font-medium mb-4">Categories</h2>
      {error && <p className="text-sm text-red-300 mb-3">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {categories.slice(0, 60).map((c) => (
          <div key={c.id} className="text-sm text-slate-300 bg-slate-900/40 rounded px-3 py-2">
            {c.name}
          </div>
        ))}
      </div>
    </div>
  );
}
