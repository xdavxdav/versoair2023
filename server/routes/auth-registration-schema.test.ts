import "../test-support/env";
import assert from "node:assert/strict";
import test from "node:test";
import { registerSchema } from "./auth";

const base = {
  email: "owner@example.com",
  password: "StrongPass1",
};

test("registration defaults to a general account", () => {
  const parsed = registerSchema.parse(base);
  assert.equal(parsed.accountType, "general");
});

test("Business Owner registration requires a non-empty business name", () => {
  assert.equal(
    registerSchema.safeParse({
      ...base,
      accountType: "business_owner",
      businessName: "  ",
    }).success,
    false,
  );
  const parsed = registerSchema.parse({
    ...base,
    accountType: "business_owner",
    businessName: "Example Co",
  });
  assert.equal(parsed.accountType, "business_owner");
  assert.equal(parsed.businessName, "Example Co");
});

test("registration does not accept a privileged account type", () => {
  assert.equal(
    registerSchema.safeParse({ ...base, accountType: "admin" }).success,
    false,
  );
});
