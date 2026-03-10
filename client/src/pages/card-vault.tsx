import { useState, useEffect, useCallback } from "react";
import { authenticatedFetch } from "@/lib/auth";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertCircle,
  Wallet,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Eye,
  X,
} from "lucide-react";
import { Link, useSearch } from "wouter";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface CardDetail {
  id: number;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  cardholder: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  billing_city: string | null;
  billing_country: string | null;
  card_funding: string | null;
  label: string | null;
  is_default: boolean;
  status: string;
  created_at: string;
}

interface CustomerRecord {
  user_id: number;
  username: string;
  email: string;
  subscription_tier: string;
  stripe_customer_id: string | null;
  card_count: string;
  cards: CardDetail[];
}

interface VaultStats {
  total_customers: string;
  total_cards: string;
  preauthorized_cards: string;
  successful_charges: string;
  failed_charges: string;
  refunded_charges: string;
  total_revenue: string;
  total_refunded: string;
  revenue_this_month: string;
  revenue_today: string;
}

// ─── Brand visuals ──────────────────────────────────────────────────────────────

function brandBadge(brand: string) {
  const b = (brand || "").toLowerCase();
  if (b.includes("visa"))
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]">
        VISA
      </Badge>
    );
  if (b.includes("mastercard") || b.includes("master"))
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[10px]">
        MC
      </Badge>
    );
  if (b.includes("amex") || b.includes("american"))
    return (
      <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 text-[10px]">
        AMEX
      </Badge>
    );
  if (b.includes("discover"))
    return (
      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-[10px]">
        DISC
      </Badge>
    );
  return (
    <Badge className="bg-gray-100 text-gray-700 text-[10px]">
      {brand || "CARD"}
    </Badge>
  );
}

