import assert from "node:assert/strict";
import test from "node:test";

import { COPY_FAILED_MESSAGE, copyText, draftAnnouncement, type AnnouncementSession } from "./listening-session-admin-share";

const SESSION: AnnouncementSession = {
  id: 42,
  title: "Friday Night Picks",
  hostName: "DJ Amara",
  startsAt: "2026-11-13T00:00:00.000Z",
};

const ORIGIN = "https://versoair.example";

test("the English draft names the host, the link and the three time zones, and ends with STOP", () => {
  const draft = draftAnnouncement(SESSION, { lang: "en", contactName: " Marie ", origin: `${ORIGIN}/` });
  assert.ok(draft.ok);

  const { text } = draft.announcement;
  assert.equal(draft.url, `${ORIGIN}/sessions/42`);
  assert.ok(text.startsWith("Hello Marie, this is DJ Amara from Verso Air."));
  assert.ok(text.includes('"Friday Night Picks"'));
  assert.ok(text.includes(`Join here: ${ORIGIN}/sessions/42 .`));
  for (const city of ["Toronto", "Paris", "Abidjan"]) assert.ok(text.includes(city), city);
  assert.ok(text.endsWith("reply STOP."));
});

test("the French draft keeps the same facts and also ends with STOP", () => {
  const draft = draftAnnouncement(SESSION, { lang: "fr", contactName: "", origin: ORIGIN });
  assert.ok(draft.ok);

  const { text } = draft.announcement;
  assert.ok(text.startsWith("Bonjour, c'est DJ Amara de Verso Air."));
  assert.ok(text.includes(`${ORIGIN}/sessions/42`));
  assert.ok(text.endsWith("répondez STOP."));
});

test("there is no live voice yet, so the draft only promises the live chat", () => {
  for (const lang of ["en", "fr"] as const) {
    const draft = draftAnnouncement(SESSION, { lang, contactName: "", origin: ORIGIN });
    assert.ok(draft.ok);
    assert.ok(/chatting live|dans le chat en direct/.test(draft.announcement.text), lang);
    assert.ok(!/on the mic|au micro/.test(draft.announcement.text), lang);
  }
});

test("the WhatsApp link only opens the share chooser with the text, never a phone number", () => {
  const draft = draftAnnouncement(SESSION, { lang: "en", contactName: "", origin: ORIGIN });
  assert.ok(draft.ok);

  const { whatsappUrl, text } = draft.announcement;
  assert.ok(whatsappUrl.startsWith("https://wa.me/?text="));
  assert.equal(whatsappUrl.split("?")[0], "https://wa.me/");
  assert.equal(decodeURIComponent(whatsappUrl.slice("https://wa.me/?text=".length)), text);
});

test("a contact name that looks like an email address is left out of the greeting", () => {
  const draft = draftAnnouncement(SESSION, { lang: "en", contactName: "marie@example.org", origin: ORIGIN });
  assert.ok(draft.ok);
  assert.ok(draft.announcement.text.startsWith("Hello, this is DJ Amara"));
  assert.ok(!draft.announcement.text.includes("@"));
});

test("a draft that cannot be built says why instead of throwing", () => {
  const noTitle = draftAnnouncement({ ...SESSION, title: "   " }, { lang: "en", contactName: "", origin: ORIGIN });
  assert.equal(noTitle.ok, false);
  assert.match(noTitle.ok ? "" : noTitle.message, /title/i);

  const opaqueOrigin = draftAnnouncement(SESSION, { lang: "en", contactName: "", origin: "null" });
  assert.equal(opaqueOrigin.ok, false);
  assert.match(opaqueOrigin.ok ? "" : opaqueOrigin.message, /link/i);

  const badStart = draftAnnouncement({ ...SESSION, startsAt: "soon" }, { lang: "en", contactName: "", origin: ORIGIN });
  assert.equal(badStart.ok, false);
});

test("copying writes the text to the clipboard", async () => {
  const written: string[] = [];
  const outcome = await copyText("hello", {
    writeText: async (value: string) => {
      written.push(value);
    },
  });
  assert.deepEqual(outcome, { ok: true });
  assert.deepEqual(written, ["hello"]);
});

test("a clipboard that refuses, or is missing, gives a message the person can act on", async () => {
  const refused = await copyText("hello", {
    writeText: async () => {
      throw new DOMException("denied", "NotAllowedError");
    },
  });
  assert.deepEqual(refused, { ok: false, message: COPY_FAILED_MESSAGE });
  assert.deepEqual(await copyText("hello", undefined), { ok: false, message: COPY_FAILED_MESSAGE });
  assert.deepEqual(await copyText("hello", null), { ok: false, message: COPY_FAILED_MESSAGE });
  assert.match(COPY_FAILED_MESSAGE, /Ctrl\+C/);
});
