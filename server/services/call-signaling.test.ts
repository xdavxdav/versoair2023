import assert from "node:assert/strict";
import test from "node:test";
import { CallRegistry, cleanSignal } from "./call-signaling";
import { getCallConfig } from "./turn-credentials";

const started = (registry = new CallRegistry()) => {
  const invite = registry.invite(1, 2, 10, true);
  assert.ok(invite.ok);
  return { registry, call: invite.call };
};

test("only the two people on a call can reach each other", () => {
  const { registry, call } = started();
  assert.equal(registry.peerOf(call.id, 1), 2);
  assert.equal(registry.peerOf(call.id, 2), 1);
  assert.equal(registry.peerOf(call.id, 3), null);
  assert.equal(registry.peerOf("nope", 1), null);
  assert.equal(registry.peerOf({ toString: () => call.id }, 1), null);
});

test("only the person being called can pick up, once", () => {
  const { registry, call } = started();
  assert.equal(registry.accept(call.id, 1), null);
  assert.equal(registry.accept(call.id, 3), null);
  assert.equal(registry.accept(call.id, 2)?.state, "active");
  assert.equal(registry.accept(call.id, 2), null);
});

test("someone on a call cannot be rung, and nobody can ring themselves", () => {
  const { registry } = started();
  assert.deepEqual(registry.invite(3, 2, 11, false), { ok: false, reason: "busy" });
  assert.deepEqual(registry.invite(1, 4, 12, false), { ok: false, reason: "busy" });
  assert.deepEqual(registry.invite(5, 5, 13, false), { ok: false, reason: "self" });
});

test("a call ends for either person, and a stranger cannot end it", () => {
  const { registry, call } = started();
  assert.equal(registry.end(call.id, 3), null);
  assert.equal(registry.end(call.id, 2)?.id, call.id);
  assert.equal(registry.peerOf(call.id, 1), null);
  assert.ok(registry.invite(1, 2, 10, false).ok);
});

test("an unanswered call expires, an answered one does not", () => {
  const { registry, call } = started();
  assert.equal(registry.expire(call.id)?.id, call.id);
  const second = started();
  second.registry.accept(second.call.id, 2);
  assert.equal(second.registry.expire(second.call.id), null);
  assert.equal(second.registry.dropUser(2)?.id, second.call.id);
  assert.equal(second.registry.dropUser(2), null);
});

test("signalling carries a description or candidate and nothing else", () => {
  assert.deepEqual(cleanSignal({ description: { type: "offer" }, evil: 1 }), {
    description: { type: "offer" },
  });
  assert.deepEqual(cleanSignal({ candidate: { candidate: "x" } }), {
    candidate: { candidate: "x" },
  });
  assert.equal(cleanSignal({}), null);
  assert.equal(cleanSignal("x"), null);
  assert.equal(cleanSignal({ description: "x".repeat(21_000) }), null);
});

test("calls stay off until switched on, and the TURN key never leaves the server", async () => {
  assert.deepEqual(await getCallConfig({}), { enabled: false, relay: false, iceServers: [] });

  const stun = await getCallConfig({ CALLS_ENABLED: "true" });
  assert.equal(stun.enabled, true);
  assert.equal(stun.relay, false);

  let sent: { url: string; auth: string } | undefined;
  const config = await getCallConfig(
    { CALLS_ENABLED: "true", CLOUDFLARE_TURN_KEY_ID: "key1", CLOUDFLARE_TURN_API_TOKEN: "tok" },
    (async (url: string, init: RequestInit) => {
      sent = { url, auth: String((init.headers as Record<string, string>).Authorization) };
      return new Response(
        JSON.stringify({
          iceServers: [
            { urls: ["turn:a:3478", "turn:a:53?transport=udp"], username: "u", credential: "c" },
          ],
        }),
        { status: 201 },
      );
    }) as unknown as typeof fetch,
  );
  assert.equal(sent?.url.includes("/turn/keys/key1/credentials/generate-ice-servers"), true);
  assert.equal(sent?.auth, "Bearer tok");
  assert.equal(config.relay, true);
  assert.deepEqual(config.iceServers[0].urls, ["turn:a:3478"]);
  assert.equal(JSON.stringify(config).includes("tok"), false);

  const failed = await getCallConfig(
    { CALLS_ENABLED: "true", CLOUDFLARE_TURN_KEY_ID: "k", CLOUDFLARE_TURN_API_TOKEN: "t" },
    (async () => new Response("no", { status: 500 })) as unknown as typeof fetch,
  );
  assert.equal(failed.relay, false);
  assert.ok(failed.iceServers.length > 0);
});
