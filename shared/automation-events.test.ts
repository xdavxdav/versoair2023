import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTOMATION_MARKETS,
  AUTOMATION_SCHEMA_VERSION,
  AUTOMATION_TOPICS,
  buildAutomationEvent,
  buildWebhookBody,
  getAutomationMarket,
  isAutomationTopic,
  isPilotLeadSubject,
  resolveMarket,
  sanitizeSummary,
} from "./automation-events";

const FIXED_NOW = new Date("2026-11-03T15:04:05.000Z");
const FIXED_ID = "11111111-2222-4333-8444-555555555555";

test("markets use IANA timezones, never fixed offsets", () => {
  for (const market of AUTOMATION_MARKETS) {
    assert.match(market.timezone, /^[A-Za-z]+\/[A-Za-z_]+$/);
  }
  assert.equal(getAutomationMarket("toronto").timezone, "America/Toronto");
  assert.equal(getAutomationMarket("paris").timezone, "Europe/Paris");
  assert.equal(getAutomationMarket("abidjan").timezone, "Africa/Abidjan");
});

test("resolveMarket accepts ISO codes, country names and city names", () => {
  assert.equal(resolveMarket("CA")?.id, "toronto");
  assert.equal(resolveMarket("ca")?.id, "toronto");
  assert.equal(resolveMarket("Canada")?.id, "toronto");
  assert.equal(resolveMarket("FR")?.id, "paris");
  assert.equal(resolveMarket("France")?.id, "paris");
  assert.equal(resolveMarket("Paris")?.id, "paris");
  assert.equal(resolveMarket("CI")?.id, "abidjan");
  assert.equal(resolveMarket("Abidjan")?.id, "abidjan");
  assert.equal(resolveMarket("Ivory Coast")?.id, "abidjan");
});

test("resolveMarket ignores diacritics, apostrophe style and case", () => {
  assert.equal(resolveMarket("Côte d'Ivoire")?.id, "abidjan");
  assert.equal(resolveMarket("Côte d’Ivoire")?.id, "abidjan");
  assert.equal(resolveMarket("COTE D IVOIRE")?.id, "abidjan");
  assert.equal(resolveMarket("  cote-d-ivoire ")?.id, "abidjan");
});

test("resolveMarket handles 'City, Country' text and rejects unknowns", () => {
  assert.equal(resolveMarket("Toronto, Canada")?.id, "toronto");
  assert.equal(resolveMarket("Lyon, France")?.id, "paris");
  assert.equal(resolveMarket("Germany"), null);
  assert.equal(resolveMarket(""), null);
  assert.equal(resolveMarket("   "), null);
  assert.equal(resolveMarket(undefined), null);
  assert.equal(resolveMarket(42), null);
  assert.equal(resolveMarket({ country: "CA" }), null);
});

test("sanitizeSummary redacts emails and phone numbers and flattens whitespace", () => {
  assert.equal(
    sanitizeSummary("Call me at +1 (416) 555-0199 or mail jane.doe+x@example.com now"),
    "Call me at [number] or mail [email] now",
  );
  assert.equal(sanitizeSummary("line one\nline two\t\u0000end"), "line one line two end");
  assert.equal(sanitizeSummary(undefined), "");
  assert.equal(sanitizeSummary(12345 as unknown), "");
});

test("sanitizeSummary truncates with an ellipsis within the limit", () => {
  const long = "a".repeat(500);
  const result = sanitizeSummary(long, 20);
  assert.equal(result.length, 20);
  assert.ok(result.endsWith("…"));
  assert.equal(sanitizeSummary("short", 20), "short");
});

test("contact events route to support with an allowlisted, PII-free data block", () => {
  const payload = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+1 416 555 0199",
    subject: "Booking question",
    message: "Please call me back about the pilot program",
  };
  const event = buildAutomationEvent("contact", payload, {
    now: FIXED_NOW,
    eventId: FIXED_ID,
  });

  assert.equal(event.schemaVersion, AUTOMATION_SCHEMA_VERSION);
  assert.equal(event.eventId, FIXED_ID);
  assert.equal(event.correlationId, FIXED_ID);
  assert.equal(event.eventType, "contact.received");
  assert.equal(event.entityType, "contact_message");
  assert.equal(event.entityId, null);
  assert.equal(event.topic, "support");
  assert.equal(event.priority, "normal");
  assert.equal(event.occurredAt, "2026-11-03T15:04:05.000Z");
  assert.deepEqual(event.data, { subject: "Booking question" });
  assert.equal(event.safeSummary, "Contact message: Booking question");
  assert.equal(event.marketId, null);

  const serialized = JSON.stringify(event);
  for (const secret of ["Jane Doe", "jane@example.com", "555 0199", "call me back"]) {
    assert.ok(!serialized.includes(secret), `envelope leaked ${secret}`);
  }
});

