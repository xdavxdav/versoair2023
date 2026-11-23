import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  Minus,
  Package,
  Plus,
  QrCode,
  ShoppingBag,
  Sparkles,
  Ticket,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import CheckoutReviewModal from "@/components/CheckoutReviewModal";
import { authenticatedFetch } from "@/lib/auth";
import { resolveEventTheme } from "@/components/EventPosterVisual";
import type { BillingDetailsInput } from "@shared/billing-details";
import {
  formatCadCents,
  type EventArsenalItem,
  type EventArsenalKind,
  type EventArsenalOrderSummary,
} from "@shared/event-arsenal";

interface BasketLine {
  key: string;
  item: EventArsenalItem;
  variant: string | null;
  quantity: number;
}

interface EventArsenalStorefrontProps {
  eventId: number;
  eventTitle: string;
  themeAccent?: string | null;
  items: EventArsenalItem[];
  myOrders: EventArsenalOrderSummary[];
  isSignedIn: boolean;
  awaitingPayment?: boolean;
  onOrderCompleted: () => Promise<void> | void;
}

/** Deterministic 7x7 visual verification matrix derived from passCode */
function PassMatrixGraphic({ code }: { code: string }) {
  const cells = useMemo(() => {
    let hash = 2166136261;
    for (let i = 0; i < code.length; i += 1) {
      hash ^= code.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const grid: boolean[] = [];
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        const corner =
          (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2);
        if (corner) {
          grid.push(true);
        } else {
          const bit = ((hash >>> ((r * 7 + c) % 28)) & 1) === 1;
          grid.push(bit || (r === 3 && c === 3));
        }
      }
    }
    return grid;
  }, [code]);

  return (
    <div
      aria-hidden="true"
      className="grid h-20 w-20 shrink-0 grid-cols-7 gap-0.5 rounded-xl border border-white/20 bg-white p-2 shadow-inner"
    >
      {cells.map((filled, idx) => (
        <span
          key={idx}
          className={`rounded-[2px] ${filled ? "bg-slate-950" : "bg-slate-100"}`}
        />
      ))}
    </div>
  );
}

