/**
 * Verso Air Card Panel — Stripe Issuing + Points Rewards
 * Extracted from credentials-vault.tsx
 */
import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  DollarSign,
  Banknote,
  Crown,
  Gift,
  Zap,
  Wallet,
  Unlock,
  Ban,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/contexts/AuthContext";
import { SectionBlock } from "./vault-shared";


// ═══════════════════════════════════════════════════════════
// 💳 VERSO AIR CARD — STRIPE ISSUING + POINTS REWARDS
// ═══════════════════════════════════════════════════════════

const TIER_MULTIPLIERS_FALLBACK: Record<string, number> = {
  free: 1.0,
  essential: 1.5,
  verified: 2.0,
  max: 3.0,
  enterprise: 5.0,
};

export default function VersoAirCardPanel() {
  const { user } = useAuthContext();
  const userId = user?.id;
  const [cards, setCards] = useState<any[]>([]);
  const [pointsBalance, setPointsBalance] = useState<any>(null);
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [cardConfig, setCardConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [revealedCard, setRevealedCard] = useState<any>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [rewards, setRewards] = useState<any[]>([]);
  const [redeemLoading, setRedeemLoading] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState<any>(null);
  const [cardholderForm, setCardholderForm] = useState({
    name: user?.name || user?.username || "",
    line1: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
  });

  // Load all data
  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [cardsRes, balanceRes, histRes, configRes, rewardsRes] =
        await Promise.all([
          fetch(`/api/v1/cards/my-cards?userId=${userId}`, {
            credentials: "include",
          }).catch(() => null),
          fetch(`/api/v1/cards/points/balance?userId=${userId}`, {
            credentials: "include",
          }).catch(() => null),
          fetch(
            `/api/v1/cards/points/history?userId=${userId}&limit=10&page=${historyPage}`,
            { credentials: "include" },
          ).catch(() => null),
          fetch(`/api/v1/cards/config`, { credentials: "include" }).catch(
            () => null,
          ),
          fetch(`/api/v1/cards/points/rewards`, {
            credentials: "include",
          }).catch(() => null),
        ]);
      if (cardsRes?.ok) {
        const d = await cardsRes.json();
        setCards(d.data || []);
      }
      if (balanceRes?.ok) {
        const d = await balanceRes.json();
        setPointsBalance(d.data);
      }
      if (histRes?.ok) {
        const d = await histRes.json();
        setPointsHistory(d.data || []);
        setHistoryPagination(d.pagination);
      }
      if (configRes?.ok) {
        const d = await configRes.json();
        setCardConfig(d.data);
      }
      if (rewardsRes?.ok) {
        const d = await rewardsRes.json();
        setRewards(d.data || []);
      }
    } catch {
      /* silent */
    }
    setLoading(false);
  }, [userId, historyPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleIssueCard = async () => {
    if (!userId) return;
    setIssuing(true);
    try {
      const chRes = await fetch("/api/v1/cards/cardholder", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...cardholderForm }),
      });
      const chData = await chRes.json();
      if (!chData.success) throw new Error(chData.error);

      const cardRes = await fetch("/api/v1/cards/issue", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          cardholderId: chData.data.cardholderId,
        }),
      });
      const cardData = await cardRes.json();
      if (!cardData.success) throw new Error(cardData.error);
      await loadData();
    } catch (err: any) {
      console.error("Issue card error:", err);
    }
    setIssuing(false);
  };

  const handleRevealCard = async (cardId: number) => {
    setRevealLoading(true);
    try {
      const res = await fetch(
        `/api/v1/cards/${cardId}/details?userId=${userId}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (data.success) setRevealedCard(data.data);
    } catch {
      /* silent */
    }
    setRevealLoading(false);
  };

  const handleFreeze = async (cardId: number, freeze: boolean) => {
    try {
      await fetch(`/api/v1/cards/${cardId}/freeze`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, freeze }),
      });
      await loadData();
    } catch {
      /* silent */
    }
  };

  const handleCancel = async (cardId: number) => {
    if (!confirm("Permanently cancel this card? This cannot be undone."))
      return;
    try {
      await fetch(`/api/v1/cards/${cardId}/cancel`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setRevealedCard(null);
      await loadData();
    } catch {
      /* silent */
    }
  };

  const handleRedeem = async (rewardId: number) => {
    setRedeemLoading(String(rewardId));
    try {
      const res = await fetch("/api/v1/cards/points/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rewardId }),
      });
      const data = await res.json();
      if (data.success) await loadData();
    } catch {
      /* silent */
    }
    setRedeemLoading(null);
  };

  const tier = user?.subscriptionTier || user?.subscription_tier || "free";
  const multiplier =
    cardConfig?.tierMultipliers?.[tier] ||
    TIER_MULTIPLIERS_FALLBACK[tier] ||
    1.0;
  const activeCards = cards.filter((c: any) => c.card_status === "active");

  return (
    <>
      {/* VERSO AIR CARD HEADER + POINTS SUMMARY */}
      <SectionBlock
        title="VERSO AIR CARD™ — VIRTUAL CARD + POINTS"
        icon={<CreditCard className="w-3.5 h-3.5 text-white" />}
        color="cyan"
      >
        {/* Points summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg p-3 border border-cyan-500/20">
            <div className="text-[9px] text-cyan-500/70 font-mono font-bold mb-1">
              BALANCE
            </div>
            <div className="text-xl font-black text-cyan-400 font-mono">
              {loading ? "..." : (pointsBalance?.balance || 0).toLocaleString()}
            </div>
            <div className="text-[9px] text-gray-500 font-mono mt-0.5">
              points
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-3 border border-green-500/20">
            <div className="text-[9px] text-green-500/70 font-mono font-bold mb-1">
              MULTIPLIER
            </div>
            <div className="text-xl font-black text-green-400 font-mono">
              {multiplier}x
            </div>
            <div className="text-[9px] text-gray-500 font-mono mt-0.5">
              {tier} tier
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-lg p-3 border border-purple-500/20">
            <div className="text-[9px] text-purple-500/70 font-mono font-bold mb-1">
              EARNED
            </div>
            <div className="text-xl font-black text-purple-400 font-mono">
              {loading
                ? "..."
                : (pointsBalance?.totalEarned || 0).toLocaleString()}
            </div>
            <div className="text-[9px] text-gray-500 font-mono mt-0.5">
              lifetime
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg p-3 border border-amber-500/20">
            <div className="text-[9px] text-amber-500/70 font-mono font-bold mb-1">
              THIS MONTH
            </div>
            <div className="text-xl font-black text-amber-400 font-mono">
              {loading
                ? "..."
                : (pointsBalance?.monthEarned || 0).toLocaleString()}
            </div>
            <div className="text-[9px] text-gray-500 font-mono mt-0.5">
              pts earned
            </div>
          </div>
        </div>

        {/* Earning rate info */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-gray-500">
            <Zap className="inline w-3 h-3 text-cyan-400 mr-1" />
            Earn{" "}
            <span className="text-cyan-400 font-bold">
              {cardConfig?.basePointsPerDollar || 10} pts
            </span>{" "}
            per $1 ×{" "}
            <span className="text-green-400 font-bold">{multiplier}x</span> ={" "}
            <span className="text-white font-bold">
              {Math.round((cardConfig?.basePointsPerDollar || 10) * multiplier)}{" "}
              pts/$1
            </span>
          </span>
          {pointsBalance?.expiringSoon > 0 && (
            <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
              ⚠ {pointsBalance.expiringSoon.toLocaleString()} pts expiring in 30
              days
            </span>
          )}
          {pointsBalance?.nextTierMultiplier && (
            <span className="text-[9px] font-mono px-2 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/20">
              ↑ Upgrade to {pointsBalance.nextTierMultiplier.tier}:{" "}
              {pointsBalance.nextTierMultiplier.multiplier}x
            </span>
          )}
        </div>
      </SectionBlock>

      {/* ISSUED CARDS */}
      <SectionBlock
        title={`MY VERSO AIR CARDS (${activeCards.length} active)`}
        icon={<Wallet className="w-3.5 h-3.5 text-white" />}
        color="blue"
      >
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-cyan-500 mx-auto mb-2" />
            <div className="text-[10px] text-gray-500 font-mono">
              Loading cards...
            </div>
          </div>
        ) : cards.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-xl border border-cyan-500/10">
              <CreditCard className="h-10 w-10 text-cyan-500/50 mx-auto mb-3" />
              <div className="text-[13px] text-white font-mono font-bold mb-1">
                Get Your Verso Air Card
              </div>
              <div className="text-[10px] text-gray-500 font-mono max-w-sm mx-auto">
                Virtual debit card powered by Stripe Issuing. Earn{" "}
                {Math.round(
                  (cardConfig?.basePointsPerDollar || 10) * multiplier,
                )}{" "}
                points per dollar spent.
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-gray-500 font-mono font-bold mb-1 block">
                  CARDHOLDER NAME
                </label>
                <input
                  className="w-full bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-[11px] font-mono text-white"
                  value={cardholderForm.name}
                  onChange={(e) =>
                    setCardholderForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Full legal name"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 font-mono font-bold mb-1 block">
                  BILLING ADDRESS
                </label>
                <input
                  className="w-full bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-[11px] font-mono text-white"
                  value={cardholderForm.line1}
                  onChange={(e) =>
                    setCardholderForm((f) => ({ ...f, line1: e.target.value }))
                  }
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <input
                  className="bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-[11px] font-mono text-white"
                  value={cardholderForm.city}
                  onChange={(e) =>
                    setCardholderForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="City"
                />
                <input
                  className="bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-[11px] font-mono text-white"
                  value={cardholderForm.state}
                  onChange={(e) =>
                    setCardholderForm((f) => ({ ...f, state: e.target.value }))
                  }
                  placeholder="State"
                />
                <input
                  className="bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-[11px] font-mono text-white"
                  value={cardholderForm.postal_code}
                  onChange={(e) =>
                    setCardholderForm((f) => ({
                      ...f,
                      postal_code: e.target.value,
                    }))
                  }
                  placeholder="ZIP"
                />
              </div>
            </div>
            <button
              onClick={handleIssueCard}
              disabled={issuing || !cardholderForm.name}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-mono font-bold text-[12px] hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {issuing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> ISSUING CARD...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" /> ISSUE VERSO AIR CARD
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card: any) => {
              const isActive = card.card_status === "active";
              const isFrozen = card.card_status === "inactive";
              const isCanceled = card.card_status === "canceled";
              const isRevealed = revealedCard?.id === card.id;

              return (
                <div
                  key={card.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 border-cyan-500/20"
                      : isFrozen
                        ? "bg-yellow-500/5 border-yellow-500/20"
                        : "bg-gray-800/30 border-gray-700/30 opacity-60"
                  }`}
                >
                  {/* Card visual */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-8 rounded-md flex items-center justify-center text-[10px] font-mono font-black ${
                          isActive
                            ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
                            : isFrozen
                              ? "bg-gradient-to-br from-yellow-500/50 to-amber-600/50 text-yellow-200"
                              : "bg-gray-700 text-gray-500"
                        }`}
                      >
                        {card.card_brand?.toUpperCase() || "VISA"}
                      </div>
                      <div>
                        <div className="text-[12px] font-mono font-black text-white tracking-[3px]">
                          •••• •••• •••• {card.card_last4}
                        </div>
                        <div className="text-[9px] text-gray-500 font-mono">
                          {card.cardholder_name} •{" "}
                          {card.card_exp_month?.toString().padStart(2, "0")}/
                          {card.card_exp_year?.toString().slice(-2)} •{" "}
                          {card.currency}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded ${
                          isActive
                            ? "bg-green-500/10 text-green-400"
                            : isFrozen
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {card.card_status?.toUpperCase()}
                      </span>
                      <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                        {card.points_multiplier}x PTS
                      </span>
                    </div>
                  </div>

                  {/* Revealed full card details (PAN + CVV) */}
                  {isRevealed && revealedCard && (
                    <div className="mb-3 p-3 bg-black/40 rounded-lg border border-cyan-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] text-cyan-500 font-mono font-bold">
                          🔐 SECURE CARD DETAILS
                        </span>
                        <button
                          onClick={() => setRevealedCard(null)}
                          className="text-[9px] text-gray-500 hover:text-gray-400 font-mono"
                        >
                          HIDE
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <div className="text-[8px] text-gray-600 font-mono mb-0.5">
                            CARD NUMBER
                          </div>
                          <div className="text-[13px] font-mono font-black text-white tracking-[2px]">
                            {revealedCard.number
                              ?.replace(/(.{4})/g, "$1 ")
                              .trim() || "••••"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[8px] text-gray-600 font-mono mb-0.5">
                            EXPIRY
                          </div>
                          <div className="text-[13px] font-mono font-black text-white">
                            {revealedCard.expMonth?.toString().padStart(2, "0")}
                            /{revealedCard.expYear?.toString().slice(-2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[8px] text-gray-600 font-mono mb-0.5">
                            CVV
                          </div>
                          <div className="text-[13px] font-mono font-black text-cyan-400">
                            {revealedCard.cvc || "•••"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-[8px] text-gray-600 font-mono flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Secured via Stripe
                        Issuing — never stored locally
                      </div>
                    </div>
                  )}

                  {/* Card info bar */}
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 font-mono mb-3">
                    <span>
                      Limit: ${card.spending_limit_amount?.toLocaleString()}/
                      {card.spending_limit_interval}
                    </span>
                    <span>•</span>
                    <span>Tier: {card.tier_at_issuance}</span>
                    <span>•</span>
                    <span>
                      Issued:{" "}
                      {card.created_at
                        ? new Date(card.created_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>

                  {/* Card actions */}
                  {!isCanceled && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isRevealed ? (
                        <button
                          onClick={() => handleRevealCard(card.id)}
                          disabled={revealLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 text-[10px] font-mono font-bold transition-colors disabled:opacity-50"
                        >
                          {revealLoading ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}{" "}
                          SHOW DETAILS
                        </button>
                      ) : (
                        <button
                          onClick={() => setRevealedCard(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20 text-[10px] font-mono font-bold transition-colors"
                        >
                          <EyeOff className="h-3 w-3" /> HIDE
                        </button>
                      )}
                      <button
                        onClick={() => handleFreeze(card.id, !isFrozen)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[10px] font-mono font-bold transition-colors ${
                          isFrozen
                            ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20"
                        }`}
                      >
                        {isFrozen ? (
                          <>
                            <Unlock className="h-3 w-3" /> UNFREEZE
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" /> FREEZE
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleCancel(card.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-[10px] font-mono font-bold transition-colors"
                      >
                        <Ban className="h-3 w-3" /> CANCEL
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={handleIssueCard}
              disabled={issuing}
              className="w-full py-2.5 rounded-lg border border-dashed border-cyan-500/30 text-cyan-500 font-mono font-bold text-[10px] hover:bg-cyan-500/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {issuing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <CreditCard className="h-3 w-3" />
              )}{" "}
              ISSUE ANOTHER CARD
            </button>
          </div>
        )}
      </SectionBlock>

      {/* POINTS HISTORY */}
      {pointsHistory.length > 0 && (
        <SectionBlock
          title="POINTS ACTIVITY LOG"
          icon={<Activity className="w-3.5 h-3.5 text-white" />}
          color="purple"
        >
          <div className="space-y-1">
            {pointsHistory.map((entry: any) => {
              const isEarn = entry.type === "earn" || entry.type === "bonus";
              const icon =
                entry.type === "earn"
                  ? "💳"
                  : entry.type === "bonus"
                    ? "🎉"
                    : entry.type === "redeem"
                      ? "🎁"
                      : "⏰";
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-800/20 border-b border-gray-800/10"
                >
                  <span className="text-base">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono text-white">
                      {entry.description}
                    </div>
                    <div className="text-[9px] text-gray-600 font-mono">
                      {entry.card_brand &&
                        `${entry.card_brand} ****${entry.card_last4} • `}
                      {entry.merchant_name && `${entry.merchant_name} • `}
                      {entry.transaction_amount
                        ? `$${entry.transaction_amount} • `
                        : ""}
                      {entry.multiplier ? `${entry.multiplier}x` : ""}
                      {entry.category_bonus
                        ? ` + ${entry.category_bonus}x cat bonus`
                        : ""}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`text-[12px] font-mono font-black ${isEarn ? "text-green-400" : "text-red-400"}`}
                    >
                      {isEarn ? "+" : ""}
                      {entry.points?.toLocaleString()} pts
                    </div>
                    <div className="text-[8px] text-gray-600 font-mono">
                      bal: {entry.balance?.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[8px] text-gray-600 font-mono text-right flex-shrink-0">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString()
                      : ""}
                  </div>
                </div>
              );
            })}
          </div>
          {historyPagination && historyPagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-800/30">
              <button
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="px-3 py-1 text-[9px] font-mono bg-gray-800/30 rounded hover:bg-gray-800/50 disabled:opacity-30 text-gray-400"
              >
                ← PREV
              </button>
              <span className="text-[9px] font-mono text-gray-500">
                Page {historyPage}/{historyPagination.pages}
              </span>
              <button
                onClick={() =>
                  setHistoryPage((p) =>
                    Math.min(historyPagination.pages, p + 1),
                  )
                }
                disabled={historyPage >= historyPagination.pages}
                className="px-3 py-1 text-[9px] font-mono bg-gray-800/30 rounded hover:bg-gray-800/50 disabled:opacity-30 text-gray-400"
              >
                NEXT →
              </button>
            </div>
          )}
        </SectionBlock>
      )}

      {/* REWARDS STORE */}
      {rewards.length > 0 && (
        <SectionBlock
          title="REDEEM POINTS — REWARDS STORE"
          icon={<Crown className="w-3.5 h-3.5 text-white" />}
          color="amber"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {rewards.map((reward: any) => {
              const canAfford =
                (pointsBalance?.balance || 0) >= reward.points_cost;
              return (
                <div
                  key={reward.id}
                  className={`rounded-lg border p-3 ${canAfford ? "border-amber-500/20 bg-amber-500/5" : "border-gray-700/30 bg-gray-800/20 opacity-60"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-[11px] font-mono font-bold text-white">
                        {reward.name}
                      </div>
                      <div className="text-[9px] text-gray-500 font-mono">
                        {reward.description}
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                      {reward.reward_type?.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-mono font-black text-amber-400">
                      {reward.points_cost?.toLocaleString()} pts
                    </span>
                    <button
                      onClick={() => handleRedeem(reward.id)}
                      disabled={
                        !canAfford || redeemLoading === String(reward.id)
                      }
                      className="px-3 py-1 text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded hover:bg-amber-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {redeemLoading === String(reward.id)
                        ? "REDEEMING..."
                        : "REDEEM"}
                    </button>
                  </div>
                  {reward.min_tier && reward.min_tier !== "free" && (
                    <div className="text-[8px] text-gray-600 font-mono mt-1">
                      Min tier: {reward.min_tier}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionBlock>
      )}

      {/* TIER MULTIPLIER TABLE */}
      <SectionBlock
        title="POINTS EARNING RATES BY TIER"
        icon={<TrendingUp className="w-3.5 h-3.5 text-white" />}
        color="green"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-gray-800/50">
                <th className="text-left py-2 text-gray-500 font-bold">TIER</th>
                <th className="text-center py-2 text-gray-500 font-bold">
                  MULTIPLIER
                </th>
                <th className="text-center py-2 text-gray-500 font-bold">
                  PTS / $1
                </th>
                <th className="text-center py-2 text-gray-500 font-bold">
                  SPEND LIMIT
                </th>
                <th className="text-center py-2 text-gray-500 font-bold">
                  MAX CARDS
                </th>
                <th className="text-center py-2 text-gray-500 font-bold">
                  WELCOME BONUS
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                cardConfig?.tierMultipliers || TIER_MULTIPLIERS_FALLBACK,
              ).map(([t, m]) => {
                const isCurrent = t === tier;
                const limits = cardConfig?.spendingLimits?.[t] || {
                  amount: "—",
                  interval: "monthly",
                };
                const maxC =
                  cardConfig?.cardLimits?.[t] ||
                  (["verified", "max", "enterprise"].includes(t) ? 3 : 1);
                const bonus = cardConfig?.welcomeBonuses?.[t] || "—";
                return (
                  <tr
                    key={t}
                    className={`border-b border-gray-800/20 ${isCurrent ? "bg-green-500/5" : ""}`}
                  >
                    <td className="py-2">
                      <span
                        className={`font-bold ${isCurrent ? "text-green-400" : "text-gray-400"}`}
                      >
                        {t.toUpperCase()} {isCurrent && "★"}
                      </span>
                    </td>
                    <td className="py-2 text-center text-cyan-400 font-bold">
                      {String(m)}x
                    </td>
                    <td className="py-2 text-center text-white font-bold">
                      {Math.round(
                        (cardConfig?.basePointsPerDollar || 10) * Number(m),
                      )}
                    </td>
                    <td className="py-2 text-center text-gray-400">
                      ${(limits as any).amount?.toLocaleString()}/
                      {(limits as any).interval}
                    </td>
                    <td className="py-2 text-center text-gray-400">
                      {String(maxC)}
                    </td>
                    <td className="py-2 text-center text-amber-400">
                      {typeof bonus === "number"
                        ? bonus.toLocaleString()
                        : bonus}{" "}
                      pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {cardConfig?.categoryBonuses &&
          Object.keys(cardConfig.categoryBonuses).length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-800/30">
              <div className="text-[9px] text-gray-500 font-mono font-bold mb-2">
                CATEGORY BONUSES (stacked with tier multiplier)
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(cardConfig.categoryBonuses).map(
                  ([cat, info]: [string, any]) => (
                    <span
                      key={cat}
                      className="text-[9px] font-mono px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20"
                    >
                      {info.label}: +{info.bonus}x
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
      </SectionBlock>
    </>
  );
}
