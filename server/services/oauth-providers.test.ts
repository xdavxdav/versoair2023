import assert from "node:assert/strict";
import test from "node:test";
import { getEnabledSignInProviders } from "./oauth-providers";

const configuredCredentials = new Set(["google", "microsoft", "linkedin"]);
const hasCredentials = (provider: string) =>
  configuredCredentials.has(provider);

test("configured provider credentials enable providers when no allowlist is set", () => {
  assert.deepEqual(
    getEnabledSignInProviders(undefined, hasCredentials),
    ["google", "microsoft", "linkedin"],
  );
  assert.deepEqual(
    getEnabledSignInProviders("", hasCredentials),
    ["google", "microsoft", "linkedin"],
  );
});

test("an explicit provider allowlist can still restrict sign-in options", () => {
  assert.deepEqual(
    getEnabledSignInProviders(" Microsoft, linkedin ", hasCredentials),
    ["microsoft", "linkedin"],
  );
});

test("providers without both credentials remain disabled", () => {
  assert.deepEqual(
    getEnabledSignInProviders("google,microsoft,linkedin", (provider) =>
      provider === "google",
    ),
    ["google"],
  );
});

test("unknown values cannot enable unsupported providers", () => {
  assert.deepEqual(
    getEnabledSignInProviders("apple,indeed,glassdoor", hasCredentials),
    [],
  );
});
