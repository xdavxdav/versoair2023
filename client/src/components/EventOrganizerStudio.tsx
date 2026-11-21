import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Check,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Sparkles,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/auth";
import {
  ACCENT_THEMES,
  compressImageFileToDataUrl,
  EventPosterVisual,
} from "@/components/EventPosterVisual";
import {
  EVENT_ARSENAL_KINDS,
  EVENT_CATEGORIES,
  EVENT_THEME_ACCENTS,
  formatCadCents,
  type EventArsenalItem,
  type EventArsenalKind,
  type EventArsenalOrderSummary,
  type EventThemeAccent,
} from "@shared/event-arsenal";

export interface HostedEventRecord {
  id: number;
  title: string;
  slug: string;
  description: string;
  event_type: string;
  starts_at: string;
  ends_at?: string | null;
  venue?: string | null;
  city?: string | null;
  image_url?: string | null;
  theme_accent?: string | null;
  capacity?: number | null;
  status: string;
  host_fee_paid?: boolean;
  attendee_count?: number;
  revenue_cents?: number;
  orders_count?: number;
  checked_in_count?: number;
  latest_audit_reason?: string | null;
  arsenal_items?: EventArsenalItem[];
}

export interface HostFeeMeta {
  required: boolean;
  active: boolean;
  amountCents: number;
  exemptByRole: boolean;
  onlinePaymentsOpen: boolean;
}

interface DraftArsenalItem {
  localId: string;
  serverId?: number;
  kind: EventArsenalKind;
  name: string;
  description: string;
  priceDollars: string;
  stockLimit: string;
  maxPerOrder: string;
  imageUrl: string;
  badge: string;
  variantsCsv: string;
  fulfillmentNote: string;
  active: boolean;
}

const ARSENAL_PRESETS: Array<{
  label: string;
  kind: EventArsenalKind;
  name: string;
  description: string;
  priceDollars: string;
  stockLimit: string;
  badge: string;
  variantsCsv: string;
  fulfillmentNote: string;
}> = [
  {
    label: "+ General Admission ($25)",
    kind: "TICKET",
    name: "General Admission",
    description: "Full entry pass with digital door code.",
    priceDollars: "25.00",
    stockLimit: "150",
    badge: "GA",
    variantsCsv: "",
    fulfillmentNote: "Instant Digital Door Pass",
  },
  {
    label: "+ Early Bird ($15)",
    kind: "TICKET",
    name: "Early Bird Pass",
    description: "Discounted first-wave entry pass while quantities last.",
    priceDollars: "15.00",
    stockLimit: "40",
    badge: "Early Bird",
    variantsCsv: "",
    fulfillmentNote: "Instant Digital Door Pass",
  },
  {
    label: "+ VIP All-Access ($75)",
    kind: "TICKET",
    name: "VIP All-Access Pass",
    description: "Priority skip-the-line entry, VIP lounge access, and welcome drink.",
    priceDollars: "75.00",
    stockLimit: "25",
    badge: "VIP",
    variantsCsv: "",
    fulfillmentNote: "Priority VIP Door Lane",
  },
  {
    label: "+ Free Guestlist ($0)",
    kind: "TICKET",
    name: "Free RSVP Guestlist",
    description: "Complimentary entry before 11 PM (subject to venue capacity).",
    priceDollars: "0",
    stockLimit: "60",
    badge: "Free RSVP",
    variantsCsv: "",
    fulfillmentNote: "Instant Digital Door Pass",
  },
  {
    label: "+ Event Tee ($40 · S–XL)",
    kind: "MERCH",
    name: "Official Event Heavyweight Tee",
    description: "Limited-run screenprinted tour tee reserved for pickup at the merch booth.",
    priceDollars: "40.00",
    stockLimit: "50",
    badge: "Limited Drop",
    variantsCsv: "S, M, L, XL",
    fulfillmentNote: "Pickup at Venue Merch Booth",
  },
  {
    label: "+ Collector Poster ($25)",
    kind: "MERCH",
    name: "Numbered Collector Poster",
    description: "18x24 heavyweight satin print signed by the featured lineup.",
    priceDollars: "25.00",
    stockLimit: "30",
    badge: "Collector",
    variantsCsv: "",
    fulfillmentNote: "Pickup at Venue Merch Booth",
  },
  {
    label: "+ Drink & Skip-Line ($20)",
    kind: "ADDON",
    name: "Fast-Track + 2 Drink Tokens",
    description: "Upgrade any ticket with express entry and 2 bar tokens at check-in.",
    priceDollars: "20.00",
    stockLimit: "50",
    badge: "VIP Add-on",
    variantsCsv: "",
    fulfillmentNote: "Redeemable at Check-in Desk",
  },
];

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function itemToDraft(item: EventArsenalItem): DraftArsenalItem {
  return {
    localId: `srv-${item.id}`,
    serverId: item.id,
    kind: item.kind,
    name: item.name,
    description: item.description || "",
    priceDollars:
      item.priceCents === 0 ? "0" : (item.priceCents / 100).toFixed(2),
    stockLimit: item.stockLimit === null ? "" : String(item.stockLimit),
    maxPerOrder: String(item.maxPerOrder || 6),
    imageUrl: item.imageUrl || "",
    badge: item.badge || "",
    variantsCsv: item.variants.join(", "),
    fulfillmentNote: item.fulfillmentNote || "",
    active: item.active,
  };
}

