import "../test-support/env";
import assert from "node:assert/strict";
import test from "node:test";
import { call, withRouter } from "../test-support/route-harness";
import notificationsRouter from "./notifications";

test("unauthenticated notification reads return only a public news hint", async () => {
  await withRouter(notificationsRouter, async (origin) => {
    const response = await call(origin, "GET", "/");

    assert.equal(response.status, 200, response.text);
    assert.deepEqual(response.body, {
      success: true,
      audience: "public",
      notifications: [],
      publicUpdates: {
        title: "Public news and updates",
        message:
          "Platform-wide announcements are available in the public news journal.",
        url: "/news",
      },
    });
  });
});

test("unauthenticated unread count is zero and links visitors to public news", async () => {
  await withRouter(notificationsRouter, async (origin) => {
    const response = await call(origin, "GET", "/unread-count");

    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.count, 0);
    assert.equal(response.body.publicUpdates.url, "/news");
  });
});

test("unauthenticated visitors cannot use notification write endpoints", async () => {
  await withRouter(notificationsRouter, async (origin) => {
    assert.equal(
      (await call(origin, "POST", "/read-all")).status,
      401,
    );
    assert.equal(
      (await call(origin, "POST", "/notice-1/read")).status,
      401,
    );
  });
});