test("artist applications route to music_events and resolve the market", () => {
  const event = buildAutomationEvent(
    "artist_application",
    {
      applicationId: 42,
      email: "artist@example.com",
      stageName: "DJ Abidjan Nights",
      genre: "Coupé-Décalé",
      country: "Côte d'Ivoire",
    },
    { now: FIXED_NOW, eventId: FIXED_ID },
  );

  assert.equal(event.topic, "music_events");
  assert.equal(event.eventType, "artist.application_submitted");
  assert.equal(event.entityType, "artist_application");
  assert.equal(event.entityId, "42");
  assert.equal(event.marketId, "abidjan");
  assert.equal(event.countryCode, "CI");
  assert.equal(event.timezone, "Africa/Abidjan");
  assert.deepEqual(event.data, {
    applicationId: 42,
    stageName: "DJ Abidjan Nights",
    genre: "Coupé-Décalé",
    country: "Côte d'Ivoire",
  });
  assert.ok(!JSON.stringify(event).includes("artist@example.com"));
});

test("countryCode takes precedence over the free-text country", () => {
  const event = buildAutomationEvent(
    "artist_application",
    { applicationId: 1, country: "France", countryCode: "CA" },
    { eventId: FIXED_ID },
  );
  assert.equal(event.marketId, "toronto");
});

test("event submissions keep their own eventId separate from the delivery id", () => {
  const payload = { eventId: 77, status: "pending", submittedBy: 9 };
  const event = buildAutomationEvent("event_submission", payload, {
    eventId: FIXED_ID,
    correlationId: "req-abc",
  });

  assert.equal(event.eventId, FIXED_ID);
  assert.equal(event.entityId, "77");
  assert.equal(event.correlationId, "req-abc");
  assert.equal(event.topic, "music_events");
  assert.deepEqual(event.data, { eventId: 77, status: "pending", submittedBy: 9 });
  assert.equal(event.safeSummary, "Event 77 submitted (pending)");
});

test("unknown fields are dropped and missing fields become null", () => {
  const event = buildAutomationEvent(
    "artist_application",
    { applicationId: 5, secretToken: "do-not-forward", nested: { a: 1 } },
    { eventId: FIXED_ID },
  );
  assert.deepEqual(event.data, {
    applicationId: 5,
    stageName: null,
    genre: null,
    country: null,
  });
  assert.ok(!JSON.stringify(event).includes("do-not-forward"));
  assert.equal(event.marketId, null);
  assert.equal(event.countryCode, null);
  assert.equal(event.timezone, null);
});

test("string data values are trimmed, stripped of control characters and length-limited", () => {
  const event = buildAutomationEvent(
    "contact",
    { subject: `  ${"x".repeat(400)}\n\u0007 ` },
    { eventId: FIXED_ID },
  );
  const subject = event.data.subject;
  assert.equal(typeof subject, "string");
  assert.equal((subject as string).length, 200);
  assert.ok(!/[\u0000-\u001f]/.test(subject as string));
  assert.ok(event.safeSummary.length <= 140);
});

const hasLoneSurrogate = (text: string) =>
  /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(text);

test("free-text data fields are redacted like the summary", () => {
  const contact = buildAutomationEvent(
    "contact",
    { subject: "Call +1 416 555 0199 or jane@example.com about the pilot" },
    { eventId: FIXED_ID },
  );
  assert.equal(contact.data.subject, "Call [number] or [email] about the pilot");

  const artist = buildAutomationEvent(
    "artist_application",
    {
      applicationId: 12,
      stageName: "DJ Sam sam@example.com",
      genre: "+33 1 23 45 67 89",
      country: "France",
    },
    { eventId: FIXED_ID },
  );
  assert.deepEqual(artist.data, {
    applicationId: 12,
    stageName: "DJ Sam [email]",
    genre: "[number]",
    country: "France",
  });
  const serialized = JSON.stringify([contact, artist]);
  for (const leaked of ["jane@example.com", "sam@example.com", "555 0199", "23 45 67"]) {
    assert.ok(!serialized.includes(leaked), `envelope leaked ${leaked}`);
  }
});

test("ids and enums are never redacted, so entityId stays usable", () => {
  const ticket = buildAutomationEvent(
    "ticket",
    { ticketId: "TKT-20260301-0042", status: "open" },
    { eventId: FIXED_ID },
  );
  assert.equal(ticket.entityId, "TKT-20260301-0042");
  assert.deepEqual(ticket.data, { ticketId: "TKT-20260301-0042", status: "open" });

  const uuid = "3f2b8f0e-1c4d-4e5a-9b6c-7d8e9f0a1b2c";
  const submission = buildAutomationEvent(
    "event_submission",
    { eventId: uuid, status: "pending", submittedBy: 9 },
    { eventId: FIXED_ID },
  );
  assert.equal(submission.entityId, uuid);
  assert.deepEqual(submission.data, { eventId: uuid, status: "pending", submittedBy: 9 });
});

