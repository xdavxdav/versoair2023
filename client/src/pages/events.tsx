import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Compass,
  Loader2,
  MapPin,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Sparkles,
  Ticket,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import CheckoutReturnNotice from "@/components/CheckoutReturnNotice";
import {
  EventBoxOfficePanel,
  EventOrganizerStudio,
  type HostedEventRecord,
  type HostFeeMeta,
} from "@/components/EventOrganizerStudio";
import { EventPosterVisual } from "@/components/EventPosterVisual";
import OfferCheckoutButton, {
  useActiveOffer,
} from "@/components/OfferCheckoutButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCheckoutReturn } from "@/hooks/use-checkout-return";
import { authenticatedFetch } from "@/lib/auth";
import { EVENT_CATEGORIES, formatCadCents } from "@shared/event-arsenal";

interface PublicEventRecord {
  id: number;
  title: string;
  slug: string;
  description: string;
  event_type: string;
  starts_at: string;
  ends_at?: string | null;
  city?: string | null;
  venue?: string | null;
  image_url?: string | null;
  theme_accent?: string | null;
  capacity?: number | null;
  organizer_name?: string | null;
  attendee_count?: number;
  ticket_tier_count?: number;
  merch_count?: number;
  addon_count?: number;
  min_ticket_cents?: number | null;
}

