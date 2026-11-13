import assert from "node:assert/strict";
import test from "node:test";
import {
  canEditFiche,
  emptyFiche,
  ficheFromRow,
  ficheStorage,
  normalizeHours,
  normalizeSocialUrl,
  openNow,
  readFiche,
  weekdayIn,
} from "./fiche-technique";

test("a complete fiche is accepted and cleaned", () => {
  const { value, errors } = readFiche({
    sector: "restaurant",
    timezone: "America/Toronto",
    services: ["  Catering ", "catering", "Dine-in", ""],
    products: ["Poutine"],
    team: "  Four cooks  ",
    kpis: [
      { label: "Covers / night", value: "120" },
      { label: "", value: "ignored" },
    ],
    case_studies: [{ title: "Gala 2025", summary: "400 guests" }],
    opening_hours: { monday: "9:00 - 17:00", sunday: "Closed" },
    social_links: { facebook: "https://facebook.com/shop" },
  });
  assert.deepEqual(errors, []);
  assert.equal(value.sector, "restaurant");
  assert.deepEqual(value.services, ["Catering", "Dine-in"]);
  assert.equal(value.team, "Four cooks");
  assert.deepEqual(value.kpis, [{ label: "Covers / night", value: "120" }]);
  assert.deepEqual(value.opening_hours, { monday: "09:00-17:00", sunday: "closed" });
  assert.equal(value.social_links.facebook, "https://facebook.com/shop");
});

test("NUL and control characters never reach storage", () => {
  const { value } = readFiche({
    team: "ok\u0000bad\u0007text",
    services: ["a\u0000b"],
  });
  assert.equal(value.team, "okbadtext");
  assert.deepEqual(value.services, ["ab"]);
  assert.equal(JSON.stringify(value).includes("\\u0000"), false);
});

test("bad input is reported and never kept", () => {
  const { value, errors } = readFiche({
    sector: "spaceship",
    timezone: "Mars/Olympus",
    team: 42,
    services: "not a list",
    legal: "x".repeat(2001),
    opening_hours: { funday: "09:00-17:00", monday: "25:00-26:00", tuesday: "09:00-09:00" },
    social_links: {
      facebook: "javascript:alert(1)",
      instagram: "https://user:pw@instagram.com/x",
      myspace: "https://myspace.com/x",
    },
  });
  assert.equal(value.sector, null);
  assert.equal(value.timezone, null);
  assert.equal(value.team, "");
  assert.deepEqual(value.services, []);
  assert.equal(value.legal.length, 2000);
  assert.deepEqual(value.opening_hours, {});
  assert.deepEqual(value.social_links, {});
  for (const pattern of [
    /Sector/, /Timezone/, /Team must be text/, /Services must be a list/, /Legal is too long/,
    /funday/, /monday are not valid/, /tuesday are not valid/, /facebook link/, /instagram link/, /myspace/,
  ]) {
    assert.ok(errors.some((e) => pattern.test(e)), `${pattern} in ${JSON.stringify(errors)}`);
  }
});

test("list and row limits are enforced", () => {
  const many = Array.from({ length: 40 }, (_, i) => `item ${i}`);
  const { value, errors } = readFiche({
    services: many,
    kpis: Array.from({ length: 13 }, (_, i) => ({ label: `k${i}`, value: "1" })),
  });
  assert.equal(value.services.length, 30);
  assert.equal(value.kpis.length, 12);
  assert.equal(errors.length, 2);
});

test("a non-object fiche is refused but still yields an empty, safe value", () => {
  for (const raw of ["x", 5, ["a"], true]) {
    const { value, errors } = readFiche(raw);
    assert.deepEqual(value, emptyFiche());
    assert.ok(errors.length > 0);
  }
  assert.deepEqual(readFiche(undefined), { value: emptyFiche(), errors: [] });
  assert.deepEqual(readFiche(null), { value: emptyFiche(), errors: [] });
});

test("hours accept split shifts and overnight ranges, and reject nonsense", () => {
  assert.equal(normalizeHours("9:00-12:00, 13:00-17:30"), "09:00-12:00, 13:00-17:30");
  assert.equal(normalizeHours("18:00-02:00"), "18:00-02:00");
  assert.equal(normalizeHours("00:00-24:00"), "00:00-24:00");
  assert.equal(normalizeHours("Fermé"), "closed");
  for (const bad of ["", "9-5", "24:00-25:00", "09:60-10:00", "10:00-10:00", "1:00-2:00,2:00-3:00,3:00-4:00,4:00-5:00"]) {
    assert.equal(normalizeHours(bad), null, bad);
  }
});

test("only plain http(s) links are kept", () => {
  assert.equal(normalizeSocialUrl("https://x.com/shop"), "https://x.com/shop");
  for (const bad of ["javascript:alert(1)", "data:text/html,hi", "ftp://x.com", "//x.com", "https://a:b@x.com", "", `https://x.com/${"a".repeat(300)}`]) {
    assert.equal(normalizeSocialUrl(bad), null, bad);
  }
});

