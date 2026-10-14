import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GEOADMIN_PLAN_DETAILS,
  GEOADMIN_PLAN_ORDER,
  formatXofPrice,
} from "@/lib/geoadmin-pricing";
import { TIERS, type TierKey } from "@/lib/tiers";
import { useGeoAdminPricing } from "@/hooks/use-geoadmin-pricing";
import { useCountry } from "@/contexts/CountryContext";
import { getCountryMeta } from "@/utils/countryMeta";

const CUSTOM_PLAN_OPTIONS = [
  "Business listing and profile setup",
  "Visibility placement and campaign planning",
  "Product, service, or portfolio presentation",
  "Lead-generation and contact workflow",
  "Reporting and performance review",
  "Onboarding, support, or multi-location needs",
];

interface GeoAdminPlanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTier?: TierKey;
}

export default function GeoAdminPlanDetailsDialog({
  open,
  onOpenChange,
  initialTier = "verified",
}: GeoAdminPlanDetailsDialogProps) {
  const [selectedTier, setSelectedTier] = useState<TierKey>(initialTier);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const { currency, rates, loadingRates, selectedCountry } =
    useGeoAdminPricing();
  const { selectedCountry: countryCode } = useCountry();

  useEffect(() => {
    if (open) {
      setSelectedTier(initialTier);
      setSelectedOptions([]);
    }
  }, [open, initialTier]);

  const marketName = countryCode
    ? getCountryMeta(countryCode).name
    : "Not detected";
  const planName = TIERS[selectedTier].name;
  const annualPriceXof = TIERS[selectedTier].annualPriceXof;
  const localRateAvailable =
    currency === "XOF" || currency === "XAF" || Boolean(rates?.[currency]);
  const customRequestHref = (() => {
    const subject = encodeURIComponent(`GeoAdmin ${planName} plan inquiry`);
    const body = encodeURIComponent(
      [
        `Plan of interest: ${planName}`,
        `Market: ${marketName}`,
        `Preferred display currency: ${currency}`,
        "",
        "Priorities:",
        ...(selectedOptions.length > 0
          ? selectedOptions.map((option) => `- ${option}`)
          : ["- Please discuss a suitable plan with me"]),
        "",
        "Please confirm availability, final scope, and written terms.",
      ].join("\n"),
    );
    return `mailto:support@versoair.com?subject=${subject}&body=${body}`;
  })();

  const toggleOption = (option: string) => {
    setSelectedOptions((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto border-slate-700 bg-slate-950 p-0 text-white">
        <div className="p-5 sm:p-8">
          <DialogHeader className="pr-8 text-left">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <DialogTitle className="text-2xl sm:text-3xl">
              Explore GeoAdmin plans
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Choose a tier to review its plan design, or select priorities for
              a custom proposal. This inquiry does not purchase or activate a
              subscription.
            </DialogDescription>
          </DialogHeader>

          <div
            className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5"
            role="tablist"
            aria-label="GeoAdmin plan tiers"
          >
            {GEOADMIN_PLAN_ORDER.map((tier) => (
              <button
                key={tier}
                type="button"
                role="tab"
                aria-selected={selectedTier === tier}
                onClick={() => setSelectedTier(tier)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  selectedTier === tier
                    ? "border-amber-300 bg-amber-300/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25"
                }`}
              >
                <span className="block text-sm font-semibold">
                  {TIERS[tier].name}
                </span>
                <span className="mt-1 block text-xs text-amber-200">
                  {TIERS[tier].annualPriceXof === null
                    ? "Custom quote"
                    : `${TIERS[tier].annualPriceXof.toLocaleString()} FCFA / year`}
                </span>
              </button>
            ))}
          </div>

          <section
            role="tabpanel"
            className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h3 className="text-xl font-bold">{TIERS[selectedTier].name}</h3>
                <p className="mt-1 text-sm text-slate-300">
                  {GEOADMIN_PLAN_DETAILS[selectedTier].shortDescription}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-lg font-bold text-amber-200">
                  {TIERS[selectedTier].annualPriceXof === null
                    ? "Custom proposal"
                    : `${TIERS[selectedTier].annualPriceXof.toLocaleString()} FCFA / year`}
                </p>
                {selectedCountry && currency !== "XOF" && currency !== "XAF" && (
                  <p className="text-sm text-slate-300">
                    Local estimate:{" "}
                    {annualPriceXof === null
                      ? "custom quote"
                      : loadingRates
                        ? "loading reference rate…"
                        : localRateAvailable
                          ? formatXofPrice(annualPriceXof, currency, rates)
                          : "rate unavailable; FCFA shown"}
                  </p>
                )}
              </div>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {GEOADMIN_PLAN_DETAILS[selectedTier].benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-2.5 text-sm text-slate-200"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  {benefit}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-2xl border border-amber-200/20 bg-amber-300/[0.05] p-5">
            <div>
              <h3 className="text-lg font-bold">Build a custom plan</h3>
              <p className="mt-1 text-sm text-slate-300">
                Pick the areas you want to discuss. We’ll include them in an
                inquiry to the Verso Air team.
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {CUSTOM_PLAN_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 p-3 text-sm text-slate-200 hover:bg-white/[0.04]"
                >
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option)}
                    onChange={() => toggleOption(option)}
                    className="mt-0.5 accent-amber-400"
                  />
                  {option}
                </label>
              ))}
            </div>
          </section>

          <p className="mt-5 text-xs leading-relaxed text-slate-400">
            Local-currency conversions are indicative reference estimates.
            Annual FCFA prices are the source amounts; tax, market eligibility,
            final deliverables, and terms are confirmed in a written proposal.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Close
            </button>
            <a
              href={customRequestHref}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-5 py-3 text-sm font-bold text-slate-950 hover:from-amber-200 hover:to-yellow-400"
            >
              Discuss this plan
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
