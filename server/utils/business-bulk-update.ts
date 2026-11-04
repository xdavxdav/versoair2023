import { parseCountryCode } from "./country-code";

export const BULK_UPDATE_MAX_ROWS = 100;

const MAX_INT4 = 2_147_483_647;
const APPROVAL_STATUSES = new Set(["pending", "approved", "rejected"]);
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Parsed = { ok: true; value: unknown } | { ok: false; message: string };

interface BulkField {
  // Trusted column name from this file; request keys never reach the SQL text.
  column: string;
  cast?: "::jsonb";
  parse: (value: unknown) => Parsed;
}

const ok = (value: unknown): Parsed => ({ ok: true, value });
const fail = (message: string): Parsed => ({ ok: false, message });

function text(max: number, nullable: boolean) {
  return (value: unknown): Parsed => {
    if (value === null) return nullable ? ok(null) : fail("cannot be null");
    if (typeof value !== "string") return fail("must be a string");
    const trimmed = value.trim();
    if (trimmed === "") return nullable ? ok(null) : fail("cannot be empty");
    if (trimmed.length > max) return fail(`must be at most ${max} characters`);
    return ok(trimmed);
  };
}

const nullableEmail = (value: unknown): Parsed => {
  const parsed = text(254, true)(value);
  if (!parsed.ok || parsed.value === null) return parsed;
  return EMAIL_SHAPE.test(parsed.value as string)
    ? parsed
    : fail("must be a valid email address");
};

const countryCode = (value: unknown): Parsed => {
  const parsed = parseCountryCode(value);
  return parsed.ok ? ok(parsed.value ?? null) : fail("must be a 2-letter country code");
};

const flag = (value: unknown): Parsed =>
  typeof value === "boolean" ? ok(value) : fail("must be true or false");

const positiveInt4 = (value: unknown): Parsed =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value > 0 &&
  value <= MAX_INT4
    ? ok(value)
    : fail("must be a positive integer");

const rating = (value: unknown): Parsed =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 5
    ? ok(value)
    : fail("must be a number between 0 and 5");

const approvalStatus = (value: unknown): Parsed =>
  typeof value === "string" && APPROVAL_STATUSES.has(value)
    ? ok(value)
    : fail("must be one of pending, approved, rejected");

const attributes = (value: unknown): Parsed => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("must be an object");
  }
  const json = JSON.stringify(value);
  return json.length <= 10_000 ? ok(json) : fail("is too large");
};

const tags = (value: unknown): Parsed =>
  Array.isArray(value) &&
  value.length <= 50 &&
  value.every((tag) => typeof tag === "string" && tag.length > 0 && tag.length <= 50)
    ? ok(JSON.stringify(value))
    : fail("must be an array of up to 50 short strings");

// Mirrors the single-business PUT allowlist, minus ad_balance (money stays out of bulk edits).
const FIELDS: Record<string, BulkField> = {
  name: { column: "name", parse: text(255, false) },
  description: { column: "description", parse: text(10_000, true) },
  phone: { column: "phone", parse: text(50, true) },
  email: { column: "email", parse: nullableEmail },
  address: { column: "address", parse: text(500, true) },
  countryCode: { column: "country_code", parse: countryCode },
  cityName: { column: "city_name", parse: text(100, true) },
  categoryId: { column: "category_id", parse: positiveInt4 },
  isActive: { column: "is_active", parse: flag },
  isAdvertiser: { column: "is_advertiser", parse: flag },
  isVerified: { column: "is_verified", parse: flag },
  rating: { column: "rating", parse: rating },
  approvalStatus: { column: "approval_status", parse: approvalStatus },
  attributes: { column: "attributes", cast: "::jsonb", parse: attributes },
  tags: { column: "tags", cast: "::jsonb", parse: tags },
};

// Accepts the camelCase API name and the snake_case column the endpoint originally took.
const FIELD_LOOKUP = new Map<string, BulkField>();
for (const [name, field] of Object.entries(FIELDS)) {
  FIELD_LOOKUP.set(name, field);
  FIELD_LOOKUP.set(field.column, field);
}

export interface BulkBusinessUpdate {
  id: number;
  assignments: Array<{ column: string; cast: string; value: unknown }>;
  categoryId?: number;
}

export type BulkParseResult =
  | { ok: true; updates: BulkBusinessUpdate[] }
  | { ok: false; message: string };

function parseBusinessId(value: unknown): number | null {
  const id =
    typeof value === "string" && /^[0-9]{1,10}$/.test(value)
      ? Number(value)
      : value;
  return typeof id === "number" &&
    Number.isInteger(id) &&
    id > 0 &&
    id <= MAX_INT4
    ? id
    : null;
}

export function parseBulkBusinessUpdates(input: unknown): BulkParseResult {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, message: "updates must be a non-empty array" };
  }
  if (input.length > BULK_UPDATE_MAX_ROWS) {
    return {
      ok: false,
      message: `updates is limited to ${BULK_UPDATE_MAX_ROWS} businesses per request`,
    };
  }

  const updates: BulkBusinessUpdate[] = [];
  for (const [index, entry] of input.entries()) {
    const label = `updates[${index}]`;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return { ok: false, message: `${label} must be an object` };
    }

    const { id: rawId, ...fields } = entry as Record<string, unknown>;
    const id = parseBusinessId(rawId);
    if (id === null) {
      return { ok: false, message: `${label}.id must be a positive integer` };
    }

    const assignments: BulkBusinessUpdate["assignments"] = [];
    const seenColumns = new Set<string>();
    let categoryId: number | undefined;
    for (const [key, value] of Object.entries(fields)) {
      const field = FIELD_LOOKUP.get(key);
      if (!field) {
        return {
          ok: false,
          message: `${label}: ${JSON.stringify(key.slice(0, 40))} cannot be bulk-updated`,
        };
      }
      if (seenColumns.has(field.column)) {
        return {
          ok: false,
          message: `${label}: ${field.column} is given more than once`,
        };
      }
      seenColumns.add(field.column);

      const parsed = field.parse(value);
      if (!parsed.ok) {
        return { ok: false, message: `${label}.${key} ${parsed.message}` };
      }
      assignments.push({
        column: field.column,
        cast: field.cast ?? "",
        value: parsed.value,
      });
      if (field.column === "category_id") categoryId = parsed.value as number;
    }

    if (assignments.length === 0) {
      return { ok: false, message: `${label} has no fields to update` };
    }
    updates.push({ id, assignments, categoryId });
  }
  return { ok: true, updates };
}

export function buildBulkUpdateStatement(update: BulkBusinessUpdate): {
  text: string;
  values: unknown[];
} {
  const setClauses = update.assignments.map(
    (assignment, i) => `${assignment.column} = $${i + 1}${assignment.cast}`,
  );
  const values = [...update.assignments.map((a) => a.value), update.id];
  return {
    text: `UPDATE businesses SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING id`,
    values,
  };
}
