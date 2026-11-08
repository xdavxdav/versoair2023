import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { DIVISIONS, norm, parse } = require("./seed-country-regions.cjs");

const COUNTRY_CODES = [
  "DZ", "BE", "BJ", "BR", "BF", "CM", "CA", "CN", "CG", "CI", "CD", "FR",
  "GA", "DE", "GN", "HT", "IN", "IT", "JP", "MG", "ML", "MX", "MA", "NE",
  "NG", "PT", "SN", "ZA", "ES", "CH", "TG", "TN", "AE", "GB", "US",
];

test("every seeded country has a division list", () => {
  assert.deepEqual(Object.keys(DIVISIONS).sort(), [...COUNTRY_CODES].sort());
});

test("no duplicate divisions within a country", () => {
  for (const [code, list] of Object.entries<string[]>(parse())) {
    const keys = list.map(norm);
    assert.equal(new Set(keys).size, keys.length, `duplicates in ${code}`);
    assert.ok(list.every((n) => n.length > 0), `blank name in ${code}`);
  }
});

test("known counts", () => {
  const d = parse();
  assert.equal(d.CI.length, 14);
  assert.equal(d.US.length, 51);
  assert.equal(d.JP.length, 47);
  assert.equal(d.NG.length, 37);
  assert.equal(d.DE.length, 16);
});

test("existing seed names still match (no duplicates of Ouest-CM style names)", () => {
  assert.equal(norm("Ouest-CM"), norm("Ouest"));
  assert.equal(norm("Vallée du Bandama"), norm("Vallee du Bandama"));
});
