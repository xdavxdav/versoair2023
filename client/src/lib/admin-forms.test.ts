import assert from "node:assert/strict";
import test from "node:test";
import {
  adminAccessIssue,
  readApiFailure,
  slugify,
  toDateInputValue,
} from "./admin-forms";
import {
  businessSearchPath,
  describeBusinessOption,
  parseBusinessOptions,
  toBusinessOption,
} from "./business-picker";

test("date inputs get YYYY-MM-DD from API timestamps and never an invalid value", () => {
  assert.equal(toDateInputValue("2026-11-04T00:00:00.000Z"), "2026-11-04");
  assert.equal(toDateInputValue("2026-11-04"), "2026-11-04");
  assert.equal(toDateInputValue(new Date("2026-11-04T10:00:00Z")), "2026-11-04");
  assert.equal(toDateInputValue(null), "");
  assert.equal(toDateInputValue(undefined), "");
  assert.equal(toDateInputValue("soon"), "");
  assert.equal(toDateInputValue(new Date("nope")), "");
});

test("slugify makes a clean url slug from a category name", () => {
  assert.equal(slugify("Health & Wellness"), "health-and-wellness");
  assert.equal(slugify("  Café   Restaurant "), "cafe-restaurant");
  assert.equal(slugify("Alimentation & Restauration"), "alimentation-and-restauration");
  assert.equal(slugify("---"), "");
  assert.equal(slugify("x".repeat(200)).length, 80);
});

test("API failures expose the status, the code and the server message", async () => {
  const gate = await readApiFailure(
    {
      status: 401,
      json: async () => ({
        success: false,
        error: { code: "GEOADMIN_CODE_REQUIRED", message: "Sign in to GeoAdmin" },
      }),
    },
    "fallback",
  );
  assert.deepEqual(gate, {
    status: 401,
    code: "GEOADMIN_CODE_REQUIRED",
    message: "Sign in to GeoAdmin",
  });

  const topLevel = await readApiFailure(
    { status: 403, json: async () => ({ message: "Please verify your email" }) },
    "fallback",
  );
  assert.equal(topLevel.message, "Please verify your email");
  assert.equal(topLevel.code, null);

  const html = await readApiFailure(
    {
      status: 502,
      json: async () => {
        throw new SyntaxError("not json");
      },
    },
    "Could not save",
  );
  assert.deepEqual(html, { status: 502, code: null, message: "Could not save" });
});

test("access failures are told apart from ordinary errors", () => {
  assert.equal(
    adminAccessIssue({ status: 401, code: "GEOADMIN_CODE_REQUIRED" }),
    "geoadmin-code",
  );
  assert.equal(adminAccessIssue({ status: 401, code: "AUTH_REQUIRED" }), "sign-in");
  assert.equal(
    adminAccessIssue({ status: 403, code: "INSUFFICIENT_PERMISSIONS" }),
    "admin-only",
  );
  assert.equal(adminAccessIssue({ status: 400, code: "VALIDATION_ERROR" }), null);
  assert.equal(adminAccessIssue({ status: 500, code: null }), null);
});

test("the business search asks for a small page and trims the query", () => {
  assert.equal(businessSearchPath(""), "/api/v1/admin/businesses?limit=20");
  assert.equal(
    businessSearchPath("  Café Noir "),
    "/api/v1/admin/businesses?limit=20&search=Caf%C3%A9+Noir",
  );
  assert.equal(businessSearchPath("x", 5), "/api/v1/admin/businesses?limit=5&search=x");
});

test("business options are read from list and detail responses, and bad rows are dropped", () => {
  const list = parseBusinessOptions({
    success: true,
    data: [
      { id: 7, name: "Maison Verte", cityName: "Abidjan", countryCode: "CI", email: "x@y.z" },
      { id: "12", name: " Atelier ", cityName: "", countryCode: null },
      { id: 0, name: "Zero" },
      { id: 3, name: "" },
      null,
    ],
  });
  assert.deepEqual(list, [
    { id: 7, name: "Maison Verte", cityName: "Abidjan", countryCode: "CI" },
    { id: 12, name: "Atelier", cityName: null, countryCode: null },
  ]);

  assert.deepEqual(parseBusinessOptions({ data: { id: 4, name: "Solo" } }), [
    { id: 4, name: "Solo", cityName: null, countryCode: null },
  ]);
  assert.deepEqual(parseBusinessOptions(null), []);
  assert.deepEqual(parseBusinessOptions({ data: null }), []);
  assert.equal(toBusinessOption("nope"), null);
});

test("a business option is described with its place when known", () => {
  assert.equal(
    describeBusinessOption({ id: 1, name: "Maison Verte", cityName: "Abidjan", countryCode: "CI" }),
    "Maison Verte (Abidjan, CI)",
  );
  assert.equal(
    describeBusinessOption({ id: 2, name: "Solo", cityName: null, countryCode: null }),
    "Solo",
  );
});
