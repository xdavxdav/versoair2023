import { useEffect, useState } from "react";
import { CalendarDays, Check, Loader2, MapPin } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
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

export default function EventDetailPage() {
  const [, params] = useRoute("/events/:slug");
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [error, setError] = useState("");
  const { user } = useAuthContext();
  const [attending, setAttending] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    if (!params?.slug) return;
    fetch(`/api/events/${params.slug}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Event not found");
        setEvent(payload.data);
        setAttendeeCount(Number(payload.data.attendee_count || 0));
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error ? loadError.message : "Event not found",
        ),
      );
  }, [params?.slug]);

  useEffect(() => {
    if (!user || !event) return;
    authenticatedFetch(`/api/events/${event.id}/rsvp/status`)
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json();
        setAttending(Boolean(payload.data?.attending));
        setAttendeeCount(Number(payload.data?.attendee_count || attendeeCount));
      })
      .catch(() => undefined);
  }, [user, event, attendeeCount]);

  const toggleRsvp = async () => {
    if (!event || !user) return;
    setRsvpLoading(true);
    try {
      const response = await authenticatedFetch(
        `/api/events/${event.id}/rsvp`,
        {
          method: attending ? "DELETE" : "POST",
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Could not update RSVP");
      setAttending(!attending);
      setAttendeeCount((count) => Math.max(0, count + (attending ? -1 : 1)));
    } catch (rsvpError) {
      setError(
        rsvpError instanceof Error
          ? rsvpError.message
          : "Could not update RSVP",
      );
    } finally {
      setRsvpLoading(false);
    }
  };

  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-rose-600">{error}</p>
        <Button asChild className="mt-4">
          <Link href="/events">Back to events</Link>
        </Button>
      </div>
    );
  if (!event)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-slate-500">
        Loading event...
      </div>
    );

  return (
    <main className="min-h-screen bg-emerald-50/30 px-4 py-12">
      <Card className="mx-auto max-w-3xl border-slate-200">
        <CardHeader>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
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
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              {new Date(event.starts_at).toLocaleString()}
            </span>
            {(event.venue || event.city) && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                {[event.venue, event.city].filter(Boolean).join(" · ")}
              </span>
            )}
            {event.community_name && (
              <span>Hosted with {event.community_name}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-y border-slate-100 py-4">
            <span className="text-sm font-medium text-slate-700">
              {attendeeCount} {attendeeCount === 1 ? "person" : "people"} going
            </span>
            {user ? (
              <Button
                onClick={() => void toggleRsvp()}
                disabled={rsvpLoading}
                className={
                  attending
                    ? "bg-emerald-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }
              >
                {rsvpLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : attending ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : null}
                {attending ? "Going" : "Join for free"}
              </Button>
            ) : (
              <Button asChild>
                <Link
                  href={`/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`}
                >
                  Sign in to join for free
                </Link>
              </Button>
            )}
          </div>
          <Button asChild variant="outline">
            <Link href="/events">Back to events</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
