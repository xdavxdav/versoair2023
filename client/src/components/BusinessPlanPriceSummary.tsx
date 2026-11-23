import {
  BUSINESS_PLAN_PRICE_SCHEDULE,
  deriveEurPlanPrice,
  type BillingCycle,
} from "@shared/plan-pricing";
import { type GeoAdminOfferKey } from "@/lib/geoadmin-pricing";
import { useLocalizedContent } from "@/hooks/use-localized-content";

interface BusinessPlanPriceSummaryProps {
  offer: GeoAdminOfferKey;
  cycle?: BillingCycle;
}

export default function BusinessPlanPriceSummary({
  offer,
  cycle,
}: BusinessPlanPriceSummaryProps) {
  const localize = useLocalizedContent(false);
  const price = BUSINESS_PLAN_PRICE_SCHEDULE[offer];

  if ("quoteOnly" in price) {
    return localize(
      <p className="text-sm font-semibold text-amber-900">
        Custom quote in CAD, FCFA, or EUR
      </p>,
    );
  }
  if (offer === "free") {
    return localize(
      <p className="text-sm font-semibold text-emerald-800">
        Free everywhere
      </p>,
    );
  }

  const eur = deriveEurPlanPrice(price.fcfaAnnual);
  const cadMonthly = `CA$${(price.cadMonthlyCents / 100).toFixed(0)}/mo`;
  const cadAnnual = `CA$${(price.cadAnnualCents / 100).toFixed(0)}/yr`;
  const cadPrices =
    cycle === "monthly"
      ? cadMonthly
      : cycle === "annual"
        ? cadAnnual
        : `${cadMonthly} · ${cadAnnual}`;
  const fcfaPrice = `${price.fcfaAnnual.toLocaleString("en-CA")} FCFA/yr`;
  const eurMonthly = `€${(eur.monthlyCents / 100).toFixed(2)}/mo`;
  const eurAnnual = `€${(eur.annualCents / 100).toFixed(2)}/yr`;
  const eurPrices =
    cycle === "monthly"
      ? eurMonthly
      : cycle === "annual"
        ? eurAnnual
        : `${eurMonthly} · ${eurAnnual}`;
  return localize(
    <div className="space-y-1 text-sm">
      <p>
        <strong>CAD (approved):</strong>{" "}
        <span translate="no" className="notranslate">{cadPrices}</span>
      </p>
      <p>
        <strong>FCFA (annual base):</strong>{" "}
        <span translate="no" className="notranslate">{fcfaPrice}</span>
      </p>
      <p>
        <strong>EUR (derived; not approved):</strong>{" "}
        <span translate="no" className="notranslate">{eurPrices}</span>
      </p>
    </div>,
  );
}
