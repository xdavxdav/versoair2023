import { useState, useEffect } from "react";
import { authenticatedFetch } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  Receipt,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";

interface Transaction {
  id: number;
  userId: number;
  type: string;
  amount: string;
  currency: string;
  status: string;
  description: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
}

export default function BillingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  async function fetchBillingHistory() {
    try {
      setLoading(true);
      const res = await authenticatedFetch("/api/v1/payments/billing-history");
      if (!res.ok) throw new Error("Failed to load billing history");
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openCustomerPortal() {
    try {
      setPortalLoading(true);
      const res = await authenticatedFetch("/api/v1/payments/customer-portal", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to open billing portal");
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPortalLoading(false);
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "refunded":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/account">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Billing & Invoices
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                View your payment history and manage billing
              </p>
            </div>
          </div>
          <Button
            onClick={openCustomerPortal}
            disabled={portalLoading}
            variant="outline"
            className="gap-2"
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Manage Billing
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-10 text-center text-red-500">
              <p>{error}</p>
              <Button
                onClick={fetchBillingHistory}
                variant="outline"
                className="mt-4"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : transactions.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Receipt className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No transactions yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                When you upgrade your subscription or make a purchase, your
                transactions will appear here.
              </p>
              <Link href="/pricing">
                <Button>View Plans</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <Card key={tx.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(tx.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={statusColor(tx.status)}
                    >
                      {tx.status}
                    </Badge>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      ${parseFloat(tx.amount).toFixed(2)}{" "}
                      <span className="text-xs text-gray-400 uppercase">
                        {tx.currency}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