test("redaction happens before truncation, so a cut-off address cannot slip through", () => {
  const event = buildAutomationEvent(
    "contact",
    { subject: `${"x".repeat(190)} jane@example.com` },
    { eventId: FIXED_ID },
  );
  const subject = event.data.subject as string;
  assert.ok(subject.endsWith(" [email]"), subject.slice(-20));
  assert.ok(!subject.includes("jane"));
});

test("hostile long text is scanned in bounded time", () => {
  const started = Date.now();
  const hostile = "a".repeat(200_000);
  assert.equal(sanitizeSummary(hostile, 140).length, 140);
  const event = buildAutomationEvent("contact", { subject: hostile }, { eventId: FIXED_ID });
  assert.equal((event.data.subject as string).length, 200);
  assert.ok(Date.now() - started < 1_000, "redaction must not backtrack on long input");
});

test("truncation never leaves half an emoji, which Postgres rejects in jsonb", () => {
  const summary = sanitizeSummary(`${"x".repeat(138)}😀tail`, 140);
  assert.ok(!hasLoneSurrogate(summary));
  assert.equal(summary, `${"x".repeat(138)}…`);

  const freeText = buildAutomationEvent(
    "contact",
    { subject: `${"x".repeat(198)}😀tail` },
    { eventId: FIXED_ID },
  );
  assert.ok(!hasLoneSurrogate(freeText.data.subject as string));

  const plain = buildAutomationEvent(
    "event_submission",
    { eventId: 1, status: `${"x".repeat(199)}😀` },
    { eventId: FIXED_ID },
  );
  assert.equal((plain.data.status as string).length, 199);
  assert.ok(!hasLoneSurrogate(plain.data.status as string));
  assert.ok(!/\\ud[89a-f][0-9a-f]{2}/i.test(JSON.stringify([freeText, plain])));
});

