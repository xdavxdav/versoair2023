import { Link } from "wouter";
import { ArrowRight, ExternalLink, Headphones, MapPin, Mic2, Sparkles, Users } from "lucide-react";
import { getTmuFaceArtist, type FeaturedArtistProfile } from "@shared/featured-artists";
import { useLanguage } from "@/components/LanguageSwitcher";
import { getFlag } from "@/utils/get-flag";

interface FeaturedArtistCardProps {
  artist?: FeaturedArtistProfile;
  compact?: boolean;
  surface?: "dark" | "adaptive";
  className?: string;
}

export function FeaturedArtistCard({
  artist = getTmuFaceArtist(),
  compact = false,
  surface = "dark",
  className = "",
}: FeaturedArtistCardProps) {
  const { currentLang } = useLanguage();
  const isFr = currentLang.toLowerCase().startsWith("fr");
  const lang = isFr ? "fr" : "en";
  const adaptive = surface === "adaptive";

  const spotify = artist.officialLinks.find((l) => l.platform === "spotify");
  const youtube = artist.officialLinks.find((l) => l.platform === "youtube");

  return (
    <section
      aria-label={isFr ? `Artiste à la une : ${artist.stageName}` : `Featured artist: ${artist.stageName}`}
      data-testid="tmu-featured-artist-card"
      className={`tmu-dark-panel relative overflow-hidden rounded-3xl border shadow-2xl ${
        adaptive
          ? "border-pink-300/80 bg-[linear-gradient(135deg,#fff5f7_0%,#fdf2f8_48%,#eef2ff_100%)] text-slate-900 shadow-rose-900/10 dark:border-indigo-400/35 dark:bg-[linear-gradient(135deg,#0c0a26_0%,#181448_54%,#0a081f_100%)] dark:text-white dark:shadow-indigo-950/70"
          : "border-fuchsia-400/35 bg-[linear-gradient(135deg,#170936_0%,#250d4f_52%,#110726_100%)] text-white shadow-purple-950/60"
      } ${compact ? "p-5 sm:p-6" : "p-6 sm:p-8"} ${className}`}
    >
      {/* Subtle ambient glow */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl ${
          adaptive ? "bg-rose-400/20 dark:bg-indigo-500/25" : "bg-fuchsia-500/20"
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full blur-3xl ${
          adaptive ? "bg-indigo-400/20 dark:bg-violet-500/20" : "bg-amber-400/15"
        }`}
      />

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center">
        {/* Bespoke monogram emblem (no unauthorized third-party photo) */}
        <div className="flex-shrink-0 mx-auto md:mx-0">
          <div
            className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br p-[2px] shadow-xl ${
              adaptive
                ? "from-rose-600 via-pink-600 to-indigo-600 shadow-pink-600/20 dark:from-indigo-500 dark:via-violet-500 dark:to-indigo-300 dark:shadow-indigo-950/60"
                : "from-purple-600 via-fuchsia-600 to-amber-500 shadow-fuchsia-900/50"
            } ${compact ? "h-24 w-24" : "h-32 w-32 sm:h-36 sm:w-36"}`}
          >
            <div
              className={`flex h-full w-full flex-col items-center justify-center rounded-[14px] ${
                adaptive ? "bg-white dark:bg-[#09071d]" : "bg-[#0d0521]"
              }`}
            >
              <span
                translate="no"
                className={`notranslate bg-gradient-to-br bg-clip-text font-black tracking-tight text-transparent ${
                  adaptive
                    ? "from-rose-600 via-pink-600 to-indigo-700 dark:from-white dark:via-indigo-200 dark:to-violet-200"
                    : "from-white via-fuchsia-200 to-amber-200"
                } ${compact ? "text-3xl" : "text-4xl sm:text-5xl"}`}
              >
                NK
              </span>
              <span
                className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${
                  adaptive ? "text-rose-700 dark:text-indigo-300" : "text-amber-300/90"
                }`}
              >
                {getFlag(artist.countryCode)} 225
              </span>
            </div>
          </div>
        </div>

        {/* Copy & metadata */}
        <div className="flex-1 min-w-0 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                adaptive
                  ? "border-rose-300 bg-rose-100/90 text-rose-800 dark:border-indigo-400/40 dark:bg-indigo-500/20 dark:text-indigo-100"
                  : "border-amber-400/40 bg-amber-500/15 text-amber-200"
              }`}
            >
              <Sparkles
                className={`h-3.5 w-3.5 ${
                  adaptive ? "text-rose-600 dark:text-indigo-300" : "text-amber-300"
                }`}
              />
              {isFr ? "Visage de The Musical Universe" : "Featured Face of The Musical Universe"}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                adaptive
                  ? "border-indigo-200 bg-indigo-100/80 text-indigo-900 dark:border-indigo-400/30 dark:bg-indigo-950/70 dark:text-indigo-100"
                  : "border-purple-400/30 bg-purple-500/15 text-purple-100"
              }`}
            >
              <MapPin
                className={`h-3 w-3 ${
                  adaptive ? "text-pink-600 dark:text-indigo-300" : "text-fuchsia-300"
                }`}
              />
              {getFlag(artist.countryCode)} {artist.city}, {artist.countryName}
            </span>
          </div>

          <h2
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              adaptive ? "text-indigo-950 dark:text-white" : "text-white"
            }`}
          >
            <span translate="no" className="notranslate">
              {artist.stageName}
            </span>
            <span
              translate="no"
              className={`notranslate ml-2.5 text-sm sm:text-base font-medium ${
                adaptive ? "text-rose-700 dark:text-indigo-200/85" : "text-fuchsia-200/85"
              }`}
            >
              ({artist.aliases.join(" · ")})
            </span>
          </h2>

          <p
            className={`mt-2 max-w-2xl text-sm sm:text-base leading-relaxed ${
              adaptive ? "text-slate-700 dark:text-indigo-100/85" : "text-slate-200"
            }`}
          >
            {artist.tagline[lang]}
          </p>

          <div
            className={`mt-3 flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs ${
              adaptive ? "text-indigo-900 dark:text-indigo-100" : "text-purple-200"
            }`}
          >
            {artist.genres.map((genre) => (
              <span
                key={genre}
                translate="no"
                className={`notranslate inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${
                  adaptive
                    ? "border-pink-200/90 bg-white/85 text-indigo-900 dark:border-indigo-400/25 dark:bg-indigo-950/65 dark:text-indigo-100"
                    : "border-white/15 bg-white/5"
                }`}
              >
                <Mic2
                  className={`h-3 w-3 ${
                    adaptive ? "text-rose-600 dark:text-indigo-300" : "text-fuchsia-300"
                  }`}
                />
                {genre}
              </span>
            ))}
            <span
              translate="no"
              className={`notranslate inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${
                adaptive
                  ? "border-indigo-200/90 bg-white/85 text-indigo-900 dark:border-indigo-400/25 dark:bg-indigo-950/65 dark:text-indigo-100"
                  : "border-white/15 bg-white/5"
              }`}
            >
              <Users
                className={`h-3 w-3 ${
                  adaptive ? "text-indigo-600 dark:text-indigo-300" : "text-amber-300"
                }`}
              />
              {artist.group} ({artist.groupMembers.join(" & ")})
            </span>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <Link href={`/artistes/${artist.slug}`}>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] hover:brightness-110 ${
                  adaptive
                    ? "from-rose-600 via-pink-600 to-indigo-600 shadow-pink-600/25 dark:from-indigo-600 dark:via-violet-600 dark:to-indigo-500 dark:shadow-indigo-600/35"
                    : "from-purple-600 via-fuchsia-600 to-amber-500 shadow-fuchsia-600/30"
                }`}
              >
                {isFr ? "Voir la biographie complète" : "Read full biography"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>

            {spotify && (
              <a
                href={spotify.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                  adaptive
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25"
                    : "border-emerald-400/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                }`}
              >
                <Headphones className="h-3.5 w-3.5" />
                Spotify
                <ExternalLink className="h-3 w-3 opacity-75" />
              </a>
            )}

            {youtube && (
              <a
                href={youtube.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                  adaptive
                    ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-indigo-400/30 dark:bg-indigo-950/60 dark:text-indigo-100 dark:hover:bg-indigo-900/70"
                    : "border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                YouTube
                <ExternalLink className="h-3 w-3 opacity-75" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturedArtistCard;
