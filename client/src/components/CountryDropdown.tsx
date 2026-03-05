/**
 * CountryDropdown — styled country selector for the top banner.
 * Trigger shows flag + country name. Opens a rich searchable dropdown
 * with full-page backdrop overlay.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, Globe, Check, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCountry } from "@/contexts/CountryContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/** Strip accents/diacritics for search: é→e, ô→o, ï→i etc. */
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const FLAGS: Record<string, string> = {
  // Americas
  US: "🇺🇸",
  CA: "🇨🇦",
  MX: "🇲🇽",
  BR: "🇧🇷",
  HT: "🇭🇹",
  // Europe
  FR: "🇫🇷",
  DE: "🇩🇪",
  GB: "🇬🇧",
  BE: "🇧🇪",
  CH: "🇨🇭",
  ES: "🇪🇸",
  IT: "🇮🇹",
  PT: "🇵🇹",
  // Africa
  CI: "🇨🇮",
  SN: "🇸🇳",
  CM: "🇨🇲",
  ML: "🇲🇱",
  BF: "🇧🇫",
  GN: "🇬🇳",
  TG: "🇹🇬",
  BJ: "🇧🇯",
  NE: "🇳🇪",
  MG: "🇲🇬",
  CD: "🇨🇩",
  CG: "🇨🇬",
  GA: "🇬🇦",
  MA: "🇲🇦",
  DZ: "🇩🇿",
  TN: "🇹🇳",
  ZA: "🇿🇦",
  NG: "🇳🇬",
  // Asia / Middle East
  JP: "🇯🇵",
  CN: "🇨🇳",
  IN: "🇮🇳",
  AE: "🇦🇪",
};

const DISPLAY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  MX: "Mexico",
  BR: "Brazil",
  HT: "Haïti",
  FR: "France",
  DE: "Germany",
  GB: "United Kingdom",
  BE: "Belgium",
  CH: "Switzerland",
  ES: "Spain",
  IT: "Italy",
  PT: "Portugal",
  CI: "Côte d'Ivoire",
  SN: "Sénégal",
  CM: "Cameroun",
  ML: "Mali",
  BF: "Burkina Faso",
  GN: "Guinée",
  TG: "Togo",
  BJ: "Bénin",
  NE: "Niger",
  MG: "Madagascar",
  CD: "Congo (RDC)",
  CG: "Congo (Brazzaville)",
  GA: "Gabon",
  MA: "Maroc",
  DZ: "Algérie",
  TN: "Tunisie",
  ZA: "South Africa",
  NG: "Nigeria",
  JP: "Japan",
  CN: "China",
  IN: "India",
  AE: "United Arab Emirates",
};

// Per-country accent for the active highlight bar
const ACCENT: Record<string, string> = {
  US: "border-l-indigo-500 bg-indigo-50/60",
  CA: "border-l-red-500 bg-red-50/60",
  FR: "border-l-blue-500 bg-blue-50/60",
  CI: "border-l-orange-500 bg-orange-50/60",
  SN: "border-l-green-600 bg-green-50/60",
  CM: "border-l-green-500 bg-green-50/60",
  DE: "border-l-yellow-500 bg-yellow-50/60",
  GB: "border-l-sky-600 bg-sky-50/60",
  BE: "border-l-yellow-600 bg-yellow-50/60",
  CH: "border-l-red-600 bg-red-50/60",
  ES: "border-l-red-500 bg-red-50/60",
  IT: "border-l-emerald-600 bg-emerald-50/60",
  PT: "border-l-green-700 bg-green-50/60",
  ML: "border-l-green-500 bg-green-50/60",
  BF: "border-l-red-600 bg-red-50/60",
  GN: "border-l-yellow-500 bg-yellow-50/60",
  TG: "border-l-green-600 bg-green-50/60",
  BJ: "border-l-green-500 bg-green-50/60",
  NE: "border-l-orange-600 bg-orange-50/60",
  MG: "border-l-red-500 bg-red-50/60",
  CD: "border-l-sky-500 bg-sky-50/60",
  CG: "border-l-green-600 bg-green-50/60",
  GA: "border-l-green-500 bg-green-50/60",
  MA: "border-l-red-700 bg-red-50/60",
  DZ: "border-l-green-600 bg-green-50/60",
  TN: "border-l-red-500 bg-red-50/60",
  ZA: "border-l-emerald-500 bg-emerald-50/60",
  NG: "border-l-green-700 bg-green-50/60",
  MX: "border-l-green-600 bg-green-50/60",
  BR: "border-l-yellow-500 bg-yellow-50/60",
  HT: "border-l-blue-700 bg-blue-50/60",
  JP: "border-l-red-500 bg-red-50/60",
  CN: "border-l-red-600 bg-red-50/60",
  IN: "border-l-orange-500 bg-orange-50/60",
  AE: "border-l-green-500 bg-green-50/60",
};

