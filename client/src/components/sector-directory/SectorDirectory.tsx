import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Car,
  ChevronDown,
  Check,
  HardHat,
  Heart,
  Hotel,
  Landmark,
  MapPin,
  Moon,
  PartyPopper,
  PhoneCall,
  Search,
  SlidersHorizontal,
  Star,
  Store,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import { searchBusinesses, type Business } from "@/lib/business-data";
import { useCountry } from "@/contexts/CountryContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  SECTOR_CONFIGS,
  type SectorIconName,
  type SectorKey,
} from "./sector-configs";
import "./sector-directory.css";

const ICONS: Record<SectorIconName, LucideIcon> = {
  store: Store,
  hotel: Hotel,
  hardhat: HardHat,
  heart: Heart,
  landmark: Landmark,
  car: Car,
  party: PartyPopper,
};

const VALUE_ICONS: LucideIcon[] = [BadgeCheck, PhoneCall, MapPin];
const FONT_LINK_ID = "sd-fonts";
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Fredoka:wght@500;600;700&family=Nunito:wght@500;600;700&display=swap";

type SortKey = "rating" | "name" | "newest";

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function cityOf(biz: Business): string {
  return (biz.cityName || biz.location || "").trim();
}

function monogram(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "");
  return letters.join("") || "•";
}

