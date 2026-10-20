import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  BarChart3,
  CheckCircle2,
  FileSearch,
  Loader2,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useGeoAdminPricing } from "@/hooks/use-geoadmin-pricing";
import {
  calculateGeoAdminFeeXof,
  calculateGeoAdminTotalXof,
  GEOADMIN_PROPOSED_FEE_PERCENTAGES,
  formatMarketXofPrice,
  type GeoAdminProposedFeePercent,
} from "@/lib/geoadmin-pricing";
import { TIERS, type TierKey } from "@/lib/tiers";
import { apiRequest } from "@/lib/queryClient";

const MARKETS = [
  { code: "CA", name: "Canada" },
  { code: "FR", name: "France" },
  { code: "CI", name: "Côte d’Ivoire" },
] as const;
type MarketCode = (typeof MARKETS)[number]["code"];

const STUDY_PRIORITIES = [
  "Target customer segments",
  "Competitor and market landscape",
  "Local demand and positioning",
  "Pricing and offer benchmarking",
  "Market-entry or expansion opportunities",
  "Marketing-channel recommendations",
];

function getTierKey(value: string): TierKey {
  switch (value) {
    case "essential":
    case "verified":
    case "max":
    case "enterprise":
      return value;
    default:
      return "free";
  }
}

function getRequestError(error: unknown) {
  if (!(error instanceof Error)) {
    return "We could not submit the request. Please try again.";
  }
  const response = error.message.replace(/^\d+:\s*/, "");
  try {
    return (JSON.parse(response) as { message?: string }).message ?? response;
  } catch {
    return response;
  }
}

