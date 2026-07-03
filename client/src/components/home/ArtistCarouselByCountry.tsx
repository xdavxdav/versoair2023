import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Music, Play } from "lucide-react";
import { useMusicArtists } from "@/hooks/use-music";
import { getCountryMeta } from "@/utils/countryMeta";

export function ArtistCarouselByCountry() {
  const { data: artists, isLoading } = useMusicArtists();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showCountryList, setShowCountryList] = useState(false);

  // Auto-scroll animation
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !artists || artists.length === 0) return;

    let animId: number;
    let scrollPos = 0;
    const speed = 0.5;

    const animate = () => {
      if (!isPaused && el) {
        scrollPos += speed;
        if (scrollPos >= el.scrollWidth / 2) {
          scrollPos = 0;
        }
        el.scrollLeft = scrollPos;
      }
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [artists, isPaused]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!artists || artists.length === 0) {
    return (
      <div className="text-center py-12">
        <Music className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
        <p className="text-purple-200 text-lg">No artists registered yet</p>
        <p className="text-purple-300 text-sm mt-2">
          Check back soon for exciting new talent!
        </p>
      </div>
    );
  }

  // Group artists by country
  const byCountry: Record<string, typeof artists> = {};
  artists.forEach((artist: any) => {
    const cc = artist.country_code || "INTL";
    if (!byCountry[cc]) byCountry[cc] = [];
    byCountry[cc].push(artist);
  });
  const countryKeys = Object.keys(byCountry).sort();

  // Build the card list — duplicate for seamless looping
  const cards = countryKeys.flatMap((cc) => {
    const meta = getCountryMeta(cc);
    return byCountry[cc].map((artist: any) => ({ artist, meta, cc }));
  });
  const duplicated = [...cards, ...cards];
  const topCountryKey = countryKeys.reduce((best, cc) => {
    if (!best) return cc;
    return byCountry[cc].length > byCountry[best].length ? cc : best;
  }, "");
  const topCountryMeta = topCountryKey ? getCountryMeta(topCountryKey) : null;

  return (
    <div className="space-y-6">
      {/* Compact country summary */}
      <div className="mb-2 rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-purple-100">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
              🌍 {countryKeys.length} countries
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
              🎤 {cards.length} artists
            </span>
            {topCountryMeta && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
                ⭐ Top: {topCountryMeta.flag || "🌍"} {topCountryMeta.name} (
                {byCountry[topCountryKey].length})
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCountryList((prev) => !prev)}
            className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full bg-purple-500/25 border border-purple-400/35 text-purple-100 hover:bg-purple-500/35 transition-colors"
          >
            {showCountryList ? "Hide countries" : "View countries"}
          </button>
        </div>

        {showCountryList && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-purple-500/40 scrollbar-track-transparent">
            {countryKeys.map((cc) => {
              const meta = getCountryMeta(cc);
              return (
                <span
                  key={cc}
                  className="inline-flex whitespace-nowrap items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[11px] text-purple-200"
                >
                  <span>{meta.flag || "🌍"}</span>
                  {meta.name || cc} ({byCountry[cc].length})
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Scrolling carousel */}
      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-slate-900/95 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-slate-900/95 to-transparent" />
        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="flex gap-4 overflow-x-hidden py-2 px-1"
          style={{ scrollBehavior: "auto" }}
        >
          {duplicated.map(({ artist, meta, cc }, i) => {
            const stageName = (artist as any)?.name?.trim() || "Unknown Artist";
            const initials = stageName
              .split(/\s+/)
              .filter(Boolean)
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <motion.div
                key={`${artist.id}-${i}`}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative overflow-hidden flex-shrink-0 w-60 bg-gradient-to-b from-white/15 via-white/7 to-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:border-purple-400/55 transition-all cursor-pointer group shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
              >
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-purple-400/0 via-purple-300/90 to-pink-400/0" />
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="w-20 h-20 mb-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold shadow-xl group-hover:shadow-purple-500/50 transition-shadow relative ring-2 ring-white/25">
                    {initials}
                    {meta && (
                      <span
                        className="absolute -bottom-1 -right-1 text-lg bg-slate-900/70 rounded-full px-1"
                        title={meta.name}
                      >
                        {meta.flag}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-300 transition-colors truncate w-full">
                    {stageName}
                  </h3>

                  {/* Genre + Country */}
                  <p className="text-purple-300 text-xs mb-2 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                    {(artist as any).genre || "Artiste"} • {meta.flag}{" "}
                    {meta.name}
                  </p>

                  {/* Verso Air badge */}
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-semibold mb-3">
                    <Music className="w-3 h-3" />
                    Verso Air ™️
                  </div>

                  {/* Label status */}
                  <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-white/10 bg-black/10 rounded-lg px-2 pb-2">
                    <div className="text-center">
                      <div className="text-xs font-bold text-white">
                        {(artist as any).label_status === "signed"
                          ? "🏷️ Signé"
                          : (artist as any).label_status === "independent"
                            ? "🎯 Indép."
                            : "🆓 Libre"}
                      </div>
                      <div className="text-[10px] text-purple-200">Label</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-white">
                        {(artist as any).genre
                          ? (artist as any).genre.slice(0, 10)
                          : "—"}
                      </div>
                      <div className="text-[10px] text-purple-200">Genre</div>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link
                    to={`/artist-catalogue/${artist.id}`}
                    className="w-full"
                  >
                    <button className="w-full mt-3 bg-gradient-to-r from-amber-600 to-orange-500 text-white py-1.5 rounded-lg font-semibold hover:from-amber-700 hover:to-orange-600 transition-all flex items-center justify-center gap-2 text-sm shadow-md">
                      <Play className="w-3.5 h-3.5" />
                      Écouter
                    </button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ArtistCarouselByCountry;
