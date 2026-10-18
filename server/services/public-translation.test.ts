import assert from "node:assert/strict";
import { test } from "node:test";
import { PUBLIC_COPY, getPublicCopyId, nativeDictionary } from "../../shared/public-translations";
import { PublicTranslationService, TranslationError, type TranslationStore } from "./public-translation";

class MemoryTestStore implements TranslationStore {
  values = new Map<string, string>();
  locks = new Map<string, string>();
  used = 0;
  async get(key: string) { return this.values.get(key) ?? null; }
  async put(key: string, value: string) { this.values.set(key, value); }
  async lock(key: string, token: string) {
    if (this.locks.has(key)) return false;
    this.locks.set(key, token);
    return true;
  }
  async unlock(key: string, token: string) {
    if (this.locks.get(key) === token) this.locks.delete(key);
  }
  async reserve(_key: string, characters: number, limit: number) {
    if (this.used + characters > limit) return false;
    this.used += characters;
    return true;
  }
}

const characterCount = PUBLIC_COPY.reduce((sum, pair) => sum + Array.from(pair[1]).length, 0);
const spanish = (source: string) => `ES ${source}`;

function provider() {
  const calls: { url: string; body: { q: string[]; source: string; target: string; format: string } }[] = [];
  const request: typeof fetch = async (input, init) => {
    assert.equal(new Headers(init?.headers).get("X-Goog-Api-Key"), "test-only-key");
    assert.equal(init?.method, "POST");
    assert.ok(init?.signal);
    const body = JSON.parse(String(init?.body));
    calls.push({ url: String(input), body });
    return Response.json({ data: { translations: body.q.map((text: string) => ({ translatedText: spanish(text) })) } });
  };
  return { calls, request };
}

test("native FR/EN never contacts Google or reserves a character budget", async () => {
  const store = new MemoryTestStore();
  const remote = provider();
  const service = new PublicTranslationService(store, "test-only-key", characterCount, remote.request);
  assert.deepEqual(await service.translate("fr"), nativeDictionary("fr"));
  assert.deepEqual(await service.translate("en"), nativeDictionary("en"));
  assert.equal(remote.calls.length, 0);
  assert.equal(store.used, 0);
});

test("only fixed public French copy is submitted, in provider-sized batches", async () => {
  const store = new MemoryTestStore();
  const remote = provider();
  const result = await new PublicTranslationService(store, "test-only-key", characterCount, remote.request).translate("es");
  assert.deepEqual(remote.calls.flatMap(call => call.body.q), PUBLIC_COPY.map(pair => pair[1]));
  assert.ok(remote.calls.every(call => call.body.q.length <= 128 && call.body.format === "text" &&
    call.body.source === "fr" && call.body.target === "es" &&
    call.url === "https://translation.googleapis.com/language/translate/v2"));
  assert.equal(Object.keys(result).length, PUBLIC_COPY.length);
  assert.equal(store.used, characterCount);
});

test("persistent cache is reused by a fresh service without another charge", async () => {
  const store = new MemoryTestStore();
  const remote = provider();
  const first = new PublicTranslationService(store, "test-only-key", characterCount, remote.request);
  const result = await first.translate("es");
  const calls = remote.calls.length;
  const restarted = new PublicTranslationService(store, "test-only-key", characterCount, remote.request);
  assert.deepEqual(await restarted.translate("es"), result);
  assert.equal(remote.calls.length, calls);
  assert.equal(store.used, characterCount);
});

test("concurrent visitors share one translation and reservation", async () => {
  const store = new MemoryTestStore();
  const remote = provider();
  const service = new PublicTranslationService(store, "test-only-key", characterCount, remote.request);
  const results = await Promise.all([service.translate("es"), service.translate("es"), service.translate("es")]);
  assert.deepEqual(results[0], results[2]);
  assert.equal(store.used, characterCount);
  assert.equal(remote.calls.length, Math.ceil(PUBLIC_COPY.length / 128));
});

test("monthly cap accepts the exact threshold and rejects another uncached language", async () => {
  const store = new MemoryTestStore();
  const remote = provider();
  const service = new PublicTranslationService(store, "test-only-key", characterCount, remote.request);
  await service.translate("es");
  const calls = remote.calls.length;
  await assert.rejects(service.translate("de"), { code: "TRANSLATION_BUDGET_EXCEEDED" });
  assert.equal(remote.calls.length, calls);
  assert.equal(store.used, characterCount);
});

test("insufficient budget does not contact Google and releases the lease", async () => {
  const store = new MemoryTestStore();
  const remote = provider();
  const service = new PublicTranslationService(store, "test-only-key", characterCount - 1, remote.request);
  await assert.rejects(service.translate("es"), { code: "TRANSLATION_BUDGET_EXCEEDED" });
  assert.equal(remote.calls.length, 0);
  assert.equal(store.locks.size, 0);
});

test("provider failure is explicit, uncached, and its reservation is retained", async () => {
  const store = new MemoryTestStore();
  const request: typeof fetch = async () => new Response("Unavailable", { status: 503 });
  const service = new PublicTranslationService(store, "test-only-key", characterCount * 2, request);
  await assert.rejects(service.translate("es"), { code: "TRANSLATION_PROVIDER_UNAVAILABLE" });
  assert.equal(store.values.size, 0);
  assert.equal(store.used, characterCount);
  assert.equal(store.locks.size, 0);
});

test("partial or empty provider results never become a successful dictionary", async () => {
  for (const translations of [[], [{ translatedText: "" }]]) {
    const store = new MemoryTestStore();
    const request: typeof fetch = async () => Response.json({ data: { translations } });
    const service = new PublicTranslationService(store, "test-only-key", characterCount, request);
    await assert.rejects(service.translate("es"), { code: "TRANSLATION_INVALID_RESPONSE" });
    assert.equal(store.values.size, 0);
  }
});

test("another instance's lease prevents duplicate billed work", async () => {
  const store = new MemoryTestStore();
  store.lock = async () => false;
  const remote = provider();
  const service = new PublicTranslationService(store, "test-only-key", characterCount, remote.request);
  await assert.rejects(service.translate("es"), { code: "TRANSLATION_BUSY" });
  assert.equal(store.used, 0);
  assert.equal(remote.calls.length, 0);
});

test("unsupported languages fail before any lookup or provider call", async () => {
  const store = new MemoryTestStore();
  const remote = provider();
  const service = new PublicTranslationService(store, "test-only-key", characterCount, remote.request);
  await assert.rejects(service.translate("../private"), (error: unknown) =>
    error instanceof TranslationError && error.status === 400);
  assert.equal(remote.calls.length, 0);
});

test("critical reference prices and Enterprise custom retain bilingual semantics", () => {
  const en = nativeDictionary("en");
  const fr = nativeDictionary("fr");
  const id = getPublicCopyId("Sur devis");
  assert.notEqual(id, undefined);
  assert.equal(en[id!], "Custom quote");
  assert.equal(fr[id!], "Sur devis");
  const disclaimer = PUBLIC_COPY.find(pair => pair[0].startsWith("no payment is taken"));
  assert.ok(disclaimer?.[1].includes("aucun paiement"));
  assert.ok(disclaimer?.[1].includes("aucune offre n'est activée"));
});
