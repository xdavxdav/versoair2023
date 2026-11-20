/**
 * Owner-managed Marketing Shop catalog (marketing_packs + print_products).
 * All prices are stored in integer CAD cents (100..500_000 = CA$1.00..CA$5,000.00).
 * No catalog rows are ever auto-seeded in production — items only exist when
 * explicitly created by the owner.
 */
import type { QueryRunner } from "./paid-offers";

export const VALID_PACK_TIERS = ["basic", "standard", "premium", "pro"] as const;
export type PackTier = (typeof VALID_PACK_TIERS)[number];

export const VALID_PRINT_CATEGORIES = [
  "business_cards",
  "flyers",
  "brochures",
  "posters",
  "banners",
  "stickers",
  "custom",
] as const;
export type PrintCategory = (typeof VALID_PRINT_CATEGORIES)[number];

export const MIN_CATALOG_PRICE_CENTS = 100;
export const MAX_CATALOG_PRICE_CENTS = 500_000;

export interface CatalogValidationError {
  ok: false;
  error: string;
}

export interface ParsedPackInput {
  name: string;
  slug: string;
  tier: PackTier;
  description: string | null;
  priceCents: number;
  features: string[];
  active: boolean;
  sortOrder: number;
}

export interface ParsedPrintProductInput {
  name: string;
  slug: string;
  category: PrintCategory;
  description: string | null;
  specs: Record<string, unknown>;
  priceCents: number;
  turnaroundDays: number;
  active: boolean;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyCatalogName(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function parsePriceCents(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (
    !Number.isSafeInteger(n) ||
    n < MIN_CATALOG_PRICE_CENTS ||
    n > MAX_CATALOG_PRICE_CENTS
  ) {
    return null;
  }
  return n;
}

function parseFeatures(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 30) return null;
  const cleaned: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.length > 200) return null;
    cleaned.push(trimmed);
  }
  return cleaned;
}

export function validateCreatePackInput(
  body: Record<string, unknown>,
): { ok: true; data: ParsedPackInput } | CatalogValidationError {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) {
    return { ok: false, error: "name is required (1–120 characters)" };
  }

  const rawSlug =
    typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim().toLowerCase()
      : slugifyCatalogName(name);
  if (!rawSlug || rawSlug.length > 80 || !SLUG_RE.test(rawSlug)) {
    return {
      ok: false,
      error: "slug must contain lowercase letters, digits, and single hyphens",
    };
  }

  const tier = typeof body.tier === "string" ? body.tier.trim().toLowerCase() : "";
  if (!VALID_PACK_TIERS.includes(tier as PackTier)) {
    return {
      ok: false,
      error: `tier must be one of: ${VALID_PACK_TIERS.join(", ")}`,
    };
  }

  const priceCents = parsePriceCents(body.priceCents ?? body.price_cents);
  if (priceCents === null) {
    return {
      ok: false,
      error: "priceCents must be an integer between 100 and 500000 (CA$1.00–CA$5,000.00)",
    };
  }

  const description =
    body.description === undefined || body.description === null
      ? null
      : typeof body.description === "string"
        ? body.description.trim().slice(0, 1000) || null
        : undefined;
  if (description === undefined) {
    return { ok: false, error: "description must be a string" };
  }

  const features = parseFeatures(body.features);
  if (features === null) {
    return {
      ok: false,
      error: "features must be an array of up to 30 short strings",
    };
  }

  const active = body.active === undefined ? true : Boolean(body.active);
  const rawSort = body.sortOrder ?? body.sort_order ?? 0;
  const sortOrder = Number(rawSort);
  if (!Number.isSafeInteger(sortOrder) || sortOrder < -1000 || sortOrder > 10_000) {
    return { ok: false, error: "sortOrder must be an integer between -1000 and 10000" };
  }

  return {
    ok: true,
    data: {
      name,
      slug: rawSlug,
      tier: tier as PackTier,
      description,
      priceCents,
      features,
      active,
      sortOrder,
    },
  };
}