test("a generated eventId is a UUID when none is supplied", () => {
  const event = buildAutomationEvent("contact", { subject: "hi" });
  assert.match(
    event.eventId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
  assert.equal(event.correlationId, event.eventId);
});

test("webhook body keeps legacy flat fields and nests the envelope", () => {
  const payload = {
    eventId: 77,
    status: "pending",
    submittedBy: 9,
  };
  const envelope = buildAutomationEvent("event_submission", payload, {
    eventId: FIXED_ID,
    now: FIXED_NOW,
  });
  const body = buildWebhookBody(
    "event_submission",
    payload,
    envelope,
    "2026-11-03T15:04:06.000Z",
  );

  assert.equal(body.category, "event_submission");
  assert.equal(body.eventId, 77);
  assert.equal(body.status, "pending");
  assert.equal(body.submittedBy, 9);
  assert.equal(body.sentAt, "2026-11-03T15:04:06.000Z");
  assert.deepEqual(body.automation, envelope);
  assert.deepEqual(Object.keys(body), [
    "category",
    "eventId",
    "status",
    "submittedBy",
    "sentAt",
    "automation",
  ]);
});

test("a payload key named 'automation' cannot override the envelope", () => {
  const envelope = buildAutomationEvent("contact", { subject: "s" }, { eventId: FIXED_ID });
  const body = buildWebhookBody(
    "contact",
    { subject: "s", automation: "spoofed" },
    envelope,
    "2026-11-03T15:04:06.000Z",
  );
  assert.deepEqual(body.automation, envelope);
});

test("a payload key named 'category' or 'sentAt' cannot override the event's own fields", () => {
  const payload = { subject: "s", category: "Restaurant", sentAt: "1999-01-01T00:00:00.000Z" };
  const envelope = buildAutomationEvent("contact", payload, { eventId: FIXED_ID, now: FIXED_NOW });
  const body = buildWebhookBody("contact", payload, envelope, "2026-11-03T15:04:06.000Z");

  assert.equal(body.category, "contact");
  assert.equal(body.sentAt, "2026-11-03T15:04:06.000Z");
  assert.equal(body.subject, "s");
  assert.deepEqual(Object.keys(body), ["category", "subject", "sentAt", "automation"]);
});

test("no event reads a payload key named like a field the webhook body sets itself", () => {
  const categories = [
    "contact",
    "ticket",
    "artist_application",
    "event_submission",
    "pilot_lead",
    "business_request",
    "artist_request",
    "job_request",
  ] as const;
  for (const category of categories) {
    const { data } = buildAutomationEvent(category, {}, { eventId: FIXED_ID, now: FIXED_NOW });
    for (const reserved of ["category", "sentAt", "automation"]) {
      assert.equal(reserved in data, false, `${category} must not read a payload key named "${reserved}"`);
    }
  }
});

test("topics are a closed set", () => {
  assert.deepEqual([...AUTOMATION_TOPICS], [
    "music_events",
    "artisans",
    "pilot",
    "finance",
    "support",
    "management",
  ]);
  assert.equal(isAutomationTopic("finance"), true);
  assert.equal(isAutomationTopic("billing"), false);
  assert.equal(isAutomationTopic(undefined), false);
});

test("isPilotLeadSubject matches pilot wording in English and French only", () => {
  assert.equal(isPilotLeadSubject("Pilot program"), true);
  assert.equal(isPilotLeadSubject("I want to join the PILOT"), true);
  assert.equal(isPilotLeadSubject("Programme pilote"), true);
  assert.equal(isPilotLeadSubject("Pilots wanted?"), true);
  assert.equal(isPilotLeadSubject("Pilotage de projet"), false);
  assert.equal(isPilotLeadSubject("Copilot question"), false);
  assert.equal(isPilotLeadSubject("General question"), false);
  assert.equal(isPilotLeadSubject(""), false);
  assert.equal(isPilotLeadSubject(undefined), false);
  assert.equal(isPilotLeadSubject(42), false);
});

test("pilot_lead maps to the pilot topic and redacts contact details in the subject", () => {
  const event = buildAutomationEvent(
    "pilot_lead",
    { subject: "Pilot: call +1 416 555 0199 or a@b.co", email: "owner@example.com", name: "Owner" },
    { now: FIXED_NOW, eventId: FIXED_ID },
  );
  assert.equal(event.eventType, "pilot.lead_received");
  assert.equal(event.entityType, "pilot_lead");
  assert.equal(event.topic, "pilot");
  assert.equal(event.safeSummary, "Pilot lead: Pilot: call [number] or [email]");
  assert.deepEqual(Object.keys(event.data), ["subject"]);
});

test("request categories carry a reference and labels, route to the admin topics and redact typed text", () => {
  const business = buildAutomationEvent(
    "business_request",
    {
      referenceId: "REQ-BIZ-ABC1",
      businessName: "Café du Port a@b.co",
      businessCategory: "Restaurants",
      countryCode: "CI",
      city: "Abidjan",
      email: "owner@example.com",
      phone: "+225 01 02 03 04",
      description: "Maquis",
    },
    { now: FIXED_NOW, eventId: FIXED_ID },
  );
  assert.equal(business.eventType, "business.request_submitted");
  assert.equal(business.topic, "artisans");
  assert.equal(business.entityId, "REQ-BIZ-ABC1");
  assert.equal(business.marketId, "abidjan");
  assert.equal(business.safeSummary, "Business request: Café du Port [email] (Abidjan)");
  assert.deepEqual(Object.keys(business.data), [
    "referenceId",
    "businessName",
    "businessCategory",
    "countryCode",
    "city",
  ]);
  assert.equal(business.data.businessCategory, "Restaurants");
  assert.ok(!JSON.stringify(business).includes("owner@example.com"));
  assert.ok(!JSON.stringify(business).includes("+225"));

  const job = buildAutomationEvent(
    "job_request",
    { referenceId: "REQ-JOB-X", jobTitle: "Chef", company: "Le Port", countryCode: "FR" },
    { now: FIXED_NOW, eventId: FIXED_ID },
  );
  assert.equal(job.eventType, "job.request_submitted");
  assert.equal(job.topic, "artisans");
  assert.equal(job.marketId, "paris");
  assert.equal(job.safeSummary, "Job request: Chef at Le Port");

  const artist = buildAutomationEvent(
    "artist_request",
    { referenceId: "REQ-ART-Y", stageName: "DJ Nova", genre: "Afrobeats", countryCode: "CA" },
    { now: FIXED_NOW, eventId: FIXED_ID },
  );
  assert.equal(artist.eventType, "artist.request_submitted");
  assert.equal(artist.topic, "music_events");
  assert.equal(artist.marketId, "toronto");
  assert.equal(artist.safeSummary, "Artist request: DJ Nova (Afrobeats)");
});

test("the business category label is typed text, so it is redacted like the business name", () => {
  const event = buildAutomationEvent(
    "business_request",
    { referenceId: "REQ-BIZ-ABC1", businessCategory: "Cafés a@b.co" },
    { now: FIXED_NOW, eventId: FIXED_ID },
  );
  assert.equal(event.data.businessCategory, "Cafés [email]");
});

test("a request with no known country has no market, never a default one", () => {
  const event = buildAutomationEvent(
    "job_request",
    { referenceId: "REQ-JOB-Z", jobTitle: "Cook", company: "X", countryCode: "DE" },
    { now: FIXED_NOW, eventId: FIXED_ID },
  );
  assert.equal(event.marketId, null);
  assert.equal(event.timezone, null);
});
