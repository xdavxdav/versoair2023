import { BarChart3, TrendingUp, Database, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import { useState } from "react";

export default function DatabaseResults() {
  const [filters, setFilters] = useState({
    category: "all",
    sort: "relevance",
  });

  const results = [
    {
      id: 1,
      name: "Commerce Analytics",
      category: "Retail",
      records: 2450,
      lastUpdated: "2 hours ago",
    },
    {
      id: 2,
      name: "Hospitality Trends",
      category: "Hotel & Resort",
      records: 1823,
      lastUpdated: "1 day ago",
    },
    {
      id: 3,
      name: "Construction Metrics",
      category: "Building",
      records: 892,
      lastUpdated: "3 days ago",
    },
    {
      id: 4,
      name: "Auto Sales Data",
      category: "Automobile",
      records: 3241,
      lastUpdated: "5 hours ago",
    },
    {
      id: 5,
      name: "Finance Reports",
      category: "Banking",
      records: 5123,
      lastUpdated: "1 hour ago",
    },
    {
      id: 6,
      name: "Entertainment Stats",
      category: "Leisure",
      records: 1456,
      lastUpdated: "2 days ago",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="relative pt-20 pb-16 px-4 bg-gradient-to-b from-slate-800/50 to-transparent">
        <div className="max-w-[95vw] mx-auto">
          <h1 className="text-5xl font-bold text-white mb-3">
            Database Results
          </h1>
          <p className="text-slate-300">{results.length} datasets found</p>
        </div>
      </div>

      {/* Filters and View */}
      <div className="max-w-[95vw] mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Filters */}
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
                    <option value="retail">Retail</option>
                    <option value="hotel">Hotel & Resort</option>
                    <option value="building">Building</option>
                    <option value="auto">Automobile</option>
                    <option value="finance">Finance</option>
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
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                    <option value="records">Most Records</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>

                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-lg p-6 hover:border-emerald-500/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {result.name}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                          {result.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Database className="h-4 w-4" />
                          {result.records.toLocaleString()} records
                        </span>
                        <span className="text-slate-500">
                          {result.lastUpdated}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    View Details →
                  </Button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 bg-transparent hover:bg-white/10 hover:text-white"
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((page) => (
                  <Button
                    key={page}
                    variant={page === 1 ? "default" : "outline"}
                    size="sm"
                    className={
                      page === 1
                        ? "bg-emerald-600"
                        : "border-slate-600 text-slate-300 bg-transparent hover:bg-white/10 hover:text-white"
                    }
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 bg-transparent hover:bg-white/10 hover:text-white"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
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
