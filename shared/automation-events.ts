/**
 * Versioned event contract between the app and Zapier.
 *
 * Pure module: no database, no network, no environment access. Mailbox
 * addresses and routing live in Zapier configuration, never here.
 */

export const AUTOMATION_SCHEMA_VERSION = 1 as const;

export const AUTOMATION_TOPICS = [
  "music_events",
  "artisans",
  "pilot",
  "finance",
  "support",
  "management",
] as const;
export type AutomationTopic = (typeof AUTOMATION_TOPICS)[number];

export const AUTOMATION_PRIORITIES = ["low", "normal", "high"] as const;
export type AutomationPriority = (typeof AUTOMATION_PRIORITIES)[number];

export type AutomationCategory =
  | "contact"
  | "ticket"
  | "artist_application"
  | "event_submission"
  | "pilot_lead";

export type AutomationScalar = string | number | boolean | null;

export const AUTOMATION_MARKETS = [
  { id: "toronto", countryCode: "CA", timezone: "America/Toronto" },
  { id: "paris", countryCode: "FR", timezone: "Europe/Paris" },
  { id: "abidjan", countryCode: "CI", timezone: "Africa/Abidjan" },
] as const;
export type AutomationMarket = (typeof AUTOMATION_MARKETS)[number];
export type AutomationMarketId = AutomationMarket["id"];

export interface AutomationEnvelope {
  schemaVersion: typeof AUTOMATION_SCHEMA_VERSION;
  eventId: string;
  eventType: string;
  occurredAt: string;
  entityType: string;
  entityId: string | null;
  topic: AutomationTopic;
  marketId: AutomationMarketId | null;
  countryCode: string | null;
  timezone: string | null;
  priority: AutomationPriority;
  correlationId: string;
  safeSummary: string;
  data: Record<string, AutomationScalar>;
}

export interface BuildAutomationEventOptions {
  now?: Date;
  eventId?: string;
  correlationId?: string;
}

interface CategoryConfig {
  eventType: string;
  entityType: string;
  topic: AutomationTopic;
  priority: AutomationPriority;
  entityIdKey: string | null;
  dataKeys: readonly string[];
  /** Subset of dataKeys typed by people; redacted like safeSummary. Ids and enums stay untouched. */
  freeTextKeys: readonly string[];
  summary: (data: Record<string, AutomationScalar>) => string;
}

const CATEGORY_CONFIG: Record<AutomationCategory, CategoryConfig> = {
  contact: {
    eventType: "contact.received",
    entityType: "contact_message",
    topic: "support",
    priority: "normal",
    entityIdKey: null,
    dataKeys: ["subject"],
    freeTextKeys: ["subject"],
    summary: (data) => `Contact message: ${data.subject ?? "(no subject)"}`,
  },
  ticket: {
    eventType: "ticket.created",
    entityType: "ticket",
    topic: "support",
    priority: "normal",
    entityIdKey: "ticketId",
    dataKeys: ["ticketId", "status"],
    freeTextKeys: [],
    summary: (data) =>
      `Ticket ${data.ticketId ?? ""} ${data.status ?? ""}`.replace(/\s+/g, " "),
  },
  artist_application: {
    eventType: "artist.application_submitted",
    entityType: "artist_application",
    topic: "music_events",
    priority: "normal",
    entityIdKey: "applicationId",
    dataKeys: ["applicationId", "stageName", "genre", "country"],
    freeTextKeys: ["stageName", "genre", "country"],
    summary: (data) =>
      `Artist application: ${data.stageName ?? "(unnamed)"}${
        data.genre ? ` (${data.genre})` : ""
      }`,
  },
  event_submission: {
    eventType: "event.submitted",
    entityType: "event",
    topic: "music_events",
    priority: "normal",
    entityIdKey: "eventId",
    dataKeys: ["eventId", "status", "submittedBy"],
    freeTextKeys: [],
    summary: (data) =>
      `Event ${data.eventId ?? ""} submitted${
        data.status ? ` (${data.status})` : ""
      }`.replace(/\s+/g, " "),
  },
  pilot_lead: {
    eventType: "pilot.lead_received",
    entityType: "pilot_lead",
    topic: "pilot",
    priority: "normal",
    entityIdKey: null,
    dataKeys: ["subject"],
    freeTextKeys: ["subject"],
    summary: (data) => `Pilot lead: ${data.subject ?? "(no subject)"}`,
  },
};

/** The contact form has no topic field, so a pilot request is recognised by its subject (English and French). */
const PILOT_SUBJECT_PATTERN = /\bpilote?s?\b/i;

