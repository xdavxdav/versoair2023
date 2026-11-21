import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  fetchAuthSession,
  invalidateAuthSessionCache,
} from "./session-fetch";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  invalidateAuthSessionCache();
});

test("fetchAuthSession coalesces concurrent requests into one network call", async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  globalThis.fetch = (async () => {
    calls += 1;
    await gate;
    return new Response(
      JSON.stringify({ success: true, authenticated: false, user: null }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const pending = Promise.all([
    fetchAuthSession(),
    fetchAuthSession(),
    fetchAuthSession(),
    fetchAuthSession(),
  ]);
  release();
  const results = await pending;

  assert.equal(calls, 1);
  for (const res of results) {
    assert.equal(res.ok, true);
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, {
      success: true,
      authenticated: false,
      user: null,
    });
  }
});

test("fetchAuthSession bypasses cache on force or invalidate", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(
      JSON.stringify({
        success: true,
        authenticated: calls > 1,
        user: calls > 1 ? { id: 7 } : null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const first = await fetchAuthSession();
  const cached = await fetchAuthSession();
  assert.equal(calls, 1);
  assert.equal(first.data?.authenticated, false);
  assert.equal(cached.data?.authenticated, false);

  const forced = await fetchAuthSession({ force: true });
  assert.equal(calls, 2);
  assert.equal(forced.data?.authenticated, true);

  invalidateAuthSessionCache();
  await fetchAuthSession();
  assert.equal(calls, 3);
});

test("aborting one caller does not cancel peer callers sharing the request", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  globalThis.fetch = (async () => {
    await gate;
    return new Response(
      JSON.stringify({ success: true, authenticated: false, user: null }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const controller = new AbortController();
  const abortedCall = fetchAuthSession({ signal: controller.signal });
  const healthyCall = fetchAuthSession();

  controller.abort();
  await assert.rejects(abortedCall);

  release();
  const res = await healthyCall;
  assert.equal(res.status, 200);
  assert.equal(res.data?.authenticated, false);
});
