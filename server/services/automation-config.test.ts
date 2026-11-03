import assert from "node:assert/strict";
import test from "node:test";
import {
  getAutomationCallbackTokens,
  getZapierWebhookUrl,
  isAutomationOutboxEnabled,
  isValidCallbackToken,
} from "./automation-config";

const TOKEN_A = "a".repeat(32);
const TOKEN_B = "b".repeat(40);

test("the outbox is enabled only by the exact string true", () => {
  assert.equal(isAutomationOutboxEnabled({ AUTOMATION_OUTBOX_ENABLED: "true" }), true);
  for (const value of ["TRUE", "True", "1", "yes", "on", " true", "true ", "", undefined]) {
    assert.equal(
      isAutomationOutboxEnabled({ AUTOMATION_OUTBOX_ENABLED: value }),
      false,
      `value ${JSON.stringify(value)} must not enable the outbox`,
    );
  }
  assert.equal(isAutomationOutboxEnabled({}), false);
});

test("callback tokens: trims, ignores weak values, keeps order", () => {
  assert.deepEqual(getAutomationCallbackTokens({}), []);
  assert.deepEqual(
    getAutomationCallbackTokens({ AUTOMATION_CALLBACK_TOKEN: `  ${TOKEN_A}\n` }),
    [TOKEN_A],
  );
  assert.deepEqual(
    getAutomationCallbackTokens({
      AUTOMATION_CALLBACK_TOKEN: TOKEN_A,
      AUTOMATION_CALLBACK_TOKEN_PREVIOUS: TOKEN_B,
    }),
    [TOKEN_A, TOKEN_B],
  );
  assert.deepEqual(
    getAutomationCallbackTokens({
      AUTOMATION_CALLBACK_TOKEN: "short",
      AUTOMATION_CALLBACK_TOKEN_PREVIOUS: TOKEN_B,
    }),
    [TOKEN_B],
    "a token under 32 characters is ignored but does not disable the other one",
  );
  assert.deepEqual(
    getAutomationCallbackTokens({ AUTOMATION_CALLBACK_TOKEN: "x".repeat(31) }),
    [],
  );
  assert.deepEqual(
    getAutomationCallbackTokens({ AUTOMATION_CALLBACK_TOKEN: "   " }),
    [],
  );
});

test("isValidCallbackToken accepts any configured token and nothing else", () => {
  const tokens = [TOKEN_A, TOKEN_B];
  assert.equal(isValidCallbackToken(TOKEN_A, tokens), true);
  assert.equal(isValidCallbackToken(TOKEN_B, tokens), true, "the previous token stays valid");
  assert.equal(isValidCallbackToken(`${TOKEN_A}x`, tokens), false);
  assert.equal(isValidCallbackToken(TOKEN_A.slice(0, -1), tokens), false);
  assert.equal(isValidCallbackToken("", tokens), false);
  assert.equal(isValidCallbackToken(TOKEN_A, []), false);
  assert.equal(isValidCallbackToken("", []), false);
});

test("webhook url must be a well-formed https url", () => {
  assert.equal(
    getZapierWebhookUrl({ ZAPIER_WEBHOOK_URL: " https://hooks.zapier.com/hooks/catch/1/abc/ " }),
    "https://hooks.zapier.com/hooks/catch/1/abc/",
  );
  for (const value of [
    undefined,
    "",
    "   ",
    "http://hooks.zapier.com/hooks/catch/1/abc/",
    "ftp://hooks.zapier.com/x",
    "not a url",
    "hooks.zapier.com/hooks/catch/1/abc/",
  ]) {
    assert.equal(
      getZapierWebhookUrl({ ZAPIER_WEBHOOK_URL: value }),
      null,
      `value ${JSON.stringify(value)} must be rejected`,
    );
  }
});
