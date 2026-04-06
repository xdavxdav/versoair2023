"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Upload,
  Search,
  Shield,
} from "lucide-react";

interface ScrapedBusiness {
  name: string;
  phone: string;
  address: string;
  city: string;
  category: string;
  website: string;
  description: string;
  source: string;
  sourceUrl: string;
}

export default function ImportBusinessPage() {
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [scrapedResults, setScrapedResults] = useState<ScrapedBusiness[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  const handleScan = async () => {
    if (!url.trim()) return;
    setIsScanning(true);
    setError("");
    setScrapedResults([]);
    setImportResult(null);

    try {
      const response = await fetch("/api/migrate/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();
      if (data.success && data.businesses?.length > 0) {
        setScrapedResults(data.businesses);
        setSelectedIds(new Set(data.businesses.map((_: any, i: number) => i)));
      } else {
        setError(
          data.error ||
            `No businesses found at this URL. (Source: ${data.source})`,
        );
      }
    } catch (err: any) {
      setError("Scan failed: " + (err.message || "Network error"));
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleImport = async () => {
    const selected = scrapedResults.filter((_, i) => selectedIds.has(i));
    if (selected.length === 0) return;

    setIsImporting(true);
    setError("");

    try {
      const response = await fetch("/api/migrate/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ businesses: selected }),
      });

      const data = await response.json();
      if (data.success) {
        setImportResult({
          imported: data.imported,
          skipped: data.skipped,
        });
        setScrapedResults([]);
        setSelectedIds(new Set());
      } else {
        setError(data.error || "Import failed");
      }
    } catch (err: any) {
      setError("Import failed: " + (err.message || "Network error"));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Globe className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Market Raider</h1>
            <p className="text-slate-400">
              Import businesses from competitor directories
            </p>
          </div>
        </div>

        {/* URL Input */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="p-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Competitor directory URL
            </label>
            <div className="flex gap-3">
              <Input
                type="url"
                placeholder="https://www.yellowpages.ca/search/si/1/plumber/Toronto+ON"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500 flex-1"
              />
              <Button
                onClick={handleScan}
                disabled={isScanning || !url.trim()}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 px-6"
              >
                {isScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {isScanning ? "Scanning..." : "Scan"}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Supports: YellowPages, PagesJaunes, GoAfricaOnline, and most
              directories with Schema.org markup
            </p>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Import success */}
        {importResult && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-300 text-sm">
              Import complete: <strong>{importResult.imported}</strong> added,{" "}
              <strong>{importResult.skipped}</strong> duplicates skipped
            </p>
          </div>
        )}

        {/* Scraped Results */}
        {scrapedResults.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Found {scrapedResults.length} businesses
              </h2>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                  className="border-slate-600 text-slate-300"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Deselect All
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || selectedIds.size === 0}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Upload className="w-4 h-4 mr-1" />
                  )}
                  Import {selectedIds.size} Selected
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {scrapedResults.map((biz, idx) => (
                <Card
                  key={idx}
                  className={`border transition-colors cursor-pointer ${
                    selectedIds.has(idx)
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-slate-800/30 border-slate-700/50"
                  }`}
                  onClick={() => toggleSelect(idx)}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selectedIds.has(idx)
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-slate-500"
                      }`}
                    >
                      {selectedIds.has(idx) && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">
                          {biz.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-slate-600 text-slate-400"
                        >
                          {biz.source}
                        </Badge>
                      </div>
                      {biz.address && (
                        <p className="text-xs text-slate-400 truncate">
                          {biz.address}
                          {biz.city ? `, ${biz.city}` : ""}
                        </p>
                      )}
                      {biz.phone && (
                        <p className="text-xs text-slate-500">{biz.phone}</p>
                      )}
                      {biz.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {biz.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Info card */}
        {scrapedResults.length === 0 && !error && !importResult && (
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-300 mb-2">
                How Market Raider Works
              </h3>
              <ol className="text-sm text-slate-500 space-y-2 text-left max-w-md mx-auto">
                <li>
                  1. Paste a competitor directory URL (search results page)
                </li>
                <li>2. We extract business listings using Schema.org markup</li>
                <li>3. Review and select which businesses to import</li>
                <li>
                  4. Businesses are added to Verso Air with source attribution
                </li>
              </ol>
              <p className="text-xs text-slate-600 mt-4">
                Only public business information is extracted. Duplicates are
                automatically detected and skipped.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
