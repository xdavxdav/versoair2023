import { useLocalizedContent } from "@/hooks/use-localized-content";
import { GEOADMIN_OFFER_ORDER, GEOADMIN_OFFER_NAMES, GEOADMIN_OFFER_PRICES_XOF, GEOADMIN_PLAN_DETAILS, GEOADMIN_REFERENCE_NOTICE } from "@/lib/geoadmin-pricing";
import GeoAdminOfferDetails from "@/components/GeoAdminOfferDetails";

export default function GeoAdminPromoCard() {
  const localize = useLocalizedContent();
  return localize((
    <section
      aria-label="Offres de référencement et visibilité des entreprises"
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
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {GEOADMIN_OFFER_ORDER.filter(tier => tier !== "free").map((tier, index) => (
          <article
            key={tier}
            className={`min-w-0 rounded-xl border p-4 ${
              index === 1
                ? "border-[#ffe394] bg-[#e0b94f]/10"
                : "border-[#d7b652]/50 bg-white/5"
            }`}
          >
            <h3 className="text-base font-bold uppercase text-[#f1d47a]">
              {GEOADMIN_OFFER_NAMES[tier]}
            </h3>
            <p className="mt-3 text-xl font-bold text-white">
              {GEOADMIN_OFFER_PRICES_XOF[tier] === null ? (
                "Sur devis"
              ) : (
                <>
                  <span translate="no" className="notranslate">{new Intl.NumberFormat("de-DE").format(GEOADMIN_OFFER_PRICES_XOF[tier]!)} FCFA</span>
                  <span className="text-sm font-normal"> / an</span>
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-[#bac7d8]">
              {GEOADMIN_OFFER_PRICES_XOF[tier] === null ? "Proposition personnalisée" : "Tarif de référence"}
            </p>
            <p className="mt-3 text-sm text-[#e8edf4]">{GEOADMIN_PLAN_DETAILS[tier].shortDescription}</p>
            {tier === "premium" && <GeoAdminOfferDetails offer={tier} />}
          </article>
        ))}
      </div>
      <p className="mt-5 text-sm leading-relaxed text-[#c5d0df]">
        {GEOADMIN_REFERENCE_NOTICE}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#d7b652]/45 bg-[#050e1d]/55 p-4">
        <a
          href="https://wa.me/14374359726"
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-11 rounded-md font-semibold text-[#f4d779] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe394]"
        >
          <span className="block">Contactez-nous sur WhatsApp →</span>
          <span translate="no" className="notranslate mt-1 block text-sm font-normal text-[#c5d0df]">
            +1 (437) 435-9726
          </span>
          <span className="sr-only"> (nouvel onglet)</span>
        </a>
        <a
          href="https://www.versoair.com"
          translate="no"
          className="notranslate inline-flex min-h-11 items-center break-all rounded-md text-sm font-semibold text-[#e6c15b] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe394]"
        >
          https://www.versoair.com
        </a>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-[#b8c6d9]">
        Le réseau professionnel qui connecte entreprises, artisans et artistes.
      </p>
    </section>
  ));
}