export default function EventArsenalStorefront({
  eventId,
  eventTitle,
  themeAccent,
  items,
  myOrders,
  isSignedIn,
  awaitingPayment = false,
  onOrderCompleted,
}: EventArsenalStorefrontProps) {
  const theme = resolveEventTheme(themeAccent);
  const [activeTab, setActiveTab] = useState<"ALL" | EventArsenalKind>("ALL");
  const [selectedVariants, setSelectedVariants] = useState<Record<number, string>>({});
  const [basket, setBasket] = useState<Record<string, BasketLine>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [copiedPass, setCopiedPass] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      ALL: items.length,
      TICKET: items.filter((i) => i.kind === "TICKET").length,
      MERCH: items.filter((i) => i.kind === "MERCH").length,
      ADDON: items.filter((i) => i.kind === "ADDON").length,
    };
  }, [items]);

  const visibleItems = useMemo(
    () =>
      activeTab === "ALL"
        ? items
        : items.filter((item) => item.kind === activeTab),
    [items, activeTab],
  );

  const basketLines = useMemo(() => Object.values(basket), [basket]);
  const totalQty = useMemo(
    () => basketLines.reduce((sum, l) => sum + l.quantity, 0),
    [basketLines],
  );
  const totalCents = useMemo(
    () =>
      basketLines.reduce(
        (sum, l) => sum + l.item.priceCents * l.quantity,
        0,
      ),
    [basketLines],
  );

  const getChosenVariant = (item: EventArsenalItem): string | null => {
    if (!item.variants.length) return null;
    return selectedVariants[item.id] || item.variants[0] || null;
  };

  const getItemTotalInBasket = (itemId: number): number =>
    basketLines
      .filter((l) => l.item.id === itemId)
      .reduce((s, l) => s + l.quantity, 0);

  const adjustLine = (item: EventArsenalItem, delta: number) => {
    setCheckoutError(null);
    const variant = getChosenVariant(item);
    const key = `${item.id}::${variant ?? ""}`;
    setBasket((prev) => {
      const current = prev[key]?.quantity ?? 0;
      const nextQty = current + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      const otherVariantsQty = Object.values(prev)
        .filter((l) => l.item.id === item.id && l.key !== key)
        .reduce((s, l) => s + l.quantity, 0);
      const maxRemaining =
        item.stockLimit === null
          ? item.maxPerOrder
          : Math.min(item.maxPerOrder, Math.max(0, item.stockLimit - item.soldCount));
      if (otherVariantsQty + nextQty > maxRemaining) {
        return prev;
      }
      return {
        ...prev,
        [key]: { key, item, variant, quantity: nextQty },
      };
    });
  };

  const removeLine = (key: string) => {
    setBasket((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleCheckout = async (billingDetails?: BillingDetailsInput) => {
    if (!basketLines.length || submitting) return;
    setSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await authenticatedFetch(
        "/api/v1/payments/create-arsenal-checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            lines: basketLines.map((line) => ({
              itemId: line.item.id,
              quantity: line.quantity,
              variant: line.variant,
            })),
            ...(billingDetails ? { billingDetails } : {}),
          }),
        },
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setCheckoutError(
          payload?.error || "Could not start checkout. Please try again.",
        );
        return;
      }
      if (payload?.data?.mode === "free_completed") {
        setBasket({});
        await onOrderCompleted();
        return;
      }
      if (payload?.data?.url) {
        window.location.assign(payload.data.url);
        return;
      }
      setCheckoutError("Checkout link was not returned. Please try again.");
    } catch {
      setCheckoutError("Network error while starting checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedPass(code);
      setTimeout(() => setCopiedPass((curr) => (curr === code ? null : curr)), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  };

  if (!items.length && !myOrders.length) {
    return null;
  }

  return (
    <section className="mt-8 space-y-6" aria-label="Event Arsenal">
      {/* ─── DIGITAL DOOR PASSES & MERCH VOUCHERS ─── */}
      {myOrders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900 dark:text-white">
              <QrCode className="h-5 w-5 text-amber-500" />
              Your Event Passes &amp; Arsenal Orders
            </h2>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {myOrders.length} Active {myOrders.length === 1 ? "Pass" : "Passes"}
            </span>
          </div>

          <div className="grid gap-4">
            {myOrders.map((order) => (
              <div
                key={order.id}
                className={`relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-r ${theme.gradient} p-5 text-white shadow-xl`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                        <Check className="h-3 w-3" />
                        {order.checkedInAt ? "Checked In at Door" : "Confirmed Door Pass"}
                      </span>
                      {order.merchQty > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-pink-400/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-pink-200">
                          <ShoppingBag className="h-3 w-3" />
                          {order.merchFulfilledAt
                            ? "Merch Picked Up"
                            : `${order.merchQty} Merch / VIP Item${order.merchQty > 1 ? "s" : ""} Ready`}
                        </span>
                      )}
                    </div>

                    <p className="text-xs uppercase tracking-widest text-white/65">
                      {eventTitle}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 font-mono text-base font-black tracking-widest text-amber-300">
                        {order.passCode}
                      </code>
                      <button
                        type="button"
                        onClick={() => void copyCode(order.passCode)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedPass === order.passCode ? "Copied" : "Copy"}
                      </button>
                    </div>

                    <ul className="space-y-1 pt-1 text-xs text-white/90">
                      {order.items.map((line) => (
                        <li key={line.id} className="flex items-center gap-2">
                          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold">
                            {line.quantity}x
                          </span>
                          <span className="font-semibold">{line.itemName}</span>
                          {line.variant && (
                            <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-amber-200">
                              {line.variant}
                            </span>
                          )}
                          <span className="text-white/65">
                            ({formatCadCents(line.lineTotalCents)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                    <PassMatrixGraphic code={order.passCode} />
                    <span className="text-[11px] font-medium text-white/75">
                      Show code at door / merch booth
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── GRAPHICAL ARSENAL STOREFRONT ─── */}
      {items.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                Official Event Arsenal
              </p>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Tickets, Merch Drops &amp; VIP Perks
              </h2>
            </div>

            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter event arsenal">
              {(
                [
                  { id: "ALL", label: "All", icon: Sparkles },
                  { id: "TICKET", label: "Tickets", icon: Ticket },
                  { id: "MERCH", label: "Merch", icon: ShoppingBag },
                  { id: "ADDON", label: "VIP & Perks", icon: Package },
                ] as const
              )
                .filter((tab) => tab.id === "ALL" || counts[tab.id] > 0)
                .map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                        active
                          ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                      <span className="opacity-75">({counts[tab.id]})</span>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleItems.map((item) => {
              const remaining =
                item.stockLimit === null
                  ? null
                  : Math.max(0, item.stockLimit - item.soldCount);
              const soldOut = remaining !== null && remaining <= 0;
              const chosenVariant = getChosenVariant(item);
              const currentKey = `${item.id}::${chosenVariant ?? ""}`;
              const qtyForVariant = basket[currentKey]?.quantity ?? 0;
              const totalItemInBag = getItemTotalInBasket(item.id);
              const maxAllowed =
                remaining === null
                  ? item.maxPerOrder
                  : Math.min(item.maxPerOrder, remaining);
              const canAddMore = !soldOut && totalItemInBag < maxAllowed;

              const kindBadge =
                item.kind === "TICKET"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : item.kind === "MERCH"
                    ? "bg-pink-500/15 text-pink-700 dark:text-pink-300"
                    : "bg-violet-500/15 text-violet-700 dark:text-violet-300";

              return (
                <div
                  key={item.id}
                  className={`group flex flex-col justify-between overflow-hidden rounded-2xl border transition ${
                    totalItemInBag > 0
                      ? "border-amber-500 bg-amber-50/40 shadow-md dark:border-amber-400 dark:bg-amber-950/20"
                      : "border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50"
                  }`}
                >
                  <div>
                    {item.imageUrl ? (
                      <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {item.badge && (
                          <span className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-sm">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    ) : null}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${kindBadge}`}
                          >
                            {item.kind === "ADDON" ? "VIP PERK" : item.kind}
                          </span>
                          {!item.imageUrl && item.badge && (
                            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 dark:bg-slate-800">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          {formatCadCents(item.priceCents)}
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                          {item.description}
                        </p>
                      )}

                      {item.variants.length > 0 && (
                        <div className="mt-3">
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Select Option / Size
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {item.variants.map((variant) => {
                              const active = chosenVariant === variant;
                              return (
                                <button
                                  key={variant}
                                  type="button"
                                  onClick={() =>
                                    setSelectedVariants((prev) => ({
                                      ...prev,
                                      [item.id]: variant,
                                    }))
                                  }
                                  className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                                    active
                                      ? "border-amber-500 bg-amber-500 text-slate-950"
                                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                  }`}
                                >
                                  {variant}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {soldOut ? (
                          <span className="font-bold uppercase text-rose-600 dark:text-rose-400">
                            Sold Out
                          </span>
                        ) : remaining !== null ? (
                          <span>
                            <strong className="text-slate-800 dark:text-slate-200">
                              {remaining}
                            </strong>{" "}
                            left
                            {item.fulfillmentNote ? ` · ${item.fulfillmentNote}` : ""}
                          </span>
                        ) : (
                          <span>
                            {item.fulfillmentNote ||
                              (item.kind === "TICKET"
                                ? "Instant Digital Door Pass"
                                : "Pickup at event")}
                          </span>
                        )}
                      </div>

                      {soldOut ? (
                        <span className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Unavailable
                        </span>
                      ) : qtyForVariant > 0 ? (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-2 py-1">
                          <button
                            type="button"
                            aria-label={`Remove one ${item.name}`}
                            onClick={() => adjustLine(item, -1)}
                            className="rounded-md p-1 text-slate-800 hover:bg-amber-500/20 dark:text-white"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[20px] text-center text-xs font-black text-slate-900 dark:text-white">
                            {qtyForVariant}
                          </span>
                          <button
                            type="button"
                            aria-label={`Add one more ${item.name}`}
                            disabled={!canAddMore}
                            onClick={() => adjustLine(item, 1)}
                            className="rounded-md p-1 text-slate-800 hover:bg-amber-500/20 disabled:opacity-40 dark:text-white"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={!canAddMore || awaitingPayment}
                          onClick={() => adjustLine(item, 1)}
                          className={`rounded-xl font-bold ${theme.button}`}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── STICKY / INLINE EVENT BAG SUMMARY ─── */}
          {basketLines.length > 0 && (
            <div className="mt-6 rounded-2xl border-2 border-amber-500/60 bg-slate-950 p-4 text-white shadow-2xl sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Your Event Bag ({totalQty} {totalQty === 1 ? "item" : "items"})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {basketLines.map((line) => (
                      <span
                        key={line.key}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs"
                      >
                        <strong className="text-amber-300">{line.quantity}x</strong>
                        <span>{line.item.name}</span>
                        {line.variant && (
                          <span className="text-white/70">({line.variant})</span>
                        )}
                        <button
                          type="button"
                          aria-label={`Remove ${line.item.name}`}
                          onClick={() => removeLine(line.key)}
                          className="ml-1 text-white/60 hover:text-rose-300"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <div className="text-right">
                    <span className="text-xs text-white/65">Total (CAD) </span>
                    <span className="text-2xl font-black text-white">
                      {formatCadCents(totalCents)}
                    </span>
                  </div>

                  {isSignedIn ? (
                    <Button
                      type="button"
                      disabled={submitting || awaitingPayment}
                      onClick={() => {
                        if (totalCents === 0) {
                          void handleCheckout();
                        } else {
                          setCheckoutError(null);
                          setReviewOpen(true);
                        }
                      }}
                      className="bg-amber-500 font-black text-slate-950 hover:bg-amber-400"
                    >
                      {submitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {totalCents === 0
                        ? "Claim Free Door Pass"
                        : `Checkout with Stripe · ${formatCadCents(totalCents)}`}
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="bg-amber-500 font-black text-slate-950 hover:bg-amber-400"
                    >
                      <Link
                        href={`/auth/signin?redirect=${encodeURIComponent(
                          typeof window !== "undefined"
                            ? window.location.pathname
                            : "/events",
                        )}`}
                      >
                        Sign in to get tickets &amp; merch
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {checkoutError && !reviewOpen && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-200"
                >
                  {checkoutError}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      <CheckoutReviewModal
        open={reviewOpen}
        onClose={() => !submitting && setReviewOpen(false)}
        title={eventTitle}
        purpose={`VERSO AIR INC. Event Tickets & Merch — ${eventTitle}`}
        deliverable="Your Digital Door Pass and itemized order voucher unlock immediately after Stripe confirmation, with an official PDF receipt emailed to you."
        totalCents={totalCents}
        billingFrequencyLabel="CAD · one-time"
        items={basketLines.map((line) => ({
          label: line.item.name,
          detail: line.variant ? `${line.variant} · ×${line.quantity}` : `×${line.quantity}`,
          amountCents: line.item.priceCents * line.quantity,
        }))}
        busy={submitting}
        serverError={checkoutError}
        onConfirm={handleCheckout}
      />
    </section>
  );
}
