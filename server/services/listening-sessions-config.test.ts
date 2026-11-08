import assert from "node:assert/strict";
import test from "node:test";
import { isListeningSessionsEnabled } from "./listening-sessions-config";

test("listening sessions are on by default", () => {
  assert.equal(isListeningSessionsEnabled({}), true);
  assert.equal(isListeningSessionsEnabled({ LISTENING_SESSIONS_ENABLED: "" }), true);
  assert.equal(isListeningSessionsEnabled({ LISTENING_SESSIONS_ENABLED: "true" }), true);
  assert.equal(isListeningSessionsEnabled({ LISTENING_SESSIONS_ENABLED: "1" }), true);
});

test("the kill switch turns them off however the operator types it", () => {
  for (const value of ["false", "False", "FALSE", " false ", "0", "off", "No", "disabled"]) {
    assert.equal(
      isListeningSessionsEnabled({ LISTENING_SESSIONS_ENABLED: value }),
      false,
      JSON.stringify(value),
    );
  }
});

test("an unrelated value never switches the feature off", () => {
  assert.equal(isListeningSessionsEnabled({ LISTENING_SESSIONS_ENABLED: "maybe" }), true);
});
