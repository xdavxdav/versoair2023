import assert from "node:assert/strict";
import test from "node:test";
import { callEndMessage, formatCallDuration } from "./call-state";

test("every way a call can end has plain wording, and unknown ones do not leak", () => {
  assert.equal(callEndMessage("no_answer"), "No answer");
  assert.equal(callEndMessage("permission"), "Allow the microphone (and camera) to make calls");
  assert.equal(callEndMessage("something_internal"), "The call could not start");
});

test("call time reads as m:ss", () => {
  assert.equal(formatCallDuration(0), "0:00");
  assert.equal(formatCallDuration(65.9), "1:05");
  assert.equal(formatCallDuration(-3), "0:00");
});
