import { Link } from "wouter";
import { ArrowRight, ExternalLink, Headphones, MapPin, Mic2, Sparkles, Users } from "lucide-react";
import { getTmuFaceArtist, type FeaturedArtistProfile } from "@shared/featured-artists";
import { useLanguage } from "@/components/LanguageSwitcher";
import { getFlag } from "@/utils/get-flag";

interface FeaturedArtistCardProps {
  artist?: FeaturedArtistProfile;
  compact?: boolean;
  className?: string;
}

export function FeaturedArtistCard({
  artist = getTmuFaceArtist(),
  compact = false,
  className = "",
}: FeaturedArtistCardProps) {
  const { currentLang } = useLanguage();
  const isFr = currentLang.toLowerCase().startsWith("fr");
  const lang = isFr ? "fr" : "en";

  const spotify = artist.officialLinks.find((l) => l.platform === "spotify");
  const youtube = artist.officialLinks.find((l) => l.platform === "youtube");

  return (
    <section
      aria-label={isFr ? `Artiste à la une : ${artist.stageName}` : `Featured artist: ${artist.stageName}`}
      data-testid="tmu-featured-artist-card"
      className={`relative overflow-hidden rounded-3xl border border-fuchsia-400/35 bg-[linear-gradient(135deg,#170936_0%,#250d4f_52%,#110726_100%)] shadow-2xl shadow-purple-950/60 ${compact ? "p-5 sm:p-6" : "p-6 sm:p-8"} ${className}`}
    >
      {/* Subtle ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl"
      />

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center">
        {/* Bespoke monogram emblem (no unauthorized third-party photo) */}
        <div className="flex-shrink-0 mx-auto md:mx-0">
          <div
            className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-amber-500 p-[2px] shadow-xl shadow-fuchsia-900/50 ${compact ? "h-24 w-24" : "h-32 w-32 sm:h-36 sm:w-36"}`}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-[14px] bg-[#0d0521]">
              <span
                translate="no"
                className={`notranslate bg-gradient-to-br from-white via-fuchsia-200 to-amber-200 bg-clip-text font-black tracking-tight text-transparent ${compact ? "text-3xl" : "text-4xl sm:text-5xl"}`}
              >
                NK
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/90">
                {getFlag(artist.countryCode)} 225
              </span>
            </div>
          </div>
        </div>

        {/* Copy & metadata */}
        <div className="flex-1 min-w-0 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {isFr ? "Visage de The Musical Universe" : "Featured Face of The Musical Universe"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-500/15 px-2.5 py-1 text-xs font-medium text-purple-100">
              <MapPin className="h-3 w-3 text-fuchsia-300" />
              {getFlag(artist.countryCode)} {artist.city}, {artist.countryName}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            <span translate="no" className="notranslate">
              {artist.stageName}
            </span>
            <span className="ml-2.5 text-sm sm:text-base font-medium text-fuchsia-200/85">
              ({artist.aliases.join(" · ")})
            </span>
          </h2>

          <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-200">
            {artist.tagline[lang]}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-purple-200">
            {artist.genres.map((genre) => (
              <span
                key={genre}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1"
              >
                <Mic2 className="h-3 w-3 text-fuchsia-300" />
                {genre}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1">
              <Users className="h-3 w-3 text-amber-300" />
              {artist.group} ({artist.groupMembers.join(" & ")})
            </span>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <Link href={`/artistes/${artist.slug}`}>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-600/30 transition-transform hover:scale-[1.02] hover:brightness-110"
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20"
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
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
