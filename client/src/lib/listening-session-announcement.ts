/**
 * Builds the WhatsApp announcement for a session. The text is a draft: the owner reads it,
 * edits it and sends it by hand, one chat at a time, to people who opted in. Nothing here
 * sends anything, and the `wa.me` link only opens WhatsApp's share sheet.
 */
import { normalizeSessionTitle } from "@shared/listening-session";
import type { SessionLang } from "./listening-session-format";

export interface AnnouncementZone {
  /** The city shown after the time. */
  label: string;
  timeZone: string;
}

export const DEFAULT_ANNOUNCEMENT_ZONES: readonly AnnouncementZone[] = [
  { label: "Toronto", timeZone: "America/Toronto" },
  { label: "Paris", timeZone: "Europe/Paris" },
  { label: "Abidjan", timeZone: "Africa/Abidjan" },
];

export interface AnnouncementInput {
  title: string;
  hostName?: string | null;
  /** ISO timestamp of the start. */
  startsAt: string;
  /** The public link to the session page. */
  url: string;
  lang: SessionLang;
  /** True only when the host can speak live; otherwise the text says "chatting live". */
  hasVoice?: boolean;
  /** Greets one person by name; left out, the greeting is just "Hello," or "Bonjour,". */
  contactName?: string | null;
  zones?: readonly AnnouncementZone[];
}

export interface Announcement {
  text: string;
  /** Opens WhatsApp's share sheet with the text filled in. Sends nothing. */
  whatsappUrl: string;
}

const NBSP = "\u00a0";
const NAME_MAX = 60;

// A name that looks like an email address is never put into a message.
function cleanName(value: string | null | undefined): string {
  if (!value) return "";
  const name = normalizeSessionTitle(value).slice(0, NAME_MAX).trim();
  return name.includes("@") ? "" : name;
}

function zoneLine(startMs: number, zone: AnnouncementZone, lang: SessionLang): string {
  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const day = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: zone.timeZone,
  }).format(startMs);
  const time = new Intl.DateTimeFormat(locale, {
    hour: lang === "fr" ? "2-digit" : "numeric",
    minute: "2-digit",
    timeZone: zone.timeZone,
  })
    .format(startMs)
    .replace(/[\u00a0\u202f]/g, " ");
  return `\u2022 ${day} \u00b7 ${time} ${zone.label}`;
}

export function buildAnnouncement(input: AnnouncementInput): Announcement {
  const title = normalizeSessionTitle(input.title);
  if (!title) throw new RangeError("A session title is needed for the announcement.");

  const startMs = Date.parse(input.startsAt);
  if (!Number.isFinite(startMs)) throw new RangeError("A valid start time is needed for the announcement.");

  const url = input.url.trim();
  if (!/^https?:\/\/[^\s]+$/i.test(url)) throw new RangeError("A public session link is needed for the announcement.");

  const zones = input.zones && input.zones.length > 0 ? input.zones : DEFAULT_ANNOUNCEMENT_ZONES;
  const lines = zones.map((zone) => zoneLine(startMs, zone, input.lang));
  const host = cleanName(input.hostName);
  const contact = cleanName(input.contactName);
  const voice = input.hasVoice === true;

  const text =
    input.lang === "fr"
      ? [
          `${contact ? `Bonjour ${contact},` : "Bonjour,"} ${host ? `c'est ${host} de Verso Air.` : "c'est Verso Air."} ` +
            `Rejoignez notre session d'écoute en direct «${NBSP}${title}${NBSP}»${NBSP}:`,
          ...lines,
          `Tout le monde entend les mêmes morceaux au même moment et je serai ${voice ? "au micro" : "dans le chat en direct"} entre les titres. ` +
            `Rejoignez-nous ici${NBSP}: ${url} . ` +
            "Pour ne plus recevoir de messages de notre part, répondez STOP.",
        ]
      : [
          `${contact ? `Hello ${contact},` : "Hello,"} ${host ? `this is ${host} from Verso Air.` : "this is Verso Air."} ` +
            `Join our live listening session "${title}":`,
          ...lines,
          `Everyone hears the same tracks at the same time and I'll be ${voice ? "on the mic" : "chatting live"} between tracks. ` +
            `Join here: ${url} . ` +
            "To stop receiving messages from us, reply STOP.",
        ];

  const message = text.join("\n");
  return { text: message, whatsappUrl: `https://wa.me/?text=${encodeURIComponent(message)}` };
}