const DEFAULT_PRINT_SPECS: Record<string, unknown> = {
  dpi_min: 300,
  bleed_mm: 3,
  color_space: "CMYK",
};

function parseSpecs(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return { ...DEFAULT_PRINT_SPECS };
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 20) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of entries) {
    const key = k.trim();
    if (!key || key.length > 40) return null;
    if (
      typeof v !== "string" &&
      typeof v !== "number" &&
      typeof v !== "boolean"
    ) {
      return null;
    }
    if (typeof v === "string" && v.length > 120) return null;
    out[key] = v;
  }
  return out;
}

export function validateCreatePrintProductInput(
  body: Record<string, unknown>,
): { ok: true; data: ParsedPrintProductInput } | CatalogValidationError {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) {
    return { ok: false, error: "name is required (1–120 characters)" };
  }

  const rawSlug =
    typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim().toLowerCase()
      : slugifyCatalogName(name);
  if (!rawSlug || rawSlug.length > 80 || !SLUG_RE.test(rawSlug)) {
    return {
      ok: false,
      error: "slug must contain lowercase letters, digits, and single hyphens",
    };
  }

  const category =
    typeof body.category === "string" ? body.category.trim().toLowerCase() : "";
  if (!VALID_PRINT_CATEGORIES.includes(category as PrintCategory)) {
    return {
      ok: false,
      error: `category must be one of: ${VALID_PRINT_CATEGORIES.join(", ")}`,
    };
  }

  const priceCents = parsePriceCents(body.priceCents ?? body.price_cents);
  if (priceCents === null) {
    return {
      ok: false,
      error: "priceCents must be an integer between 100 and 500000 (CA$1.00–CA$5,000.00)",
    };
  }

  const description =
    body.description === undefined || body.description === null
      ? null
      : typeof body.description === "string"
        ? body.description.trim().slice(0, 1000) || null
        : undefined;
  if (description === undefined) {
    return { ok: false, error: "description must be a string" };
  }

  const specs = parseSpecs(body.specs);
  if (specs === null) {
    return {
      ok: false,
      error: "specs must be a flat JSON object with string, number, or boolean values",
    };
  }

  const rawTurnaround = body.turnaroundDays ?? body.turnaround_days ?? 3;
  const turnaroundDays = Number(rawTurnaround);
  if (
    !Number.isSafeInteger(turnaroundDays) ||
    turnaroundDays < 1 ||
    turnaroundDays > 90
  ) {
    return { ok: false, error: "turnaroundDays must be an integer between 1 and 90" };
  }

  const active = body.active === undefined ? true : Boolean(body.active);

  return {
    ok: true,
    data: {
      name,
      slug: rawSlug,
      category: category as PrintCategory,
      description,
      specs,
      priceCents,
      turnaroundDays,
      active,
    },
  };
}

export async function listAdminCatalog(db: QueryRunner) {
  const [packsRes, printRes] = await Promise.all([
    db.query(
      `SELECT mp.*,
              COALESCE(
                json_agg(json_build_object(
                  'id', pi.id,
                  'name', COALESCE(to_jsonb(pi)->>'name', to_jsonb(pi)->>'item_type'),
                  'description', pi.description,
                  'included', COALESCE((to_jsonb(pi)->>'included')::boolean, true)
                ) ORDER BY pi.id) FILTER (WHERE pi.id IS NOT NULL),
                '[]'::json
              ) AS items
         FROM marketing_packs mp
         LEFT JOIN pack_items pi ON pi.pack_id = mp.id
        GROUP BY mp.id
        ORDER BY COALESCE(mp.sort_order, 0) ASC, mp.price_cents ASC, mp.id ASC`,
    ),
    db.query(
      `SELECT * FROM print_products ORDER BY category ASC, price_cents ASC, id ASC`,
    ),
  ]);

  return {
    packs: packsRes.rows,
    printProducts: printRes.rows,
  };
}