export function isPilotLeadSubject(subject: unknown): boolean {
  return (
    typeof subject === "string" &&
    PILOT_SUBJECT_PATTERN.test(clip(subject, MAX_SCAN_CHARS))
  );
}

const MARKET_ALIASES: Record<AutomationMarketId, readonly string[]> = {
  toronto: ["ca", "can", "canada", "toronto"],
  paris: ["fr", "fra", "france", "paris"],
  abidjan: ["ci", "civ", "cote d ivoire", "ivory coast", "abidjan"],
};

const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
const PHONE_PATTERN = /\+?\d[\d\s().-]{6,}\d/g;
/** Redaction only looks at this many characters: EMAIL_PATTERN backtracks quadratically on a long run with no "@". */
const MAX_SCAN_CHARS = 1_000;

/** Cuts at a UTF-16 limit without leaving half of an emoji behind, which Postgres rejects in jsonb. */
function clip(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, Math.max(0, limit));
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

export function getAutomationMarket(id: AutomationMarketId): AutomationMarket {
  const market = AUTOMATION_MARKETS.find((entry) => entry.id === id);
  if (!market) throw new Error(`Unknown automation market: ${id}`);
  return market;
}

function normalizeMarketText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Resolves an ISO code, country name or city name ("Côte d'Ivoire", "Toronto, Canada"). */
export function resolveMarket(input: unknown): AutomationMarket | null {
  if (typeof input !== "string") return null;
  for (const segment of input.split(",")) {
    const normalized = normalizeMarketText(segment);
    if (!normalized) continue;
    for (const market of AUTOMATION_MARKETS) {
      if (MARKET_ALIASES[market.id].includes(normalized)) return market;
    }
  }
  return null;
}

export function isAutomationTopic(value: unknown): value is AutomationTopic {
  return (
    typeof value === "string" &&
    (AUTOMATION_TOPICS as readonly string[]).includes(value)
  );
}

/** Keeps the text safe to show in a task title or report line. */
export function sanitizeSummary(input: unknown, maxLength = 140): string {
  if (typeof input !== "string") return "";
  const cleaned = clip(input, MAX_SCAN_CHARS)
    .replace(CONTROL_CHARS, " ")
    .replace(EMAIL_PATTERN, "[email]")
    .replace(PHONE_PATTERN, "[number]")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${clip(cleaned, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function toScalar(value: unknown, maxLength = 200): AutomationScalar {
  if (typeof value === "string") {
    const text = value.replace(CONTROL_CHARS, " ").trim();
    return text ? clip(text, maxLength) : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  return null;
}

function resolvePayloadMarket(
  payload: Record<string, unknown>,
): AutomationMarket | null {
  for (const key of ["countryCode", "country", "city", "market"]) {
    const market = resolveMarket(payload[key]);
    if (market) return market;
  }
  return null;
}

export function buildAutomationEvent(
  category: AutomationCategory,
  payload: Record<string, unknown>,
  options: BuildAutomationEventOptions = {},
): AutomationEnvelope {
  const config = CATEGORY_CONFIG[category];
  const eventId = options.eventId ?? globalThis.crypto.randomUUID();
  const data: Record<string, AutomationScalar> = {};
  for (const key of config.dataKeys) {
    const value = payload[key];
    // Redact before truncating so a cut-off address cannot slip through.
    data[key] =
      config.freeTextKeys.includes(key) && typeof value === "string"
        ? sanitizeSummary(value, 200) || null
        : toScalar(value);
  }

  const market = resolvePayloadMarket(payload);
  const entityId = config.entityIdKey ? data[config.entityIdKey] : null;

  return {
    schemaVersion: AUTOMATION_SCHEMA_VERSION,
    eventId,
    eventType: config.eventType,
    occurredAt: (options.now ?? new Date()).toISOString(),
    entityType: config.entityType,
    entityId: entityId === null || entityId === undefined ? null : String(entityId),
    topic: config.topic,
    marketId: market?.id ?? null,
    countryCode: market?.countryCode ?? null,
    timezone: market?.timezone ?? null,
    priority: config.priority,
    correlationId: options.correlationId ?? eventId,
    safeSummary: sanitizeSummary(config.summary(data)),
    data,
  };
}

/**
 * Legacy flat fields stay first and untouched so existing Zaps keep working;
 * the versioned envelope is nested under `automation` to avoid key collisions
 * (the legacy event_submission payload already uses `eventId`).
 */
export function buildWebhookBody(
  category: AutomationCategory,
  payload: Record<string, unknown>,
  envelope: AutomationEnvelope,
  sentAt: string,
): Record<string, unknown> {
  return { category, ...payload, sentAt, automation: envelope };
}
