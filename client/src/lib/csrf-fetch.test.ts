import assert from "node:assert/strict";
import test from "node:test";
import { createCsrfFetch, installCsrfFetch } from "./csrf-fetch";

const ORIGIN = "https://app.example";

interface Call {
  input: RequestInfo | URL;
  init?: RequestInit;
}

function harness(
  options: { token?: string | null; loaded?: string | null; loadFails?: boolean } = {},
) {
  const calls: Call[] = [];
  let token = options.token ?? null;
  let loads = 0;
  const nativeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response("{}", { status: 200 });
  };
  const csrfFetch = createCsrfFetch(nativeFetch, {
    origin: ORIGIN,
    readToken: () => token,
    loadToken: async () => {
      loads += 1;
      await Promise.resolve();
      if (options.loadFails) throw new Error("offline");
      token = options.loaded ?? null;
      return token;
    },
  });
  return { csrfFetch, calls, loads: () => loads };
}

function sentToken(call: Call): string | null {
  return new Headers(call.init?.headers).get("x-csrf-token");
}

test("adds the token to a same-origin mutation and keeps the rest of the request", async () => {
  const { csrfFetch, calls } = harness({ token: "tok-1" });
  const controller = new AbortController();

  await csrfFetch("/api/properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"name":"Villa"}',
    credentials: "include",
    signal: controller.signal,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, "/api/properties");
  assert.equal(sentToken(calls[0]), "tok-1");
  assert.equal(
    new Headers(calls[0].init?.headers).get("content-type"),
    "application/json",
  );
  assert.equal(calls[0].init?.body, '{"name":"Villa"}');
  assert.equal(calls[0].init?.credentials, "include");
  assert.equal(calls[0].init?.signal, controller.signal);
});

test("covers every mutating method regardless of casing", async () => {
  const { csrfFetch, calls } = harness({ token: "tok-1" });
  for (const method of ["POST", "put", "Patch", "DELETE"]) {
    await csrfFetch("/api/x", { method });
  }
  assert.deepEqual(calls.map(sentToken), ["tok-1", "tok-1", "tok-1", "tok-1"]);
});

test("leaves reads untouched", async () => {
  const { csrfFetch, calls, loads } = harness({ token: null, loaded: "tok-2" });
  const init = { method: "GET" };
  await csrfFetch("/api/properties", init);
  await csrfFetch("/api/properties");
  await csrfFetch("/api/properties", { method: "HEAD" });

  assert.equal(calls[0].init, init);
  assert.equal(calls[1].init, undefined);
  assert.equal(sentToken(calls[2]), null);
  assert.equal(loads(), 0);
});

test("never sends the token to another origin", async () => {
  const { csrfFetch, calls, loads } = harness({ token: "tok-1" });
  await csrfFetch("https://api.other.example/x", { method: "POST" });
  await csrfFetch("//evil.example/x", { method: "POST" });
  await csrfFetch(new URL("https://evil.example/x"), { method: "POST" });
  await csrfFetch(
    new Request("https://evil.example/x", { method: "POST", body: "a" }),
  );
  await csrfFetch("http://app.example/x", { method: "POST" });

  assert.deepEqual(calls.map(sentToken), [null, null, null, null, null]);
  assert.equal(loads(), 0);
});

test("accepts absolute same-origin URLs and URL objects", async () => {
  const { csrfFetch, calls } = harness({ token: "tok-1" });
  await csrfFetch(`${ORIGIN}/api/x`, { method: "POST" });
  await csrfFetch(new URL(`${ORIGIN}/api/y`), { method: "POST" });
  assert.deepEqual(calls.map(sentToken), ["tok-1", "tok-1"]);
});

test("keeps a token the caller already set", async () => {
  const { csrfFetch, calls } = harness({ token: "tok-1" });
  const plain = { method: "POST", headers: { "X-CSRF-Token": "caller" } };
  const instance = { method: "POST", headers: new Headers({ "x-csrf-token": "caller" }) };
  const pairs = { method: "POST", headers: [["x-csrf-token", "caller"]] as [string, string][] };

  await csrfFetch("/a", plain);
  await csrfFetch("/b", instance);
  await csrfFetch("/c", pairs);

  assert.equal(calls[0].init, plain);
  assert.equal(calls[1].init, instance);
  assert.equal(calls[2].init, pairs);
});

test("handles a Request input and keeps its own headers", async () => {
  const { csrfFetch, calls } = harness({ token: "tok-1" });
  const request = new Request(`${ORIGIN}/api/x`, {
    method: "POST",
    body: "hello",
    headers: { "x-trace": "abc" },
  });

  await csrfFetch(request);

  assert.equal(calls[0].input, request);
  assert.equal(sentToken(calls[0]), "tok-1");
  assert.equal(new Headers(calls[0].init?.headers).get("x-trace"), "abc");
});

test("loads the token once for concurrent requests when none is cached", async () => {
  const { csrfFetch, calls, loads } = harness({ token: null, loaded: "tok-3" });

  await Promise.all([
    csrfFetch("/api/a", { method: "POST" }),
    csrfFetch("/api/b", { method: "PUT" }),
    csrfFetch("/api/c", { method: "DELETE" }),
  ]);

  assert.equal(loads(), 1);
  assert.deepEqual(calls.map(sentToken), ["tok-3", "tok-3", "tok-3"]);
});

test("sends the request unchanged when no token can be obtained", async () => {
  const empty = harness({ token: null, loaded: null });
  const init = { method: "POST", body: "{}" };
  await empty.csrfFetch("/api/a", init);
  assert.equal(empty.calls[0].init, init);

  const failing = harness({ token: null, loadFails: true });
  await failing.csrfFetch("/api/a", init);
  assert.equal(failing.calls[0].init, init);
});

test("installing outside a browser does nothing", () => {
  assert.doesNotThrow(() => installCsrfFetch());
});
