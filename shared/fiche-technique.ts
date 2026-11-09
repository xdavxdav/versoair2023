// Shared contract for a business's "fiche technique": what an owner may publish,
// how it is validated on write, how it is cleaned on read, and the open-now rule.

export const FICHE_SECTORS = [
  "convenience_store",
  "ad_agency",
  "finance",
  "restaurant",
  "ecommerce",
  "commerce",
  "hotellerie",
  "batiment",
  "automobile",
  "divertissement",
  "other",
] as const;
export type FicheSector = (typeof FICHE_SECTORS)[number];

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const SOCIAL_NETWORKS = [
  "facebook",
  "instagram",
  "linkedin",
  "x",
  "youtube",
  "tiktok",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export const FICHE_LIMITS = {
  listItems: 30,
  listItemLength: 120,
  shortText: 200,
  longText: 2000,
  kpis: 12,
  kpiText: 60,
  caseStudies: 10,
  caseTitle: 120,
  caseSummary: 600,
  hoursRanges: 3,
  url: 300,
} as const;

export interface Fiche {
  sector: FicheSector | null;
  timezone: string | null;
  services: string[];
  products: string[];
  tech_stack: string[];
  team: string;
  legal: string;
  rgpd: string;
  terms: string;
  mission: string;
  vision: string;
  proposition_valeur: string;
  strategy: string;
  kpis: { label: string; value: string }[];
  case_studies: { title: string; summary: string }[];
  opening_hours: Partial<Record<Weekday, string>>;
  social_links: Partial<Record<SocialNetwork, string>>;
}

export const emptyFiche = (): Fiche => ({
  sector: null,
  timezone: null,
  services: [],
  products: [],
  tech_stack: [],
  team: "",
  legal: "",
  rgpd: "",
  terms: "",
  mission: "",
  vision: "",
  proposition_valeur: "",
  strategy: "",
  kpis: [],
  case_studies: [],
  opening_hours: {},
  social_links: {},
});

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

// PostgreSQL jsonb rejects NUL, and other control characters have no place in a profile.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (s: string) => s.replace(CONTROL, "").trim();

class Reader {
  readonly errors: string[] = [];

  private fail(message: string) {
    this.errors.push(message);
  }

  text(value: unknown, max: number, label: string): string {
    if (value === undefined || value === null) return "";
    if (typeof value !== "string") {
      this.fail(`${label} must be text`);
      return "";
    }
    const out = clean(value);
    if (out.length > max) {
      this.fail(`${label} is too long (max ${max} characters)`);
      return out.slice(0, max);
    }
    return out;
  }

  list(value: unknown, label: string): string[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      this.fail(`${label} must be a list`);
      return [];
    }
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of value) {
      if (typeof item !== "string") {
        this.fail(`${label} must only contain text`);
        continue;
      }
      const text = clean(item).replace(/\s+/g, " ");
      if (!text || seen.has(text.toLowerCase())) continue;
      if (text.length > FICHE_LIMITS.listItemLength) {
        this.fail(
          `${label}: "${text.slice(0, 20)}…" is too long (max ${FICHE_LIMITS.listItemLength} characters)`,
        );
        continue;
      }
      seen.add(text.toLowerCase());
      out.push(text);
    }
    if (out.length > FICHE_LIMITS.listItems) {
      this.fail(`${label} has too many entries (max ${FICHE_LIMITS.listItems})`);
      return out.slice(0, FICHE_LIMITS.listItems);
    }
    return out;
  }

  rows<T>(
    value: unknown,
    label: string,
    max: number,
    read: (row: Obj) => T | null,
  ): T[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      this.fail(`${label} must be a list`);
      return [];
    }
    const out: T[] = [];
    for (const row of value) {
      if (!isObj(row)) {
        this.fail(`${label} entries must be objects`);
        continue;
      }
      const parsed = read(row);
      if (parsed) out.push(parsed);
    }
    if (out.length > max) {
      this.fail(`${label} has too many entries (max ${max})`);
      return out.slice(0, max);
    }
    return out;
  }
}

export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const RANGE = /^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/;
const CLOSED = /^(closed|ferm[eé]e?)$/i;

const pad = (n: number) => String(n).padStart(2, "0");
const toMinutes = (h: number, m: number) => h * 60 + m;

