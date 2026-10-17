import assert from "node:assert/strict";
import test from "node:test";
import { authErrorMessage } from "./auth-error";

test("extracts actionable route and middleware error messages", () => {
  assert.equal(authErrorMessage(new Error('409: {"message":"Username is taken."}')), "Username is taken.");
  assert.equal(authErrorMessage(new Error('403: {"error":{"message":"Superadmin required."}}')), "Superadmin required.");
});

test("preserves plain-text failures and handles unknown errors", () => {
  assert.equal(authErrorMessage(new Error("503: Email delivery unavailable")), "Email delivery unavailable");
  assert.equal(authErrorMessage(new Error("Failed to fetch")), "Failed to fetch");
  assert.equal(authErrorMessage(null), "The request failed. Please try again.");
  assert.equal(authErrorMessage(new Error('400: {"message":null}')), '{"message":null}');
});
