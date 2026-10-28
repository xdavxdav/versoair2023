import { Link } from "wouter";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  CreditCard,
  ArrowLeft,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export default function CartPage() {
  const {
    items,
    totalCents,
    itemCount,
    isLoading,
    updateQuantity,
    removeItem,
    clearCart,
    checkout,
    isCheckingOut,
  } = useCart();
  const { toast } = useToast();

  const handleCheckout = async () => {
    try {
      await checkout();
    } catch (error) {
      toast({
        title: "Checkout unavailable",
        description:
          error instanceof Error
            ? error.message
            : "Checkout could not be started. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3efe9] flex items-center justify-center">
        <p className="text-slate-600">Loading cart...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3efe9] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-amber-800" />
            Shopping Cart
          </h1>
          <Link href="/marketing">
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Continue Shopping
            </Button>
          </Link>
        </div>

        {itemCount === 0 ? (
          <Card className="text-slate-900 bg-white border-gray-700">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl text-slate-900 font-semibold mb-2">
                Your cart is empty
              </h2>
              <p className="text-slate-700 mb-6">
                Browse our marketing packs and print services to get started.
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/marketing/packs">
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                    View Packs
                  </Button>
                </Link>
                <Link href="/marketing/print">
                  <Button
                    variant="outline"
                    className="border-gray-600 text-slate-900"
                  >
                    Print Services
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3">
              {items.map((item, idx) => (
                <Card
                  key={`${item.item_type}-${item.item_id}-${idx}`}
                  className="text-slate-900 bg-white border-gray-700"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-slate-900 font-medium">
                          {item.item_name ||
                            `${item.item_type} #${item.item_id}`}
                        </h3>
                        <p className="text-slate-700 text-sm capitalize">
                          {item.item_type.replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-gray-600"
                            onClick={() =>
                              updateQuantity(
                                item.item_type,
                                item.item_id,
                                item.quantity - 1,
                              )
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-slate-900 w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-gray-600"
                            onClick={() =>
                              updateQuantity(
                                item.item_type,
                                item.item_id,
                                item.quantity + 1,
                              )
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Price */}
                        <span className="text-amber-800 font-semibold w-20 text-right">
                          {cad.format((item.price_cents * item.quantity) / 100)}
                        </span>

                        {/* Remove */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-700 hover:text-red-700 hover:bg-red-500/10"
                          onClick={() =>
                            removeItem(item.item_type, item.item_id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-700 hover:text-red-700"
                  onClick={clearCart}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Cart
                </Button>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="text-slate-900 bg-white border-gray-700 sticky top-24">
                <CardHeader>
                  <CardTitle className="text-slate-900">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal ({itemCount} items)</span>
                    <span className="text-slate-900">
                      {cad.format(totalCents / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Shipping</span>
                    <span className="text-green-700">Free</span>
                  </div>
                  <hr className="border-gray-700" />
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-slate-900">Total</span>
                    <span className="text-amber-800">
                      {cad.format(totalCents / 100)}
                    </span>
                  </div>

                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    size="lg"
                    onClick={() => void handleCheckout()}
                    disabled={isCheckingOut}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    {isCheckingOut ? "Opening secure checkout…" : "Continue to secure checkout"}
                  </Button>

                  <p className="text-slate-700 text-xs text-center">
                    Prices are in CAD. Secure checkout is available when online
                    payments are enabled.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