test("storage keeps attributes and the hours and links columns separate", () => {
  const { value } = readFiche({
    sector: "finance",
    services: ["Loans"],
    opening_hours: { monday: "09:00-17:00" },
    social_links: { linkedin: "https://linkedin.com/company/x" },
  });
  const stored = ficheStorage(value);
  assert.equal(stored.sectorData.sector, "finance");
  assert.equal("opening_hours" in stored.sectorData, false);
  assert.equal("social_links" in stored.sectorData, false);
  assert.deepEqual(stored.openingHours, { monday: "09:00-17:00" });
  const round = ficheFromRow({
    attributes: { type: "bank", sectorData: stored.sectorData },
    opening_hours: stored.openingHours,
    social_links: stored.socialLinks,
  });
  assert.deepEqual(round, value);
});

test("reading a legacy or corrupt row cannot throw or leak junk", () => {
  for (const row of [
    {},
    { attributes: null },
    { attributes: "oops", opening_hours: "x", social_links: 3 },
    { attributes: { sectorData: ["a"] } },
    { attributes: { sectorData: { services: [1, 2], sector: "nope", __proto__: { x: 1 } } } },
  ]) {
    const fiche = ficheFromRow(row as never);
    assert.deepEqual(Object.keys(fiche).sort(), Object.keys(emptyFiche()).sort());
  }
});

test("who may edit a fiche", () => {
  const business = { owner_id: 7 };
  assert.equal(canEditFiche({ id: 7, role: "user" }, business), true);
  assert.equal(canEditFiche({ id: "7", role: "business_owner" }, business), true);
  assert.equal(canEditFiche({ id: 8, role: "user" }, business), false);
  assert.equal(canEditFiche({ id: 8, role: "business_owner" }, business), false);
  assert.equal(canEditFiche({ id: 8, role: "business_owner" }, { owner_id: 7, is_owner: true }), true);
  assert.equal(canEditFiche({ id: 8, role: "business_owner" }, { owner_id: 7, is_owner: false }), false);
  for (const role of ["admin", "moderator", "superuser"]) {
    assert.equal(canEditFiche({ id: 8, role }, business), true, role);
  }
  assert.equal(canEditFiche({ id: 8, role: "tsr" }, business), false);
  assert.equal(canEditFiche({ id: null, role: "user" }, business), false);
  assert.equal(canEditFiche({ id: 0, role: "user" }, { owner_id: 0 }), false);
  assert.equal(canEditFiche({ id: 7, role: "user" }, { owner_id: null }), false);
});

test("open now follows the business's own timezone, not the visitor's", () => {
  const hours = { monday: "09:00-17:00", tuesday: "closed" } as const;
  // Monday 2026-11-09 14:30 UTC is 09:30 in Toronto (EST) and 06:30 in Vancouver.
  const at = new Date("2026-11-09T14:30:00Z");
  assert.deepEqual(openNow(hours, "America/Toronto", at), { state: "open", at: "17:00" });
  assert.deepEqual(openNow(hours, "America/Vancouver", at), { state: "closed", at: "09:00" });
  assert.deepEqual(openNow(hours, null, at), { state: "unknown" });
  assert.deepEqual(openNow(hours, "Not/AZone", at), { state: "unknown" });
  assert.deepEqual(openNow({}, "America/Toronto", at), { state: "unknown" });
  assert.deepEqual(openNow(hours, "America/Toronto", new Date("2026-11-10T15:00:00Z")), { state: "closed" });
});

test("today is read in the business's timezone", () => {
  // 02:30 UTC on Tuesday is still Monday evening in Toronto and Vancouver, already Tuesday in Paris.
  const at = new Date("2026-11-10T02:30:00Z");
  assert.equal(weekdayIn("America/Toronto", at), "monday");
  assert.equal(weekdayIn("America/Vancouver", at), "monday");
  assert.equal(weekdayIn("Europe/Paris", at), "tuesday");
  assert.equal(weekdayIn("Not/AZone", at), weekdayIn(null, at));
});

test("open now handles split shifts, the closing minute and overnight hours", () => {
  const split = { monday: "09:00-12:00, 13:00-17:00" } as const;
  const at = (iso: string) => new Date(iso);
  // 2026-11-09 is a Monday; Toronto is UTC-5 in November.
  assert.deepEqual(openNow(split, "America/Toronto", at("2026-11-09T17:30:00Z")), { state: "closed", at: "13:00" });
  assert.deepEqual(openNow(split, "America/Toronto", at("2026-11-09T21:59:00Z")), { state: "open", at: "17:00" });
  assert.deepEqual(openNow(split, "America/Toronto", at("2026-11-09T22:00:00Z")), { state: "closed" });
  const night = { monday: "18:00-02:00", tuesday: "closed" } as const;
  assert.deepEqual(openNow(night, "America/Toronto", at("2026-11-10T05:00:00Z")), { state: "open", at: "02:00" });
  assert.deepEqual(openNow(night, "America/Toronto", at("2026-11-10T08:00:00Z")), { state: "closed" });
  assert.deepEqual(openNow(night, "America/Toronto", at("2026-11-09T23:30:00Z")), { state: "open", at: "02:00" });
});
