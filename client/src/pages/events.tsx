import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, Compass, Loader2, MapPin, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth";

interface EventRecord {
  id: number;
  title: string;
  slug: string;
  description: string;
  event_type: string;
  starts_at: string;
  city?: string | null;
  venue?: string | null;
  status?: string;
}

export default function EventsPage() {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startsAt: "",
    city: "",
    venue: "",
  });
  const [myEvents, setMyEvents] = useState<EventRecord[]>([]);

  useEffect(() => {
    fetch("/api/events")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error || "Failed to load events");
        setEvents(payload.data || []);
      })
      .catch((error) =>
        setMessage(
          error instanceof Error ? error.message : "Failed to load events",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setMyEvents([]);
      return;
    }
    authenticatedFetch("/api/events/me")
      .then(async (response) => {
        const payload = await response.json();
        if (response.ok) setMyEvents(payload.data || []);
      })
      .catch(() => undefined);
  }, [user]);

  const createDraft = async (event: FormEvent) => {
    event.preventDefault();
    const response = await authenticatedFetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "Failed to create event draft");
      return;
    }
    setForm({ title: "", description: "", startsAt: "", city: "", venue: "" });
    setFormOpen(false);
    setMessage(
      "Event saved as a draft. It will be reviewed before publication.",
    );
    const refreshed = await authenticatedFetch("/api/events/me");
    if (refreshed.ok) setMyEvents((await refreshed.json()).data || []);
  };

  const submitDraft = async (id: number) => {
    const response = await authenticatedFetch(`/api/events/${id}/submit`, {
      method: "POST",
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "Failed to submit event");
      return;
    }
    setMyEvents((current) =>
      current.map((event) =>
        event.id === id ? { ...event, status: "PENDING" } : event,
      ),
    );
    setMessage("Event submitted for review.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-amber-50/40">
      <section className="border-b border-emerald-100 bg-emerald-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
              <CalendarDays className="h-4 w-4" /> Events on Verso Air
            </p>
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              Find something worth showing up for.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-100">
              Discover workshops, cultural programs, live entertainment, and
              community gatherings in one dedicated event space.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {message && (
          <p
            className="mb-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700"
            role="alert"
          >
            {message}
          </p>
        )}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-emerald-100 shadow-sm">
            <CardHeader>
              <Sparkles className="h-6 w-6 text-emerald-600" />
              <CardTitle>Workshops</CardTitle>
              <CardDescription>
                Learn directly from artisans and craft professionals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/artisan-workshops">Explore workshops</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-amber-100 shadow-sm">
            <CardHeader>
              <Compass className="h-6 w-6 text-amber-600" />
              <CardTitle>Cultural programs</CardTitle>
              <CardDescription>
                Explore programs, showcases, and cultural experiences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/programs">View programs</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-sky-100 shadow-sm">
            <CardHeader>
              <MapPin className="h-6 w-6 text-sky-600" />
              <CardTitle>Entertainment</CardTitle>
              <CardDescription>
                Browse entertainment businesses and event-ready venues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/divertissement">Browse entertainment</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-10 border-slate-200 bg-white/80 shadow-sm">
          <CardContent className="py-10">
            {loading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
            ) : events.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {events.map((event) => (
                  <Card key={event.id} className="border-slate-200 text-left">
                    <CardHeader>
                      <CardTitle>{event.title}</CardTitle>
                      <CardDescription>
                        {new Date(event.starts_at).toLocaleString()}
                        {event.city ? ` · ${event.city}` : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600">
                        {event.description}
                      </p>
                      <Button asChild variant="link" className="mt-2 px-0">
                        <Link href={`/events/${event.slug}`}>
                          View event details
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <CalendarDays className="mx-auto h-12 w-12 text-slate-300" />
                <h2 className="mt-4 text-xl font-bold text-slate-800">
                  No published events yet
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-slate-500">
                  Workshops and cultural programs remain available while the
                  event directory is being populated.
                </p>
              </div>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/communities">Explore communities</Link>
              </Button>
              {user ? (
                <Button
                  variant="outline"
                  onClick={() => setFormOpen((open) => !open)}
                >
                  Submit an event
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/apply?portal=artisan&redirect=/events">
                    Apply as an artisan
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {formOpen && user && (
          <Card className="mt-6 border-emerald-200">
            <CardHeader>
              <CardTitle>Submit an event draft</CardTitle>
              <CardDescription>
                Events are reviewed before publication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createDraft} className="grid gap-4">
                <input
                  className="rounded-md border px-3 py-2"
                  placeholder="Event title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
                <input
                  className="rounded-md border px-3 py-2"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                  required
                />
                <input
                  className="rounded-md border px-3 py-2"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
                <input
                  className="rounded-md border px-3 py-2"
                  placeholder="Venue"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                />
                <textarea
                  className="min-h-28 rounded-md border px-3 py-2"
                  placeholder="Describe the event"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  required
                />
                <Button type="submit">Save draft for review</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {user && myEvents.length > 0 && (
          <Card className="mt-6 border-slate-200">
            <CardHeader>
              <CardTitle>My submitted events</CardTitle>
              <CardDescription>
                Track drafts and review status from one place.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {myEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {event.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {event.status} ·{" "}
                      {new Date(event.starts_at).toLocaleString()}
                    </p>
                  </div>
                  {event.status === "DRAFT" && (
                    <Button
                      size="sm"
                      onClick={() => void submitDraft(event.id)}
                    >
                      Submit for review
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
