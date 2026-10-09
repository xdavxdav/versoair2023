import assert from "node:assert/strict";
import test from "node:test";

import {
  type NewsletterDbClient,
  queueNewsletterCampaign,
} from "./newsletter-delivery.ts";

function createClient(options: {
  claimed?: boolean;
  queuedCount?: number;
  failOnEnqueue?: Error;
  failOnRollback?: Error;
} = {}) {
  const calls: Array<{ query: string; values?: unknown[] }> = [];
  let released = false;
  let releaseError: Error | undefined;

  const client: NewsletterDbClient = {
    async query<Row extends object = Record<string, unknown>>(
      query: string,
      values?: unknown[],
    ) {
      calls.push({ query, values });
      if (query === "ROLLBACK" && options.failOnRollback) {
        throw options.failOnRollback;
      }
      if (query.includes("RETURNING id, title, subject, content")) {
        const rows = options.claimed === false
          ? []
          : [{
              id: 7,
              title: "Campaign",
              subject: null,
              content: "<p>Message</p>",
            }];
        return { rows: rows as Row[], rowCount: rows.length };
      }
      if (query.startsWith("INSERT INTO email_queue")) {
        if (options.failOnEnqueue) throw options.failOnEnqueue;
        return { rows: [], rowCount: options.queuedCount ?? 2 };
      }
      return { rows: [], rowCount: 0 };
    },
    release(error) {
      released = true;
      releaseError = error;
    },
  };

  return {
    calls,
    client,
    wasReleased: () => released,
    releasedWith: () => releaseError,
  };
}

test("claims scheduled campaigns and queues all active subscribers atomically", async () => {
  const fake = createClient({ queuedCount: 3 });
  const result = await queueNewsletterCampaign(7, "scheduled", async () => fake.client);

  assert.deepEqual(result, { recipientCount: 3 });
  assert.match(fake.calls[1].query, /status = 'scheduled' AND scheduled_at <= NOW\(\)/);
  assert.equal(fake.calls[2].values?.[0], "Campaign");
  assert.equal(fake.calls[2].values?.[1], "<p>Message</p>");
  assert.equal(fake.calls.at(-1)?.query, "COMMIT");
  assert.equal(fake.wasReleased(), true);
});

test("does not queue a campaign that could not be claimed", async () => {
  const fake = createClient({ claimed: false });
  const result = await queueNewsletterCampaign(7, "immediate", async () => fake.client);

  assert.equal(result, null);
  assert.equal(fake.calls.some(({ query }) => query.startsWith("INSERT INTO email_queue")), false);
  assert.equal(fake.calls.at(-1)?.query, "ROLLBACK");
  assert.equal(fake.wasReleased(), true);
});

test("rolls back queued emails when the transaction fails", async () => {
  const enqueueError = new Error("queue insert failed");
  const fake = createClient({ failOnEnqueue: enqueueError });

  await assert.rejects(
    queueNewsletterCampaign(7, "immediate", async () => fake.client),
    enqueueError,
  );

  assert.equal(fake.calls.at(-1)?.query, "ROLLBACK");
  assert.equal(fake.wasReleased(), true);
});

test("discards a connection when rollback fails", async () => {
  const enqueueError = new Error("queue insert failed");
  const rollbackError = new Error("rollback failed");
  const fake = createClient({
    failOnEnqueue: enqueueError,
    failOnRollback: rollbackError,
  });

  await assert.rejects(
    queueNewsletterCampaign(7, "immediate", async () => fake.client),
    enqueueError,
  );

  assert.equal(fake.releasedWith(), rollbackError);
});
