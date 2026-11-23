import { z } from "zod";

export const EVENT_ARSENAL_KINDS = ["TICKET", "MERCH", "ADDON"] as const;
export type EventArsenalKind = (typeof EVENT_ARSENAL_KINDS)[number];

export const EVENT_THEME_ACCENTS = [
  "amber",
  "violet",
  "rose",
  "emerald",
  "cyan",
] as const;
export type EventThemeAccent = (typeof EVENT_THEME_ACCENTS)[number];

export const EVENT_CATEGORIES = [
  { id: "PARTY", label: "Party & Nightlife", badge: "Party" },
  { id: "CONCERT", label: "Live Concert", badge: "Concert" },
  { id: "LISTENING_NIGHT", label: "Listening Party", badge: "Listening" },
  { id: "WORKSHOP", label: "Workshop & Masterclass", badge: "Workshop" },
  { id: "SHOWCASE", label: "Cultural Showcase", badge: "Showcase" },
  { id: "FESTIVAL", label: "Pop-up & Festival", badge: "Pop-up" },
  { id: "COMMUNITY", label: "Community Gathering", badge: "Community" },
] as const;

export const EVENT_ARSENAL_MIN_PAID_CENTS = 100; // CA$1.00 minimum when paid
export const EVENT_ARSENAL_MAX_PRICE_CENTS = 500_000; // CA$5,000.00 ceiling

export interface EventArsenalItem {
  id: number;
  eventId: number;
  kind: EventArsenalKind;
  name: string;
  description: string;
  priceCents: number;
  stockLimit: number | null;
  soldCount: number;
  maxPerOrder: number;
  imageUrl: string | null;
  badge: string | null;
  variants: string[];
  fulfillmentNote: string | null;
  sortOrder: number;
  active: boolean;
}

export interface EventArsenalOrderItemSummary {
  id: number;
  itemId: number | null;
  kind: EventArsenalKind;
  itemName: string;
  variant: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface EventArsenalOrderSummary {
  id: number;
  eventId: number;
  userId: number;
  buyerName?: string;
  buyerEmail?: string;
  passCode: string;
  status: string;
  totalCents: number;
  currency: string;
  hasTicket: boolean;
  ticketQty: number;
  merchQty: number;
  checkedInAt: string | null;
  merchFulfilledAt: string | null;
  paidAt: string | null;
  createdAt: string;
  items: EventArsenalOrderItemSummary[];
}

export const upsertArsenalItemSchema = z
  .object({
    kind: z.enum(EVENT_ARSENAL_KINDS),
    name: z.string().trim().min(2, "Item name is required").max(160),
    description: z.string().trim().max(1200).optional().default(""),
    priceCents: z
      .number()
      .int()
      .min(0)
      .max(EVENT_ARSENAL_MAX_PRICE_CENTS),
    stockLimit: z
      .number()
      .int()
      .min(0)
      .max(100_000)
      .nullable()
      .optional()
      .default(null),
    maxPerOrder: z.number().int().min(1).max(20).optional().default(6),
    imageUrl: z
      .string()
      .trim()
      .max(700_000)
      .refine(
        (val) =>
          !val ||
          val.startsWith("https://") ||
          val.startsWith("http://") ||
          val.startsWith("/") ||
          /^data:image\/(webp|jpeg|jpg|png|gif);base64,/i.test(val),
        "Image must be an https:// URL or uploaded image",
      )
      .nullable()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    badge: z
      .string()
      .trim()
      .max(60)
      .nullable()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    variants: z
      .array(z.string().trim().min(1).max(40))
      .max(16)
      .optional()
      .default([]),
    fulfillmentNote: z
      .string()
      .trim()
      .max(220)
      .nullable()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    sortOrder: z.number().int().min(0).max(999).optional().default(0),
    active: z.boolean().optional().default(true),
  })
  .superRefine((val, ctx) => {
    // MERCH and ADDON must be paid (>= CA$1.00) unless it's a free TICKET tier (priceCents = 0)
    if (val.priceCents > 0 && val.priceCents < EVENT_ARSENAL_MIN_PAID_CENTS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceCents"],
        message: "Paid items must be at least CA$1.00 (100 cents), or CA$0.00 for a free ticket.",
      });
    }
    if (val.kind !== "TICKET" && val.priceCents === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceCents"],
        message: "Merch and VIP add-ons require a price of at least CA$1.00.",
      });
    }
  });

export const createArsenalCheckoutSchema = z.object({
  eventId: z.number().int().positive(),
  lines: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(20),
        variant: z
          .string()
          .trim()
          .max(60)
          .nullable()
          .optional()
          .transform((v) => (v && v.length > 0 ? v : null)),
      }),
    )
    .min(1, "Select at least one ticket or merch item.")
    .max(25),
});

export function isEventThemeAccent(value: unknown): value is EventThemeAccent {
  return (
    typeof value === "string" &&
    (EVENT_THEME_ACCENTS as readonly string[]).includes(value)
  );
}

export function formatCadCents(cents: number): string {
  const safe = Number.isFinite(Number(cents)) ? Number(cents) : 0;
  if (safe <= 0) return "Free";
  return `CA$${(safe / 100).toFixed(2)}`;
}
