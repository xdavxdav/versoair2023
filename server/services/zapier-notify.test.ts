import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import type { EnqueueInput } from "./automation-outbox";
import {
  createZapierNotifier,
  notifyZapier,
  type ZapierNotifierDeps,
} from "./zapier-notify";

const URL_OK = "https://hooks.zapier.com/hooks/catch/123456/abcdef/";
const NOW = new Date("2026-11-03T15:00:00.000Z");
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

function setup(overrides: Partial<ZapierNotifierDeps> = {}) {
  const posts: Array<{ url: string; body: Record<string, unknown>; raw: string }> = [];
  const enqueued: EnqueueInput[] = [];
  const warnings: unknown[][] = [];
  let wakes = 0;
  const deps: ZapierNotifierDeps = {
    legacyUrl: () => URL_OK,
    outboxEnabled: () => false,
    outboxUrl: () => URL_OK,
    post: async (url, body) => {
      posts.push({ url, body, raw: JSON.stringify(body) });
    },
    enqueue: async (input) => {
      enqueued.push(input);
      return true;
    },
    wake: () => {
      wakes += 1;
    },
    now: () => NOW,
    warn: (...args) => warnings.push(args),
    ...overrides,
  };
  return { notify: createZapierNotifier(deps), posts, enqueued, warnings, wakes: () => wakes };
}

const contact = { name: "Awa", email: "awa@example.com", phone: "+1 514 555 0100", subject: "Hello", message: "Hi" };

describe("notifyZapier with the outbox disabled (legacy path)", () => {
  it("posts exactly the legacy body, key order included", async () => {
    const { notify, posts, enqueued, wakes } = setup();
    notify("contact", contact);
    await settle();

    assert.equal(posts.length, 1);
    assert.equal(posts[0].url, URL_OK);
    assert.equal(
      posts[0].raw,
      '{"category":"contact","name":"Awa","email":"awa@example.com","phone":"+1 514 555 0100","subject":"Hello","message":"Hi","sentAt":"2026-11-03T15:00:00.000Z"}',
    );
    assert.equal("automation" in posts[0].body, false);
    assert.equal(enqueued.length, 0);
    assert.equal(wakes(), 0);
  });

  it("is a no-op until a webhook URL is configured", async () => {
    for (const url of [undefined, ""]) {
      const { notify, posts, enqueued } = setup({ legacyUrl: () => url });
      notify("contact", contact);
      await settle();
      assert.equal(posts.length + enqueued.length, 0);
    }
  });

  it("keeps the event category and send time when the payload has keys with the same names", async () => {
    const { notify, posts } = setup();
    notify("contact", { ...contact, category: "Restaurant", sentAt: "1999-01-01T00:00:00.000Z" });
    await settle();

    assert.equal(posts.length, 1);
    assert.equal(
      posts[0].raw,
      '{"category":"contact","name":"Awa","email":"awa@example.com","phone":"+1 514 555 0100","subject":"Hello","message":"Hi","sentAt":"2026-11-03T15:00:00.000Z"}',
    );
  });

  it("logs failures with the legacy message and never throws", async () => {
    const rejected = setup({ post: async () => Promise.reject(new Error("network down")) });
    assert.doesNotThrow(() => rejected.notify("ticket", { ticketId: 1 }));
    await settle();
    assert.deepEqual(rejected.warnings, [['[ZAPIER] Notify failed for "ticket":', "network down"]]);

    const thrown = setup({
      post: () => {
        throw new Error("bad body");
      },
    });
    assert.doesNotThrow(() => thrown.notify("ticket", { ticketId: 1 }));
    assert.deepEqual(thrown.warnings, [['[ZAPIER] Notify failed for "ticket":', "bad body"]]);
  });
});

