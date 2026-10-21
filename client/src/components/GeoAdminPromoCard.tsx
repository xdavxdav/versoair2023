import { useLocalizedContent } from "@/hooks/use-localized-content";
import GeoAdminContacts from "@/components/GeoAdminContacts";
import { Link } from "wouter";

export default function GeoAdminPromoCard() {
  const localize = useLocalizedContent();
  return localize((
    <section
      aria-label="Offres de référencement et visibilité des entreprises"
      data-testid="geoadmin-promo"
      className="relative isolate overflow-hidden rounded-2xl border border-[#d7b652]/50 bg-[linear-gradient(135deg,#07162d_0%,#0a2343_55%,#101a32_100%)] p-5 text-white shadow-lg sm:p-7"
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id="geoadmin-promo-grid" width="54" height="54" patternUnits="userSpaceOnUse">
            <path d="M54 0H0V54" fill="none" stroke="#d9b95d" strokeOpacity=".07" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#geoadmin-promo-grid)" />
        <circle cx="90%" cy="10%" r="110" fill="#d7ad46" opacity=".07" />
        <circle cx="90%" cy="10%" r="76" fill="none" stroke="#e8c668" strokeOpacity=".25" strokeWidth="2" />
      </svg>
      <p translate="no" className="notranslate text-sm font-bold tracking-[0.2em] text-[#f5d579]">
        VERSO AIR INC
      </p>
      <h2 className="mt-4 text-2xl font-bold leading-tight text-white sm:text-3xl">
        Plateforme de Référencement &amp; Visibilité des Entreprises
      </h2>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#d7b652]/45 bg-[#050e1d]/55 p-4">
        <GeoAdminContacts />
        <Link
          href="/versoai"
          className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-[#e6c15b] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe394]"
        >
          Ask VersoAI
        </Link>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-[#b8c6d9]">
        Le réseau professionnel qui connecte entreprises, artisans et artistes.
      </p>
    </section>
  ));
}
