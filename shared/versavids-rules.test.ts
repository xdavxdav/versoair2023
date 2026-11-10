import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorMessage } from "./api-error";
import {
  DELIVERY_ACCEPTING_STATUSES,
  DELIVERY_URL_MAX,
  parseDeliveryUrl,
} from "./versavids-rules";

test("a delivery link is trimmed and normalised", () => {
  assert.equal(
    parseDeliveryUrl("  HTTPS://Vimeo.com/123  "),
    "https://vimeo.com/123",
  );
  assert.equal(
    parseDeliveryUrl("http://example.org/a b"),
    "http://example.org/a%20b",
  );
  assert.equal(
    parseDeliveryUrl("https://drive.google.com/file/d/abc/view?usp=sharing"),
    "https://drive.google.com/file/d/abc/view?usp=sharing",
  );
});

test("only plain http(s) links are kept", () => {
  for (const bad of [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "ftp://example.com/video.mp4",
    "blob:https://example.com/1",
    "//evil.example/video",
    "vimeo.com/123",
    "not a link",
    "",
    "   ",
  ]) {
    assert.equal(parseDeliveryUrl(bad), null, JSON.stringify(bad));
  }
});

test("a link that hides its real host behind a login is refused", () => {
  assert.equal(parseDeliveryUrl("https://vimeo.com@evil.example/x"), null);
  assert.equal(parseDeliveryUrl("https://user:pass@example.com/x"), null);
});

test("an over-long link is refused, not cut", () => {
  const prefix = "https://example.com/";
  const atLimit = prefix + "a".repeat(DELIVERY_URL_MAX - prefix.length);
  assert.equal(atLimit.length, DELIVERY_URL_MAX);
  assert.equal(parseDeliveryUrl(atLimit), atLimit);
  assert.equal(parseDeliveryUrl(atLimit + "a"), null);
});

test("anything that is not text is refused", () => {
  for (const bad of [null, undefined, 42, true, {}, [], ["https://a.com"]]) {
    assert.equal(parseDeliveryUrl(bad), null, JSON.stringify(bad));
  }
});

test("deliveries are accepted while the artist has the project", () => {
  assert.deepEqual(
    [...DELIVERY_ACCEPTING_STATUSES].sort(),
    ["claimed", "in_progress", "review", "revision"].sort(),
  );
  for (const closed of ["open", "completed", "cancelled"]) {
    assert.equal(DELIVERY_ACCEPTING_STATUSES.includes(closed), false, closed);
  }
});

test("an API error is shown whichever shape the server used", () => {
  assert.equal(
    apiErrorMessage({ error: "Project is no longer open" }, "fallback"),
    "Project is no longer open",
  );
  assert.equal(
    apiErrorMessage(
      { success: false, error: { code: "AUTH_REQUIRED", message: "Sign in" } },
      "fallback",
    ),
    "Sign in",
  );
  for (const unusable of [
    null,
    undefined,
    "oops",
    {},
    { error: "" },
    { error: {} },
    { error: { message: 7 } },
  ]) {
    assert.equal(apiErrorMessage(unusable, "fallback"), "fallback");
  }
});