// One day's hours as "closed" or up to three "HH:MM-HH:MM" ranges, or null if invalid.
export function normalizeHours(value: string): string | null {
  const text = clean(value);
  if (CLOSED.test(text)) return "closed";
  const parts = text.split(",").map((p) => p.trim());
  if (parts.length === 0 || parts.length > FICHE_LIMITS.hoursRanges) return null;
  const out: string[] = [];
  for (const part of parts) {
    const match = RANGE.exec(part);
    if (!match) return null;
    const [h1, m1, h2, m2] = match.slice(1).map(Number);
    if (h1 > 23 || m1 > 59 || h2 > 24 || m2 > 59 || (h2 === 24 && m2 !== 0)) {
      return null;
    }
    if (toMinutes(h1, m1) === toMinutes(h2, m2)) return null;
    out.push(`${pad(h1)}:${pad(m1)}-${pad(h2)}:${pad(m2)}`);
  }
  return out.join(", ");
}

export function normalizeSocialUrl(value: string): string | null {
  const text = clean(value);
  if (!text || text.length > FICHE_LIMITS.url) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export interface FicheResult {
  value: Fiche;
  errors: string[];
}

// Reads untrusted input. `value` is always safe to store or render; `errors` lists
// everything that was dropped or truncated so a write can refuse it instead.
export function readFiche(raw: unknown): FicheResult {
  const r = new Reader();
  const input: Obj = isObj(raw) ? raw : {};
  if (raw !== undefined && raw !== null && !isObj(raw)) {
    r.errors.push("The fiche must be an object");
  }
  const fiche = emptyFiche();

  const sector = r.text(input.sector, 40, "Sector");
  if (sector) {
    if ((FICHE_SECTORS as readonly string[]).includes(sector)) {
      fiche.sector = sector as FicheSector;
    } else {
      r.errors.push("Sector is not recognised");
    }
  }

  const timezone = r.text(input.timezone, 64, "Timezone");
  if (timezone) {
    if (isValidTimezone(timezone)) fiche.timezone = timezone;
    else r.errors.push("Timezone is not recognised");
  }

  fiche.services = r.list(input.services, "Services");
  fiche.products = r.list(input.products, "Products");
  fiche.tech_stack = r.list(input.tech_stack, "Tech stack");
  fiche.team = r.text(input.team, FICHE_LIMITS.longText, "Team");
  fiche.legal = r.text(input.legal, FICHE_LIMITS.longText, "Legal");
  fiche.rgpd = r.text(input.rgpd, FICHE_LIMITS.longText, "Privacy (RGPD)");
  fiche.terms = r.text(input.terms, FICHE_LIMITS.longText, "Terms");
  fiche.mission = r.text(input.mission, FICHE_LIMITS.shortText * 2, "Mission");
  fiche.vision = r.text(input.vision, FICHE_LIMITS.shortText * 2, "Vision");
  fiche.proposition_valeur = r.text(
    input.proposition_valeur,
    FICHE_LIMITS.shortText * 2,
    "Value proposition",
  );
  fiche.strategy = r.text(input.strategy, FICHE_LIMITS.longText, "Strategy");

  fiche.kpis = r.rows(input.kpis, "KPIs", FICHE_LIMITS.kpis, (row) => {
    const label = r.text(row.label, FICHE_LIMITS.kpiText, "KPI label");
    const value = r.text(row.value, FICHE_LIMITS.kpiText, "KPI value");
    return label && value ? { label, value } : null;
  });

  fiche.case_studies = r.rows(
    input.case_studies,
    "Case studies",
    FICHE_LIMITS.caseStudies,
    (row) => {
      const title = r.text(row.title, FICHE_LIMITS.caseTitle, "Case study title");
      const summary = r.text(
        row.summary,
        FICHE_LIMITS.caseSummary,
        "Case study summary",
      );
      return title ? { title, summary } : null;
    },
  );

  if (input.opening_hours !== undefined && input.opening_hours !== null) {
    if (!isObj(input.opening_hours)) {
      r.errors.push("Opening hours must be an object");
    } else {
      for (const [day, hours] of Object.entries(input.opening_hours)) {
        if (!(WEEKDAYS as readonly string[]).includes(day)) {
          r.errors.push(`Opening hours: "${day.slice(0, 20)}" is not a weekday`);
          continue;
        }
        if (hours === undefined || hours === null || hours === "") continue;
        const normalized =
          typeof hours === "string" ? normalizeHours(hours) : null;
        if (normalized) fiche.opening_hours[day as Weekday] = normalized;
        else r.errors.push(`Opening hours for ${day} are not valid`);
      }
    }
  }

  if (input.social_links !== undefined && input.social_links !== null) {
    if (!isObj(input.social_links)) {
      r.errors.push("Social links must be an object");
    } else {
      for (const [network, url] of Object.entries(input.social_links)) {
        if (!(SOCIAL_NETWORKS as readonly string[]).includes(network)) {
          r.errors.push(`Social links: "${network.slice(0, 20)}" is not supported`);
          continue;
        }
        if (url === undefined || url === null || url === "") continue;
        const normalized =
          typeof url === "string" ? normalizeSocialUrl(url) : null;
        if (normalized) fiche.social_links[network as SocialNetwork] = normalized;
        else r.errors.push(`The ${network} link must be a valid http(s) address`);
      }
    }
  }

  return { value: fiche, errors: r.errors };
}

// What lives in businesses.attributes.sectorData; hours and links have their own columns.
export function ficheStorage(fiche: Fiche) {
  const { opening_hours, social_links, ...sectorData } = fiche;
  return { sectorData, openingHours: opening_hours, socialLinks: social_links };
}

export function ficheFromRow(row: {
  attributes?: unknown;
  opening_hours?: unknown;
  social_links?: unknown;
}): Fiche {
  const attributes = isObj(row.attributes) ? row.attributes : {};
  const sectorData = isObj(attributes.sectorData) ? attributes.sectorData : {};
  return readFiche({
    ...sectorData,
    opening_hours: row.opening_hours,
    social_links: row.social_links,
  }).value;
}

const STAFF_ROLES = new Set(["admin", "moderator", "superuser"]);

// Staff curate any listing; everyone else may only edit a business they own.
export function canEditFiche(
  actor: { id: number | string | null | undefined; role?: string | null },
  business: { owner_id: number | null },
): boolean {
  if (actor.role && STAFF_ROLES.has(actor.role)) return true;
  const id = Number(actor.id);
  return (
    Number.isInteger(id) &&
    id > 0 &&
    business.owner_id !== null &&
    Number(business.owner_id) === id
  );
}

export interface OpenNow {
  state: "open" | "closed" | "unknown";
  // Closing time when open, next opening time today when closed (HH:MM).
  at?: string;
}

// The weekday it currently is in `timezone` (the visitor's own zone when none is given).
export function weekdayIn(timezone: string | null, now: Date): Weekday {
  const zone = timezone && isValidTimezone(timezone) ? timezone : undefined;
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "long",
  })
    .format(now)
    .toLowerCase();
  return (WEEKDAYS as readonly string[]).includes(name)
    ? (name as Weekday)
    : "monday";
}

