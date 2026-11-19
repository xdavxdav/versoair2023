import { useCallback, useEffect, useState, type ReactNode } from "react";
import CheckoutReturnNotice from "@/components/CheckoutReturnNotice";
import OfferCheckoutButton, { useActiveOffer } from "@/components/OfferCheckoutButton";
import { CalendarDays, Check, Loader2, MapPin } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCheckoutReturn } from "@/hooks/use-checkout-return";
import { useTranslate } from "@/hooks/use-translate";
import { authenticatedFetch } from "@/lib/auth";

interface EventRecord {
  title: string;
  description: string;
  starts_at: string;
  ends_at?: string | null;
  venue?: string | null;
  city?: string | null;
  community_name?: string | null;
  event_type: string;
  id: number;
  attendee_count: number;
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
  const eventId = event?.id;

  useEffect(() => {
    if (!params?.slug) return;
    fetch(`/api/events/${params.slug}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Event not found");
        setEvent(payload.data);
        setAttendeeCount(Number(payload.data.attendee_count || 0));
      })
      .catch((loadFailure) =>
        setLoadError(
          loadFailure instanceof Error ? loadFailure.message : "Event not found",
        ),
      );
  }, [params?.slug]);

  const refreshStatus = useCallback(async (): Promise<RsvpStatus | null> => {
    if (!user || eventId === undefined) return null;
    const response = await authenticatedFetch(
      `/api/events/${eventId}/rsvp/status`,
    );
    if (!response.ok) return null;
    const { data } = await response.json();
    const status = {
      attending: Boolean(data?.attending),
      ticketPaid: Boolean(data?.ticketPaid),
      attendeeCount: Number(data?.attendee_count ?? 0),
    };
    setAttending(status.attending);
    setTicketPaid(status.ticketPaid);
    setAttendeeCount(status.attendeeCount);
    return status;
  }, [user, eventId]);

  useEffect(() => {
    setStatusReady(false);
    if (!user) {
      setAttending(false);
      setTicketPaid(false);
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
    isFulfilled: async () => (await refreshStatus())?.ticketPaid === true,
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

  // Hold the buttons until we know what is on sale and what this visitor already has.
  const controlsReady = ticket !== undefined && (!user || statusReady);
  let controls: ReactNode = null;
  if (controlsReady && !checkout.awaitingPayment) {
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

  return (
    <main className="min-h-screen bg-amber-50/30 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <CheckoutReturnNotice
          phase={checkout.phase}
          purchase="activity"
          onCheckAgain={checkout.checkAgain}
          onDismiss={checkout.dismiss}
        />
      </div>
      <Card className="mx-auto max-w-3xl border-slate-200">
        <CardHeader>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
            {event.event_type}
          </p>
          <CardTitle className="text-3xl">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="whitespace-pre-wrap text-slate-700">
            {event.description}
          </p>
          <div className="grid gap-3 text-sm text-slate-600">
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
            {event.community_name && (
              <span>
                {tr("Hosted with {name}", { name: event.community_name })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-y border-slate-100 py-4">
            <span className="text-sm font-medium text-slate-700">
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
            <p className="text-sm text-slate-500">
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
          <Button asChild variant="outline">
            <Link href="/events">{tr("Back to events")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
