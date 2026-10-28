import assert from "node:assert/strict";
import test from "node:test";

import { getPublicBaseUrl } from "./base-url";

const PROD = { NODE_ENV: "production" } as const;

test("PUBLIC_BASE_URL wins and its trailing slashes are stripped", () => {
  assert.equal(
    getPublicBaseUrl({ ...PROD, PUBLIC_BASE_URL: "https://shop.example.com/" }),
    "https://shop.example.com",
  );
  assert.equal(
    getPublicBaseUrl({ PUBLIC_BASE_URL: "https://shop.example.com///" }),
    "https://shop.example.com",
  );
});

test("the repo's existing URL variables are honoured in site-origin order", () => {
  assert.equal(
    getPublicBaseUrl({
      ...PROD,
      PRODUCTION_URL: "https://a.example.com",
      APP_PUBLIC_URL: "https://b.example.com",
      VERSOAIR_URL: "https://c.example.com",
    }),
    "https://a.example.com",
  );
  assert.equal(
    getPublicBaseUrl({
      ...PROD,
      APP_PUBLIC_URL: "https://b.example.com",
      VERSOAIR_URL: "https://c.example.com",
    }),
    "https://b.example.com",
  );
  assert.equal(
    getPublicBaseUrl({ ...PROD, VERSOAIR_URL: "https://c.example.com" }),
    "https://c.example.com",
  );
  assert.equal(
    getPublicBaseUrl({
      ...PROD,
      PUBLIC_BASE_URL: "https://explicit.example.com",
      PRODUCTION_URL: "https://a.example.com",
    }),
    "https://explicit.example.com",
  );
});

test("production without any URL variable uses the canonical www origin", () => {
  assert.equal(getPublicBaseUrl({ ...PROD }), "https://www.versoair.com");
});

test("the localhost fallback only exists outside production", () => {
  assert.equal(getPublicBaseUrl({}), "http://localhost:5003");
  assert.equal(
    getPublicBaseUrl({ NODE_ENV: "development" }),
    "http://localhost:5003",
  );
  assert.equal(
    getPublicBaseUrl({ NODE_ENV: "test", PORT: "5060" }),
    "http://localhost:5060",
  );
  assert.equal(
    getPublicBaseUrl({ NODE_ENV: "test", PORT: "not-a-port" }),
    "http://localhost:5003",
  );
  assert.doesNotMatch(getPublicBaseUrl({ ...PROD }), /localhost/);
});

test("values that are not http(s) URLs are skipped", () => {
  for (const bad of [
    "not a url",
    "javascript:alert(1)",
    "ftp://files.example.com",
    "//evil.example.com",
    "   ",
  ]) {
    assert.equal(
      getPublicBaseUrl({ ...PROD, PUBLIC_BASE_URL: bad }),
      "https://www.versoair.com",
      `ignored: ${bad}`,
    );
  }
  assert.equal(
    getPublicBaseUrl({
      ...PROD,
      PUBLIC_BASE_URL: "javascript:alert(1)",
      PRODUCTION_URL: "https://fallback.example.com",
    }),
    "https://fallback.example.com",
  );
});

test("production never returns a loopback, placeholder or onrender origin", () => {
  for (const bad of [
    "http://localhost:5003",
    "http://127.0.0.1:5003",
    "http://[::1]:5003",
    "http://0.0.0.0:5003",
    "https://app.localhost",
    "https://versoair-abc.onrender.com",
    "https://your-domain.com",
  ]) {
    assert.equal(
      getPublicBaseUrl({ ...PROD, PUBLIC_BASE_URL: bad }),
      "https://www.versoair.com",
      `rejected in production: ${bad}`,
    );
  }
});

test("outside production an explicit loopback URL is allowed", () => {
  assert.equal(
    getPublicBaseUrl({ PUBLIC_BASE_URL: "http://localhost:5173/" }),
    "http://localhost:5173",
  );
});

test("credentials, query and fragment never leak into the base URL", () => {
  assert.equal(
    getPublicBaseUrl({
      ...PROD,
      PUBLIC_BASE_URL: "https://user:secret@shop.example.com/?a=1#frag",
    }),
    "https://shop.example.com",
  );
  assert.equal(
    getPublicBaseUrl({ PUBLIC_BASE_URL: "https://shop.example.com/app/?x=1" }),
    "https://shop.example.com/app",
  );
});

test("the result is stable and never ends with a slash", () => {
  for (const env of [
    {},
    { ...PROD },
    { PUBLIC_BASE_URL: "https://a.example.com/" },
    { PUBLIC_BASE_URL: "http://localhost:1/" },
  ]) {
    const value = getPublicBaseUrl(env);
    assert.ok(!value.endsWith("/"), value);
    assert.equal(new URL(value).origin.length > 0, true);
  }
});
