import { useState, useEffect, useCallback } from "react";
import { authenticatedFetch } from "@/lib/auth";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Plus,
  Trash2,
  Star,
  Shield,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { Link, useSearch } from "wouter";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SavedCard {
  id: number;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  cardholder_name: string | null;
  billing_email: string | null;
  card_funding: string | null;
  is_default: boolean;
  label: string | null;
  status: string;
  created_at: string;
}

// ─── Brand Colors / Icons ───────────────────────────────────────────────────────

function cardBrandIcon(brand: string) {
  const b = (brand || "").toLowerCase();
  if (b.includes("visa"))
    return (
      <span className="text-[#1A1F71] font-extrabold text-sm tracking-tight">
        VISA
      </span>
    );
  if (b.includes("mastercard") || b.includes("master"))
    return (
      <span className="text-[#EB001B] font-extrabold text-sm tracking-tight">
        MC
      </span>
    );
  if (b.includes("amex") || b.includes("american"))
    return (
      <span className="text-[#006FCF] font-extrabold text-sm tracking-tight">
        AMEX
      </span>
    );
  if (b.includes("discover"))
    return (
      <span className="text-[#FF6000] font-extrabold text-sm tracking-tight">
        DISC
      </span>
    );
  return <CreditCard className="h-5 w-5 text-gray-400" />;
}

