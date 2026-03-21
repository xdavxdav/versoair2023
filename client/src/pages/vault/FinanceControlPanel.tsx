/**
 * Finance Control Panel — Payments, revenue, billing
 * Extracted from credentials-vault.tsx
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Banknote,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ShoppingCart,
  Eye,
  Send,
  Ban,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionBlock, InfoRow, ApiEndpoint, DbTable } from "./vault-shared";
import VersoAirCardPanel from "./VersoAirCardPanel";

// ═══════════════════════════════════════════════════════════
// 💰 FINANCE CONTROL PANEL — Payments, revenue, billing
// ═══════════════════════════════════════════════════════════

interface Transaction {
  id: string;
  userId: number | null;
  businessId: number | null;
  amount: string;
  type: string;
  status: string;
  reference: string | null;
  createdAt: string;
}

export default function FinanceControlPanel() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState<any>(null);
  const [stripeStatus, setStripeStatus] = useState<
    "checking" | "active" | "inactive"
  >("checking");

  // ─── NGO POS STATE ──────────────────────────────────────────────
  const [posStats, setPosStats] = useState<any>(null);
  const [posCustomers, setPosCustomers] = useState<any[]>([]);
  const [posCharges, setPosCharges] = useState<any[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [posSearch, setPosSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [chargeForm, setChargeForm] = useState({
    cardId: "",
    amount: "",
    description: "",
    category: "activity_fee",
    currency: "USD",
  });
  const [chargeLoading, setChargeLoading] = useState(false);
  const [chargeResult, setChargeResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [posView, setPosView] = useState<
    "dashboard" | "customers" | "terminal" | "history"
  >("dashboard");

  useEffect(() => {
    const load = async () => {
      try {
        const [txRes, statsRes] = await Promise.all([
          fetch("/api/v1/payments/billing-history?limit=50", {
            credentials: "include",
          }).catch(() => null),
          fetch("/api/database/stats", { credentials: "include" }).catch(
            () => null,
          ),
        ]);
        if (txRes?.ok) {
          const data = await txRes.json();
          setTransactions(Array.isArray(data) ? data : data.transactions || []);
        }
        if (statsRes?.ok) setDbStats(await statsRes.json());

        // Check Stripe
        try {
          const sRes = await fetch("/api/v1/payments/create-checkout", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier: "test", period: "test" }),
          });
          setStripeStatus(sRes.status === 503 ? "inactive" : "active");
        } catch {
          setStripeStatus("inactive");
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    };
    load();
  }, []);

  // ─── POS DATA LOADER ────────────────────────────────────────────
  const loadPosData = async () => {
    setPosLoading(true);
    try {
      const [statsRes, custRes, chargesRes] = await Promise.all([
        fetch("/api/v1/payments/pos-stats", { credentials: "include" }).catch(
          () => null,
        ),
        fetch(
          `/api/v1/payments/customers?search=${encodeURIComponent(posSearch)}&limit=50`,
          { credentials: "include" },
        ).catch(() => null),
        fetch("/api/v1/payments/ngo-charges?limit=100", {
          credentials: "include",
        }).catch(() => null),
      ]);
      if (statsRes?.ok) setPosStats((await statsRes.json()).data);
      if (custRes?.ok) setPosCustomers((await custRes.json()).data || []);
      if (chargesRes?.ok) setPosCharges((await chargesRes.json()).data || []);
    } catch {
      /* silent */
    }
    setPosLoading(false);
  };

  useEffect(() => {
    loadPosData();
  }, [posSearch]);

  // ─── POS CHARGE HANDLER ──────────────────────────────────────────
  const handlePosCharge = async () => {
    if (!chargeForm.cardId || !chargeForm.amount) return;
    setChargeLoading(true);
    setChargeResult(null);
    try {
      const res = await fetch("/api/v1/payments/charge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: parseInt(chargeForm.cardId),
          amount: parseFloat(chargeForm.amount),
          currency: chargeForm.currency,
          description: chargeForm.description || "NGO Activity Charge",
          category: chargeForm.category,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChargeResult({
          success: true,
          message: `✅ Charged ${chargeForm.currency} ${parseFloat(chargeForm.amount).toFixed(2)} successfully! Intent: ${data.data?.paymentIntent?.id}`,
        });
        setChargeForm((prev) => ({ ...prev, amount: "", description: "" }));
        loadPosData(); // Refresh stats
      } else {
        setChargeResult({
          success: false,
          message: `❌ ${data.error || "Charge failed"}`,
        });
      }
    } catch (err: any) {
      setChargeResult({
        success: false,
        message: `❌ Network error: ${err.message}`,
      });
    }
    setChargeLoading(false);
  };

  // ─── POS REFUND HANDLER ──────────────────────────────────────────
  const handleRefund = async (chargeId: string) => {
    if (!confirm("Process refund for this charge?")) return;
    try {
      const res = await fetch("/api/v1/payments/refund", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId }),
      });
      const data = await res.json();
      if (data.success) {
        loadPosData();
      } else {
        alert(data.error || "Refund failed");
      }
    } catch {
      alert("Network error");
    }
  };

  const totalRevenue = useMemo(
    () =>
      transactions
        .filter((t) => t.status === "completed")
        .reduce((s, t) => s + parseFloat(t.amount || "0"), 0),
    [transactions],
  );
  const pendingRevenue = useMemo(
    () =>
      transactions
        .filter((t) => t.status === "pending")
        .reduce((s, t) => s + parseFloat(t.amount || "0"), 0),
    [transactions],
  );
  const failedCount = useMemo(
    () => transactions.filter((t) => t.status === "failed").length,
    [transactions],
  );
  const typeBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    transactions.forEach((t) => {
      if (!map[t.type]) map[t.type] = { count: 0, total: 0 };
      map[t.type].count++;
      map[t.type].total += parseFloat(t.amount || "0");
    });
    return map;
  }, [transactions]);

  return (
    <>
      {/* Revenue KPI Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CircleDollarSign className="h-4 w-4 text-green-500" />
            <span className="text-[10px] text-gray-500 font-mono">
              TOTAL REVENUE
            </span>
          </div>
          <div className="text-2xl font-black text-green-400 font-mono">
            $
            {totalRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[10px] text-gray-600 font-mono">
            {transactions.filter((t) => t.status === "completed").length}{" "}
            completed
          </div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] text-gray-500 font-mono">PENDING</span>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            $
            {pendingRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[10px] text-gray-600 font-mono">
            {transactions.filter((t) => t.status === "pending").length} pending
          </div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-[10px] text-gray-500 font-mono">FAILED</span>
          </div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {failedCount}
          </div>
          <div className="text-[10px] text-gray-600 font-mono">
            payment failures
          </div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard
              className={`h-4 w-4 ${stripeStatus === "active" ? "text-purple-500" : "text-gray-600"}`}
            />
            <span className="text-[10px] text-gray-500 font-mono">STRIPE</span>
          </div>
          <div
            className={`text-2xl font-black font-mono ${stripeStatus === "active" ? "text-purple-400" : stripeStatus === "inactive" ? "text-gray-600" : "text-gray-700"}`}
          >
            {stripeStatus === "active"
              ? "LIVE"
              : stripeStatus === "inactive"
                ? "OFF"
                : "..."}
          </div>
          <div className="text-[10px] text-gray-600 font-mono">
            {stripeStatus === "active"
              ? "Payments accepting"
              : "Set STRIPE_SECRET_KEY"}
          </div>
        </div>
      </div>

      {/* Stripe Integration */}
      <SectionBlock
        title="STRIPE PAYMENT GATEWAY"
        icon={<CreditCard className="w-3.5 h-3.5 text-white" />}
        color="purple"
      >
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
          <InfoRow label="SDK Version" value="Stripe 20.x" />
          <InfoRow label="API Version" value="2025-02-24.acacia" />
          <InfoRow
            label="Mode"
            value={
              stripeStatus === "active"
                ? "LIVE — accepting payments"
                : "DISABLED — no API key"
            }
          />
          <InfoRow
            label="Init Strategy"
            value="Lazy (only if STRIPE_SECRET_KEY set)"
          />
          <InfoRow label="Checkout Mode" value="payment (one-time)" />
          <InfoRow
            label="Webhook Events"
            value="checkout.session.completed, payment_intent.payment_failed"
          />
          <InfoRow
            label="Customer Portal"
            value="/api/v1/payments/create-portal → Stripe-hosted"
          />
          <InfoRow
            label="Webhook Body"
            value="Raw body via express.raw({ type: application/json })"
          />
        </div>
        <div className="mt-3 pt-3 border-t border-gray-800/30">
          <div className="text-[10px] font-mono text-gray-500 mb-2 font-bold">
            ENVIRONMENT VARIABLES
          </div>
          <InfoRow
            label="STRIPE_SECRET_KEY"
            value={
              stripeStatus === "active"
                ? "sk_live_****** (configured)"
                : "NOT SET — payments disabled"
            }
          />
          <InfoRow
            label="STRIPE_WEBHOOK_SECRET"
            value="whsec_****** (optional, skips verify in dev)"
          />
          <InfoRow
            label="VITE_STRIPE_PUBLISHABLE_KEY"
            value="pk_****** (client-side)"
          />
        </div>
      </SectionBlock>

      {/* Pricing & Tier Revenue Model */}
      <SectionBlock
        title="SUBSCRIPTION PRICING MODEL"
        icon={<Banknote className="w-3.5 h-3.5 text-white" />}
        color="green"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800/50">
                <th className="text-left py-2 px-2">TIER</th>
                <th className="text-right py-2 px-2">MONTHLY</th>
                <th className="text-right py-2 px-2">ANNUAL</th>
                <th className="text-right py-2 px-2">SAVE</th>
                <th className="text-center py-2 px-2">RANKING</th>
              </tr>
            </thead>
            <tbody className="text-gray-400">
              {[
                {
                  tier: "Free",
                  mo: "$0",
                  yr: "$0",
                  save: "—",
                  rank: "1×",
                  color: "text-gray-500",
                },
                {
                  tier: "Essential",
                  mo: "$29",
                  yr: "$290",
                  save: "17%",
                  rank: "2×",
                  color: "text-blue-400",
                },
                {
                  tier: "Verified",
                  mo: "$79",
                  yr: "$790",
                  save: "17%",
                  rank: "4×",
                  color: "text-green-400",
                },
                {
                  tier: "Max",
                  mo: "$149",
                  yr: "$1,490",
                  save: "17%",
                  rank: "6×",
                  color: "text-amber-400",
                },
                {
                  tier: "Enterprise",
                  mo: "$499",
                  yr: "$4,990",
                  save: "17%",
                  rank: "10×",
                  color: "text-red-400",
                },
              ].map((row) => (
                <tr
                  key={row.tier}
                  className="border-b border-gray-800/20 hover:bg-gray-800/20"
                >
                  <td className={`py-2 px-2 font-bold ${row.color}`}>
                    {row.tier}
                  </td>
                  <td className="py-2 px-2 text-right">{row.mo}</td>
                  <td className="py-2 px-2 text-right">{row.yr}</td>
                  <td className="py-2 px-2 text-right text-green-500">
                    {row.save}
                  </td>
                  <td className="py-2 px-2 text-center text-purple-400">
                    {row.rank}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionBlock>

      {/* Transaction Type Breakdown */}
      <SectionBlock
        title="REVENUE BY TYPE"
        icon={<BarChart3 className="w-3.5 h-3.5 text-white" />}
        color="blue"
      >
        {Object.keys(typeBreakdown).length === 0 ? (
          <div className="text-center py-4 text-gray-600 font-mono text-[11px]">
            No transactions recorded yet
          </div>
        ) : (
          Object.entries(typeBreakdown).map(([type, data]) => (
            <div
              key={type}
              className="flex items-center justify-between py-2 border-b border-gray-800/20 last:border-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-400 font-mono">
                  {type}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-gray-600 font-mono">
                  {data.count} txns
                </span>
                <span className="text-[11px] text-green-400 font-mono font-bold">
                  $
                  {data.total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </SectionBlock>

      {/* Transaction History */}
      <SectionBlock
        title="TRANSACTION HISTORY"
        icon={<Receipt className="w-3.5 h-3.5 text-white" />}
        color="cyan"
      >
        {loading ? (
          <div className="text-center py-8 text-gray-600 font-mono text-[11px]">
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="h-8 w-8 text-gray-700 mx-auto mb-2" />
            <div className="text-gray-600 font-mono text-[11px]">
              No transactions yet
            </div>
            <div className="text-gray-700 font-mono text-[10px] mt-1">
              Transactions appear when users make payments via Stripe
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.slice(0, 30).map((tx) => {
              const statusColor =
                {
                  completed: "text-green-400 bg-green-500/10",
                  pending: "text-amber-400 bg-amber-500/10",
                  failed: "text-red-400 bg-red-500/10",
                }[tx.status] || "text-gray-400 bg-gray-500/10";
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-800/20 border-b border-gray-800/10"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${tx.status === "completed" ? "bg-green-500/10" : tx.status === "failed" ? "bg-red-500/10" : "bg-amber-500/10"}`}
                  >
                    {tx.status === "completed" ? (
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                    ) : tx.status === "failed" ? (
                      <X className="h-3 w-3 text-red-400" />
                    ) : (
                      <Clock className="h-3 w-3 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-white font-mono font-bold">
                        $
                        {parseFloat(tx.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${statusColor}`}
                      >
                        {tx.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-gray-600 font-mono">
                        {tx.type}
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-700 font-mono truncate">
                      {tx.reference ? `ref: ${tx.reference}` : `id: ${tx.id}`}
                      {tx.userId ? ` • user:${tx.userId}` : ""}
                    </div>
                  </div>
                  <div className="text-[9px] text-gray-600 font-mono text-right flex-shrink-0">
                    {new Date(tx.createdAt).toLocaleDateString()}
                    <br />
                    {new Date(tx.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionBlock>

      {/* Payment Endpoints */}
      <SectionBlock
        title="PAYMENT API ENDPOINTS"
        icon={<Plug className="w-3.5 h-3.5 text-white" />}
        color="amber"
      >
        <ApiEndpoint
          method="POST"
          path="/api/v1/payments/create-checkout"
          desc="Create Stripe Checkout (tier + period)"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/payments/webhook"
          desc="Stripe webhook (session.completed / failed)"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/payments/billing-history"
          desc="User's paginated transaction history"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/payments/create-portal"
          desc="Stripe Customer Portal session"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/subscription/status"
          desc="Current tier + effective tier + trial info"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/subscription/upgrade"
          desc="Upgrade tier or start 7-day trial"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/subscription/downgrade"
          desc="Downgrade to lower tier"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/subscription/feature-check"
          desc="Check feature access for tier"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/subscription/tiers"
          desc="All tier definitions + pricing"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/subscription/cancel-trial"
          desc="Cancel active trial"
        />
      </SectionBlock>

      {/* Webhook Processing */}
      <SectionBlock
        title="WEBHOOK & PAYMENT FLOW"
        icon={<ArrowRightLeft className="w-3.5 h-3.5 text-white" />}
        color="red"
      >
        <div className="font-mono text-[11px] text-gray-400 bg-black/40 rounded-lg p-4 leading-relaxed space-y-2">
          <div className="text-green-400 font-bold">▸ CHECKOUT FLOW:</div>
          <div className="ml-4">
            1. Client →{" "}
            <span className="text-cyan-400">
              POST /api/v1/payments/create-checkout
            </span>{" "}
            {`{ tier, period }`}
          </div>
          <div className="ml-4">
            2. Server → Creates{" "}
            <span className="text-purple-400">Stripe Checkout Session</span>{" "}
            (one-time payment mode)
          </div>
          <div className="ml-4">
            3. Client → Redirected to{" "}
            <span className="text-purple-400">Stripe-hosted checkout page</span>
          </div>
          <div className="ml-4">
            4. On success → Stripe fires{" "}
            <span className="text-amber-400">checkout.session.completed</span>{" "}
            webhook
          </div>
          <div className="ml-4">
            5. Server → Records{" "}
            <span className="text-green-400">transaction</span> + upgrades
            user's <span className="text-green-400">subscriptionTier</span>
          </div>
          <div className="text-red-400 font-bold mt-3">▸ FAILURE FLOW:</div>
          <div className="ml-4">
            1. Stripe fires{" "}
            <span className="text-red-400">payment_intent.payment_failed</span>
          </div>
          <div className="ml-4">2. Server → Records failed transaction</div>
          <div className="ml-4">
            3. User tier unchanged, notified of failure
          </div>
          <div className="text-amber-400 font-bold mt-3">▸ EXPIRY FLOW:</div>
          <div className="ml-4">
            1. Daily cron (
            <span className="text-cyan-400">subscription-scheduler.ts</span>)
            checks <span className="text-gray-500">premiumExpiresAt</span>
          </div>
          <div className="ml-4">
            2. Expired paid → tier reverts to{" "}
            <span className="text-gray-500">free</span>, status →{" "}
            <span className="text-gray-500">expired</span>
          </div>
          <div className="ml-4">
            3. Expired trial →{" "}
            <span className="text-gray-500">trialTier = null</span>, tier
            restored
          </div>
        </div>
      </SectionBlock>

      {/* DB Schema */}
      <SectionBlock
        title="FINANCIAL DATABASE SCHEMA"
        icon={<Table2 className="w-3.5 h-3.5 text-white" />}
        color="cyan"
      >
        <DbTable
          name="transactions"
          columns="id (uuid PK), business_id (FK → businesses), user_id (FK → users), amount (decimal 12,2), type (varchar: ad_topup | subscription_fee), status (varchar: pending | completed | failed), reference (varchar unique — Stripe session ID), created_at"
        />
        <DbTable
          name="users (financial fields)"
          columns="subscription_tier (free|essential|verified|max|enterprise), subscription_status (active|cancelled|past_due|trialing|expired), premium_expires_at (timestamp), trial_tier (varchar), trial_started_at (timestamp), trial_expires_at (timestamp)"
        />
        <DbTable
          name="adCampaigns"
          columns="id, name, budget (decimal), status, start_date, end_date, target_audience, impressions, clicks, created_at"
        />
        <DbTable
          name="paymentCardTypes"
          columns="id, name, code (unique), description, created_at"
        />
        <DbTable
          name="savedPaymentMethods"
          columns="id, user_id (FK), stripe_payment_method_id, stripe_customer_id, card_brand, card_last4, card_exp_month, card_exp_year, cardholder_name, is_default, label, preauthorized, max_charge_amount, currency, status, created_at"
        />
        <DbTable
          name="ngoCharges"
          columns="id (uuid), payment_method_id (FK), user_id (FK), amount (decimal 12,2), currency, description, category, stripe_payment_intent_id, status, receipt_url, processed_by (FK), refunded_at, refund_reason, metadata, created_at"
        />
      </SectionBlock>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ░░░ NGO POS TERMINAL ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      <div className="mt-6 mb-3">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-black font-mono bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              NGO POS TERMINAL
            </h3>
            <p className="text-[9px] text-gray-600 font-mono">
              PRE-AUTHORIZED CARD MANAGEMENT • DIRECT CHARGE PROCESSING • SECURE
              TOKENIZED
            </p>
          </div>
        </div>

        {/* POS Navigation */}
        <div className="flex gap-1 mb-4 bg-gray-950/50 border border-gray-800/50 rounded-lg p-1">
          {(
            [
              {
                key: "dashboard" as const,
                label: "DASHBOARD",
                icon: "📊",
              },
              {
                key: "customers" as const,
                label: "CARD VAULT",
                icon: "🏦",
              },
              {
                key: "terminal" as const,
                label: "CHARGE",
                icon: "💳",
              },
              {
                key: "history" as const,
                label: "RECEIPTS",
                icon: "🧾",
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPosView(tab.key)}
              className={`flex-1 py-2 px-2 rounded-md text-[10px] font-mono font-bold transition-all ${
                posView === tab.key
                  ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border border-orange-500/30"
                  : "text-gray-600 hover:text-gray-400 hover:bg-gray-800/30"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── POS DASHBOARD ───────────────────────────────────────────── */}
      {posView === "dashboard" && (
        <SectionBlock
          title="POS OPERATIONS DASHBOARD"
          icon={<BarChart3 className="w-3.5 h-3.5 text-white" />}
          color="amber"
        >
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
            {[
              {
                label: "CUSTOMERS",
                value: posStats?.total_customers || "0",
                color: "text-blue-400",
                icon: "👥",
              },
              {
                label: "CARDS STORED",
                value: posStats?.total_cards || "0",
                color: "text-purple-400",
                icon: "💳",
              },
              {
                label: "PRE-AUTH",
                value: posStats?.preauthorized_cards || "0",
                color: "text-green-400",
                icon: "✅",
              },
              {
                label: "CHARGED",
                value: posStats?.successful_charges || "0",
                color: "text-cyan-400",
                icon: "💰",
              },
              {
                label: "REFUNDED",
                value: posStats?.refunded_charges || "0",
                color: "text-red-400",
                icon: "↩️",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-black/40 rounded-lg p-3 border border-gray-800/30"
              >
                <div className="text-[9px] text-gray-600 font-mono">
                  {stat.icon} {stat.label}
                </div>
                <div
                  className={`text-xl font-black font-mono ${stat.color} mt-1`}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
              <div className="text-[9px] text-green-600 font-mono font-bold mb-1">
                TOTAL REVENUE
              </div>
              <div className="text-2xl font-black text-green-400 font-mono">
                $
                {parseFloat(posStats?.total_revenue || "0").toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 },
                )}
              </div>
            </div>
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
              <div className="text-[9px] text-cyan-600 font-mono font-bold mb-1">
                THIS MONTH
              </div>
              <div className="text-2xl font-black text-cyan-400 font-mono">
                $
                {parseFloat(posStats?.revenue_this_month || "0").toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 },
                )}
              </div>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
              <div className="text-[9px] text-amber-600 font-mono font-bold mb-1">
                TODAY
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                $
                {parseFloat(posStats?.revenue_today || "0").toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 },
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/30">
            <div className="text-[10px] font-mono text-gray-500 mb-2 font-bold">
              NGO POS API ENDPOINTS
            </div>
            <ApiEndpoint
              method="POST"
              path="/api/v1/payments/setup-intent"
              desc="Create SetupIntent for card pre-authorization"
            />
            <ApiEndpoint
              method="POST"
              path="/api/v1/payments/save-card"
              desc="Save tokenized card to user (after SetupIntent)"
            />
            <ApiEndpoint
              method="GET"
              path="/api/v1/payments/cards/:userId"
              desc="List saved cards for a user"
            />
            <ApiEndpoint
              method="DELETE"
              path="/api/v1/payments/cards/:cardId"
              desc="Remove/revoke saved card"
            />
            <ApiEndpoint
              method="POST"
              path="/api/v1/payments/charge"
              desc="POS charge against pre-authorized card"
            />
            <ApiEndpoint
              method="POST"
              path="/api/v1/payments/refund"
              desc="Refund an NGO charge"
            />
            <ApiEndpoint
              method="GET"
              path="/api/v1/payments/customers"
              desc="List all customers with saved cards"
            />
            <ApiEndpoint
              method="GET"
              path="/api/v1/payments/ngo-charges"
              desc="NGO charge history with filters"
            />
            <ApiEndpoint
              method="GET"
              path="/api/v1/payments/pos-stats"
              desc="POS terminal dashboard statistics"
            />
          </div>
        </SectionBlock>
      )}

      {/* ── CARD VAULT (Customer List) ──────────────────────────────── */}
      {posView === "customers" && (
        <SectionBlock
          title="CUSTOMER CARD VAULT"
          icon={<Shield className="w-3.5 h-3.5 text-white" />}
          color="purple"
        >
          <div className="mb-3">
            <input
              type="text"
              value={posSearch}
              onChange={(e) => setPosSearch(e.target.value)}
              placeholder="Search customers by name or email..."
              className="w-full bg-black/40 border border-gray-800/50 rounded-lg px-3 py-2 text-[11px] text-gray-300 font-mono placeholder:text-gray-700 focus:border-purple-500/50 focus:outline-none"
            />
          </div>

          {posLoading ? (
            <div className="text-center py-8 text-gray-600 font-mono text-[11px]">
              Loading card vault...
            </div>
          ) : posCustomers.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-8 w-8 text-gray-700 mx-auto mb-2" />
              <div className="text-gray-600 font-mono text-[11px]">
                No customers with saved cards
              </div>
              <div className="text-gray-700 font-mono text-[10px] mt-1">
                Cards appear when users pre-authorize via SetupIntent
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {posCustomers.map((customer) => (
                <div
                  key={customer.user_id}
                  className={`border rounded-lg transition-all cursor-pointer ${
                    selectedCustomer?.user_id === customer.user_id
                      ? "border-purple-500/50 bg-purple-500/5"
                      : "border-gray-800/30 bg-black/20 hover:border-gray-700/50"
                  }`}
                  onClick={() =>
                    setSelectedCustomer(
                      selectedCustomer?.user_id === customer.user_id
                        ? null
                        : customer,
                    )
                  }
                >
                  {/* Customer Header */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {(customer.username || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[11px] text-white font-mono font-bold">
                          {customer.username}
                        </div>
                        <div className="text-[9px] text-gray-600 font-mono">
                          {customer.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                        {customer.subscription_tier?.toUpperCase() || "FREE"}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                        {customer.card_count} card
                        {parseInt(customer.card_count) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Expanded — Card Details */}
                  {selectedCustomer?.user_id === customer.user_id &&
                    customer.cards && (
                      <div className="px-3 pb-3 border-t border-gray-800/20 pt-2">
                        <div className="space-y-1.5">
                          {customer.cards.map((card: any) => (
                            <div
                              key={card.id}
                              className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-900/60 border border-gray-800/30"
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-lg">
                                  {card.brand === "visa"
                                    ? "💳"
                                    : card.brand === "mastercard"
                                      ? "🔶"
                                      : card.brand === "amex"
                                        ? "💎"
                                        : "💳"}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-white font-mono font-bold">
                                      {(card.brand || "CARD").toUpperCase()}{" "}
                                      •••• {card.last4}
                                    </span>
                                    {card.card_funding && (
                                      <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-slate-500/10 text-slate-400 uppercase">
                                        {card.card_funding}
                                      </span>
                                    )}
                                    {card.cvc_check && (
                                      <span
                                        className={`text-[8px] font-mono px-1 py-0.5 rounded ${
                                          card.cvc_check === "pass"
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : card.cvc_check === "fail"
                                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                              : "bg-gray-500/10 text-gray-400"
                                        }`}
                                      >
                                        CVC{" "}
                                        {card.cvc_check === "pass"
                                          ? "✓"
                                          : card.cvc_check === "fail"
                                            ? "✗"
                                            : "?"}
                                      </span>
                                    )}
                                    {card.preauthorized && (
                                      <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                        PRE-AUTH
                                      </span>
                                    )}
                                    {card.is_default && (
                                      <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-blue-500/10 text-blue-400">
                                        DEFAULT
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-gray-600 font-mono">
                                    Exp {card.exp_month}/{card.exp_year}
                                    {card.card_country
                                      ? ` • 🌍 ${card.card_country}`
                                      : ""}
                                    {card.label ? ` • ${card.label}` : ""}
                                  </div>
                                  {card.cardholder && (
                                    <div className="text-[9px] text-cyan-400 font-mono mt-0.5">
                                      👤 {card.cardholder}
                                    </div>
                                  )}
                                  {card.card_issuer && (
                                    <div className="text-[9px] text-violet-400 font-mono">
                                      🏦 {card.card_issuer}
                                    </div>
                                  )}
                                  {(card.billing_address_line1 ||
                                    card.billing_city ||
                                    card.billing_email ||
                                    card.billing_phone) && (
                                    <div className="text-[9px] text-gray-500 font-mono mt-0.5 space-y-px">
                                      {card.billing_address_line1 && (
                                        <div>
                                          📍 {card.billing_address_line1}
                                          {card.billing_address_line2
                                            ? `, ${card.billing_address_line2}`
                                            : ""}
                                        </div>
                                      )}
                                      {(card.billing_city ||
                                        card.billing_state ||
                                        card.billing_postal_code) && (
                                        <div className="pl-5">
                                          {[
                                            card.billing_city,
                                            card.billing_state,
                                            card.billing_postal_code,
                                            card.billing_country,
                                          ]
                                            .filter(Boolean)
                                            .join(", ")}
                                        </div>
                                      )}
                                      {card.billing_email && (
                                        <div>✉️ {card.billing_email}</div>
                                      )}
                                      {card.billing_phone && (
                                        <div>📞 {card.billing_phone}</div>
                                      )}
                                    </div>
                                  )}
                                  {card.max_charge && (
                                    <div className="text-[9px] text-amber-500 font-mono mt-0.5">
                                      Max charge: {card.currency || "USD"} $
                                      {card.max_charge}
                                    </div>
                                  )}
                                  {card.card_fingerprint && (
                                    <div className="text-[8px] text-gray-700 font-mono mt-0.5">
                                      🔑{" "}
                                      {card.card_fingerprint.substring(0, 12)}…
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChargeForm((prev) => ({
                                      ...prev,
                                      cardId: String(card.id),
                                    }));
                                    setPosView("terminal");
                                  }}
                                  className="px-2 py-1 text-[9px] font-mono bg-green-500/10 text-green-400 border border-green-500/20 rounded hover:bg-green-500/20 transition-colors"
                                  title="Charge this card"
                                >
                                  ⚡ CHARGE
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-[9px] text-gray-700 font-mono">
                          Stripe Customer:{" "}
                          {customer.stripe_customer_id || "Not linked"}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </SectionBlock>
      )}

      {/* ── POS CHARGE TERMINAL ─────────────────────────────────────── */}
      {posView === "terminal" && (
        <SectionBlock
          title="CHARGE TERMINAL"
          icon={<Zap className="w-3.5 h-3.5 text-white" />}
          color="green"
        >
          <div className="max-w-lg mx-auto">
            {/* Terminal Display */}
            <div className="bg-black border-2 border-green-500/30 rounded-xl p-6 mb-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="text-center mb-6">
                  <div className="text-[9px] text-green-600 font-mono tracking-[0.3em] mb-1">
                    VERSO AIR NGO • PAYMENT TERMINAL
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
                </div>

                {/* Card Selection */}
                <div className="mb-4">
                  <label className="text-[9px] text-green-500/70 font-mono block mb-1">
                    SELECT CARD
                  </label>
                  <select
                    value={chargeForm.cardId}
                    onChange={(e) =>
                      setChargeForm((prev) => ({
                        ...prev,
                        cardId: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-950 border border-green-500/20 rounded-lg px-3 py-2.5 text-[11px] text-green-300 font-mono focus:border-green-500/50 focus:outline-none appearance-none"
                  >
                    <option value="">-- Select pre-authorized card --</option>
                    {posCustomers.flatMap((c) =>
                      (c.cards || [])
                        .filter(
                          (card: any) =>
                            card.preauthorized && card.status === "active",
                        )
                        .map((card: any) => (
                          <option key={card.id} value={String(card.id)}>
                            {c.username} —{" "}
                            {(card.brand || "card").toUpperCase()} ••••{" "}
                            {card.last4} ({card.exp_month}/{card.exp_year})
                          </option>
                        )),
                    )}
                  </select>
                </div>

                {/* Amount */}
                <div className="mb-4">
                  <label className="text-[9px] text-green-500/70 font-mono block mb-1">
                    AMOUNT
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={chargeForm.currency}
                      onChange={(e) =>
                        setChargeForm((prev) => ({
                          ...prev,
                          currency: e.target.value,
                        }))
                      }
                      className="bg-gray-950 border border-green-500/20 rounded-lg px-2 py-2.5 text-[11px] text-green-300 font-mono focus:border-green-500/50 focus:outline-none w-20"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="XOF">XOF</option>
                      <option value="XAF">XAF</option>
                      <option value="NGN">NGN</option>
                      <option value="KES">KES</option>
                      <option value="ZAR">ZAR</option>
                      <option value="GHS">GHS</option>
                      <option value="MAD">MAD</option>
                    </select>
                    <input
                      type="number"
                      value={chargeForm.amount}
                      onChange={(e) =>
                        setChargeForm((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      step="0.01"
                      min="0.50"
                      className="flex-1 bg-gray-950 border border-green-500/20 rounded-lg px-3 py-2.5 text-2xl text-green-300 font-mono font-black text-right focus:border-green-500/50 focus:outline-none placeholder:text-green-900"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="mb-4">
                  <label className="text-[9px] text-green-500/70 font-mono block mb-1">
                    CATEGORY
                  </label>
                  <select
                    value={chargeForm.category}
                    onChange={(e) =>
                      setChargeForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-950 border border-green-500/20 rounded-lg px-3 py-2.5 text-[11px] text-green-300 font-mono focus:border-green-500/50 focus:outline-none"
                  >
                    <option value="activity_fee">Activity Fee</option>
                    <option value="donation">Donation</option>
                    <option value="membership">Membership</option>
                    <option value="event">Event</option>
                    <option value="supplies">Supplies</option>
                    <option value="service_fee">Service Fee</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Description */}
                <div className="mb-5">
                  <label className="text-[9px] text-green-500/70 font-mono block mb-1">
                    DESCRIPTION
                  </label>
                  <input
                    type="text"
                    value={chargeForm.description}
                    onChange={(e) =>
                      setChargeForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="e.g. Monthly membership fee"
                    className="w-full bg-gray-950 border border-green-500/20 rounded-lg px-3 py-2.5 text-[11px] text-green-300 font-mono focus:border-green-500/50 focus:outline-none placeholder:text-green-900"
                  />
                </div>

                {/* Charge Button */}
                <button
                  onClick={handlePosCharge}
                  disabled={
                    chargeLoading || !chargeForm.cardId || !chargeForm.amount
                  }
                  className={`w-full py-3 rounded-lg font-mono font-black text-sm transition-all ${
                    chargeLoading || !chargeForm.cardId || !chargeForm.amount
                      ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 text-black hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/20"
                  }`}
                >
                  {chargeLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span> PROCESSING...
                    </span>
                  ) : (
                    <span>
                      ⚡ CHARGE{" "}
                      {chargeForm.amount
                        ? `${chargeForm.currency} ${parseFloat(chargeForm.amount).toFixed(2)}`
                        : ""}
                    </span>
                  )}
                </button>

                {/* Charge Result */}
                {chargeResult && (
                  <div
                    className={`mt-4 p-3 rounded-lg border text-[11px] font-mono ${
                      chargeResult.success
                        ? "bg-green-500/10 border-green-500/30 text-green-300"
                        : "bg-red-500/10 border-red-500/30 text-red-300"
                    }`}
                  >
                    {chargeResult.message}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[5, 10, 20, 25, 50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() =>
                    setChargeForm((prev) => ({
                      ...prev,
                      amount: String(amt),
                    }))
                  }
                  className="px-3 py-1.5 text-[10px] font-mono bg-gray-900/60 border border-gray-800/30 rounded-lg text-gray-400 hover:text-green-400 hover:border-green-500/30 transition-colors"
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>
        </SectionBlock>
      )}

      {/* ── CHARGE RECEIPTS / HISTORY ───────────────────────────────── */}
      {posView === "history" && (
        <SectionBlock
          title="NGO CHARGE RECEIPTS"
          icon={<Receipt className="w-3.5 h-3.5 text-white" />}
          color="cyan"
        >
          {posCharges.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-8 w-8 text-gray-700 mx-auto mb-2" />
              <div className="text-gray-600 font-mono text-[11px]">
                No charges processed yet
              </div>
              <div className="text-gray-700 font-mono text-[10px] mt-1">
                Use the CHARGE terminal to process payments
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {posCharges.map((charge) => {
                const statusColors: Record<string, string> = {
                  succeeded: "text-green-400 bg-green-500/10",
                  pending: "text-amber-400 bg-amber-500/10",
                  failed: "text-red-400 bg-red-500/10",
                  refunded: "text-purple-400 bg-purple-500/10",
                };
                const statusColor =
                  statusColors[charge.status] || "text-gray-400 bg-gray-500/10";
                return (
                  <div
                    key={charge.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-800/20 border-b border-gray-800/10"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        charge.status === "succeeded"
                          ? "bg-green-500/10"
                          : charge.status === "refunded"
                            ? "bg-purple-500/10"
                            : charge.status === "failed"
                              ? "bg-red-500/10"
                              : "bg-amber-500/10"
                      }`}
                    >
                      {charge.status === "succeeded" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      ) : charge.status === "refunded" ? (
                        <ArrowRightLeft className="h-3.5 w-3.5 text-purple-400" />
                      ) : charge.status === "failed" ? (
                        <X className="h-3.5 w-3.5 text-red-400" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] text-white font-mono font-black">
                          {charge.currency || "USD"} $
                          {parseFloat(charge.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${statusColor}`}
                        >
                          {charge.status?.toUpperCase()}
                        </span>
                        <span className="text-[9px] text-gray-600 font-mono px-1 py-0.5 bg-gray-800/30 rounded">
                          {charge.category}
                        </span>
                        {charge.card_brand && (
                          <span className="text-[9px] text-gray-500 font-mono">
                            {charge.card_brand?.toUpperCase()} ****
                            {charge.card_last4}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {charge.description || "NGO Charge"}
                        {charge.username ? ` • ${charge.username}` : ""}
                        {charge.processed_by_name
                          ? ` • by ${charge.processed_by_name}`
                          : ""}
                      </div>
                      {charge.refund_reason && (
                        <div className="text-[9px] text-purple-400 font-mono mt-0.5">
                          Refund reason: {charge.refund_reason}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {charge.status === "succeeded" && (
                        <button
                          onClick={() => handleRefund(charge.id)}
                          className="px-2 py-1 text-[8px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors"
                          title="Refund this charge"
                        >
                          REFUND
                        </button>
                      )}
                      <div className="text-[9px] text-gray-600 font-mono text-right">
                        {charge.created_at
                          ? new Date(charge.created_at).toLocaleDateString()
                          : ""}
                        <br />
                        {charge.created_at
                          ? new Date(charge.created_at).toLocaleTimeString()
                          : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionBlock>
      )}

      {/* ═══ VERSO AIR CARD — STRIPE ISSUING + POINTS ═══ */}
      <VersoAirCardPanel />
    </>
  );