function tierColor(tier: string) {
  switch (tier) {
    case "enterprise":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "max":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "verified":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "essential":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function CardVaultPage() {
  const { user } = useSubscription();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);

  // Dashboard state
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Customer list
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // View detail
  const [viewCustomer, setViewCustomer] = useState<CustomerRecord | null>(null);

  // Manual add card
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({
    userId: "",
    cardBrand: "",
    cardLast4: "",
    cardExpMonth: "",
    cardExpYear: "",
    cardholderName: "",
    billingEmail: "",
    label: "",
  });

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{
    cardId: number;
    brand: string;
    last4: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Return from Stripe
  useEffect(() => {
    const cardAdded = searchParams.get("card_added");
    if (cardAdded === "true") {
      toast({
        title: "Card registered",
        description: "Payment method saved via Stripe.",
      });
      window.history.replaceState({}, "", "/account/cards");
    } else if (cardAdded === "false") {
      toast({
        title: "Cancelled",
        description: "Card setup was cancelled.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/account/cards");
    }
  }, []);

  // ─── Fetch Stats ────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await authenticatedFetch("/api/v1/payments/pos-stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch {
      /* silent */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ─── Fetch Customers ───────────────────────────────────────────────────────

  const fetchCustomers = useCallback(async (pageNum = 1, search = "") => {
    try {
      setCustomersLoading(true);
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "20",
      });
      if (search) params.set("search", search);

      const res = await authenticatedFetch(
        `/api/v1/payments/customers?${params}`,
      );
      if (!res.ok) throw new Error("Failed to load customers");
      const data = await res.json();
      setCustomers(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalCustomers(data.pagination?.total || 0);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCustomers();
  }, [fetchStats, fetchCustomers]);

  // ─── Search handler ─────────────────────────────────────────────────────────

  function handleSearch() {
    setPage(1);
    fetchCustomers(1, searchQuery);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchCustomers(newPage, searchQuery);
  }

  // ─── Manual Add Card ───────────────────────────────────────────────────────

  async function handleManualAdd() {
    const { userId, cardBrand, cardLast4, cardExpMonth, cardExpYear } = addForm;
    if (!userId || !cardBrand || !cardLast4 || !cardExpMonth || !cardExpYear) {
      toast({
        title: "Missing fields",
        description: "User ID, brand, last 4, and expiry are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddLoading(true);
      const res = await authenticatedFetch(
        "/api/v1/payments/admin/register-card",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: parseInt(userId),
            cardBrand: cardBrand,
            cardLast4: cardLast4,
            cardExpMonth: parseInt(cardExpMonth),
            cardExpYear: parseInt(cardExpYear),
            cardholderName: addForm.cardholderName || null,
            billingEmail: addForm.billingEmail || null,
            label:
              addForm.label || `${cardBrand.toUpperCase()} •••• ${cardLast4}`,
          }),
        },
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to register card");
      }

      toast({
        title: "Card registered",
        description: `${cardBrand.toUpperCase()} ****${cardLast4} added for user #${userId}.`,
      });
      setShowAddDialog(false);
      setAddForm({
        userId: "",
        cardBrand: "",
        cardLast4: "",
        cardExpMonth: "",
        cardExpYear: "",
        cardholderName: "",
        billingEmail: "",
        label: "",
      });
      fetchCustomers(page, searchQuery);
      fetchStats();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAddLoading(false);
    }
  }

  // ─── Delete Card ────────────────────────────────────────────────────────────

  async function handleDeleteCard() {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      const res = await authenticatedFetch(
        `/api/v1/payments/cards/${deleteTarget.cardId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to remove card");
      toast({
        title: "Card removed",
        description: `Card ****${deleteTarget.last4} has been removed.`,
      });
      setDeleteTarget(null);
      fetchCustomers(page, searchQuery);
      fetchStats();
      if (viewCustomer) {
        // Refresh detail view
        const updated = customers.find(
          (c) => c.user_id === viewCustomer.user_id,
        );
        if (updated) {
          setViewCustomer({
            ...updated,
            cards: updated.cards.filter((c) => c.id !== deleteTarget.cardId),
          });
        }
      }
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

  // ─── Access check ───────────────────────────────────────────────────────────

  const isAdmin =
    user?.role === "admin" ||
    user?.role === "moderator" ||
    user?.role === "superuser" ||
    user?.isAdmin;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-sm text-gray-500">
              Card Vault is an admin-only dashboard for managing client payment
              credentials.
            </p>
            <Link href="/">
              <Button className="mt-6">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
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
                Admin dashboard — Client payment credentials (auto-registered
                via Stripe)
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            Register Card
          </Button>
        </div>

        {/* ═══════════════════ STATS CARDS ═══════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {statsLoading ? "—" : (stats?.total_customers ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500">Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {statsLoading ? "—" : (stats?.total_cards ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500">Cards Saved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {statsLoading
                      ? "—"
                      : `$${parseFloat(stats?.revenue_this_month ?? "0").toFixed(0)}`}
                  </p>
                  <p className="text-xs text-gray-500">Revenue (Month)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {statsLoading ? "—" : (stats?.successful_charges ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500">Charges</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info banner */}
        <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Client cards are registered <strong>automatically</strong> when
                they complete a subscription checkout via Stripe. You can also
                manually register card credentials for clients below.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════ SEARCH BAR ═══════════════════ */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search clients by name or email..."
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} variant="outline">
            Search
          </Button>
        </div>

        {/* ═══════════════════ CLIENTS TABLE ═══════════════════ */}
        {customersLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : customers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No clients with saved cards
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Cards will appear here automatically when clients complete
                subscription payments, or you can register cards manually.
              </p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="h-4 w-4" />
                Register First Card
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Cards
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Card Details
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {customers.map((customer) => (
                      <tr
                        key={customer.user_id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {customer.username}
                            </p>
                            <p className="text-xs text-gray-500">
                              {customer.email}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              ID: {customer.user_id}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`capitalize text-[10px] ${tierColor(customer.subscription_tier)}`}
                          >
                            {customer.subscription_tier || "free"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {customer.card_count}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {customer.cards.slice(0, 3).map((card) => (
                              <div
                                key={card.id}
                                className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1"
                              >
                                {brandBadge(card.brand)}
                                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                                  ****{card.last4}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {String(card.exp_month).padStart(2, "0")}/
                                  {card.exp_year}
                                </span>
                                {card.is_default && (
                                  <Star className="h-3 w-3 text-amber-500" />
                                )}
                              </div>
                            ))}
                            {customer.cards.length > 3 && (
                              <span className="text-xs text-gray-400 self-center">
                                +{customer.cards.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            onClick={() => setViewCustomer(customer)}
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  {totalCustomers} client{totalCustomers !== 1 ? "s" : ""} total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Security footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            All payment data encrypted via Stripe. Only last-4, brand & expiry
            are stored for display.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          VIEW CLIENT DETAIL DIALOG
          ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={!!viewCustomer}
        onOpenChange={(v) => !v && setViewCustomer(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-600" />
              {viewCustomer?.username}'s Cards
            </DialogTitle>
          </DialogHeader>

          {viewCustomer && (
            <div className="space-y-3 py-2">
              {/* Client info */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500 text-xs">Email</span>
                    <p className="font-medium text-gray-900 dark:text-white text-xs">
                      {viewCustomer.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Plan</span>
                    <p>
                      <Badge
                        className={`capitalize text-[10px] ${tierColor(viewCustomer.subscription_tier)}`}
                      >
                        {viewCustomer.subscription_tier || "free"}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">User ID</span>
                    <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                      {viewCustomer.user_id}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Stripe ID</span>
                    <p className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate">
                      {viewCustomer.stripe_customer_id || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cards */}
              {viewCustomer.cards.map((card) => (
                <div
                  key={card.id}
                  className="border rounded-lg p-3 hover:shadow transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {brandBadge(card.brand)}
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                        •••• •••• •••• {card.last4}
                      </span>
                      {card.is_default && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] gap-0.5">
                          <Star className="h-2.5 w-2.5" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={() =>
                        setDeleteTarget({
                          cardId: card.id,
                          brand: card.brand,
                          last4: card.last4,
                        })
                      }
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                    <div>
                      <span className="block text-[10px] text-gray-400">
                        Expiry
                      </span>
                      {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400">
                        Cardholder
                      </span>
                      {card.cardholder || "—"}
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400">
                        Funding
                      </span>
                      {card.card_funding || "—"}
                    </div>
                  </div>
                  {(card.billing_email ||
                    card.billing_city ||
                    card.billing_country) && (
                    <div className="mt-2 pt-2 border-t text-xs text-gray-400">
                      {card.billing_email && <span>{card.billing_email}</span>}
                      {card.billing_city && <span> · {card.billing_city}</span>}
                      {card.billing_country && (
                        <span> · {card.billing_country}</span>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    Registered{" "}
                    {new Date(card.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewCustomer(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          MANUAL ADD CARD DIALOG
          ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(v) => {
          setShowAddDialog(v);
          if (!v)
            setAddForm({
              userId: "",
              cardBrand: "",
              cardLast4: "",
              cardExpMonth: "",
              cardExpYear: "",
              cardholderName: "",
              billingEmail: "",
              label: "",
            });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              Register Client Card
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>
                Client User ID <span className="text-red-500">*</span>
              </Label>
              <Input
                value={addForm.userId}
                onChange={(e) =>
                  setAddForm({ ...addForm, userId: e.target.value })
                }
                placeholder="e.g. 42"
                type="number"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  Card Brand <span className="text-red-500">*</span>
                </Label>
                <select
                  value={addForm.cardBrand}
                  onChange={(e) =>
                    setAddForm({ ...addForm, cardBrand: e.target.value })
                  }
                  className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700"
                >
                  <option value="">Select...</option>
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="amex">American Express</option>
                  <option value="discover">Discover</option>
                  <option value="diners">Diners Club</option>
                  <option value="unionpay">UnionPay</option>
                  <option value="jcb">JCB</option>
                </select>
              </div>
              <div>
                <Label>
                  Last 4 Digits <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={addForm.cardLast4}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      cardLast4: e.target.value.replace(/\D/g, "").slice(0, 4),
                    })
                  }
                  placeholder="4242"
                  maxLength={4}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  Exp Month <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={addForm.cardExpMonth}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      cardExpMonth: e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 2),
                    })
                  }
                  placeholder="MM"
                  maxLength={2}
                />
              </div>
              <div>
                <Label>
                  Exp Year <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={addForm.cardExpYear}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      cardExpYear: e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4),
                    })
                  }
                  placeholder="2027"
                  maxLength={4}
                />
              </div>
            </div>
            <div>
              <Label>Cardholder Name</Label>
              <Input
                value={addForm.cardholderName}
                onChange={(e) =>
                  setAddForm({ ...addForm, cardholderName: e.target.value })
                }
                placeholder="Name on card"
              />
            </div>
            <div>
              <Label>Billing Email</Label>
              <Input
                value={addForm.billingEmail}
                onChange={(e) =>
                  setAddForm({ ...addForm, billingEmail: e.target.value })
                }
                placeholder="client@example.com"
                type="email"
              />
            </div>
            <div>
              <Label>
                Label{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                value={addForm.label}
                onChange={(e) =>
                  setAddForm({ ...addForm, label: e.target.value })
                }
                placeholder='e.g. "Business Visa", "Personal Amex"'
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Manual registration saves card metadata only (brand, last 4,
                expiry). No full card numbers are stored. For Stripe-linked
                cards, use the automated checkout flow.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleManualAdd}
              disabled={addLoading}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              {addLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Register Card
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
            Remove <strong className="capitalize">{deleteTarget?.brand}</strong>{" "}
            card ending in <strong>{deleteTarget?.last4}</strong>?
          </p>
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
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
