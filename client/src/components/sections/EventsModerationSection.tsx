import { useEffect, useState } from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  Loader2,
  QrCode,
  RefreshCw,
  ShoppingBag,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";
import { EventBoxOfficePanel } from "@/components/EventOrganizerStudio";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCadCents, type EventArsenalItem } from "@shared/event-arsenal";

interface EventReviewRecord {
  id: number;
  title: string;
  slug?: string;
  description: string;
  event_type: string;
  starts_at: string;
  ends_at?: string | null;
  city?: string | null;
  venue?: string | null;
  image_url?: string | null;
  theme_accent?: string | null;
  capacity?: number | null;
  status: string;
  organizer_name?: string | null;
  organizer_email?: string | null;
  host_fee_paid?: boolean;
  host_fee_cents?: number | null;
  attendee_count?: number;
  revenue_cents?: number;
  orders_count?: number;
  arsenal_items?: EventArsenalItem[];
}

const STATUS_OPTIONS = [
  "PENDING",
  "DRAFT",
  "PUBLISHED",
  "REJECTED",
  "SUSPENDED",
  "ARCHIVED",
];

export function EventsModerationSection() {
  const [status, setStatus] = useState("PENDING");
  const [events, setEvents] = useState<EventReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<EventReviewRecord | null>(null);
  const [boxOfficeFor, setBoxOfficeFor] = useState<EventReviewRecord | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    eventType: "",
    startsAt: "",
    endsAt: "",
    venue: "",
    city: "",
    capacity: "",
    themeAccent: "amber",
    imageUrl: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `/api/events/admin?status=${status}`,
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Failed to load event review queue");
      setEvents(payload.data || []);
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load event review queue",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const updateStatus = async (id: number, nextStatus: string) => {
    setBusyId(id);
    try {
      const response = await authenticatedFetch(`/api/events/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          reason: `GeoAdmin ${nextStatus.toLowerCase()} review`,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Failed to update event");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to update event",
      );
    } finally {
      setBusyId(null);
    }
  };

  const saveEvent = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      const response = await authenticatedFetch(`/api/events/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          capacity: editForm.capacity.trim() ? Number(editForm.capacity) : null,
          imageUrl: editForm.imageUrl.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Failed to update event");
      setEditing(null);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to update event",
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteEvent = async (id: number) => {
    if (!window.confirm("Delete this event permanently?")) return;
    setBusyId(id);
    try {
      const response = await authenticatedFetch(`/api/events/${id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Failed to delete event");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to delete event",
      );
    } finally {
      setBusyId(null);
    }
  };

  const removeArsenalItem = async (eventId: number, itemId: number) => {
    if (!window.confirm("Remove this arsenal item from the event?")) return;
    setBusyId(eventId);
    try {
      const res = await authenticatedFetch(
        `/api/events/${eventId}/arsenal/${itemId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to remove item");
      }
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to remove item",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Card className="border-slate-200 shadow-lg">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Calendar className="h-5 w-5 text-amber-600" /> Events Review
            </CardTitle>
            <CardDescription>
              Review organizer submissions before they appear publicly.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              aria-label="Filter events by status"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void load()}
              aria-label="Refresh events"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {message && (
            <p className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">
              {message}
            </p>
          )}
          {loading ? (
            <div className="flex justify-center py-10 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading event
              queue...
            </div>
          ) : events.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No {status.toLowerCase()} events.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const arsenalItems = event.arsenal_items ?? [];
                return (
                  <div
                    key={event.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3.5">
                        {event.image_url ? (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="h-20 w-20 shrink-0 rounded-xl object-cover border border-slate-200"
                          />
                        ) : null}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {event.title}
                            </h3>
                            <Badge variant="outline">{event.status}</Badge>
                            <Badge variant="secondary">{event.event_type}</Badge>
                            {event.host_fee_paid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Host Fee Paid
                                {event.host_fee_cents
                                  ? ` (${formatCadCents(event.host_fee_cents)})`
                                  : ""}
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                Fee Unpaid / Admin Exempt
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(event.starts_at).toLocaleString()}{" "}
                            {event.city ? ` · ${event.city}` : ""}{" "}
                            {event.venue ? ` · ${event.venue}` : ""}
                            {event.capacity ? ` · Cap ${event.capacity}` : ""}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            {event.description}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            Organizer:{" "}
                            {event.organizer_name ||
                              event.organizer_email ||
                              "Unknown"}{" "}
                            · {event.attendee_count ?? 0} going ·{" "}
                            {event.orders_count ?? 0} orders (
                            {(event.revenue_cents ?? 0) > 0
                              ? formatCadCents(event.revenue_cents ?? 0)
                              : "CA$0.00"}
                            )
                          </p>

                          {/* Visual Event Arsenal Inspection */}
                          {arsenalItems.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {arsenalItems.map((item) => (
                                <span
                                  key={item.id}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800"
                                >
                                  {item.kind === "TICKET" ? (
                                    <Ticket className="h-3 w-3 text-amber-600" />
                                  ) : (
                                    <ShoppingBag className="h-3 w-3 text-pink-600" />
                                  )}
                                  <strong>{item.name}</strong>
                                  <span className="text-slate-500">
                                    {formatCadCents(item.priceCents)}
                                    {item.stockLimit !== null
                                      ? ` (${item.soldCount}/${item.stockLimit})`
                                      : ` (${item.soldCount} sold)`}
                                  </span>
                                  <button
                                    type="button"
                                    title="Remove arsenal item"
                                    onClick={() =>
                                      void removeArsenalItem(event.id, item.id)
                                    }
                                    className="text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {event.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                void updateStatus(event.id, "PUBLISHED")
                              }
                              disabled={busyId === event.id}
                            >
                              <Check className="mr-1 h-4 w-4" /> Publish
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void updateStatus(event.id, "REJECTED")
                              }
                              disabled={busyId === event.id}
                            >
                              <X className="mr-1 h-4 w-4" /> Reject
                            </Button>
                          </>
                        )}
                        {event.status === "PUBLISHED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void updateStatus(event.id, "SUSPENDED")
                            }
                            disabled={busyId === event.id}
                          >
                            Suspend
                          </Button>
                        )}
                        {event.status === "SUSPENDED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void updateStatus(event.id, "PUBLISHED")
                            }
                            disabled={busyId === event.id}
                          >
                            Restore
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setBoxOfficeFor(event)}
                        >
                          <QrCode className="mr-1 h-3.5 w-3.5" />
                          Box Office
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(event);
                            setEditForm({
                              title: event.title || "",
                              description: event.description || "",
                              eventType: event.event_type || "",
                              startsAt: event.starts_at?.slice(0, 16) || "",
                              endsAt: event.ends_at?.slice(0, 16) || "",
                              venue: event.venue || "",
                              city: event.city || "",
                              capacity: event.capacity
                                ? String(event.capacity)
                                : "",
                              themeAccent: event.theme_accent || "amber",
                              imageUrl: event.image_url || "",
                            });
                          }}
                          disabled={busyId === event.id}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void deleteEvent(event.id)}
                          disabled={busyId === event.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {boxOfficeFor && (
        <div className="mt-4">
          <EventBoxOfficePanel
            eventId={boxOfficeFor.id}
            eventTitle={boxOfficeFor.title}
            onClose={() => setBoxOfficeFor(null)}
          />
        </div>
      )}
      {editing && (
        <Card className="mt-4 border-amber-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-900">Edit event</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(
              [
                "title",
                "eventType",
                "startsAt",
                "endsAt",
                "venue",
                "city",
                "capacity",
                "themeAccent",
                "imageUrl",
              ] as const
            ).map((field) => (
              <label key={field} className="text-sm text-slate-700">
                {field}
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={editForm[field]}
                  onChange={(event) =>
                    setEditForm({ ...editForm, [field]: event.target.value })
                  }
                />
              </label>
            ))}
            <label className="text-sm text-slate-700 sm:col-span-2">
              description
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                rows={3}
                value={editForm.description}
                onChange={(event) =>
                  setEditForm({ ...editForm, description: event.target.value })
                }
              />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                onClick={() => void saveEvent()}
                disabled={busyId === editing.id}
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
