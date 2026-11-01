import assert from "node:assert/strict";
import test from "node:test";
import { CONTRACTOR_APPLY_PATH, saveContractorDraft } from "./contractor-draft";
import {
  BUSINESS_REQUEST_PATH,
  clearBusinessIntent,
  getBusinessResumePath,
  getSignupResumePath,
  saveBusinessIntent,
} from "./signup-resume";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const DAY = 24 * 60 * 60 * 1000;

test("nothing is waiting on a fresh device", () => {
  const storage = memoryStorage();
  assert.equal(getBusinessResumePath(storage), null);
  assert.equal(getSignupResumePath(storage), null);
});

test("a saved business sign-up resumes on the request form", () => {
  const storage = memoryStorage();
  saveBusinessIntent(storage, 1_000);

  assert.equal(getBusinessResumePath(storage, 2_000), BUSINESS_REQUEST_PATH);
  assert.equal(getSignupResumePath(storage, 2_000), BUSINESS_REQUEST_PATH);
});

test("only a timestamp is stored, never personal details", () => {
  const storage = memoryStorage();
  saveBusinessIntent(storage, 1_000);

  const stored = [...storage.data.values()].join("");
  assert.deepEqual(JSON.parse(stored), { savedAt: 1_000 });
});

test("the intent expires after 14 days and is cleaned up", () => {
  const storage = memoryStorage();
  const savedAt = 1_700_000_000_000;
  saveBusinessIntent(storage, savedAt);

  assert.equal(
    getBusinessResumePath(storage, savedAt + 13 * DAY),
    BUSINESS_REQUEST_PATH,
  );
  assert.equal(getBusinessResumePath(storage, savedAt + 15 * DAY), null);
  assert.equal(storage.data.size, 0);
});

test("a timestamp from the future or a broken value is ignored", () => {
  const future = memoryStorage();
  saveBusinessIntent(future, 10 * DAY);
  assert.equal(getBusinessResumePath(future, 0), null);

  const broken = memoryStorage({ "versoair:business-intent": "{not json" });
  assert.equal(getBusinessResumePath(broken), null);

  const wrongShape = memoryStorage({ "versoair:business-intent": '"yes"' });
  assert.equal(getBusinessResumePath(wrongShape), null);
});

test("clearing the intent stops the redirect", () => {
  const storage = memoryStorage();
  saveBusinessIntent(storage, 1_000);
  clearBusinessIntent(storage);

  assert.equal(getBusinessResumePath(storage, 2_000), null);
});

test("an unfinished contractor application wins over a business request", () => {
  const storage = memoryStorage();
  saveBusinessIntent(storage, 1_000);
  saveContractorDraft({ name: "Awa" }, storage, 1_000);

  assert.equal(getSignupResumePath(storage, 2_000), CONTRACTOR_APPLY_PATH);

  storage.removeItem("versoair:contractor-draft");
  assert.equal(getSignupResumePath(storage, 2_000), BUSINESS_REQUEST_PATH);
});

test("blocked or missing storage never throws", () => {
  const blocked = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };

  assert.doesNotThrow(() => saveBusinessIntent(blocked, 1));
  assert.doesNotThrow(() => clearBusinessIntent(blocked));
  assert.equal(getSignupResumePath(blocked), null);
  assert.equal(getSignupResumePath(null), null);
});
