import assert from "node:assert/strict";
import test from "node:test";
import {
  classifySubscriberLogin,
  staffSessionLacksAccessCode,
} from "./geoadmin-gate-flow";

test("an OTP challenge means a staff account and is never sent to the general login", () => {
  assert.deepEqual(
    classifySubscriberLogin({
      success: true,
      requiresOtp: true,
      otpToken: "t",
      otpMethod: "email",
    }),
    { kind: "staff-needs-code", hasServerSession: false },
  );
  assert.deepEqual(
    classifySubscriberLogin({ success: true, requiresOtp: true, otpMethod: "authenticator" }),
    { kind: "staff-needs-code", hasServerSession: false },
  );
});

test("a staff login without OTP (TSR) is flagged and reports the session the server already set", () => {
  for (const role of ["admin", "moderator", "superuser", "tsr"]) {
    assert.deepEqual(
      classifySubscriberLogin({ success: true, token: "jwt", user: { role } }),
      { kind: "staff-needs-code", hasServerSession: true },
      role,
    );
  }
  assert.deepEqual(
    classifySubscriberLogin({ success: true, token: "jwt", user: { role: "user", isAdmin: true } }),
    { kind: "staff-needs-code", hasServerSession: true },
  );
});

test("subscribers sign in normally", () => {
  assert.deepEqual(
    classifySubscriberLogin({ success: true, token: "jwt", user: { role: "user" } }),
    { kind: "signed-in", token: "jwt" },
  );
  assert.deepEqual(classifySubscriberLogin({ success: true, token: "jwt" }), {
    kind: "signed-in",
    token: "jwt",
  });
});

test("failures keep the server message, or report none so the caller can fall back", () => {
  assert.deepEqual(classifySubscriberLogin({ success: false, message: "Invalid credentials" }), {
    kind: "error",
    message: "Invalid credentials",
  });
  assert.deepEqual(classifySubscriberLogin(null), { kind: "error", message: null });
  assert.deepEqual(classifySubscriberLogin({ success: true }), { kind: "error", message: null });
  assert.deepEqual(classifySubscriberLogin({ success: false, message: 42 }), {
    kind: "error",
    message: null,
  });
});

test("a stale local marker is overruled only when the server says the access code was not used", () => {
  assert.equal(staffSessionLacksAccessCode(true, false), true);
  assert.equal(staffSessionLacksAccessCode(true, true), false);
  // No server answer yet, or an older server: keep relying on the marker.
  assert.equal(staffSessionLacksAccessCode(true, undefined), false);
  // Subscribers never have the access-code claim and are not gated by it.
  assert.equal(staffSessionLacksAccessCode(false, false), false);
  assert.equal(staffSessionLacksAccessCode(false, undefined), false);
});