function serializeDraftItem(d: DraftArsenalItem, sortOrder: number) {
  const numericDollars = Number(d.priceDollars || "0");
  const priceCents = Number.isFinite(numericDollars)
    ? Math.max(0, Math.round(numericDollars * 100))
    : 0;
  const stockTrimmed = d.stockLimit.trim();
  const stockLimit =
    stockTrimmed === "" ? null : Math.max(0, Math.round(Number(stockTrimmed)));
  const maxPerOrder = Math.min(
    20,
    Math.max(1, Math.round(Number(d.maxPerOrder || "6") || 6)),
  );
  const variants = d.variantsCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    kind: d.kind,
    name: d.name.trim(),
    description: d.description.trim(),
    priceCents,
    stockLimit,
    maxPerOrder,
    imageUrl: d.imageUrl.trim() || null,
    badge: d.badge.trim() || null,
    variants,
    fulfillmentNote: d.fulfillmentNote.trim() || null,
    sortOrder,
    active: d.active,
  };
}

const BLANK_COMPOSER: Omit<DraftArsenalItem, "localId"> = {
  kind: "TICKET",
  name: "",
  description: "",
  priceDollars: "25.00",
  stockLimit: "",
  maxPerOrder: "6",
  imageUrl: "",
  badge: "",
  variantsCsv: "",
  fulfillmentNote: "Instant Digital Door Pass",
  active: true,
};

interface EventOrganizerStudioProps {
  editingEvent: HostedEventRecord | null;
  hostFee: HostFeeMeta | null;
  organizerDisplayName?: string;
  onSaved: (savedEventId?: number) => Promise<void> | void;
  onClose: () => void;
}