interface Country {
  id: number;
  code: string;
  name: string;
}

export function CountryDropdown() {
  const { selectedCountry, setSelectedCountry } = useCountry();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["countries-list"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/countries`);
      if (!res.ok) return [];
      const json = await res.json();
      // API may return bare array or { data: [...] }
      return Array.isArray(json) ? json : json.data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else {
      setSearch("");
    }
  }, [open]);

  const allOptions = countries.map((c) => {
    const code = c.code.trim().toUpperCase();
    return {
      code,
      name: DISPLAY_NAMES[code] ?? c.name,
      flag: FLAGS[code] ?? "🏳️",
    };
  });

  const filtered = search.trim()
    ? allOptions.filter((c) => {
        const q = normalize(search);
        return (
          normalize(c.name).includes(q) || c.code.toLowerCase().includes(q)
        );
      })
    : allOptions;

  const current =
    allOptions.find((c) => c.code === selectedCountry) ?? allOptions[0];

  const select = useCallback(
    (code: string) => {
      setSelectedCountry(code);
      setOpen(false);
    },
    [setSelectedCountry],
  );

  // Countries haven't loaded yet — render nothing until ready
  if (!current) return null;

  return (
    <>
      {/* ── Full-page backdrop overlay ── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[999998] transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className="relative flex items-center"
        style={{ zIndex: open ? 999999 : "auto" }}
      >
        {/* ── Trigger ── */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="group flex items-center gap-1.5 pl-1.5 pr-2 py-[3px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 transition-all text-white border border-white/20 hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          title="Select country"
          aria-haspopup="true"
          aria-expanded={open}
        >
          <span className="text-sm leading-none">{current.flag}</span>
          <span className="text-[10px] sm:text-[11px] font-semibold max-w-[4.5rem] sm:max-w-[6rem] truncate">
            {current.name}
          </span>
          <ChevronDown
            className={`h-2.5 w-2.5 opacity-70 group-hover:opacity-100 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* ── Dropdown ── */}
        {open && (
          <div className="absolute top-full right-0 sm:left-0 sm:right-auto mt-2 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.22)] border border-gray-200/80 z-[999999] w-64 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Globe className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold tracking-wide">
                  Select Country
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
                <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  aria-label="Search country"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 text-xs text-gray-700 placeholder-gray-400 bg-transparent outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Clear"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.map((c) => {
                const isActive = selectedCountry === c.code;
                const accent = c.code
                  ? (ACCENT[c.code] ?? "border-l-gray-400 bg-gray-50/60")
                  : "";
                return (
                  <button
                    key={c.code}
                    onClick={() => select(c.code)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 border-l-[3px] ${
                      isActive
                        ? `${accent || "border-l-amber-500 bg-amber-50/60"} font-semibold`
                        : "border-l-transparent hover:bg-gray-50 hover:border-l-gray-200"
                    }`}
                  >
                    <span className="text-lg leading-none w-6 text-center shrink-0">
                      {c.flag}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-[13px] truncate ${isActive ? "text-gray-900" : "text-gray-700"}`}
                      >
                        {c.name}
                      </span>
                      {c.code && (
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                          {c.code}
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <Check className="ml-auto h-4 w-4 text-amber-500 shrink-0" />
                    )}
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center py-6 px-4">
                  <Search className="h-5 w-5 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">
                    No countries matching &ldquo;{search}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
