import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CONTRACTOR_APPLY_PATH,
  clearContractorDraft,
  draftToApplyForm,
  getContractorResumePath,
  readContractorDraft,
  saveContractorDraft,
} from "./contractor-draft";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    size: () => data.size,
  };
}

const NOW = Date.UTC(2025, 0, 10);
const DAY = 24 * 60 * 60 * 1000;

test("a saved draft is read back with trimmed fields", () => {
  const storage = memoryStorage();
  saveContractorDraft(
    { name: "  Awa Kone ", phone: "+225 07 00", specialization: "Plomberie", hourlyRate: "45" },
    storage,
    NOW,
  );
  assert.deepEqual(readContractorDraft(storage, NOW + DAY), {
    name: "Awa Kone",
    phone: "+225 07 00",
    specialization: "Plomberie",
    hourlyRate: "45",
  });
});

test("fields are cut to the limits the server accepts", () => {
  const storage = memoryStorage();
  saveContractorDraft({ name: "n".repeat(500), phone: "9".repeat(80) }, storage, NOW);
  const draft = readContractorDraft(storage, NOW);
  assert.equal(draft?.name.length, 200);
  assert.equal(draft?.phone.length, 30);
});

test("a draft older than two weeks is discarded and removed", () => {
  const storage = memoryStorage();
  saveContractorDraft({ name: "Awa" }, storage, NOW);
  assert.equal(readContractorDraft(storage, NOW + 15 * DAY), null);
  assert.equal(storage.size(), 0);
});

test("a draft from the future is not trusted", () => {
  const storage = memoryStorage();
  saveContractorDraft({ name: "Awa" }, storage, NOW + 5 * DAY);
  assert.equal(readContractorDraft(storage, NOW), null);
});

test("malformed or foreign data reads as no draft instead of throwing", () => {
  assert.equal(
    readContractorDraft(memoryStorage({ "versoair:contractor-draft": "{not json" })),
    null,
  );
  assert.equal(
    readContractorDraft(memoryStorage({ "versoair:contractor-draft": "null" })),
    null,
  );
  assert.equal(
    readContractorDraft(memoryStorage({ "versoair:contractor-draft": '{"name":"x"}' }), NOW),
    null,
  );
});

test("clearing removes the draft", () => {
  const storage = memoryStorage();
  saveContractorDraft({ name: "Awa" }, storage, NOW);
  clearContractorDraft(storage);
  assert.equal(readContractorDraft(storage, NOW), null);
});

test("without storage nothing throws and there is nothing to resume", () => {
  assert.doesNotThrow(() => saveContractorDraft({ name: "Awa" }, null));
  assert.doesNotThrow(() => clearContractorDraft(null));
  assert.equal(readContractorDraft(null), null);
  assert.equal(getContractorResumePath(null), null);
});

test("storage that refuses writes does not break registration", () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {},
  };
  assert.doesNotThrow(() => saveContractorDraft({ name: "Awa" }, storage, NOW));
});

test("the resume path points at the application form only while a draft exists", () => {
  const storage = memoryStorage();
  assert.equal(getContractorResumePath(storage, NOW), null);
  saveContractorDraft({ name: "Awa" }, storage, NOW);
  assert.equal(getContractorResumePath(storage, NOW), CONTRACTOR_APPLY_PATH);
  assert.equal(CONTRACTOR_APPLY_PATH, "/contracts?apply=contractor");
});

test("a bare hourly amount becomes free text for the application form", () => {
  const base = { name: "Awa", phone: "", specialization: "IT Services" };
  assert.equal(draftToApplyForm({ ...base, hourlyRate: "45" }).hourlyRate, "$45/hr");
  assert.equal(draftToApplyForm({ ...base, hourlyRate: "45.50" }).hourlyRate, "$45.50/hr");
  assert.equal(draftToApplyForm({ ...base, hourlyRate: "50 000 FCFA" }).hourlyRate, "50 000 FCFA");
  assert.equal(draftToApplyForm({ ...base, hourlyRate: "" }).hourlyRate, "");
});

test("no draft gives an empty form", () => {
  assert.deepEqual(draftToApplyForm(null), {
    name: "",
    phone: "",
    specialization: "",
    hourlyRate: "",
  });
});
