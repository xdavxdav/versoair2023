import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ANNOUNCEMENT_ZONES,
  buildAnnouncement,
  type AnnouncementInput,
} from "./listening-session-announcement";

const URL_12 = "https://www.versoair.com/sessions/12";
const NBSP = "\u00a0";

const base: AnnouncementInput = {
  title: "Sunday Sounds",
  hostName: "Luq",
  startsAt: "2026-11-08T20:00:00.000Z",
  url: URL_12,
  lang: "en",
  contactName: "Amina",
};

test("the English draft names the host, three cities with their own day, the link and the STOP line", () => {
  const { text } = buildAnnouncement(base);
  assert.equal(
    text,
    [
      'Hello Amina, this is Luq from Verso Air. Join our live listening session "Sunday Sounds":',
      "\u2022 Sunday, November 8 \u00b7 3:00 PM Toronto",
      "\u2022 Sunday, November 8 \u00b7 9:00 PM Paris",
      "\u2022 Sunday, November 8 \u00b7 8:00 PM Abidjan",
      "Everyone hears the same tracks at the same time and I'll be chatting live between tracks. " +
        `Join here: ${URL_12} . To stop receiving messages from us, reply STOP.`,
    ].join("\n"),
  );
});

test("the French draft is French throughout, with the STOP line", () => {
  const { text } = buildAnnouncement({ ...base, lang: "fr" });
  assert.equal(
    text,
    [
      `Bonjour Amina, c'est Luq de Verso Air. Rejoignez notre session d'écoute en direct «${NBSP}Sunday Sounds${NBSP}»${NBSP}:`,
      "\u2022 dimanche 8 novembre \u00b7 15:00 Toronto",
      "\u2022 dimanche 8 novembre \u00b7 21:00 Paris",
      "\u2022 dimanche 8 novembre \u00b7 20:00 Abidjan",
      "Tout le monde entend les mêmes morceaux au même moment et je serai dans le chat en direct entre les titres. " +
        `Rejoignez-nous ici${NBSP}: ${URL_12} . Pour ne plus recevoir de messages de notre part, répondez STOP.`,
    ].join("\n"),
  );
});

test("the offsets between the cities follow daylight saving rather than being fixed", () => {
  const lines = (startsAt: string) =>
    buildAnnouncement({ ...base, startsAt }).text.split("\n").filter((line) => line.startsWith("\u2022"));

  // 28 Oct 2026: Europe is already on winter time, Canada is not yet (Paris is 5 h ahead).
  assert.deepEqual(lines("2026-10-28T19:00:00.000Z"), [
    "\u2022 Wednesday, October 28 \u00b7 3:00 PM Toronto",
    "\u2022 Wednesday, October 28 \u00b7 8:00 PM Paris",
    "\u2022 Wednesday, October 28 \u00b7 7:00 PM Abidjan",
  ]);
  // 8 Nov 2026: both are on winter time (Paris is 6 h ahead).
  assert.deepEqual(lines("2026-11-08T20:00:00.000Z"), [
    "\u2022 Sunday, November 8 \u00b7 3:00 PM Toronto",
    "\u2022 Sunday, November 8 \u00b7 9:00 PM Paris",
    "\u2022 Sunday, November 8 \u00b7 8:00 PM Abidjan",
  ]);
  // 12 Jul 2026: Paris is on summer time too (6 h ahead again).
  assert.deepEqual(lines("2026-07-12T19:00:00.000Z"), [
    "\u2022 Sunday, July 12 \u00b7 3:00 PM Toronto",
    "\u2022 Sunday, July 12 \u00b7 9:00 PM Paris",
    "\u2022 Sunday, July 12 \u00b7 7:00 PM Abidjan",
  ]);
});

test("each line carries its own weekday when a late session crosses midnight somewhere", () => {
  const lines = buildAnnouncement({ ...base, startsAt: "2026-11-08T23:30:00.000Z" })
    .text.split("\n")
    .filter((line) => line.startsWith("\u2022"));
  assert.deepEqual(lines, [
    "\u2022 Sunday, November 8 \u00b7 6:30 PM Toronto",
    "\u2022 Monday, November 9 \u00b7 12:30 AM Paris",
    "\u2022 Sunday, November 8 \u00b7 11:30 PM Abidjan",
  ]);
  const fr = buildAnnouncement({ ...base, lang: "fr", startsAt: "2026-11-08T23:30:00.000Z" })
    .text.split("\n")
    .filter((line) => line.startsWith("\u2022"));
  assert.equal(fr[1], "\u2022 lundi 9 novembre \u00b7 00:30 Paris");
});

