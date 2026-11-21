import { CalendarDays, MapPin, ShoppingBag, Sparkles, Ticket, Users } from "lucide-react";
import {
  EVENT_CATEGORIES,
  formatCadCents,
  isEventThemeAccent,
  type EventThemeAccent,
} from "@shared/event-arsenal";

export const ACCENT_THEMES: Record<
  EventThemeAccent,
  {
    label: string;
    swatch: string;
    gradient: string;
    glow: string;
    pill: string;
    ring: string;
    button: string;
  }
> = {
  amber: {
    label: "Amber Gold",
    swatch: "bg-amber-500",
    gradient: "from-stone-950 via-amber-950 to-orange-900",
    glow: "bg-amber-500/25",
    pill: "border-amber-400/40 bg-amber-500/20 text-amber-200",
    ring: "ring-amber-500",
    button: "bg-amber-500 hover:bg-amber-400 text-slate-950",
  },
  violet: {
    label: "Electric Violet",
    swatch: "bg-violet-500",
    gradient: "from-slate-950 via-violet-950 to-fuchsia-950",
    glow: "bg-violet-500/25",
    pill: "border-violet-400/40 bg-violet-500/20 text-violet-200",
    ring: "ring-violet-500",
    button: "bg-violet-500 hover:bg-violet-400 text-white",
  },
  rose: {
    label: "Neon Rose",
    swatch: "bg-rose-500",
    gradient: "from-zinc-950 via-rose-950 to-pink-950",
    glow: "bg-rose-500/25",
    pill: "border-rose-400/40 bg-rose-500/20 text-rose-200",
    ring: "ring-rose-500",
    button: "bg-rose-500 hover:bg-rose-400 text-white",
  },
  emerald: {
    label: "Emerald Pulse",
    swatch: "bg-emerald-500",
    gradient: "from-slate-950 via-emerald-950 to-teal-950",
    glow: "bg-emerald-500/25",
    pill: "border-emerald-400/40 bg-emerald-500/20 text-emerald-200",
    ring: "ring-emerald-500",
    button: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
  },
  cyan: {
    label: "Cyber Cyan",
    swatch: "bg-cyan-500",
    gradient: "from-slate-950 via-cyan-950 to-blue-950",
    glow: "bg-cyan-500/25",
    pill: "border-cyan-400/40 bg-cyan-500/20 text-cyan-200",
    ring: "ring-cyan-500",
    button: "bg-cyan-500 hover:bg-cyan-400 text-slate-950",
  },
};

export function resolveEventTheme(raw?: string | null) {
  return isEventThemeAccent(raw) ? ACCENT_THEMES[raw] : ACCENT_THEMES.amber;
}

export function categoryLabel(eventType?: string | null): string {
  const upper = String(eventType || "COMMUNITY").toUpperCase();
  const match = EVENT_CATEGORIES.find((c) => c.id === upper);
  return match ? match.badge : upper;
}

/**
 * Compresses a browser image File onto an offscreen canvas so flyers and merch
 * photos upload swiftly and fit comfortably inside PostgreSQL text columns.
 */
export async function compressImageFileToDataUrl(
  file: File,
  maxDimension = 1200,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG, or WebP).");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Image must be under 12 MB.");
  }
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode image file."));
      el.src = bitmapUrl;
    });
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height, 1));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable.");
    ctx.drawImage(img, 0, 0, width, height);

    let dataUrl = canvas.toDataURL("image/webp", 0.82);
    if (!dataUrl.startsWith("data:image/webp")) {
      dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    }
    if (dataUrl.length > 680_000) {
      dataUrl = canvas.toDataURL("image/jpeg", 0.68);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

interface EventPosterVisualProps {
  title: string;
  eventType?: string | null;
  startsAt?: string | null;
  venue?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  themeAccent?: string | null;
  organizerName?: string | null;
  attendeeCount?: number;
  capacity?: number | null;
  minTicketCents?: number | null;
  ticketTierCount?: number;
  merchCount?: number;
  addonCount?: number;
  compact?: boolean;
}

export function EventPosterVisual({
  title,
  eventType,
  startsAt,
  venue,
  city,
  imageUrl,
  themeAccent,
  organizerName,
  attendeeCount = 0,
  capacity,
  minTicketCents,
  ticketTierCount = 0,
  merchCount = 0,
  addonCount = 0,
  compact = false,
}: EventPosterVisualProps) {
  const theme = resolveEventTheme(themeAccent);
  const parsedDate =
    startsAt && Number.isFinite(Date.parse(startsAt)) ? new Date(startsAt) : null;
  const monthShort = parsedDate
    ? parsedDate.toLocaleDateString(undefined, { month: "short" }).toUpperCase()
    : "TBA";
  const dayNum = parsedDate ? parsedDate.getDate() : "—";
  const timeStr = parsedDate
    ? parsedDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${theme.gradient} text-white shadow-xl ${
        compact ? "min-h-[220px] p-4" : "min-h-[300px] p-6 sm:p-7"
      } flex flex-col justify-between`}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={title || "Event flyer"}
            className="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/30" />
        </>
      ) : (
        <>
          <div
            className={`pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl ${theme.glow}`}
          />
          <div
            className={`pointer-events-none absolute -bottom-16 -left-10 h-52 w-52 rounded-full blur-3xl ${theme.glow}`}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.9) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
        </>
      )}

      {/* Top row: Category pill + Date calendar badge */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md ${theme.pill}`}
          >
            <Sparkles className="h-3 w-3" />
            {categoryLabel(eventType)}
          </span>
          {minTicketCents !== null && minTicketCents !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
              <Ticket className="h-3 w-3 text-amber-300" />
              {minTicketCents === 0
                ? "Free Entry"
                : `From ${formatCadCents(minTicketCents)}`}
            </span>
          )}
        </div>

        <div className="flex min-w-[54px] flex-col items-center rounded-xl border border-white/20 bg-black/55 px-2.5 py-1.5 text-center backdrop-blur-md">
          <span className="text-[10px] font-bold tracking-widest text-amber-300">
            {monthShort}
          </span>
          <span className="text-lg font-black leading-tight text-white">
            {dayNum}
          </span>
        </div>
      </div>

      {/* Bottom row: Title, venue, arsenal chips */}
      <div className="relative z-10 mt-8 space-y-2.5">
        {organizerName && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Presented by {organizerName}
          </p>
        )}
        <h3
          className={`font-black tracking-tight text-white drop-shadow-sm ${
            compact ? "text-xl line-clamp-2" : "text-2xl sm:text-3xl line-clamp-2"
          }`}
        >
          {title || "Untitled Event"}
        </h3>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/85">
          {parsedDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-amber-300" />
              {parsedDate.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              {timeStr ? ` · ${timeStr}` : ""}
            </span>
          )}
          {(venue || city) && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-amber-300" />
              {[venue, city].filter(Boolean).join(", ")}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {ticketTierCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              <Ticket className="h-3 w-3 text-amber-300" />
              {ticketTierCount} {ticketTierCount === 1 ? "Ticket Tier" : "Ticket Tiers"}
            </span>
          )}
          {merchCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              <ShoppingBag className="h-3 w-3 text-pink-300" />
              {merchCount} {merchCount === 1 ? "Merch Drop" : "Merch Drops"}
            </span>
          )}
          {addonCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 text-violet-300" />
              {addonCount} VIP {addonCount === 1 ? "Add-on" : "Add-ons"}
            </span>
          )}
          {(attendeeCount > 0 || capacity) && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              <Users className="h-3 w-3 text-emerald-300" />
              {capacity ? `${attendeeCount}/${capacity} spots` : `${attendeeCount} going`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