function cardBrandGradient(brand: string) {
  const b = (brand || "").toLowerCase();
  if (b.includes("visa")) return "from-blue-600 to-blue-800";
  if (b.includes("mastercard") || b.includes("master"))
    return "from-red-500 to-orange-600";
  if (b.includes("amex") || b.includes("american"))
    return "from-cyan-600 to-blue-700";
  if (b.includes("discover")) return "from-orange-500 to-amber-600";
  return "from-gray-600 to-gray-800";
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function CardVaultPage() {
  const { user, tier, tierName } = useSubscription();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);

  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Card redirect
  const [addLoading, setAddLoading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SavedCard | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Default-setting
  const [defaultLoading, setDefaultLoading] = useState<number | null>(null);

  // ─── Show toast on return from Stripe ───────────────────────────────────────

  useEffect(() => {
    const cardAdded = searchParams.get("card_added");
    if (cardAdded === "true") {
      toast({
        title: "Card registered",
        description:
          "Your payment method has been securely saved by Stripe.",
      });
      // Clean URL
      window.history.replaceState({}, "", "/account/cards");
    } else if (cardAdded === "false") {
      toast({
        title: "Card not added",
        description: "You cancelled the card setup. No card was saved.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/account/cards");
    }
  }, []);

  // ─── Fetch Cards ────────────────────────────────────────────────────────────

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authenticatedFetch("/api/v1/payments/my-cards");
      if (!res.ok) throw new Error("Failed to load saved cards");
      const data = await res.json();
      setCards(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // ─── Add Card → Stripe Hosted Page ─────────────────────────────────────────

  async function handleAddCard() {
    try {
      setAddLoading(true);

      const res = await authenticatedFetch(
        "/api/v1/payments/add-card-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to start card setup");
      }

      const data = await res.json();

      if (data.data?.url) {
        // Redirect to Stripe's secure hosted page
        window.location.href = data.data.url;
      } else {
        throw new Error("No redirect URL received from Stripe");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      setAddLoading(false);
    }
  }

  // ─── Set Default ────────────────────────────────────────────────────────────

  async function handleSetDefault(cardId: number) {
    try {
      setDefaultLoading(cardId);
      const res = await authenticatedFetch(
        `/api/v1/payments/cards/${cardId}/default`,
        { method: "PUT" },
      );
      if (!res.ok) throw new Error("Failed to set default card");
      toast({
        title: "Default updated",
        description: "This card is now your default payment method.",
      });
      fetchCards();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDefaultLoading(null);
    }
  }

  // ─── Delete Card ────────────────────────────────────────────────────────────

  async function handleDeleteCard() {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      const res = await authenticatedFetch(
        `/api/v1/payments/cards/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to remove card");
      toast({
        title: "Card removed",
        description: `Card ending in ${deleteTarget.card_last4} has been removed.`,
      });
      setDeleteTarget(null);
      fetchCards();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/account/billing">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="h-6 w-6 text-amber-600" />
                Card Vault
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Payment methods are registered automatically via Stripe
              </p>
            </div>
          </div>
          <Button
            onClick={handleAddCard}
            disabled={addLoading}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            {addLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Card
          </Button>
        </div>

        {/* How it works banner */}
        <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                  Automatic & Secure Registration
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Cards are registered automatically when you complete a
                  subscription payment or add a card via Stripe's secure
                  checkout. Your card numbers never touch our servers — all
                  credentials are handled directly by Stripe (PCI Level 1
                  certified).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Info Banner */}
        <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Current Plan:{" "}
                  <span className="text-amber-700 dark:text-amber-400 capitalize">
                    {tierName || tier || "Free"}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.email || "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/pricing">
                <Button variant="outline" size="sm" className="text-xs">
                  View Plans
                </Button>
              </Link>
              <Link href="/account/billing">
                <Button variant="outline" size="sm" className="text-xs">
                  Billing History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Cards List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-10 text-center text-red-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
              <Button onClick={fetchCards} variant="outline" className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : cards.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CreditCard className="h-14 w-14 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No saved cards yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 max-w-md mx-auto">
                Cards are registered automatically when you purchase a
                subscription. You can also add a card via Stripe's secure
                checkout page.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                Your card details are handled entirely by Stripe — we never see
                your full card number.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleAddCard}
                  disabled={addLoading}
                  className="gap-2 bg-amber-600 hover:bg-amber-700"
                >
                  {addLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Add Card via Stripe
                </Button>
                <Link href="/pricing">
                  <Button variant="outline" className="gap-2">
                    <Wallet className="h-4 w-4" />
                    Subscribe to a Plan
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card) => (
              <Card
                key={card.id}
                className={`relative overflow-hidden transition-shadow hover:shadow-lg ${
                  card.is_default
                    ? "ring-2 ring-amber-500 dark:ring-amber-400"
                    : ""
                }`}
              >
                {/* Card visual strip */}
                <div
                  className={`h-2 bg-gradient-to-r ${cardBrandGradient(card.card_brand)}`}
                />

                <CardContent className="p-5">
                  {/* Top row: brand & default badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        {cardBrandIcon(card.card_brand)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">
                          {card.card_brand || "Card"}
                        </p>
                        {card.label && (
                          <p className="text-xs text-gray-500">{card.label}</p>
                        )}
                      </div>
                    </div>
                    {card.is_default && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
                        <Star className="h-3 w-3" />
                        Default
                      </Badge>
                    )}
                  </div>

                  {/* Card number (masked) */}
                  <p className="text-lg font-mono tracking-widest text-gray-700 dark:text-gray-300 mb-3">
                    •••• •••• •••• {card.card_last4}
                  </p>

                  {/* Expiry & cardholder */}
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>
                      Exp: {String(card.card_exp_month).padStart(2, "0")}/
                      {card.card_exp_year}
                    </span>
                    <span className="truncate max-w-[140px]">
                      {card.cardholder_name || "—"}
                    </span>
                  </div>

                  {/* Registered date */}
                  <p className="text-xs text-gray-400 mb-3">
                    Registered{" "}
                    {new Date(card.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {!card.is_default && (
                      <Button
                        onClick={() => handleSetDefault(card.id)}
                        disabled={defaultLoading === card.id}
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs flex-1"
                      >
                        {defaultLoading === card.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Star className="h-3 w-3" />
                        )}
                        Set Default
                      </Button>
                    )}
                    <Button
                      onClick={() => setDeleteTarget(card)}
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Security footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            All payment data is encrypted and processed securely via Stripe. Card
            numbers are never stored on our servers.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION DIALOG
          ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Remove Card</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
            Are you sure you want to remove your{" "}
            <strong className="capitalize">{deleteTarget?.card_brand}</strong>{" "}
            card ending in <strong>{deleteTarget?.card_last4}</strong>?
          </p>
          {deleteTarget?.is_default && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-xs text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                This is your default payment method. Removing it may affect your
                active subscription billing.
              </span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteCard}
              disabled={deleteLoading}
              variant="destructive"
              className="gap-2"
            >
              {deleteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remove Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
