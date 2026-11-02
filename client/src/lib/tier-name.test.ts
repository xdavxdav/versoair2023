import assert from "node:assert/strict";
import test from "node:test";
import { tierName } from "./tier-name";

// Body shape returned by GET /api/artist/division-status (server/routes/evaluations.ts).
const divisionStatus = {
  success: true,
  division: {
    current: {
      key: "Discovery",
      label: "Discovery",
      color: "#6b7280",
      icon: "🔍",
      contractAccess: "none",
    },
    currentIndex: 0,
    total: 5,
  },
};

test("reads the key of a division object instead of calling string methods on it", () => {
  assert.equal(tierName(divisionStatus.division.current), "discovery");
});

test("reads plain string tiers, trimmed and lower-cased", () => {
  assert.equal(tierName("Guest"), "guest");
  assert.equal(tierName("  Spark "), "spark");
});

test("anything else is no tier rather than an exception", () => {
  for (const value of [undefined, null, 0, 3, true, [], {}, { key: 7 }, { key: "" }, "", "   "]) {
    assert.equal(tierName(value), null, JSON.stringify(value));
  }
});
