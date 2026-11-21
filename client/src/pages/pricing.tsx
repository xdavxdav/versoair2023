import { useLocalizedContent } from "@/hooks/use-localized-content";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import CheckoutReturnNotice from "@/components/CheckoutReturnNotice";
import GeoAdminContacts from "@/components/GeoAdminContacts";
import { Button } from "@/components/ui/button";
import ScrollToTop from "@/components/ScrollToTop";
import { SeoHead } from "@/components/seo/SeoHead";
import GeoAdminPlanDetailsDialog from "@/components/GeoAdminPlanDetailsDialog";
import GeoAdminPromoCard from "@/components/GeoAdminPromoCard";
import GeoAdminOfferDetails from "@/components/GeoAdminOfferDetails";
import BusinessPlanPriceSummary from "@/components/BusinessPlanPriceSummary";
import PlanCheckoutButton from "@/components/PlanCheckoutButton";
import { isSelfServePlanTier, type BillingCycle } from "@shared/plan-pricing";
import {
  GEOADMIN_OFFER_NAMES,
  GEOADMIN_PLAN_DETAILS,
  GEOADMIN_OFFER_ORDER,
  type GeoAdminOfferKey,
  isGeoAdminComingSoonCountry,
  getMarketAvailability,
} from "@/lib/geoadmin-pricing";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { useCheckoutReturn } from "@/hooks/use-checkout-return";

