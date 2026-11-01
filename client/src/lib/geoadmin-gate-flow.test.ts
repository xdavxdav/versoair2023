import assert from "node:assert/strict";
import test from "node:test";
import {
  classifySubscriberLogin,
  getSignedOutGuardPath,
  getStaffReturnPath,
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

test("signed-out visitors on staff-only pages go to the GeoAdmin gate, everyone else to the general sign-in", () => {
  const back = "/admin/tickets?status=open";
  const encoded = encodeURIComponent(back);

  assert.equal(
    getSignedOutGuardPath(back, { roles: ["admin", "moderator", "tsr"] }),
    `/geo-admin?redirect=${encoded}`,
  );
  assert.equal(
    getSignedOutGuardPath("/admin/credentials", { ownerOnly: true }),
    `/geo-admin?redirect=${encodeURIComponent("/admin/credentials")}`,
  );
  // A guard that lets a non-staff role in is not a staff page.
  assert.equal(
    getSignedOutGuardPath("/vault", {
      roles: ["admin", "superuser", "moderator", "business_owner"],
    }),
    `/auth/signin?redirect=${encodeURIComponent("/vault")}`,
  );
  assert.equal(
    getSignedOutGuardPath("/dashboard", {}),
    `/auth/signin?redirect=${encodeURIComponent("/dashboard")}`,
  );
  assert.equal(
    getSignedOutGuardPath("/dashboard", { roles: [] }),
    `/auth/signin?redirect=${encodeURIComponent("/dashboard")}`,
  );
});

test("the gate returns only to same-site staff pages", () => {
  assert.equal(
    getStaffReturnPath(`?redirect=${encodeURIComponent("/admin/tickets?status=open")}`),
    "/admin/tickets?status=open",
  );
  assert.equal(
    getStaffReturnPath("?redirect=%2Fgeo-admin%2Fworkspace"),
    "/geo-admin/workspace",
  );
  assert.equal(getStaffReturnPath("?redirect=%2Fadmin"), "/admin");

  for (const unsafe of [
    "",
    "?other=1",
    "?redirect=%2Fgeo-admin", // the gate itself: would loop
    "?redirect=%2Fdashboard", // not a staff area
    "?redirect=%2Fadministrator", // prefix lookalike
    "?redirect=%2F%2Fevil.example%2Fadmin",
    "?redirect=https%3A%2F%2Fevil.example%2Fadmin%2Fx",
    "?redirect=%2Fadmin%5Cx",
    "?redirect=%2Fadmin%0D%0Ax",
  ]) {
    assert.equal(getStaffReturnPath(unsafe), null, unsafe);
  }
});
