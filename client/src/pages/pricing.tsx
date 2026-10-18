import { useLocalizedContent } from "@/hooks/use-localized-content";
import { useState } from "react";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollToTop from "@/components/ScrollToTop";
import { SeoHead } from "@/components/seo/SeoHead";
import GeoAdminPlanDetailsDialog from "@/components/GeoAdminPlanDetailsDialog";
import GeoAdminPromoCard from "@/components/GeoAdminPromoCard";
import GeoAdminOfferDetails from "@/components/GeoAdminOfferDetails";
import { useGeoAdminPricing } from "@/hooks/use-geoadmin-pricing";
import {
  GEOADMIN_OFFER_NAMES,
  type GeoAdminOfferKey,
  GEOADMIN_OFFER_PRICES_XOF,
  GEOADMIN_PLAN_DETAILS,
  GEOADMIN_OFFER_ORDER,
  formatMarketXofPrice,
} from "@/lib/geoadmin-pricing";

export default function Pricing() {
  const localize = useLocalizedContent();
  const [selectedTier, setSelectedTier] = useState<GeoAdminOfferKey>("verified");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { currency, rates, selectedCountry, marketAvailability } =
    useGeoAdminPricing();

  const formatAnnualPrice = (tier: GeoAdminOfferKey) => {
    return formatMarketXofPrice(
      GEOADMIN_OFFER_PRICES_XOF[tier],
      selectedCountry ?? "",
      currency,
      rates,
    );
  };

  return localize((
    <div className="flex min-h-screen flex-col bg-[#f3efe9] pb-24 text-slate-900">
      <SeoHead
        title="GeoAdmin Plans and Annual Reference Pricing | VersoAir"
        description="Review GeoAdmin annual plan reference prices, benefits, market availability, and request a tailored proposal from VersoAir."
        canonicalPath="/pricing"
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-12 sm:py-16">
        <div className="grid items-center gap-7 lg:grid-cols-[0.9fr_1.1fr]">
          <GeoAdminPromoCard />
          <p className="text-xs leading-relaxed text-slate-700 lg:col-start-1">
            The promotional card shows FCFA reference amounts. In available markets,
            plan cards below use the local display currency.
          </p>
          <section>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
              GeoAdmin plans
            </p>
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              Choose the visibility that fits your business
            </h1>
            <p className="mb-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Annual reference prices are shown in Canadian dollars in Canada,
              euros in France, and FCFA in Côte d’Ivoire. Other countries are
              marked as coming soon.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {GEOADMIN_OFFER_ORDER.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    setSelectedTier(tier);
                    setDetailsOpen(true);
                  }}
                  className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    selectedTier === tier
                      ? "border-emerald-700 ring-1 ring-emerald-700"
                      : "border-slate-200"
                  }`}
                >
                  <span className="block font-semibold">{GEOADMIN_OFFER_NAMES[tier]}</span>
                  <span
                    className="mt-1 block text-lg font-bold text-emerald-800"
                  >
                    {formatAnnualPrice(tier)}
                    {GEOADMIN_OFFER_PRICES_XOF[tier] !== null &&
                      marketAvailability !== false && (
                      <span className="text-sm font-normal text-slate-700">
                        {" "}
                        / year
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block text-sm text-slate-600">
                    {tier === "free"
                      ? "Start with a basic directory presence."
                      : tier === "enterprise"
                        ? "Discuss a package tailored to your needs."
                        : marketAvailability === false
                          ? `GeoAdmin is coming soon in your selected country.`
                          : (
                              <>
                                Annual reference price for your market:{" "}
                                <span translate="no">
                                  {formatAnnualPrice(tier)}
                                </span>
                                .
                              </>
                            )}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-700">
              Prices in CAD and EUR are indicative conversions from the FCFA
              reference schedule; the written offer confirms the final amount.
              Availability, deliverables, taxes, and terms are confirmed
              directly. This page does not offer checkout or activate a plan,
              and it does not promise a free listing, a trial, or a specific
              placement.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => setDetailsOpen(true)}
                className="bg-emerald-800 text-white hover:bg-emerald-900"
              >
                Learn more and customize
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <a
                href="tel:+14374359726"
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Phone className="h-4 w-4" />
                Canada: +1 (437) 435-9726
              </a>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Côte d’Ivoire:{" "}
              <a className="underline" href="tel:+2252720212223">
                +225 27 20 21 22 23
              </a>
              {" · "}
              <a className="underline" href="mailto:support@versoair.com">
                support@versoair.com
              </a>
            </p>
          </section>
        </div>

        <section className="mt-14" aria-labelledby="plan-inclusions-heading">
          <div className="mx-auto mb-7 max-w-3xl text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Clear plan comparison
            </p>
            <h2
              id="plan-inclusions-heading"
              className="text-3xl font-bold sm:text-4xl"
            >
              What each plan is designed to include
            </h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              Compare the intended listing, visibility, and support benefits
              before you contact us. Select any plan to build an inquiry around
              your priorities.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {GEOADMIN_OFFER_ORDER.map((tier) => {
              const annualPrice = GEOADMIN_OFFER_PRICES_XOF[tier];
              return (
                <article
                  key={tier}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold">{GEOADMIN_OFFER_NAMES[tier]}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {GEOADMIN_PLAN_DETAILS[tier].shortDescription}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900"
                    >
                      {formatAnnualPrice(tier)}
                      {annualPrice !== null && marketAvailability !== false
                        ? " / year"
                        : ""}
                    </span>
                  </div>
                  {annualPrice !== null &&
                    annualPrice > 0 &&
                    marketAvailability !== false && (
                    <p className="mt-3 text-xs text-slate-700">
                      About{" "}
                      <span translate="no">
                        {formatMarketXofPrice(
                          annualPrice / 12,
                          selectedCountry ?? "",
                          currency,
                          rates,
                        )}
                      </span>{" "}
                      per month on an annual-equivalent basis; this is not a
                      monthly billing option.
                    </p>
                  )}
                  <GeoAdminOfferDetails offer={tier} />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTier(tier);
                      setDetailsOpen(true);
                    }}
                    className="mt-6 inline-flex items-center gap-2 font-semibold text-emerald-800 hover:text-emerald-950"
                  >
                    <span>Discuss</span>
                    <span>{GEOADMIN_OFFER_NAMES[tier]}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className="mt-12 grid gap-5 lg:grid-cols-2"
          aria-label="Pricing and service scope"
        >
          <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold">How to interpret these prices</h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              These are annual reference prices—not a checkout offer or a final
              quote. Canada prices are displayed in CAD, France prices in EUR,
              and Côte d’Ivoire prices in FCFA. CAD and EUR amounts are
              indicative conversions from the FCFA reference schedule; taxes,
              eligibility, final inclusions, and contract terms are confirmed
              in writing before purchase.
            </p>
            <p className="mt-3 leading-relaxed text-slate-600">
              Standard is the basic directory offer. Essentiel proposes initial
              setup. Premium adds proposed content preparation on request,
              not additional account permissions. Pro Vérifié and Pro Max have
              separate proposed scopes; no ranking or commercial result is guaranteed.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold">
              Platform access vs. managed service
            </h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              Platform scope and services are presented separately. All
              availability, deliverables and service volumes require written
              confirmation. Premium is a commercial inquiry, not a new
              subscription entitlement. No managed social campaign or
              advertising spend is included automatically.
            </p>
            <p className="mt-3 leading-relaxed text-slate-600">
              If you want hands-on support, choose the relevant priorities in
              “Learn more and customize.” We will confirm the deliverables,
              schedule, any advertising spend, support level, and total price
              separately so you know exactly what you are agreeing to.
            </p>
          </article>
        </section>

        <p className="mt-6 rounded-xl border border-amber-300/70 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
          <strong>Before you commit:</strong> no payment is taken and no plan is
          activated from this page. Request a written proposal and review its
          market availability, deliverables, term, taxes, exclusions, renewal,
          and cancellation conditions before accepting.
        </p>

        <GeoAdminPlanDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          initialTier={selectedTier}
        />
      </main>
      <ScrollToTop />
    </div>
  ));
}
