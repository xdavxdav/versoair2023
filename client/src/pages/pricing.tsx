import { useState } from "react";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollToTop from "@/components/ScrollToTop";
import { SeoHead } from "@/components/seo/SeoHead";
import GeoAdminPlanDetailsDialog from "@/components/GeoAdminPlanDetailsDialog";
import { useGeoAdminPricing } from "@/hooks/use-geoadmin-pricing";
import {
  GEOADMIN_ANNUAL_PRICES_XOF,
  GEOADMIN_PLAN_ORDER,
} from "@/lib/geoadmin-pricing";
import { TIERS, type TierKey } from "@/lib/tiers";

export default function Pricing() {
  const [selectedTier, setSelectedTier] = useState<TierKey>("verified");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { currency, rates } = useGeoAdminPricing();

  const formatAnnualPrice = (tier: TierKey) => {
    const amountXof = GEOADMIN_ANNUAL_PRICES_XOF[tier];
    if (amountXof === null) return "Custom quote";
    if (currency === "XOF" || currency === "XAF") {
      return `${amountXof.toLocaleString()} FCFA`;
    }
    const rate = rates?.[currency];
    if (!rate) return `${amountXof.toLocaleString()} FCFA`;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 0,
    }).format(amountXof * rate);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f3efe9] pb-24 text-slate-900">
      <SeoHead
        title="GeoAdmin Plans and Annual Reference Pricing | VersoAir"
        description="Review GeoAdmin annual plan reference prices, benefits, market availability, and request a tailored proposal from VersoAir."
        canonicalPath="/pricing"
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-12 sm:py-16">
        <div className="grid items-center gap-7 lg:grid-cols-[0.9fr_1.1fr]">
          <img
            src="/images/geoadmin-plans.svg"
            alt="GeoAdmin annual plans and base FCFA prices"
            className="h-auto w-full rounded-2xl border border-slate-200 shadow-lg"
          />
          <section>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
              GeoAdmin plans
            </p>
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              Choose the visibility that fits your business
            </h1>
            <p className="mb-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Annual reference prices start in FCFA. When available, an
              approximate visitor-currency conversion is shown; the FCFA amount
              remains the source price.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {GEOADMIN_PLAN_ORDER.map((tier) => (
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
                  <span className="block font-semibold">{TIERS[tier].name}</span>
                  <span className="mt-1 block text-lg font-bold text-emerald-800">
                    {formatAnnualPrice(tier)}
                    {GEOADMIN_ANNUAL_PRICES_XOF[tier] !== null && (
                      <span className="text-sm font-normal text-slate-500">
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
                        : `Annual reference: ${GEOADMIN_ANNUAL_PRICES_XOF[tier]?.toLocaleString()} FCFA.`}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Local-currency conversions are indicative, not a payment quote.
              Plan availability, deliverables, taxes, and terms are confirmed
              directly. This page does not offer checkout or activate a plan.
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

        <GeoAdminPlanDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          initialTier={selectedTier}
        />
      </main>
      <ScrollToTop />
    </div>
  );
}
