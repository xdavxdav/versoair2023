import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCountryCode,
  publicBusinessVisibilitySql,
  requestedCountryCode,
  requestedOrDefaultCountryCode,
} from "./business-visibility";

test("normalizeCountryCode accepts only two-letter codes", () => {
  assert.equal(normalizeCountryCode(" ci "), "CI");
  assert.equal(normalizeCountryCode("CAN"), null);
  assert.equal(normalizeCountryCode("C1"), null);
  assert.equal(normalizeCountryCode("CI'; DROP TABLE businesses;--"), null);
  assert.equal(normalizeCountryCode(undefined), null);
  assert.equal(normalizeCountryCode(["CI"]), null);
});

test("visibility SQL scopes to the selected country and rejects injection", () => {
  assert.match(publicBusinessVisibilitySql("b", "ci"), /UPPER\(b\.country_code\) = 'CI'/);
  const injected = publicBusinessVisibilitySql("b", "CI' OR '1'='1");
  assert.doesNotMatch(injected, /country_code/);
  assert.match(injected, /b\.is_verified = true/);
});

test("visibility SQL without a country keeps the quality gate for every country", () => {
  const sql = publicBusinessVisibilitySql("businesses");
  assert.doesNotMatch(sql, /country_code/);
  assert.match(sql, /businesses\.is_active = true/);
  assert.match(sql, /@versoair\.local/);
});

test("request country falls back to the configured default", () => {
  const previous = process.env.VITE_DIRECTORY_COUNTRY_CODE;
  process.env.VITE_DIRECTORY_COUNTRY_CODE = "CA";
  try {
    assert.equal(requestedCountryCode({ query: { countryCode: "ci" } }), "CI");
    assert.equal(requestedCountryCode({ query: { country: "bj" } }), "BJ");
    assert.equal(requestedCountryCode({ query: { countryCode: "all" } }), null);
    assert.equal(requestedOrDefaultCountryCode({ query: {} }), "CA");
    assert.equal(requestedOrDefaultCountryCode({ query: { countryCode: "CI" } }), "CI");
  } finally {
    if (previous === undefined) delete process.env.VITE_DIRECTORY_COUNTRY_CODE;
    else process.env.VITE_DIRECTORY_COUNTRY_CODE = previous;
  }
});