test("when the host can speak, the text says so; otherwise it never promises a microphone", () => {
  const withVoice = buildAnnouncement({ ...base, hasVoice: true });
  const without = buildAnnouncement({ ...base, hasVoice: false });
  const omitted = buildAnnouncement(base);
  assert.match(withVoice.text, /on the mic between tracks/);
  assert.doesNotMatch(without.text, /mic/);
  assert.equal(omitted.text, without.text);
  assert.match(buildAnnouncement({ ...base, lang: "fr", hasVoice: true }).text, /au micro entre les titres/);
  assert.doesNotMatch(buildAnnouncement({ ...base, lang: "fr" }).text, /micro/);
});

test("without a contact name the greeting is plain, and a missing host is left out", () => {
  const plain = buildAnnouncement({ ...base, contactName: null, hostName: null });
  assert.ok(plain.text.startsWith('Hello, this is Verso Air. Join our live listening session'));
  const fr = buildAnnouncement({ ...base, contactName: "  ", hostName: "", lang: "fr" });
  assert.ok(fr.text.startsWith("Bonjour, c'est Verso Air. Rejoignez"));
});

test("a name that looks like an email address is never put into the message", () => {
  const { text } = buildAnnouncement({ ...base, hostName: "luq@example.com", contactName: "amina@example.com" });
  assert.doesNotMatch(text, /@/);
  assert.ok(text.startsWith("Hello, this is Verso Air."));
});

test("the text has no placeholder, no email address and no raw ICU spacing", () => {
  for (const lang of ["en", "fr"] as const) {
    const { text } = buildAnnouncement({ ...base, lang });
    assert.doesNotMatch(text, /\{\{|\}\}|\[\[|\]\]|undefined|null|NaN/);
    assert.doesNotMatch(text, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    assert.doesNotMatch(text, /\u202f/);
    assert.ok(text.includes(URL_12));
    assert.ok(/\bSTOP\b/.test(text));
  }
});

test("the share link opens WhatsApp with the exact text and sends nothing itself", () => {
  const { text, whatsappUrl } = buildAnnouncement(base);
  assert.ok(whatsappUrl.startsWith("https://wa.me/?text="));
  assert.equal(decodeURIComponent(whatsappUrl.slice("https://wa.me/?text=".length)), text);
  assert.equal(new URL(whatsappUrl).hostname, "wa.me");
  assert.equal(new URL(whatsappUrl).searchParams.get("text"), text);
});

test("custom cities replace the defaults", () => {
  const { text } = buildAnnouncement({
    ...base,
    zones: [{ label: "Dakar", timeZone: "Africa/Dakar" }],
  });
  const lines = text.split("\n").filter((line) => line.startsWith("\u2022"));
  assert.deepEqual(lines, ["\u2022 Sunday, November 8 \u00b7 8:00 PM Dakar"]);
  assert.equal(
    buildAnnouncement({ ...base, zones: [] }).text.split("\n").filter((l) => l.startsWith("\u2022")).length,
    DEFAULT_ANNOUNCEMENT_ZONES.length,
    "an empty list falls back to the defaults",
  );
});

test("the title is cleaned to one line before it is quoted", () => {
  const { text } = buildAnnouncement({ ...base, title: "  Sunday\n\tSounds\u200b  " });
  assert.ok(text.includes('session "Sunday Sounds":'));
});

test("a draft cannot be built without a title, a real start time or a web link", () => {
  assert.throws(() => buildAnnouncement({ ...base, title: "  \n " }), RangeError);
  assert.throws(() => buildAnnouncement({ ...base, startsAt: "soon" }), RangeError);
  for (const url of ["", "javascript:alert(1)", "/sessions/12", "versoair.com/sessions/12", "https://a b.com"]) {
    assert.throws(() => buildAnnouncement({ ...base, url }), RangeError, url);
  }
  assert.doesNotThrow(() => buildAnnouncement({ ...base, url: "http://localhost:5000/sessions/12" }));
});
