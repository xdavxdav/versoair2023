import assert from "node:assert/strict";
import test from "node:test";
import {
  isArtistCodeLoginInput,
  isStaffArtistCode,
} from "./artist-code-input.ts";

test("recognizes VA_ and VA- artist codes", () => {
  assert.equal(isArtistCodeLoginInput("VA_NK-E_260115_A2V2F5.b"), true);
  assert.equal(isArtistCodeLoginInput(" va-2026-artist "), true);
  assert.equal(isStaffArtistCode("VA_NK-E_260115_A2V2F5.b"), false);
});

test("recognizes staff codes without treating usernames as code logins", () => {
  assert.equal(isStaffArtistCode("ABC-123-XYZ"), true);
  assert.equal(isArtistCodeLoginInput("abc-123-xyz"), true);
  assert.equal(isStaffArtistCode("AB-123-XYZ"), false);
  assert.equal(isArtistCodeLoginInput("admin_user"), false);
  assert.equal(isArtistCodeLoginInput("artist@example.com"), false);
});