export default function EventsPage() {
  const { user } = useAuthContext();
  const hostFeeOffer = useActiveOffer("event_host_fee");
  const studioRef = useRef<HTMLDivElement | null>(null);

  const [events, setEvents] = useState<PublicEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [message, setMessage] = useState<{
    kind: "info" | "error";
    text: string;
  } | null>(null);

  const [myEvents, setMyEvents] = useState<HostedEventRecord[]>([]);
  const [hostFeeMeta, setHostFeeMeta] = useState<HostFeeMeta | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HostedEventRecord | null>(
    null,
  );
  const [boxOfficeEvent, setBoxOfficeEvent] =
    useState<HostedEventRecord | null>(null);
  const [busyEventId, setBusyEventId] = useState<number | null>(null);

  const loadPublicEvents = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (typeFilter) qs.set("type", typeFilter);
      if (searchQuery.trim()) qs.set("q", searchQuery.trim());
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const response = await fetch(`/api/events${suffix}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load events");
      }
      setEvents(payload.data || []);
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Failed to load events",
      });
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPublicEvents();
    }, 180);
    return () => clearTimeout(timer);
  }, [loadPublicEvents]);

  const loadMyEvents = useCallback(async (): Promise<HostedEventRecord[]> => {
    if (!user) {
      setMyEvents([]);
      setHostFeeMeta(null);
      return [];
    }
    const response = await authenticatedFetch("/api/events/me");
    if (!response.ok) return [];
    const payload = await response.json();
    const list: HostedEventRecord[] = payload.data || [];
    setMyEvents(list);
    if (payload.meta?.hostFee) {
      setHostFeeMeta(payload.meta.hostFee);
    }
    return list;
  }, [user]);

  useEffect(() => {
    void loadMyEvents().catch(() => undefined);
  }, [loadMyEvents]);

  const checkout = useCheckoutReturn({
    ready: Boolean(user),
    isFulfilled: async (params) => {
      const targetId = params.get("hostedEvent");
      const list = await loadMyEvents();
      if (!targetId) return list.some((e) => Boolean(e.host_fee_paid));
      return list.some(
        (e) =>
          String(e.id) === targetId &&
          (Boolean(e.host_fee_paid) ||
            e.status === "PENDING" ||
            e.status === "PUBLISHED"),
      );
    },
  });

  const openStudioForNew = () => {
    setEditingEvent(null);
    setBoxOfficeEvent(null);
    setStudioOpen(true);
    setTimeout(
      () => studioRef.current?.scrollIntoView({ behavior: "smooth" }),
      80,
    );
  };

  const openStudioForEvent = (ev: HostedEventRecord) => {
    setEditingEvent(ev);
    setBoxOfficeEvent(null);
    setStudioOpen(true);
    setTimeout(
      () => studioRef.current?.scrollIntoView({ behavior: "smooth" }),
      80,
    );
  };

  const submitForReview = async (id: number) => {
    setBusyEventId(id);
    setMessage(null);
    try {
      const response = await authenticatedFetch(`/api/events/${id}/submit`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage({
          kind: "error",
          text: payload?.error || "Failed to submit event for review",
        });
        return;
      }
      await loadMyEvents();
      setMessage({
        kind: "info",
        text: "Event submitted to GeoAdmin for review! Once approved, your event and Arsenal go live.",
      });
    } finally {
      setBusyEventId(null);
    }
  };

  const deleteDraftEvent = async (id: number) => {
    if (!window.confirm("Delete this draft event and its arsenal?")) return;
    setBusyEventId(id);
    try {
      const res = await authenticatedFetch(`/api/events/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadMyEvents();
      }
    } finally {
      setBusyEventId(null);
    }
  };

  const organizerName =
    (user as any)?.displayName ||
    (user as any)?.username ||
    (user as any)?.email ||
    "Verso Air Host";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-amber-50/20 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* ─── STAGE-LIT HERO BANNER ─── */}
      <section className="relative overflow-hidden border-b border-amber-500/20 bg-gradient-to-br from-stone-950 via-amber-950 to-slate-950 text-white">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 left-12 h-72 w-72 rounded-full bg-rose-500/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-8">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-3.5 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-300">
                <CalendarDays className="h-3.5 w-3.5" /> Events &amp; Box Office on Verso Air
              </p>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Parties, live shows &amp; drops worth showing up for.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-amber-100/90 sm:text-lg">
                Grab official digital door passes, limited merch drops, and VIP
                upgrades — or launch your own event with a visual storefront and
                built-in box office.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {user ? (
                  <Button
                    type="button"
                    size="lg"
                    onClick={openStudioForNew}
                    className="bg-amber-500 font-black text-slate-950 hover:bg-amber-400"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Host an Event &amp; Arsenal
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="lg"
                    className="bg-amber-500 font-black text-slate-950 hover:bg-amber-400"
                  >
                    <Link href="/auth/signin?redirect=/events">
                      Sign in to Host an Event
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-white/10 text-white hover:bg-white/20"
                >
                  <Link href="/communities">Explore Communities</Link>
                </Button>
              </div>
            </div>

            {/* Host Value Card */}
            <div className="rounded-2xl border border-white/15 bg-black/40 p-5 backdrop-blur-md lg:col-span-4">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">
                Host Your Own Night
              </p>
              <h2 className="mt-1 text-lg font-black text-white">
                Every Event Gets Its Full Arsenal
              </h2>
              <ul className="mt-3 space-y-2 text-xs text-white/85">
                <li className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 shrink-0 text-amber-400" />
                  Multi-tier tickets (Early Bird, GA, VIP, or Free RSVP)
                </li>
                <li className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 shrink-0 text-pink-400" />
                  Official event merch drops with size &amp; stock tracking
                </li>
                <li className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 shrink-0 text-emerald-400" />
                  Digital door passes + live guestlist check-in
                </li>
              </ul>
              {hostFeeOffer ? (
                <p className="mt-4 border-t border-white/10 pt-3 text-xs text-amber-200/90">
                  Hosting fee:{" "}
                  <strong>{formatCadCents(hostFeeOffer.amountCents)}</strong>{" "}
                  per event (includes moderation &amp; box office tools).
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <CheckoutReturnNotice
          phase={checkout.phase}
          purchase="event_host"
          onCheckAgain={checkout.checkAgain}
          onDismiss={checkout.dismiss}
        />

        {message && (
          <div
            role="alert"
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              message.kind === "error"
                ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
                : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* ─── GRAPHICAL ORGANIZER STUDIO / BOX OFFICE DRAWER ─── */}
        <div ref={studioRef}>
          {studioOpen && user && (
            <EventOrganizerStudio
              editingEvent={editingEvent}
              hostFee={hostFeeMeta}
              organizerDisplayName={organizerName}
              onClose={() => {
                setStudioOpen(false);
                setEditingEvent(null);
              }}
              onSaved={async () => {
                setStudioOpen(false);
                setEditingEvent(null);
                await Promise.all([loadMyEvents(), loadPublicEvents()]);
                setMessage({
                  kind: "info",
                  text: editingEvent
                    ? "Event & Arsenal updated."
                    : "Event & Arsenal saved! Complete the hosting step below to submit for GeoAdmin review.",
                });
              }}
            />
          )}

          {boxOfficeEvent && user && (
            <EventBoxOfficePanel
              eventId={boxOfficeEvent.id}
              eventTitle={boxOfficeEvent.title}
              onClose={() => setBoxOfficeEvent(null)}
            />
          )}
        </div>

        {/* ─── MY HOSTED EVENTS PIPELINE ─── */}
        {user && myEvents.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                  Organizer Command Center
                </p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  My Hosted Events ({myEvents.length})
                </h2>
              </div>
              {!studioOpen && (
                <Button
                  type="button"
                  size="sm"
                  onClick={openStudioForNew}
                  className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  New Event
                </Button>
              )}
            </div>

            <div className="grid gap-4">
              {myEvents.map((ev) => {
                const arsenalItems = ev.arsenal_items ?? [];
                const needsHostFee =
                  Boolean(hostFeeMeta?.required) &&
                  !ev.host_fee_paid &&
                  (ev.status === "DRAFT" || ev.status === "REJECTED");
                const canSubmitNow =
                  (ev.status === "DRAFT" || ev.status === "REJECTED") &&
                  !needsHostFee;

                const stepIndex =
                  ev.status === "PUBLISHED"
                    ? 4
                    : ev.status === "PENDING"
                      ? 3
                      : ev.host_fee_paid || !hostFeeMeta?.required
                        ? 2
                        : 1;

                return (
                  <Card
                    key={ev.id}
                    className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                                ev.status === "PUBLISHED"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                  : ev.status === "PENDING"
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                    : ev.status === "REJECTED"
                                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {ev.status}
                            </span>
                            {ev.host_fee_paid && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                Host Fee Paid
                              </span>
                            )}
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(ev.starts_at).toLocaleString()}
                              {ev.city ? ` · ${ev.city}` : ""}
                            </span>
                          </div>

                          <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            {ev.title}
                          </h3>

                          {ev.status === "REJECTED" && ev.latest_audit_reason && (
                            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                              Review note: {ev.latest_audit_reason}
                            </p>
                          )}

                          {/* Arsenal summary chips */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold dark:bg-slate-800">
                              {arsenalItems.length} Arsenal{" "}
                              {arsenalItems.length === 1 ? "Item" : "Items"}
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold dark:bg-slate-800">
                              {ev.attendee_count ?? 0} Going
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold dark:bg-slate-800">
                              Sales:{" "}
                              {(ev.revenue_cents ?? 0) > 0
                                ? formatCadCents(ev.revenue_cents ?? 0)
                                : "CA$0.00"}
                            </span>
                          </div>

                          {/* 4-Step Visual Pipeline */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
                            {[
                              "1. Flyer & Arsenal",
                              "2. Host Fee",
                              "3. GeoAdmin Review",
                              "4. Live Box Office",
                            ].map((stepLabel, idx) => {
                              const done = stepIndex > idx + 1 || ev.status === "PUBLISHED";
                              const current = stepIndex === idx + 1 && ev.status !== "PUBLISHED";
                              return (
                                <span
                                  key={stepLabel}
                                  className={`rounded-md px-2 py-0.5 ${
                                    done
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                      : current
                                        ? "bg-amber-500 text-slate-950"
                                        : "bg-slate-100 text-slate-400 dark:bg-slate-800/70"
                                  }`}
                                >
                                  {stepLabel}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          {needsHostFee && hostFeeOffer && !checkout.awaitingPayment && (
                            <OfferCheckoutButton
                              offer={hostFeeOffer}
                              label="Pay hosting fee"
                              eventId={ev.id}
                              onOwned={() => void loadMyEvents()}
                            />
                          )}

                          {canSubmitNow && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={busyEventId === ev.id}
                              onClick={() => void submitForReview(ev.id)}
                              className="bg-amber-600 text-white hover:bg-amber-700"
                            >
                              {busyEventId === ev.id ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              Submit for Review
                            </Button>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openStudioForEvent(ev)}
                          >
                            Manage Flyer &amp; Arsenal
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setStudioOpen(false);
                              setBoxOfficeEvent(ev);
                              setTimeout(
                                () =>
                                  studioRef.current?.scrollIntoView({
                                    behavior: "smooth",
                                  }),
                                80,
                              );
                            }}
                          >
                            <QrCode className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                            Box Office
                          </Button>

                          {ev.status === "PUBLISHED" && (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/events/${ev.slug}`}>
                                View Live Page
                              </Link>
                            </Button>
                          )}

                          {ev.status === "DRAFT" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              aria-label={`Delete draft ${ev.title}`}
                              disabled={busyEventId === ev.id}
                              onClick={() => void deleteDraftEvent(ev.id)}
                              className="text-rose-600 hover:text-rose-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── PUBLIC EVENT DISCOVERY & FILTER BAR ─── */}
        <section className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                Upcoming Lineup
              </p>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Live Events &amp; Ticketed Experiences
              </h2>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search events, venues, cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTypeFilter("")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                typeFilter === ""
                  ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              All Events
            </button>
            {EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setTypeFilter(cat.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  typeFilter === cat.id
                    ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="group block rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <EventPosterVisual
                      compact
                      title={event.title}
                      eventType={event.event_type}
                      startsAt={event.starts_at}
                      venue={event.venue}
                      city={event.city}
                      imageUrl={event.image_url}
                      themeAccent={event.theme_accent}
                      organizerName={event.organizer_name}
                      attendeeCount={event.attendee_count ?? 0}
                      capacity={event.capacity}
                      minTicketCents={event.min_ticket_cents}
                      ticketTierCount={event.ticket_tier_count ?? 0}
                      merchCount={event.merch_count ?? 0}
                      addonCount={event.addon_count ?? 0}
                    />
                    <div className="flex items-center justify-between gap-3 px-5 py-4">
                      <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                        {event.description}
                      </p>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold text-amber-600 group-hover:translate-x-0.5 dark:text-amber-400">
                        Tickets &amp; Arsenal
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
              <CardContent className="py-14 text-center">
                <CalendarDays className="mx-auto h-12 w-12 text-amber-500/70" />
                <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
                  No upcoming events match right now
                </h3>
                <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
                  Be the first to put your party, showcase, or listening night
                  on the board — complete with custom ticket tiers and merch
                  drops.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {user ? (
                    <Button
                      type="button"
                      onClick={openStudioForNew}
                      className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Host the First Event
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
                    >
                      <Link href="/auth/signin?redirect=/events">
                        Sign in to Host an Event
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ─── ECOSYSTEM PATHWAYS ─── */}
        <section className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-3">
          <Card className="border-amber-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <Sparkles className="h-6 w-6 text-amber-600" />
              <CardTitle>Workshops</CardTitle>
              <CardDescription>
                Learn directly from artisans and craft professionals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="outline"
                className="h-auto min-h-10 max-w-full whitespace-normal py-2 text-left"
              >
                <Link href="/artisan-workshops">Explore workshops</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-amber-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <Compass className="h-6 w-6 text-amber-600" />
              <CardTitle>Cultural programs</CardTitle>
              <CardDescription>
                Explore programs, showcases, and cultural experiences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="outline"
                className="h-auto min-h-10 max-w-full whitespace-normal py-2 text-left"
              >
                <Link href="/programs">View programs</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-sky-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <MapPin className="h-6 w-6 text-sky-600" />
              <CardTitle>Entertainment</CardTitle>
              <CardDescription>
                Browse entertainment businesses and event-ready venues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="outline"
                className="h-auto min-h-10 max-w-full whitespace-normal py-2 text-left"
              >
                <Link href="/divertissement">Browse entertainment</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