export default function SectorDirectory({ sector }: { sector: SectorKey }) {
  const config = SECTOR_CONFIGS[sector];
  const Icon = ICONS[config.icon];
  const { selectedCountry } = useCountry();
  const { resolvedTheme, setTheme } = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [sort, setSort] = useState<SortKey>("rating");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const debouncedQ = useDebounced(q.trim());
  const debouncedLoc = useDebounced(loc.trim());

  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  const hasTextSearch = Boolean(debouncedQ || debouncedLoc);

  const baseQuery = useQuery({
    queryKey: ["sector-directory", config.sectorSlug, selectedCountry || ""],
    queryFn: () =>
      searchBusinesses({
        sectorSlug: config.sectorSlug,
        countryCode: selectedCountry || undefined,
        limit: 100,
      }),
    staleTime: 60_000,
  });

  const searchQuery = useQuery({
    queryKey: [
      "sector-directory",
      config.sectorSlug,
      selectedCountry || "",
      debouncedQ,
      debouncedLoc,
    ],
    queryFn: () =>
      searchBusinesses({
        sectorSlug: config.sectorSlug,
        query: debouncedQ || undefined,
        location: debouncedLoc || undefined,
        countryCode: selectedCountry || undefined,
        limit: 100,
      }),
    enabled: hasTextSearch,
    staleTime: 60_000,
  });

  const all = useMemo(() => baseQuery.data ?? [], [baseQuery.data]);
  const matches = useMemo(
    () => (hasTextSearch ? (searchQuery.data ?? []) : all),
    [hasTextSearch, searchQuery.data, all],
  );
  const isLoading = hasTextSearch ? searchQuery.isLoading : baseQuery.isLoading;

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const biz of all) {
      if (biz.category) {
        counts.set(biz.category, (counts.get(biz.category) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [all]);

  const results = useMemo(() => {
    const filtered = matches.filter(
      (biz) =>
        (!category || biz.category === category) &&
        (!verifiedOnly || biz.is_verified),
    );
    return filtered.sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title);
      if (sort === "newest") {
        return (
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
        );
      }
      return (b.rating ?? 0) - (a.rating ?? 0) || a.title.localeCompare(b.title);
    });
  }, [matches, category, verifiedOnly, sort]);

  const stats = useMemo(
    () => ({
      verified: all.filter((biz) => biz.is_verified).length,
      cities: new Set(all.map(cityOf).filter(Boolean)).size,
    }),
    [all],
  );

  const activeFilterCount = (category ? 1 : 0) + (verifiedOnly ? 1 : 0);
  const hasCriteria = Boolean(q || loc || activeFilterCount);

  const resetAll = () => {
    setQ("");
    setLoc("");
    setCategory("");
    setVerifiedOnly(false);
  };

  const focusSearch = () => {
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    searchRef.current?.focus();
  };

  const isDark = resolvedTheme === "dark";

  return (
    <div
      className="sd-root"
      data-tone={config.tone}
      data-sector={sector}
      style={
        {
          "--sd-accent": config.accent,
          "--sd-accent-dark": config.accentDark,
        } as React.CSSProperties
      }
    >
      <main>
        <section className="sd-shell sd-hero">
          <div className="sd-heroTop">
            <span className="sd-eyebrow">
              <Icon aria-hidden="true" />
              {config.eyebrow}
            </span>
            <button
              type="button"
              className="sd-iconbtn"
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>
          </div>
          <h1 className="sd-title">{config.title}</h1>
          <p className="sd-sub">{config.subtitle}</p>
          <div className="sd-actions">
            <button
              type="button"
              className="sd-btn sd-btn-primary"
              onClick={focusSearch}
            >
              <Search aria-hidden="true" />
              Search the directory
            </button>
            <Link href="/business" className="sd-btn">
              Browse all sectors
            </Link>
          </div>

          <div className="sd-stats" aria-label="Directory at a glance">
            <div className="sd-stat">
              <span className="k">Listings</span>
              <span className="v">{all.length}</span>
              <span className="n">in this sector</span>
            </div>
            <div className="sd-stat">
              <span className="k">Categories</span>
              <span className="v">{categories.length}</span>
              <span className="n">{config.categoryNoun}</span>
            </div>
            <div className="sd-stat">
              <span className="k">Verified</span>
              <span className="v">{stats.verified}</span>
              <span className="n">checked by Verso Air</span>
            </div>
            <div className="sd-stat">
              <span className="k">Cities</span>
              <span className="v">{stats.cities}</span>
              <span className="n">across Canada</span>
            </div>
          </div>
        </section>

        <div className="sd-toolbar" id="directory">
          <div className="sd-shell">
            <div className="sd-row">
              <div className="sd-field wide">
                <Search className="fi" aria-hidden="true" />
                <label htmlFor={`sd-q-${sector}`} className="sd-sr">
                  Search businesses
                </label>
                <input
                  id={`sd-q-${sector}`}
                  ref={searchRef}
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={config.searchPlaceholder}
                  autoComplete="off"
                />
                {q && (
                  <button
                    type="button"
                    className="sd-clear"
                    aria-label="Clear search"
                    onClick={() => setQ("")}
                  >
                    <X aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="sd-field">
                <MapPin className="fi" aria-hidden="true" />
                <label htmlFor={`sd-loc-${sector}`} className="sd-sr">
                  Filter by city
                </label>
                <input
                  id={`sd-loc-${sector}`}
                  type="search"
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                  placeholder="City or region…"
                  autoComplete="off"
                />
                {loc && (
                  <button
                    type="button"
                    className="sd-clear"
                    aria-label="Clear location"
                    onClick={() => setLoc("")}
                  >
                    <X aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="sd-select">
                <label htmlFor={`sd-sort-${sector}`} className="sd-sr">
                  Sort results
                </label>
                <select
                  id={`sd-sort-${sector}`}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="rating">Best rating</option>
                  <option value="name">Name A–Z</option>
                  <option value="newest">Recently added</option>
                </select>
                <ChevronDown aria-hidden="true" />
              </div>
              <button
                type="button"
                className="sd-tbbtn"
                aria-expanded={filtersOpen}
                aria-controls={`sd-filters-${sector}`}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <SlidersHorizontal aria-hidden="true" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="sd-badge">{activeFilterCount}</span>
                )}
              </button>
            </div>

            {filtersOpen && (
              <div className="sd-filters" id={`sd-filters-${sector}`}>
                <div className="sd-fgroup">
                  <span className="sd-flabel">Category</span>
                  {categories.length === 0 && (
                    <span className="sd-count">No categories yet</span>
                  )}
                  {categories.map(([name, count]) => (
                    <button
                      key={name}
                      type="button"
                      className="sd-chip"
                      aria-pressed={category === name}
                      onClick={() => setCategory(category === name ? "" : name)}
                    >
                      {name} <span className="cnt">{count}</span>
                    </button>
                  ))}
                </div>
                <div className="sd-fgroup">
                  <span className="sd-flabel">Refine</span>
                  <button
                    type="button"
                    className="sd-chip"
                    aria-pressed={verifiedOnly}
                    onClick={() => setVerifiedOnly((value) => !value)}
                  >
                    <Check size={12} aria-hidden="true" />
                    Verified only
                  </button>
                  {hasCriteria && (
                    <button type="button" className="sd-chip" onClick={resetAll}>
                      Reset all
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <section className="sd-shell" aria-live="polite">
          <div className="sd-resbar">
            <p className="sd-count">
              <b>{results.length}</b>{" "}
              {results.length === 1 ? "listing" : "listings"}
              {hasCriteria ? " match your search" : ""}
            </p>
          </div>

          {isLoading ? (
            <div className="sd-grid" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="sd-skel" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-emptyIco">
                <Icon aria-hidden="true" />
              </div>
              <h2>{hasCriteria ? "No matches found" : config.emptyTitle}</h2>
              <p>
                {hasCriteria
                  ? "Nothing fits those filters. Try a broader search or reset them."
                  : config.emptyText}
              </p>
              <div className="sd-emptyActions">
                {hasCriteria && (
                  <button
                    type="button"
                    className="sd-btn sd-btn-primary"
                    onClick={resetAll}
                  >
                    Reset filters
                  </button>
                )}
                <Link href="/business" className="sd-btn">
                  Browse all sectors
                </Link>
              </div>
            </div>
          ) : (
            <div className={`sd-grid${results.length === 1 ? " single" : ""}`}>
              {results.map((biz) => (
                <article key={biz.id} className="sd-card">
                  <div className="sd-top">
                    <div className="sd-mono" aria-hidden="true">
                      {biz.imageUrl ? (
                        <img src={biz.imageUrl} alt="" loading="lazy" />
                      ) : (
                        monogram(biz.title)
                      )}
                    </div>
                    <div className="sd-id">
                      <h3 className="sd-name">
                        {biz.title}
                        {biz.is_verified && (
                          <span className="sd-vf" title="Verified by Verso Air">
                            <Check aria-label="Verified" />
                          </span>
                        )}
                      </h3>
                      <div className="sd-meta">
                        {biz.category && <span>{biz.category}</span>}
                        {biz.category && cityOf(biz) && <span>·</span>}
                        {cityOf(biz) && <span>{cityOf(biz)}</span>}
                      </div>
                    </div>
                  </div>
                  {biz.description && <p className="sd-desc">{biz.description}</p>}
                  {biz.tags && biz.tags.length > 0 && (
                    <div className="sd-tags">
                      {biz.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="sd-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="sd-foot">
                    <span className="sd-rating">
                      {biz.rating ? (
                        <>
                          <Star aria-hidden="true" />
                          {biz.rating.toFixed(1)}
                        </>
                      ) : (
                        <span className="none">No ratings yet</span>
                      )}
                    </span>
                    <Link href={`/business/${biz.id}`} className="sd-link">
                      View profile <ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="sd-shell sd-band">
          <h2>Why use Verso Air</h2>
          <div className="sd-bandGrid">
            {config.values.map((value, index) => {
              const ValueIcon = VALUE_ICONS[index % VALUE_ICONS.length];
              return (
                <div key={value.title} className="sd-vcard">
                  <div className="sd-vico">
                    <ValueIcon aria-hidden="true" />
                  </div>
                  <h3>{value.title}</h3>
                  <p>{value.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
