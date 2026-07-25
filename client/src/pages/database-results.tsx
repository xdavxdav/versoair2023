import { BarChart3, Database, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import { useEffect, useMemo, useState } from "react";

type ApiBusinessRow = {
  id: number | string;
  name?: string;
  category_id?: number;
  category_name?: string;
  country_code?: string;
  reviews?: number | string;
  updated_at?: string;
};

type CategoryOption = {
  id: number;
  name: string;
};

const PAGE_SIZE = 24;
const SCROLL_STORAGE_KEY = "scroll:database-results";
const API_BASE_URL = "";

export default function DatabaseResults() {
  const initialCountryCode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("countryCode") || "all").toUpperCase();
  }, []);

  const [filters, setFilters] = useState({
    category: "all",
    sort: "created_at",
    countryCode: initialCountryCode || "all",
  });
  const [results, setResults] = useState<ApiBusinessRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    const savedY = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (!savedY) return;
    const y = Number(savedY);
    if (!Number.isFinite(y)) return;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, []);

  useEffect(() => {
    const saveScroll = () => {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY));
    };
    window.addEventListener("scroll", saveScroll, { passive: true });
    return () => {
      saveScroll();
      window.removeEventListener("scroll", saveScroll);
    };
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/business/categories`);
        if (!res.ok) throw new Error(`Categories HTTP ${res.status}`);
        const json = await res.json();
        const data = Array.isArray(json.categoryData) ? json.categoryData : [];
        const normalized = data
          .map((cat: any) => ({
            id: Number(cat.id),
            name: String(cat.name || ""),
          }))
          .filter((cat: CategoryOption) => Number.isFinite(cat.id) && cat.name);
        setCategories(normalized);
      } catch {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        params.set("sortBy", filters.sort);
        params.set("order", "DESC");
        if (filters.category !== "all") params.set("categoryId", filters.category);
        if (filters.countryCode !== "all")
          params.set("countryCode", filters.countryCode);

        const res = await fetch(`${API_BASE_URL}/api/businesses?${params}`);
        if (!res.ok) throw new Error(`Businesses HTTP ${res.status}`);
        const json = await res.json();
        const rows = Array.isArray(json.data) ? json.data : [];
        setResults(rows);
        setTotalCount(Number(json.pagination?.total) || rows.length);
      } catch (err: any) {
        setResults([]);
        setTotalCount(0);
        setLoadError(err?.message || "Failed to load database results");
      } finally {
        setIsLoading(false);
      }
    };
    fetchResults();
  }, [filters.category, filters.countryCode, filters.sort, page]);

  const availableCountries = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of results) {
      const code = String(row.country_code || "").toUpperCase();
      if (!code) continue;
      map.set(code, code);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [results]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="relative pt-20 pb-16 px-4 bg-gradient-to-b from-slate-800/50 to-transparent">
        <div className="max-w-[95vw] mx-auto">
          <h1 className="text-5xl font-bold text-white mb-3">Database Results</h1>
          <p className="text-slate-300">{totalCount} datasets found</p>
        </div>
      </div>

      <div className="max-w-[95vw] mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="md:w-64">
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 sticky top-20">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-white block mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) =>
                      setFilters({ ...filters, category: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-white block mb-2">
                    Country
                  </label>
                  <select
                    value={filters.countryCode}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        countryCode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Countries</option>
                    {availableCountries.map((countryCode) => (
                      <option key={countryCode} value={countryCode}>
                        {countryCode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-white block mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sort}
                    onChange={(e) =>
                      setFilters({ ...filters, sort: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="created_at">Newest</option>
                    <option value="rating">Highest Rated</option>
                    <option value="reviews">Most Reviewed</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setPage(1)}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1">
            {loadError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {loadError}
              </div>
            )}

            {isLoading ? (
              <div className="text-slate-300">Loading datasets...</div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-lg p-6 hover:border-emerald-500/50 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {result.name || `Business #${result.id}`}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-400">
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                            {result.category_name || "General"}
                          </span>
                          {result.country_code && (
                            <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                              {String(result.country_code).toUpperCase()}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Database className="h-4 w-4" />
                            {Number(result.reviews || 0).toLocaleString()} reviews
                          </span>
                          {result.updated_at && (
                            <span className="text-slate-500">
                              Updated{" "}
                              {new Date(result.updated_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link href={`/business/${result.id}`}>
                      <Button
                        variant="outline"
                        className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        View Details →
                      </Button>
                    </Link>
                  </div>
                ))}

                {results.length === 0 && !loadError && (
                  <div className="text-slate-300">
                    No datasets matched these filters.
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="border-slate-600 text-slate-300 bg-transparent hover:bg-white/10 hover:text-white"
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => {
                  const pageNumber = Math.min(
                    totalPages,
                    Math.max(1, page - 2 + idx),
                  );
                  return (
                    <Button
                      key={`${pageNumber}-${idx}`}
                      variant={pageNumber === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNumber)}
                      className={
                        pageNumber === page
                          ? "bg-emerald-600"
                          : "border-slate-600 text-slate-300 bg-transparent hover:bg-white/10 hover:text-white"
                      }
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border-slate-600 text-slate-300 bg-transparent hover:bg-white/10 hover:text-white"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[95vw] mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 p-8 md:p-12 rounded-xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Ready to Analyze?
          </h2>
          <p className="text-slate-300 mb-8">
            Create custom dashboards and unlock insights from these datasets
          </p>
          <Link href="/dashboard">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              Start Analyzing
            </Button>
          </Link>
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
