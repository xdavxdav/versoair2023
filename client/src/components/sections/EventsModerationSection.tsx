import { useEffect, useState } from "react";
import { Calendar, Check, Loader2, RefreshCw, X } from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EventReviewRecord {
  id: number;
  title: string;
  description: string;
  event_type: string;
  starts_at: string;
  city?: string | null;
  venue?: string | null;
  status: string;
  organizer_name?: string | null;
  organizer_email?: string | null;
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
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    eventType: "",
    startsAt: "",
    endsAt: "",
    venue: "",
    city: "",
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
        body: JSON.stringify(editForm),
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

  return (
    <>
      <Card className="border-slate-200 shadow-lg">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Calendar className="h-5 w-5 text-emerald-600" /> Events Review
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
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {event.title}
                        </h3>
                        <Badge variant="outline">{event.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(event.starts_at).toLocaleString()}{" "}
                        {event.city ? ` · ${event.city}` : ""}{" "}
                        {event.venue ? ` · ${event.venue}` : ""}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {event.description}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Organizer:{" "}
                        {event.organizer_name ||
                          event.organizer_email ||
                          "Unknown"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
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
                        onClick={() => {
                          setEditing(event);
                          setEditForm({
                            title: event.title || "",
                            description: event.description || "",
                            eventType: event.event_type || "",
                            startsAt: event.starts_at?.slice(0, 16) || "",
                            endsAt: "",
                            venue: event.venue || "",
                            city: event.city || "",
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
