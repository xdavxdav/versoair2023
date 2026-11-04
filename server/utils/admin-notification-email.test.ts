import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveAdminNotificationEmail } from "./admin-notification-email";

test("ADMIN_EMAIL wins over SMTP_FROM and SMTP_USER", () => {
  assert.equal(
    resolveAdminNotificationEmail({
      ADMIN_EMAIL: "admin@example.test",
      SMTP_FROM: "noreply@example.test",
      SMTP_USER: "smtp@example.test",
    }),
    "admin@example.test",
  );
});

test("falls back to SMTP_FROM, then SMTP_USER, then an empty string", () => {
  assert.equal(
    resolveAdminNotificationEmail({
      SMTP_FROM: "noreply@example.test",
      SMTP_USER: "smtp@example.test",
    }),
    "noreply@example.test",
  );
  assert.equal(
    resolveAdminNotificationEmail({ SMTP_USER: "smtp@example.test" }),
    "smtp@example.test",
  );
  assert.equal(resolveAdminNotificationEmail({}), "");
});

test("blank or whitespace-only values are skipped, and the winner is trimmed", () => {
  assert.equal(
    resolveAdminNotificationEmail({
      ADMIN_EMAIL: "   ",
      SMTP_FROM: "",
      SMTP_USER: "  smtp@example.test ",
    }),
    "smtp@example.test",
  );
});

test("artist application notices are addressed through the helper", () => {
  const source = readFileSync(
    new URL("../routes/artist-contracts.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /const adminEmail = resolveAdminNotificationEmail\(\);/,
  );
  assert.doesNotMatch(
    source,
    /adminEmail = process\.env\.SMTP_FROM/,
    "the notice must not go to SMTP_FROM (noreply) first",
  );
});
