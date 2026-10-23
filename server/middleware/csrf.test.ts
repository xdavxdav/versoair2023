import assert from "node:assert/strict";
import test from "node:test";
import { csrfProtect } from "./csrf";

test("login OTP verification is exempt from CSRF before authentication", () => {
  let continued = false;
  const req = {
    method: "POST",
    path: "/auth/verify-login-otp",
    headers: {},
    cookies: { csrf_token: "cookie-only" },
  } as any;
  const res = {
    status() {
      throw new Error("Expected OTP verification to continue");
    },
    json() {
      throw new Error("Expected OTP verification to continue");
    },
  } as any;

  csrfProtect(req, res, () => {
    continued = true;
  });

  assert.equal(continued, true);
});

test("other unauthenticated POST routes still require a CSRF token", () => {
  let statusCode: number | undefined;
  let responseBody: unknown;
  const req = {
    method: "POST",
    path: "/auth/account/change-password",
    headers: {},
    cookies: { csrf_token: "cookie-only" },
  } as any;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
    },
  } as any;

  csrfProtect(req, res, () => {
    throw new Error("Expected CSRF validation to reject the request");
  });

  assert.equal(statusCode, 403);
  assert.equal(
    (responseBody as { error: { code: string } }).error.code,
    "CSRF_VALIDATION_FAILED",
  );
});