const clock = (minutes: number) =>
  `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;

function parseRanges(value: string): [number, number][] {
  return value.split(",").flatMap((part) => {
    const match = RANGE.exec(part.trim());
    if (!match) return [];
    const [h1, m1, h2, m2] = match.slice(1).map(Number);
    return [[toMinutes(h1, m1), toMinutes(h2, m2)] as [number, number]];
  });
}

// "Open now" is only claimed when the business states its own timezone; the
// visitor's clock says nothing about whether a shop in another zone is open.
export function openNow(
  hours: Partial<Record<Weekday, string>>,
  timezone: string | null,
  now: Date,
): OpenNow {
  if (!timezone || !isValidTimezone(timezone)) return { state: "unknown" };
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const today = get("weekday").toLowerCase() as Weekday;
  const index = WEEKDAYS.indexOf(today);
  if (index < 0) return { state: "unknown" };
  const minutes = toMinutes(Number(get("hour")), Number(get("minute")));

  const todayHours = hours[today];
  if (!todayHours) return { state: "unknown" };

  // A range that ends after midnight (18:00-02:00) also covers the early hours of the next day.
  const yesterday = hours[WEEKDAYS[(index + 6) % 7]];
  for (const [start, end] of yesterday && yesterday !== "closed"
    ? parseRanges(yesterday)
    : []) {
    if (end <= start && minutes < end) return { state: "open", at: clock(end) };
  }

  if (todayHours === "closed") return { state: "closed" };
  const ranges = parseRanges(todayHours);
  for (const [start, end] of ranges) {
    if (end > start ? minutes >= start && minutes < end : minutes >= start) {
      return { state: "open", at: clock(end) };
    }
  }
  const next = ranges
    .map(([start]) => start)
    .filter((start) => start > minutes)
    .sort((a, b) => a - b)[0];
  return next === undefined
    ? { state: "closed" }
    : { state: "closed", at: clock(next) };
}
