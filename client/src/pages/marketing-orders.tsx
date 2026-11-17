import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  CreditCard,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ORDER_POLL_WINDOW_MS,
  checkoutBanner,
  findOrder,
  nextOrderPoll,
  type CheckoutBanner,
} from "@/lib/order-tracking";

const SUPPORT_EMAIL = "support@versoair.com";

const BANNER_COPY: Record<
  CheckoutBanner,
  {
    icon: any;
    card: string;
    title: string;
    titleColor: string;
    body: (orderId: string | null) => string;
  }
> = {
  confirmed: {
    icon: CheckCircle,
    card: "bg-green-900/20 border-green-500/30",
    title: "Payment successful!",
    titleColor: "text-green-400",
    body: (id) =>
      `Your order #${id} has been confirmed. We'll start processing it shortly. For charge or refund questions, email ${SUPPORT_EMAIL} with your order number.`,
  },
  confirming: {
    icon: Clock,
    card: "bg-amber-900/20 border-amber-500/30",
    title: "Confirming your payment…",
    titleColor: "text-amber-400",
    body: (id) =>
      `We're waiting for the payment provider to confirm order #${id}. This page updates by itself.`,
  },
  delayed: {
    icon: AlertCircle,
    card: "bg-amber-900/20 border-amber-500/30",
    title: "Your payment hasn't been confirmed yet",
    titleColor: "text-amber-400",
    body: (id) =>
      `It may still be processing. If you were charged and order #${id} doesn't update, email ${SUPPORT_EMAIL} with your order number.`,
  },
  cancelled: {
    icon: AlertCircle,
    card: "bg-red-900/20 border-red-500/30",
    title: "This order was cancelled",
    titleColor: "text-red-400",
    body: (id) =>
      `Order #${id} is cancelled. If you were charged, email ${SUPPORT_EMAIL} with your order number.`,
  },
  refunded: {
    icon: AlertCircle,
    card: "bg-orange-900/20 border-orange-500/30",
    title: "This order was refunded",
    titleColor: "text-orange-400",
    body: (id) =>
      `Order #${id} has been refunded. For charge or refund questions, email ${SUPPORT_EMAIL} with your order number.`,
  },
};

export default function OrderTrackingPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const status = params.get("status");
  const highlightOrderId = params.get("orderId");
  const returnedFromCheckout = status === "success";

  // Landing on the success URL does not prove the payment went through, so the
  // page keeps checking the order for a while before saying it is taking long.
  const [waitedLong, setWaitedLong] = useState(false);
  useEffect(() => {
    if (!returnedFromCheckout) return;
    const timer = setTimeout(() => setWaitedLong(true), ORDER_POLL_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [returnedFromCheckout]);

  const token =
    localStorage.getItem("auth_token") || localStorage.getItem("authToken");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["marketing", "orders"],
    queryFn: async () => {
      const res = await fetch("/api/marketing/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!token,
    refetchInterval: (query) =>
      nextOrderPoll({
        returnedFromCheckout,
        orders: query.state.data,
        orderId: highlightOrderId,
        waitedLong,
      }),
  });

  const banner = token
    ? checkoutBanner({
        returnedFromCheckout,
        orderStatus: findOrder(orders, highlightOrderId)?.status,
        waitedLong,
      })
    : null;
  const bannerCopy = banner ? BANNER_COPY[banner] : null;
  const BannerIcon = bannerCopy?.icon;

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> =
    {
      pending: {
        icon: Clock,
        color: "text-yellow-400",
        bg: "bg-yellow-500/20",
      },
      paid: { icon: CreditCard, color: "text-blue-400", bg: "bg-blue-500/20" },
      processing: {
        icon: Package,
        color: "text-purple-400",
        bg: "bg-purple-500/20",
      },
      shipped: { icon: Truck, color: "text-cyan-400", bg: "bg-cyan-500/20" },
      completed: {
        icon: CheckCircle,
        color: "text-green-400",
        bg: "bg-green-500/20",
      },
      cancelled: {
        icon: AlertCircle,
        color: "text-red-400",
        bg: "bg-red-500/20",
      },
      refunded: {
        icon: AlertCircle,
        color: "text-orange-400",
        bg: "bg-orange-500/20",
      },
      disputed: {
        icon: AlertCircle,
        color: "text-orange-400",
        bg: "bg-orange-500/20",
      },
      chargeback: {
        icon: AlertCircle,
        color: "text-red-400",
        bg: "bg-red-500/20",
      },
    };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Checkout result banner */}
        {bannerCopy && BannerIcon && (
          <Card className={`${bannerCopy.card} mb-6`} role="status">
            <CardContent className="p-4 flex items-center gap-3">
              <BannerIcon className={`h-6 w-6 shrink-0 ${bannerCopy.titleColor}`} />
              <div>
                <p className={`${bannerCopy.titleColor} font-semibold`}>
                  {bannerCopy.title}
                </p>
                <p className="text-gray-300/80 text-sm">
                  {bannerCopy.body(highlightOrderId)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="h-8 w-8 text-amber-400" />
            My Orders
          </h1>
          <Link href="/marketing">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketing
            </Button>
          </Link>
        </div>

        {!token ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Please sign in to view your orders.
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="text-gray-400 text-center py-12">
            Loading orders...
          </div>
        ) : !orders || orders.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">
                No orders yet. Start shopping!
              </p>
              <Link href="/marketing/packs">
                <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                  Browse Packs
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => {
              const config = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              const isHighlighted =
                highlightOrderId &&
                String(order.id) === String(highlightOrderId);

              return (
                <Card
                  key={order.id}
                  className={`bg-gray-800/50 border-gray-700 ${
                    isHighlighted ? "ring-2 ring-amber-500/50" : ""
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}
                        >
                          <StatusIcon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div>
                          <p className="text-white font-semibold">
                            Order #{order.id}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {new Date(order.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={`${config.bg} ${config.color} capitalize`}
                        >
                          {order.status}
                        </Badge>
                        <p className="text-amber-400 font-bold mt-1">
                          ${(order.total_cents / 100).toFixed(2)} CAD
                        </p>
                      </div>
                    </div>

                    {/* Order items */}
                    {order.items &&
                      Array.isArray(order.items) &&
                      order.items[0]?.id && (
                        <div className="border-t border-gray-700 pt-3 mt-3">
                          <p className="text-gray-400 text-xs mb-2">Items:</p>
                          <div className="space-y-1">
                            {order.items.map((item: any) => (
                              <div
                                key={item.id}
                                className="flex justify-between text-sm"
                              >
                                <span className="text-gray-300">
                                  {item.item_type.replace(/_/g, " ")} #
                                  {item.item_id} × {item.quantity}
                                </span>
                                <span className="text-gray-400">
                                  $
                                  {(
                                    (item.unit_price_cents * item.quantity) /
                                    100
                                  ).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