export default function GeoInsightsPage() {
  const { loading, isAuthenticated, tier, user } = useSubscription();
  const { currency, rates, selectedCountry } = useGeoAdminPricing();
  const isStaff = ["admin", "superuser", "moderator", "tsr"].includes(
    user?.role ?? "",
  );
  const hasPaidPlan =
    !!user &&
    user.subscriptionStatus === "active" &&
    (user.subscriptionExpiresAt == null ||
      new Date(user.subscriptionExpiresAt).getTime() > Date.now()) &&
    ["essential", "verified", "max", "enterprise"].includes(
      user.subscriptionTier,
    );
  const effectiveTier = user ? getTierKey(user.subscriptionTier) : tier;
  const annualBaseXof = TIERS[effectiveTier]?.annualPriceXof ?? null;
  const [marketCode, setMarketCode] = useState<MarketCode | "">("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [feePercent, setFeePercent] =
    useState<GeoAdminProposedFeePercent>(15);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    const detected = MARKETS.find(
      (market) => market.code === selectedCountry,
    )?.code;
    if (detected) setMarketCode(detected);
  }, [selectedCountry]);

  const feeExample =
    effectiveTier === "enterprise"
      ? null
      : calculateGeoAdminFeeXof(annualBaseXof, feePercent);
  const combinedExample =
    effectiveTier === "enterprise"
      ? null
      : calculateGeoAdminTotalXof(annualBaseXof, feePercent);

  const togglePriority = (priority: string) => {
    setPriorities((current) =>
      current.includes(priority)
        ? current.filter((item) => item !== priority)
        : [...current, priority],
    );
  };

  const submitRequest = async () => {
    setRequestError("");
    setRequestMessage("");
    if (!marketCode) {
      setRequestError("Choose an available market.");
      return;
    }
    if (businessType.trim().length < 2) {
      setRequestError("Enter your business type (at least 2 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest(
        "POST",
        "/api/geo-admin/addons/requests",
        {
          marketCode,
          businessName: businessName.trim() || undefined,
          businessType: businessType.trim(),
          studyPriorities: priorities,
          proposedFeePercent:
            effectiveTier === "enterprise" ? null : feePercent,
        },
      );
      const result = (await response.json()) as { message?: string };
      setRequestMessage(
        result.message ??
          "Request received. The team will confirm your quote in writing.",
      );
    } catch (error) {
      setRequestError(getRequestError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-16 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          GeoAdmin Insights
        </p>
        <h1 className="mt-3 text-4xl font-bold">
          Market intelligence for your business
        </h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          GeoAdmin is a separate annual market-study add-on to an active paid
          VersoAir subscription. The examples below are discussion proposals,
          not approved prices. Your written quote will confirm scope, amount,
          availability, and terms.
        </p>

        <section className="mt-8 rounded-2xl border border-sky-300/20 bg-sky-300/5 p-6">
          <div className="flex gap-4">
            <Sparkles className="mt-1 h-6 w-6 shrink-0 text-sky-300" />
            <div>
              <h2 className="text-xl font-bold">
                {!isAuthenticated || !hasPaidPlan
                  ? "GeoAdmin Preview"
                  : `Separate annual add-on · ${TIERS[effectiveTier].name}`}
              </h2>
              <p className="mt-2 text-slate-300">
                Free accounts can explore this preview, but personalized
                studies, competitor analysis, reports, recommendations, alerts,
                and downloadable data require an approved add-on.
              </p>
              {!isAuthenticated || !hasPaidPlan ? (
                <Link
                  href={
                    isAuthenticated
                      ? "/pricing"
                      : "/auth/signin?redirect=%2Fgeo-insights"
                  }
                  className="mt-5 inline-flex rounded-xl bg-amber-300 px-4 py-2 font-semibold text-slate-950"
                >
                  {isAuthenticated ? "Review paid subscriptions" : "Sign in"}
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-1 h-6 w-6 shrink-0 text-emerald-300" />
            <div>
              <h2 className="text-xl font-bold">Illustrative annual fee examples</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Examples apply a 10%, 15%, or 20% proposal to the base
                subscription reference. They are unapproved, not binding, and
                do not initiate a payment or activation.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {(["essential", "verified", "max"] as const).map((baseTier) => (
              <article
                key={baseTier}
                className="rounded-xl border border-white/10 bg-slate-900/60 p-4"
              >
                <h3 className="font-semibold">{TIERS[baseTier].name} base plan</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {TIERS[baseTier].annualPriceXof?.toLocaleString()} FCFA / year
                  base reference
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {GEOADMIN_PROPOSED_FEE_PERCENTAGES.map((percent) => (
                    <li key={percent} className="rounded-lg bg-white/[0.04] p-2">
                      <span className="font-semibold">{percent}% example</span>
                      <span className="block text-slate-300">
                        Add-on:{" "}
                        {formatMarketXofPrice(
                          calculateGeoAdminFeeXof(
                            TIERS[baseTier].annualPriceXof,
                            percent,
                          ),
                          selectedCountry ?? "",
                          currency,
                          rates,
                        )}
                      </span>
                      <span className="block text-slate-400">
                        Combined:{" "}
                        {formatMarketXofPrice(
                          calculateGeoAdminTotalXof(
                            TIERS[baseTier].annualPriceXof,
                            percent,
                          ),
                          selectedCountry ?? "",
                          currency,
                          rates,
                        )}{" "}
                        / year
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 text-sm text-slate-400">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
            {effectiveTier === "enterprise"
              ? "Enterprise studies are custom-quoted. Free is not eligible for the add-on."
              : `Your tier's ${feePercent}% example is ${formatMarketXofPrice(
                  feeExample,
                  marketCode || selectedCountry || "",
                  currency,
                  rates,
                )} add-on, or ${formatMarketXofPrice(
                  combinedExample,
                  marketCode || selectedCountry || "",
                  currency,
                  rates,
                )} combined per year. These figures are only a discussion reference.`}
          </p>
        </section>

        {hasPaidPlan && !isStaff && (
          <section className="mt-8 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-6">
            <div className="flex items-start gap-3">
              <FileSearch className="mt-1 h-6 w-6 shrink-0 text-amber-300" />
              <div className="w-full">
                <h2 className="text-xl font-bold">Request a written quote</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Tell us about your business and target market. Staff reviews
                  your request and must approve the final annual quote before
                  access is activated.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Target market
                    <select
                      value={marketCode}
                      onChange={(event) =>
                        setMarketCode(event.target.value as MarketCode | "")
                      }
                      className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-white"
                    >
                      <option value="">Choose an available market</option>
                      {MARKETS.map((market) => (
                        <option key={market.code} value={market.code}>
                          {market.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    Business type
                    <input
                      value={businessType}
                      onChange={(event) => setBusinessType(event.target.value)}
                      maxLength={160}
                      placeholder="e.g. restaurant, artist, retailer"
                      className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500"
                    />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    Business name (optional)
                    <input
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      maxLength={200}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                </div>

                {effectiveTier !== "enterprise" && (
                  <label className="mt-4 block text-sm font-medium">
                    Discussion example for your current base plan
                    <select
                      value={feePercent}
                      onChange={(event) =>
                        setFeePercent(
                          Number(event.target.value) as GeoAdminProposedFeePercent,
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-white"
                    >
                      {GEOADMIN_PROPOSED_FEE_PERCENTAGES.map((percent) => (
                        <option key={percent} value={percent}>
                          {percent}% — unapproved example only
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {STUDY_PRIORITIES.map((priority) => (
                    <label
                      key={priority}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 p-3 text-sm text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={priorities.includes(priority)}
                        onChange={() => togglePriority(priority)}
                        className="accent-emerald-400"
                      />
                      {priority}
                    </label>
                  ))}
                </div>

                {requestError && (
                  <p role="alert" className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">
                    {requestError}
                  </p>
                )}
                {requestMessage && (
                  <p role="status" className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    {requestMessage}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void submitRequest()}
                  disabled={submitting || !!requestMessage}
                  className="mt-5 inline-flex items-center rounded-xl bg-emerald-300 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Submit quote request
                </button>
              </div>
            </div>
          </section>
        )}

        {isAuthenticated && isStaff && (
          <section className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6">
            <h2 className="text-xl font-bold">Staff access</h2>
            <p className="mt-2 text-slate-300">
              Internal GeoAdmin administration is kept separate from customer
              add-on access.
            </p>
            <Link
              href="/geo-admin"
              className="mt-4 inline-flex rounded-xl bg-amber-300 px-4 py-2 font-semibold text-slate-950"
            >
              Open internal GeoAdmin
            </Link>
          </section>
        )}

        <p className="mt-6 text-sm leading-6 text-slate-400">
          Available study markets: Canada (CAD), France (EUR), and Côte
          d’Ivoire (FCFA). Other markets are coming soon. Display conversions
          are indicative; the written quote defines the final price and scope.
          No online payment is taken, and customer access is activated only
          after explicit staff approval.
        </p>
      </section>
    </main>
  );
}
