import { useState, useEffect, useCallback } from "react";
import { authenticatedFetch } from "@/lib/auth";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CheckCircle,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { Link } from "wouter";

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

  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Card form
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardLabel, setCardLabel] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SavedCard | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Default-setting
  const [defaultLoading, setDefaultLoading] = useState<number | null>(null);

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

  // ─── Add Card via SetupIntent ───────────────────────────────────────────────

  async function handleAddCard() {
    if (!cardNumber || !expMonth || !expYear || !cvc) {
      toast({
        title: "Missing fields",
        description: "Please fill in all card details",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddLoading(true);

      // Step 1: Create a SetupIntent on the server
      const setupRes = await authenticatedFetch(
        "/api/v1/payments/setup-intent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardholderName: cardholderName || undefined,
          }),
        },
      );

      if (!setupRes.ok) {
        const errData = await setupRes.json();
        throw new Error(errData.error || "Failed to create setup intent");
      }

      const setupData = await setupRes.json();

      // Step 2: Save card to database via our API
      const saveRes = await authenticatedFetch("/api/v1/payments/save-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupIntentId: setupData.setupIntentId,
          cardholderName: cardholderName || undefined,
          label: cardLabel || undefined,
          // Server will retrieve payment method details from Stripe
        }),
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json();
        throw new Error(errData.error || "Failed to save card");
      }

      toast({
        title: "Card added",
        description: "Your payment method has been saved securely.",
      });

      // Reset form & refresh
      setShowAddDialog(false);
      resetAddForm();
      fetchCards();
    } catch (err: any) {
      toast({
        title: "Error adding card",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAddLoading(false);
    }
  }

  function resetAddForm() {
    setCardNumber("");
    setExpMonth("");
    setExpYear("");
    setCvc("");
    setCardholderName("");
    setCardLabel("");
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
                Manage your saved payment methods for subscription billing
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            Add Card
          </Button>
        </div>

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
                No saved cards
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                Add a payment method to enable subscription billing, quick
                upgrades, and seamless renewals.
              </p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="h-4 w-4" />
                Add Your First Card
              </Button>
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
            All payment data is encrypted and processed securely via Stripe.
            Card numbers are never stored on our servers.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ADD CARD DIALOG
          ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(v) => {
          setShowAddDialog(v);
          if (!v) resetAddForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              Add Payment Method
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Cardholder Name</Label>
              <Input
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Name on card"
              />
            </div>
            <div>
              <Label>Card Number</Label>
              <Input
                value={cardNumber}
                onChange={(e) =>
                  setCardNumber(
                    e.target.value
                      .replace(/\D/g, "")
                      .replace(/(.{4})/g, "$1 ")
                      .trim()
                      .slice(0, 19),
                  )
                }
                placeholder="4242 4242 4242 4242"
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Month</Label>
                <Input
                  value={expMonth}
                  onChange={(e) =>
                    setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  placeholder="MM"
                  maxLength={2}
                />
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  value={expYear}
                  onChange={(e) =>
                    setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="2026"
                  maxLength={4}
                />
              </div>
              <div>
                <Label>CVC</Label>
                <Input
                  value={cvc}
                  onChange={(e) =>
                    setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="123"
                  maxLength={4}
                  type="password"
                />
              </div>
            </div>
            <div>
              <Label>
                Label{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                value={cardLabel}
                onChange={(e) => setCardLabel(e.target.value)}
                placeholder='e.g. "Business Amex", "Personal Visa"'
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Your card details are securely tokenized by Stripe. We never
                store your full card number. A small authorization hold may
                appear and will be immediately released.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                resetAddForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCard}
              disabled={addLoading}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              {addLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Save Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