/** True once the webhook has put the bought plan on the buyer's account. */
async function planIsActive(params: URLSearchParams): Promise<boolean> {
  const response = await fetch("/auth/session", {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) return false;
  const current = (await response.json())?.user?.subscriptionTier;
  const bought = params.get("tier");
  return isSelfServePlanTier(bought)
    ? current === bought
    : typeof current === "string" && current !== "free";
}

export default function Pricing() {
  const localize = useLocalizedContent();
  const [selectedTier, setSelectedTier] = useState<GeoAdminOfferKey>("verified");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const { selectedCountry } = useCountry();
  const { user, restoreAuth } = useAuthContext();
  const checkout = useCheckoutReturn({ ready: !!user, isFulfilled: planIsActive });
  const marketAvailability = getMarketAvailability(selectedCountry ?? "");
  const boughtTier = checkout.params?.get("tier");

  // Bring the navbar and account state up to date with the new plan.
  useEffect(() => {
    if (checkout.phase === "confirmed") void restoreAuth();
  }, [checkout.phase, restoreAuth]);

  return localize((
    <div className="flex min-h-screen flex-col bg-[#f3efe9] pb-24 text-slate-900">
      <SeoHead
        title="GeoAdmin Business Plan Prices | VersoAir"
        description="Review approved CAD business-plan prices, the FCFA annual base schedule, and derived EUR reference amounts."
        canonicalPath="/pricing"
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-12 sm:py-16">
        <CheckoutReturnNotice
          phase={checkout.phase}
          purchase="plan"
          planName={
            isSelfServePlanTier(boughtTier)
              ? GEOADMIN_OFFER_NAMES[boughtTier]
              : undefined
          }
          onCheckAgain={checkout.checkAgain}
          onDismiss={checkout.dismiss}
        />
        <Link
          href="/geo-admin"
          className="mb-5 inline-flex w-fit items-center gap-2 rounded-md text-sm font-semibold text-amber-900 hover:text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to GeoAdmin
        </Link>
        <div className="grid min-w-0 gap-7">
          <GeoAdminPromoCard />
          <section>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-amber-900">
              Business plan prices · CAD, FCFA, EUR
            </p>
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              Choose the visibility that fits your business
            </h1>
            <p className="mb-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              CAD is the approved price, and FCFA is the annual base schedule.
              EUR amounts are derived from the fixed peg (1 EUR = 655.957 FCFA)
              and are not approved prices.
            </p>
            <div className="mb-5 flex justify-center gap-2" role="group" aria-label="Billing cycle">
              {(["monthly", "annual"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={cycle === value ? "default" : "outline"}
                  aria-pressed={cycle === value}
                  onClick={() => setCycle(value)}
                >
                  {value === "monthly" ? "Monthly" : "Annual"}
                </Button>
              ))}
            </div>
            <p className="mb-6 text-center text-sm text-slate-600">
              {cycle === "annual"
                ? "Showing annual billing: self-serve CAD plans include two months free compared with twelve monthly payments (CA$430/yr, CA$960/yr, CA$1,870/yr)."
                : "Showing monthly billing: self-serve CAD plans renew monthly (CA$43/mo, CA$96/mo, CA$187/mo); switch to Annual to view full-year rates."}
            </p>
            <div
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              aria-label="Clear plan comparison"
            >
              {GEOADMIN_OFFER_ORDER.map((tier) => (
                <article
                  key={tier}
                  className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition ${
                    selectedTier === tier
                      ? "border-amber-700 ring-1 ring-amber-700"
                      : "border-slate-200"
                  }`}
                >
                  <div>
                    <h2 className="text-xl font-bold">{GEOADMIN_OFFER_NAMES[tier]}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {tier === "free"
                        ? "Start with a basic directory presence."
                        : tier === "enterprise"
                          ? "Discuss a package tailored to your needs."
                          : marketAvailability === false
                            ? isGeoAdminComingSoonCountry(selectedCountry ?? "")
                              ? "GeoAdmin is coming soon in Côte d’Ivoire."
                              : "GeoAdmin availability is not confirmed in your selected country."
                            : GEOADMIN_PLAN_DETAILS[tier].shortDescription}
                    </p>
                  </div>
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-slate-800">
                    <BusinessPlanPriceSummary offer={tier} cycle={cycle} />
                  </div>
                  <GeoAdminOfferDetails offer={tier} />
                  <div className="mt-auto pt-2">
                    {isSelfServePlanTier(tier) ? (
                      <PlanCheckoutButton
                        tier={tier}
                        cycle={cycle}
                        disabled={checkout.awaitingPayment}
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTier(tier);
                        setDetailsOpen(true);
                      }}
                      className="mt-4 inline-flex items-center gap-2 font-semibold text-amber-900 hover:text-amber-950"
                    >
                      <span>Discuss</span>
                      <span>{GEOADMIN_OFFER_NAMES[tier]}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-5 text-xs leading-relaxed text-slate-700">
              CAD amounts are approved. FCFA amounts are the annual base
              schedule. EUR amounts are calculated from the fixed peg and are
              not approved prices. Availability, deliverables, taxes, and terms
              are confirmed directly. Payment is only taken in CAD when you
              press a Pay button and complete secure Stripe checkout.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => setDetailsOpen(true)}
                className="bg-amber-900 text-white hover:bg-amber-900"
              >
                Learn more and customize
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4"><GeoAdminContacts light /></div>
          </section>
        </div>

        <section
          className="mt-12 grid gap-5 lg:grid-cols-2"
          aria-label="Pricing and service scope"
        >
          <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold">How to interpret these prices</h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              {cycle === "annual"
                ? "Annual view selected: self-serve CAD plans are billed once per year at ten times the monthly rate (CA$430/yr for Essentiel, CA$960/yr for Pro Vérifié, and CA$1,870/yr for Pro Max), while Premium shows its CA$720/yr inquiry reference."
                : "Monthly view selected: self-serve CAD plans are billed month-to-month (CA$43/mo for Essentiel, CA$96/mo for Pro Vérifié, and CA$187/mo for Pro Max), while Premium shows its CA$60/mo inquiry reference."}
            </p>
            <p className="mt-3 leading-relaxed text-slate-600">
              CAD is the approved price. FCFA is the annual base schedule. EUR
              amounts are derived using the fixed 1 EUR = 655.957 FCFA peg and
              are not approved prices. Enterprise is quote-only in all three
              currencies. Taxes, availability, inclusions, and contract terms
              are confirmed in writing; payment is only taken in CAD through
              the Pay buttons on the self-serve plans.
            </p>
            <p className="mt-3 leading-relaxed text-slate-600">
              Essentiel proposes initial
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
          <strong>Before you commit:</strong> nothing is charged until you press
          a Pay button and complete Stripe checkout. For Premium or Enterprise,
          request a written proposal and review its market availability,
          deliverables, term, taxes, exclusions, renewal, and cancellation
          conditions before accepting.
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
