import { useCallback, useEffect, useState, type ReactNode } from "react";
import CheckoutReturnNotice from "@/components/CheckoutReturnNotice";
import EventArsenalStorefront from "@/components/EventArsenalStorefront";
import { EventPosterVisual } from "@/components/EventPosterVisual";
import OfferCheckoutButton, { useActiveOffer } from "@/components/OfferCheckoutButton";
import { CalendarDays, Check, Loader2, MapPin, Users } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCheckoutReturn } from "@/hooks/use-checkout-return";
import { useTranslate } from "@/hooks/use-translate";
import { authenticatedFetch } from "@/lib/auth";
import type {
  EventArsenalItem,
  EventArsenalOrderSummary,
} from "@shared/event-arsenal";

interface EventRecord {
  title: string;
  description: string;
  starts_at: string;
  ends_at?: string | null;
  venue?: string | null;
  city?: string | null;
  image_url?: string | null;
  theme_accent?: string | null;
  capacity?: number | null;
  organizer_name?: string | null;
  community_name?: string | null;
  event_type: string;
  id: number;
  attendee_count: number;
  arsenal_items?: EventArsenalItem[];
}

interface RsvpStatus {
  attending: boolean;
  ticketPaid: boolean;
  attendeeCount: number;
}

export default function EventDetailPage() {
  const ticket = useActiveOffer("activity_ticket");
  const tr = useTranslate();
  const [, params] = useRoute("/events/:slug");
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [rsvpError, setRsvpError] = useState("");
  const { user } = useAuthContext();
  const [attending, setAttending] = useState(false);
  const [ticketPaid, setTicketPaid] = useState(false);
  const [statusReady, setStatusReady] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [myOrders, setMyOrders] = useState<EventArsenalOrderSummary[]>([]);
  const eventId = event?.id;

  const reloadEventDetail = useCallback(async () => {
    if (!params?.slug) return;
    const response = await fetch(`/api/events/${params.slug}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Event not found");
    setEvent(payload.data);
    setAttendeeCount(Number(payload.data.attendee_count || 0));
  }, [params?.slug]);

  useEffect(() => {
    if (!params?.slug) return;
    reloadEventDetail().catch((loadFailure) =>
      setLoadError(
        loadFailure instanceof Error ? loadFailure.message : "Event not found",
      ),
    );
  }, [params?.slug, reloadEventDetail]);

  const refreshStatus = useCallback(async (): Promise<{
    rsvp: RsvpStatus | null;
    orders: EventArsenalOrderSummary[];
  }> => {
    if (!user || eventId === undefined) return { rsvp: null, orders: [] };
    const [rsvpRes, arsenalRes] = await Promise.all([
      authenticatedFetch(`/api/events/${eventId}/rsvp/status`),
      authenticatedFetch(`/api/events/${eventId}/my-arsenal`),
    ]);
    let status: RsvpStatus | null = null;
    if (rsvpRes.ok) {
      const { data } = await rsvpRes.json();
      status = {
        attending: Boolean(data?.attending),
        ticketPaid: Boolean(data?.ticketPaid),
        attendeeCount: Number(data?.attendee_count ?? 0),
      };
      setAttending(status.attending);
      setTicketPaid(status.ticketPaid);
      setAttendeeCount(status.attendeeCount);
    }
    let orders: EventArsenalOrderSummary[] = [];
    if (arsenalRes.ok) {
      const body = await arsenalRes.json();
      orders = Array.isArray(body?.data) ? body.data : [];
      setMyOrders(orders);
    }
    return { rsvp: status, orders };
  }, [user, eventId]);

  useEffect(() => {
    setStatusReady(false);
    if (!user) {
      setAttending(false);
      setTicketPaid(false);
      setMyOrders([]);
      return;
    }
    if (eventId === undefined) return;
    let active = true;
    refreshStatus()
      .catch(() => undefined)
      .finally(() => {
        if (active) setStatusReady(true);
      });
    return () => {
      active = false;
    };
  }, [user, eventId, refreshStatus]);

  const checkout = useCheckoutReturn({
    ready: !!user && eventId !== undefined,
    isFulfilled: async (searchParams) => {
      const targetOrder = searchParams.get("arsenalOrder");
      const latest = await refreshStatus();
      if (targetOrder) {
        const fulfilled = latest.orders.some(
          (o) => String(o.id) === targetOrder && o.status === "paid",
        );
        if (fulfilled) void reloadEventDetail().catch(() => undefined);
        return fulfilled;
      }
      return latest.rsvp?.ticketPaid === true;
    },
  });

  const toggleRsvp = async () => {
    if (!event || !user) return;
    setRsvpLoading(true);
    setRsvpError("");
    try {
      const response = await authenticatedFetch(
        `/api/events/${event.id}/rsvp`,
        {
          method: attending ? "DELETE" : "POST",
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        // The server may know something the page does not: a paid or required ticket.
        void refreshStatus().catch(() => undefined);
        setRsvpError(payload?.error || "Could not update RSVP");
        return;
      }
      setAttending(!attending);
      setAttendeeCount((count) => Math.max(0, count + (attending ? -1 : 1)));
    } catch {
      setRsvpError("Could not update RSVP");
    } finally {
      setRsvpLoading(false);
    }
  };

  if (loadError)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-rose-600">{tr(loadError)}</p>
        <Button asChild className="mt-4">
          <Link href="/events">{tr("Back to events")}</Link>
        </Button>
      </div>
    );
  if (!event)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-slate-500">
        {tr("Loading event...")}
      </div>
    );

  const arsenalItems = event.arsenal_items ?? [];
  const hasArsenalTicketTiers = arsenalItems.some(
    (item) => item.kind === "TICKET" && item.active,
  );
  const ticketTierCount = arsenalItems.filter((i) => i.kind === "TICKET").length;
  const merchCount = arsenalItems.filter((i) => i.kind === "MERCH").length;
  const addonCount = arsenalItems.filter((i) => i.kind === "ADDON").length;
  const minTicketCents = hasArsenalTicketTiers
    ? Math.min(
        ...arsenalItems
          .filter((i) => i.kind === "TICKET")
          .map((i) => i.priceCents),
      )
    : null;

  // Hold the fallback RSVP/activity-ticket buttons when no custom Arsenal ticket tiers exist.
  const controlsReady = ticket !== undefined && (!user || statusReady);
  let controls: ReactNode = null;
  if (!hasArsenalTicketTiers && controlsReady && !checkout.awaitingPayment) {
    if (ticketPaid && attending) {
      controls = (
        <span className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white">
          <Check className="h-4 w-4" aria-hidden="true" />
          {tr("Going (ticket paid)")}
        </span>
      );
    } else if (ticket && !attending && !ticketPaid) {
      controls = (
        <OfferCheckoutButton
          offer={ticket}
          label="Buy ticket"
          eventId={event.id}
          onOwned={() => void refreshStatus().catch(() => undefined)}
        />
      );
    } else if (user) {
      controls = (
        <Button
          onClick={() => void toggleRsvp()}
          disabled={rsvpLoading}
          className={
            attending ? "bg-amber-700" : "bg-amber-600 hover:bg-amber-700"
          }
        >
          {rsvpLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : attending ? (
            <Check className="mr-2 h-4 w-4" />
          ) : null}
          {attending
            ? tr("Going")
            : ticketPaid
              ? tr("Join (ticket paid)")
              : tr("Join for free")}
        </Button>
      );
    } else {
      controls = (
        <Button asChild>
          <Link
            href={`/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`}
          >
            {tr("Sign in to join for free")}
          </Link>
        </Button>
      );
    }
  }

  const returnPurchaseKind = checkout.params?.get("arsenalOrder")
    ? "event_arsenal"
    : "activity";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-amber-50/20 to-white px-4 py-10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-4xl">
        <CheckoutReturnNotice
          phase={checkout.phase}
          purchase={returnPurchaseKind}
          onCheckAgain={checkout.checkAgain}
          onDismiss={checkout.dismiss}
        />

        <EventPosterVisual
          title={event.title}
          eventType={event.event_type}
          startsAt={event.starts_at}
          venue={event.venue}
          city={event.city}
          imageUrl={event.image_url}
          themeAccent={event.theme_accent}
          organizerName={event.organizer_name}
          attendeeCount={attendeeCount}
          capacity={event.capacity}
          minTicketCents={minTicketCents}
          ticketTierCount={ticketTierCount}
          merchCount={merchCount}
          addonCount={addonCount}
        />

        <Card className="mt-6 border-slate-200 dark:border-slate-800 dark:bg-slate-900/90">
          <CardContent className="space-y-5 pt-6">
            <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-200">
              {event.description}
            </p>
            <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-amber-600" />
                {new Date(event.starts_at).toLocaleString()}
              </span>
              {(event.venue || event.city) && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  {[event.venue, event.city].filter(Boolean).join(" · ")}
                </span>
              )}
              {event.organizer_name && (
                <span>
                  {tr("Hosted by {name}", { name: event.organizer_name })}
                </span>
              )}
              {event.community_name && (
                <span>
                  {tr("Hosted with {name}", { name: event.community_name })}
                </span>
              )}
              {event.capacity && (
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-600" />
                  {tr("Capacity: {count}", { count: event.capacity })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 border-y border-slate-100 py-4 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {tr(
                  attendeeCount === 1
                    ? "{count} person going"
                    : "{count} people going",
                  { count: attendeeCount },
                )}
              </span>
              {controls}
            </div>
            {rsvpError ? (
              <p role="alert" className="text-sm text-rose-600">
                {tr(rsvpError)}
              </p>
            ) : null}
            {ticketPaid && attending ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tr(
                  "Your ticket is paid. To cancel it and request a refund, contact support.",
                )}{" "}
                <a
                  href="mailto:support@versoair.com"
                  className="font-medium underline underline-offset-2"
                >
                  support@versoair.com
                </a>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <EventArsenalStorefront
          eventId={event.id}
          eventTitle={event.title}
          themeAccent={event.theme_accent}
          items={arsenalItems}
          myOrders={myOrders}
          isSignedIn={Boolean(user)}
          awaitingPayment={checkout.awaitingPayment}
          onOrderCompleted={async () => {
            await Promise.all([refreshStatus(), reloadEventDetail()]);
          }}
        />

        <div className="mt-8">
          <Button asChild variant="outline">
            <Link href="/events">{tr("Back to events")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