export function EventOrganizerStudio({
  editingEvent,
  hostFee,
  organizerDisplayName,
  onSaved,
  onClose,
}: EventOrganizerStudioProps) {
  const [title, setTitle] = useState(editingEvent?.title ?? "");
  const [eventType, setEventType] = useState(
    editingEvent?.event_type ?? "PARTY",
  );
  const [themeAccent, setThemeAccent] = useState<EventThemeAccent>(
    (editingEvent?.theme_accent as EventThemeAccent) || "amber",
  );
  const [startsAt, setStartsAt] = useState(
    toDatetimeLocalValue(editingEvent?.starts_at),
  );
  const [endsAt, setEndsAt] = useState(
    toDatetimeLocalValue(editingEvent?.ends_at),
  );
  const [venue, setVenue] = useState(editingEvent?.venue ?? "");
  const [city, setCity] = useState(editingEvent?.city ?? "");
  const [capacity, setCapacity] = useState(
    editingEvent?.capacity ? String(editingEvent.capacity) : "",
  );
  const [imageUrl, setImageUrl] = useState(editingEvent?.image_url ?? "");
  const [description, setDescription] = useState(
    editingEvent?.description ?? "",
  );
  const [arsenal, setArsenal] = useState<DraftArsenalItem[]>(() =>
    (editingEvent?.arsenal_items ?? []).map(itemToDraft),
  );

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [composer, setComposer] = useState(BLANK_COMPOSER);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);
  const [uploadingMerchImg, setUploadingMerchImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(editingEvent?.title ?? "");
    setEventType(editingEvent?.event_type ?? "PARTY");
    setThemeAccent((editingEvent?.theme_accent as EventThemeAccent) || "amber");
    setStartsAt(toDatetimeLocalValue(editingEvent?.starts_at));
    setEndsAt(toDatetimeLocalValue(editingEvent?.ends_at));
    setVenue(editingEvent?.venue ?? "");
    setCity(editingEvent?.city ?? "");
    setCapacity(editingEvent?.capacity ? String(editingEvent.capacity) : "");
    setImageUrl(editingEvent?.image_url ?? "");
    setDescription(editingEvent?.description ?? "");
    setArsenal((editingEvent?.arsenal_items ?? []).map(itemToDraft));
    setError(null);
  }, [editingEvent]);

  const previewStats = useMemo(() => {
    const active = arsenal.filter((i) => i.active);
    const tickets = active.filter((i) => i.kind === "TICKET");
    const merch = active.filter((i) => i.kind === "MERCH");
    const addons = active.filter((i) => i.kind === "ADDON");
    const minTicketCents = tickets.length
      ? Math.min(
          ...tickets.map((t) =>
            Math.max(0, Math.round(Number(t.priceDollars || "0") * 100)),
          ),
        )
      : null;
    return {
      ticketTierCount: tickets.length,
      merchCount: merch.length,
      addonCount: addons.length,
      minTicketCents,
    };
  }, [arsenal]);

  const handleFlyerFile = async (file?: File | null) => {
    if (!file) return;
    setUploadingFlyer(true);
    setError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1280);
      setImageUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load flyer image");
    } finally {
      setUploadingFlyer(false);
    }
  };

  const handleMerchFile = async (file?: File | null) => {
    if (!file) return;
    setUploadingMerchImg(true);
    setError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 900);
      setComposer((prev) => ({ ...prev, imageUrl: dataUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load item photo");
    } finally {
      setUploadingMerchImg(false);
    }
  };

  const addPreset = async (preset: (typeof ARSENAL_PRESETS)[number]) => {
    setError(null);
    const draft: DraftArsenalItem = {
      localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: preset.kind,
      name: preset.name,
      description: preset.description,
      priceDollars: preset.priceDollars,
      stockLimit: preset.stockLimit,
      maxPerOrder: "6",
      imageUrl: "",
      badge: preset.badge,
      variantsCsv: preset.variantsCsv,
      fulfillmentNote: preset.fulfillmentNote,
      active: true,
    };
    if (editingEvent) {
      const res = await authenticatedFetch(
        `/api/events/${editingEvent.id}/arsenal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serializeDraftItem(draft, arsenal.length)),
        },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error || "Could not add preset item");
        return;
      }
      setArsenal((prev) => [...prev, itemToDraft(body.data)]);
      return;
    }
    setArsenal((prev) => [...prev, draft]);
  };

  const saveComposerItem = async () => {
    setError(null);
    if (composer.name.trim().length < 2) {
      setError("Please give the arsenal item a name (at least 2 characters).");
      return;
    }
    const cents = Math.round(Number(composer.priceDollars || "0") * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      setError("Enter a valid price in CAD.");
      return;
    }
    if (cents > 0 && cents < 100) {
      setError("Paid items must be at least CA$1.00 (or CA$0 for a free ticket).");
      return;
    }
    if (composer.kind !== "TICKET" && cents === 0) {
      setError("Merch drops and VIP add-ons must be priced at CA$1.00 or more.");
      return;
    }

    const targetDraft: DraftArsenalItem = {
      localId:
        editingLocalId ??
        `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      serverId: editingLocalId
        ? arsenal.find((i) => i.localId === editingLocalId)?.serverId
        : undefined,
      ...composer,
    };

    if (editingEvent) {
      const payload = serializeDraftItem(targetDraft, arsenal.length);
      const url = targetDraft.serverId
        ? `/api/events/${editingEvent.id}/arsenal/${targetDraft.serverId}`
        : `/api/events/${editingEvent.id}/arsenal`;
      const method = targetDraft.serverId ? "PUT" : "POST";
      const res = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error || "Failed to save arsenal item");
        return;
      }
      const savedDraft = itemToDraft(body.data);
      setArsenal((prev) =>
        editingLocalId
          ? prev.map((it) => (it.localId === editingLocalId ? savedDraft : it))
          : [...prev, savedDraft],
      );
    } else {
      setArsenal((prev) =>
        editingLocalId
          ? prev.map((it) => (it.localId === editingLocalId ? targetDraft : it))
          : [...prev, targetDraft],
      );
    }

    setComposer(BLANK_COMPOSER);
    setEditingLocalId(null);
    setComposerOpen(false);
  };

  const removeArsenalItem = async (item: DraftArsenalItem) => {
    setError(null);
    if (editingEvent && item.serverId) {
      const res = await authenticatedFetch(
        `/api/events/${editingEvent.id}/arsenal/${item.serverId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Could not remove arsenal item");
        return;
      }
    }
    setArsenal((prev) => prev.filter((x) => x.localId !== item.localId));
  };

  const handleSaveEvent = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const eventBody: Record<string, unknown> = {
        title,
        description,
        eventType,
        themeAccent,
        startsAt: startsAt ? new Date(startsAt).toISOString() : "",
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        venue: venue.trim() || null,
        city: city.trim() || null,
        capacity: capacity.trim() ? Number(capacity) : null,
        imageUrl: imageUrl.trim() || null,
      };
      if (!editingEvent) {
        eventBody.arsenalItems = arsenal.map((item, idx) =>
          serializeDraftItem(item, idx),
        );
      }

      const res = await authenticatedFetch(
        editingEvent ? `/api/events/${editingEvent.id}` : "/api/events",
        {
          method: editingEvent ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventBody),
        },
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error || "Could not save event");
        return;
      }
      await onSaved(Number(payload?.data?.id ?? editingEvent?.id));
    } catch {
      setError("Network error while saving event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-amber-300/60 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
            Graphical Event &amp; Arsenal Studio
          </p>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {editingEvent ? `Manage "${editingEvent.title}"` : "Design & Host Your Event"}
          </h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          <X className="mr-1.5 h-4 w-4" />
          Close Studio
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
        >
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: BUILDER FORM + GRAPHICAL ARSENAL */}
        <form onSubmit={handleSaveEvent} className="space-y-6 lg:col-span-7">
          {/* 1. Category & Theme Accent */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              1. Vibe, Category &amp; Stage Palette
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_CATEGORIES.map((cat) => {
                const selected = eventType === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEventType(cat.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      selected
                        ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950"
                        : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Flyer Accent:
              </span>
              {EVENT_THEME_ACCENTS.map((acc) => {
                const meta = ACCENT_THEMES[acc];
                const active = themeAccent === acc;
                return (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => setThemeAccent(acc)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                      active
                        ? `border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-slate-800`
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${meta.swatch}`} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Flyer Artwork & Event Details */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              2. Flyer Artwork, Schedule &amp; Venue
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
                {uploadingFlyer ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                Upload Flyer Artwork
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleFlyerFile(e.target.files?.[0])}
                />
              </label>
              <input
                type="text"
                placeholder="Or paste flyer https:// image URL"
                value={imageUrl.startsWith("data:") ? "" : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="min-w-[200px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
                >
                  Clear flyer
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
                Event Title *
                <input
                  required
                  placeholder="e.g., Neon Rooftop Listening Session & Merch Pop-up"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Doors Open / Starts At *
                <input
                  required
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ends At (optional)
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Venue / Spot
                <input
                  placeholder="e.g., Studio Saint-Laurent"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                City
                <input
                  placeholder="e.g., Montreal"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Max Guest Capacity (optional)
                <input
                  type="number"
                  min="1"
                  max="100000"
                  placeholder="Unlimited"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
                Lineup, Vibe &amp; Event Details *
                <textarea
                  required
                  rows={4}
                  placeholder="Tell guests about the DJs/performers, dress code, schedule, and exclusive merch drops..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>
            </div>
          </div>

          {/* 3. Graphical Event Arsenal Builder */}
          <div className="space-y-4 rounded-2xl border border-amber-300/70 bg-amber-50/40 p-4 dark:border-amber-500/30 dark:bg-slate-950/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  3. Event Arsenal — Tickets, Merch &amp; VIP Perks
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Click a preset to drop it right in, or craft custom ticket tiers &amp; merch items.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingLocalId(null);
                  setComposer(BLANK_COMPOSER);
                  setComposerOpen(true);
                }}
                className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Custom Item
              </Button>
            </div>

            {/* 1-Click Presets */}
            <div className="flex flex-wrap gap-1.5">
              {ARSENAL_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => void addPreset(preset)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-sm transition hover:border-amber-500 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-400"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Item Visual Composer */}
            {composerOpen && (
              <div className="space-y-3 rounded-2xl border border-slate-300 bg-white p-4 shadow-md dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {editingLocalId ? "Edit Arsenal Item" : "Add Arsenal Item"}
                  </h4>
                  <div className="flex gap-1">
                    {EVENT_ARSENAL_KINDS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() =>
                          setComposer((prev) => ({
                            ...prev,
                            kind: k,
                            fulfillmentNote:
                              k === "TICKET"
                                ? "Instant Digital Door Pass"
                                : "Pickup at Venue Merch Booth",
                          }))
                        }
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                          composer.kind === k
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {k === "ADDON" ? "VIP PERK" : k}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Item Name *
                    <input
                      placeholder="e.g., VIP Backstage Pass or Tour Hoodie"
                      value={composer.name}
                      onChange={(e) =>
                        setComposer({ ...composer, name: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Price (CAD $)
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      step="0.01"
                      value={composer.priceDollars}
                      onChange={(e) =>
                        setComposer({ ...composer, priceDollars: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Stock Limit (blank = unlimited)
                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={composer.stockLimit}
                      onChange={(e) =>
                        setComposer({ ...composer, stockLimit: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Highlight Badge (optional)
                    <input
                      placeholder="Early Bird, VIP, Limited..."
                      value={composer.badge}
                      onChange={(e) =>
                        setComposer({ ...composer, badge: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  {composer.kind !== "TICKET" && (
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
                      Sizes / Variants (comma-separated, optional)
                      <input
                        placeholder="S, M, L, XL"
                        value={composer.variantsCsv}
                        onChange={(e) =>
                          setComposer({
                            ...composer,
                            variantsCsv: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                  )}

                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
                    Pickup / Delivery Note
                    <input
                      placeholder="Instant Digital Door Pass / Pickup at Merch Booth / Ships in Canada"
                      value={composer.fulfillmentNote}
                      onChange={(e) =>
                        setComposer({
                          ...composer,
                          fulfillmentNote: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
                    Short Description
                    <input
                      placeholder="What's included with this item?"
                      value={composer.description}
                      onChange={(e) =>
                        setComposer({ ...composer, description: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {uploadingMerchImg ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5" />
                      )}
                      Item Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          void handleMerchFile(e.target.files?.[0])
                        }
                      />
                    </label>
                    <input
                      placeholder="Or item photo https:// URL"
                      value={
                        composer.imageUrl.startsWith("data:")
                          ? ""
                          : composer.imageUrl
                      }
                      onChange={(e) =>
                        setComposer({ ...composer, imageUrl: e.target.value })
                      }
                      className="min-w-[160px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setComposerOpen(false);
                      setEditingLocalId(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void saveComposerItem()}
                    className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
                  >
                    {editingLocalId ? "Update Item" : "Add to Arsenal"}
                  </Button>
                </div>
              </div>
            )}

            {/* Visual Arsenal Deck */}
            {arsenal.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                No tickets or merch added yet — tap a preset above to populate your event's arsenal!
              </p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {arsenal.map((item) => {
                  const cents = Math.max(
                    0,
                    Math.round(Number(item.priceDollars || "0") * 100),
                  );
                  return (
                    <div
                      key={item.localId}
                      className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                            {item.kind === "ADDON" ? "VIP" : item.kind}
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {formatCadCents(cents)}
                          </span>
                          {item.stockLimit && (
                            <span className="text-[10px] text-slate-500">
                              · {item.stockLimit} cap
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </p>
                        {item.variantsCsv && (
                          <p className="truncate text-[11px] text-slate-500">
                            Options: {item.variantsCsv}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => {
                            setEditingLocalId(item.localId);
                            setComposer({
                              kind: item.kind,
                              name: item.name,
                              description: item.description,
                              priceDollars: item.priceDollars,
                              stockLimit: item.stockLimit,
                              maxPerOrder: item.maxPerOrder,
                              imageUrl: item.imageUrl,
                              badge: item.badge,
                              variantsCsv: item.variantsCsv,
                              fulfillmentNote: item.fulfillmentNote,
                              active: item.active,
                            });
                            setComposerOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${item.name}`}
                          onClick={() => void removeArsenalItem(item)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {hostFee?.required ? (
                <span>
                  Hosting fee:{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {formatCadCents(hostFee.amountCents)}
                  </strong>{" "}
                  one-time when ready to submit for review.
                </span>
              ) : (
                <span>No hosting fee required to submit for review.</span>
              )}
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="bg-amber-500 px-6 font-black text-slate-950 hover:bg-amber-400"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingEvent ? "Save Event Changes" : "Save Event & Arsenal Draft"}
            </Button>
          </div>
        </form>

        {/* RIGHT COLUMN: LIVE GRAPHICAL FLYER & ARSENAL PREVIEW */}
        <div className="space-y-4 lg:col-span-5">
          <div className="lg:sticky lg:top-20 space-y-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Live Poster &amp; Storefront Preview
            </p>

            <EventPosterVisual
              title={title || "Your Event Headline"}
              eventType={eventType}
              startsAt={startsAt ? new Date(startsAt).toISOString() : null}
              venue={venue || "Venue TBA"}
              city={city || "Montreal"}
              imageUrl={imageUrl || null}
              themeAccent={themeAccent}
              organizerName={organizerDisplayName || "You"}
              capacity={capacity ? Number(capacity) : null}
              minTicketCents={previewStats.minTicketCents}
              ticketTierCount={previewStats.ticketTierCount}
              merchCount={previewStats.merchCount}
              addonCount={previewStats.addonCount}
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>Included in Your Event Page</span>
                <span className="text-amber-600 dark:text-amber-400">
                  {arsenal.length} Arsenal {arsenal.length === 1 ? "Item" : "Items"}
                </span>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <Ticket className="h-3.5 w-3.5 text-amber-500" />
                  Stripe CAD checkout + instant <code className="font-mono">VA-EVT</code> digital door passes
                </li>
                <li className="flex items-center gap-2">
                  <ShoppingBag className="h-3.5 w-3.5 text-pink-500" />
                  Merch size variants, stock caps, and booth pickup tracking
                </li>
                <li className="flex items-center gap-2">
                  <QrCode className="h-3.5 w-3.5 text-emerald-500" />
                  Live Box Office guestlist &amp; 1-tap door check-in
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ORGANIZER BOX OFFICE & DOOR CHECK-IN PANEL ─────────────────────────────

interface EventBoxOfficePanelProps {
  eventId: number;
  eventTitle: string;
  onClose: () => void;
}

export function EventBoxOfficePanel({
  eventId,
  eventTitle,
  onClose,
}: EventBoxOfficePanelProps) {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    attendeeCount: 0,
    capacity: null as number | null,
    paidOrders: 0,
    grossRevenueCents: 0,
    ticketsSold: 0,
    merchSold: 0,
    checkedInOrders: 0,
    merchFulfilledOrders: 0,
  });
  const [orders, setOrders] = useState<EventArsenalOrderSummary[]>([]);

  const loadBoxOffice = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/events/${eventId}/box-office`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not load box office");
      if (body?.data?.stats) {
        setStats((prev) => ({ ...prev, ...body.data.stats }));
      }
      setOrders(Array.isArray(body?.data?.orders) ? body.data.orders : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load box office");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBoxOffice();
  }, [eventId]);

  const toggleOrderFlag = async (
    orderId: number,
    patch: { checkedIn?: boolean; merchFulfilled?: boolean },
  ) => {
    setBusyOrderId(orderId);
    try {
      const res = await authenticatedFetch(
        `/api/events/${eventId}/orders/${orderId}/check-in`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Update failed");
      }
      await loadBoxOffice();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyOrderId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.passCode.toLowerCase().includes(q) ||
        (o.buyerName || "").toLowerCase().includes(q) ||
        (o.buyerEmail || "").toLowerCase().includes(q),
    );
  }, [orders, query]);

  return (
    <div className="rounded-3xl border border-emerald-400/50 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            Live Box Office &amp; Door Check-In
          </p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {eventTitle}
          </h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          <X className="mr-1.5 h-4 w-4" />
          Close Box Office
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </p>
      )}

      {/* KPI Tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase text-slate-500">
            Gross Box Office
          </p>
          <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
            {stats.grossRevenueCents === 0
              ? "CA$0.00"
              : formatCadCents(stats.grossRevenueCents)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase text-slate-500">
            Tickets Issued
          </p>
          <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
            {stats.ticketsSold}
            {stats.capacity ? ` / ${stats.capacity}` : ""}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase text-slate-500">
            Merch &amp; VIP Sold
          </p>
          <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
            {stats.merchSold}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase text-slate-500">
            Door Checked In
          </p>
          <p className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.checkedInOrders} / {stats.paidOrders}
          </p>
        </div>
      </div>

      {/* Door Pass Lookup */}
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Scan or type pass code (VA-EVT-...) or guest name/email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </div>

      <div className="mt-4 space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-8 text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading guest passes...
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">
            {orders.length === 0
              ? "No passes or arsenal orders yet — share your event link once published!"
              : "No pass matches your search."}
          </p>
        ) : (
          filteredOrders.map((order) => {
            const isPaid = order.status === "paid";
            return (
              <div
                key={order.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-black text-amber-300">
                      {order.passCode}
                    </code>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {order.buyerName}
                    </span>
                    {order.buyerEmail && (
                      <span className="text-xs text-slate-500">
                        {order.buyerEmail}
                      </span>
                    )}
                    {!isPaid && (
                      <span className="rounded bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-600">
                        {order.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {order.items
                      .map(
                        (it) =>
                          `${it.quantity}x ${it.itemName}${
                            it.variant ? ` (${it.variant})` : ""
                          }`,
                      )
                      .join(" · ")}{" "}
                    — <strong>{formatCadCents(order.totalCents)}</strong>
                  </p>
                </div>

                {isPaid && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyOrderId === order.id}
                      variant={order.checkedInAt ? "outline" : "default"}
                      onClick={() =>
                        void toggleOrderFlag(order.id, {
                          checkedIn: !order.checkedInAt,
                        })
                      }
                      className={
                        order.checkedInAt
                          ? "border-emerald-500 text-emerald-700 dark:text-emerald-300"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      {order.checkedInAt ? "Checked In" : "Check In Door"}
                    </Button>
                    {order.merchQty > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyOrderId === order.id}
                        variant="outline"
                        onClick={() =>
                          void toggleOrderFlag(order.id, {
                            merchFulfilled: !order.merchFulfilledAt,
                          })
                        }
                        className={
                          order.merchFulfilledAt
                            ? "border-pink-500 text-pink-700 dark:text-pink-300"
                            : ""
                        }
                      >
                        <Package className="mr-1 h-3.5 w-3.5" />
                        {order.merchFulfilledAt
                          ? "Merch Handed Over"
                          : "Mark Merch Picked Up"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