describe("notifyZapier with the outbox enabled", () => {
  const enabled = { outboxEnabled: () => true };

  it("queues the enriched body instead of posting, then wakes the dispatcher", async () => {
    const { notify, posts, enqueued, wakes } = setup(enabled);
    notify("contact", contact);
    await settle();

    assert.equal(posts.length, 0);
    assert.equal(enqueued.length, 1);
    const { category, envelope, body } = enqueued[0];
    assert.equal(category, "contact");
    assert.equal(envelope.topic, "support");
    assert.equal(envelope.occurredAt, NOW.toISOString());
    assert.match(envelope.eventId, /^[0-9a-f-]{36}$/);

    assert.deepEqual(Object.keys(body), [
      "category", "name", "email", "phone", "subject", "message", "sentAt", "automation",
    ]);
    assert.equal(body.name, "Awa");
    assert.equal((body.automation as { eventId: string }).eventId, envelope.eventId);
    assert.equal(wakes(), 1);
  });

  it("does not wake for an event id that was already queued", async () => {
    const { notify, wakes } = setup({ ...enabled, enqueue: async () => false });
    notify("contact", contact);
    await settle();
    assert.equal(wakes(), 0);
  });

  it("keeps the event category in the queued body when the payload has a key named category", async () => {
    const { notify, enqueued } = setup(enabled);
    notify("contact", { ...contact, category: "Restaurant" });
    await settle();

    assert.equal(enqueued.length, 1);
    assert.equal(enqueued[0].body.category, "contact");
    assert.deepEqual(Object.keys(enqueued[0].body), [
      "category", "name", "email", "phone", "subject", "message", "sentAt", "automation",
    ]);
  });

  it("queues nothing and posts nothing without a valid webhook URL", async () => {
    const { notify, posts, enqueued } = setup({ ...enabled, outboxUrl: () => null });
    notify("contact", contact);
    await settle();
    assert.equal(posts.length + enqueued.length, 0);
  });

  it("falls back to a direct post of the same body when the outbox is unavailable", async () => {
    let attempted: EnqueueInput | undefined;
    const { notify, posts, warnings, wakes } = setup({
      ...enabled,
      enqueue: async (input) => {
        attempted = input;
        throw new Error('relation "automation_outbox" does not exist');
      },
    });
    notify("contact", contact);
    await settle();

    assert.equal(posts.length, 1);
    assert.deepEqual(posts[0].body, attempted!.body);
    assert.equal(
      (posts[0].body.automation as { eventId: string }).eventId,
      attempted!.envelope.eventId,
      "the Zap can still dedupe on the same event id",
    );
    assert.equal(wakes(), 0);
    assert.equal(warnings.length, 1);
    assert.match(String(warnings[0][0]), /Outbox unavailable for "contact", sending directly/);
  });

  it("survives a failing fallback without an unhandled rejection", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const { notify, warnings } = setup({
        ...enabled,
        enqueue: async () => {
          throw new Error("db down");
        },
        post: () => {
          throw new Error("also down");
        },
      });
      notify("contact", contact);
      await settle();
      await settle();
      assert.equal(warnings.length, 2);
      assert.deepEqual(unhandled, []);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("never throws into the calling route", () => {
    const { notify, warnings } = setup({
      ...enabled,
      now: () => {
        throw new Error("clock failure");
      },
    });
    assert.doesNotThrow(() => notify("contact", contact));
    assert.deepEqual(warnings, [['[ZAPIER] Notify failed for "contact":', "clock failure"]]);
  });

  it("maps every legacy category to a topic without losing legacy fields", async () => {
    const { notify, enqueued } = setup(enabled);
    notify("ticket", { ticketId: 7, market: "paris" });
    notify("artist_application", { applicationId: 3 });
    notify("event_submission", { eventId: 9, status: "pending" });
    notify("pilot_lead", { subject: "Pilot program" });
    await settle();

    assert.deepEqual(enqueued.map((item) => item.category), [
      "ticket",
      "artist_application",
      "event_submission",
      "pilot_lead",
    ]);
    assert.equal((enqueued[3].envelope as { topic: string }).topic, "pilot");
    assert.equal(enqueued[2].body.eventId, 9, "legacy eventId is not overwritten by the envelope id");
    assert.notEqual((enqueued[2].body.automation as { eventId: string }).eventId, 9);
  });
});

describe("default notifyZapier export", () => {
  const saved = { flag: process.env.AUTOMATION_OUTBOX_ENABLED, url: process.env.ZAPIER_WEBHOOK_URL };
  afterEach(() => {
    for (const [key, value] of [
      ["AUTOMATION_OUTBOX_ENABLED", saved.flag],
      ["ZAPIER_WEBHOOK_URL", saved.url],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("does nothing, and never touches the database, when unconfigured", async () => {
    delete process.env.ZAPIER_WEBHOOK_URL;
    delete process.env.AUTOMATION_OUTBOX_ENABLED;
    assert.equal(notifyZapier("contact", contact), undefined);

    process.env.AUTOMATION_OUTBOX_ENABLED = "true";
    assert.equal(notifyZapier("contact", contact), undefined);

    process.env.ZAPIER_WEBHOOK_URL = "http://insecure.example.test/hook";
    assert.equal(notifyZapier("contact", contact), undefined);
    await settle();
  });
});
