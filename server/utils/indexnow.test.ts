import assert from "node:assert/strict";
import test from "node:test";

import {
  INDEXNOW_KEY,
  INDEXNOW_KEY_PATH,
  buildIndexNowSubmission,
} from "./indexnow.ts";

test("the IndexNow key is a valid 8-128 char hex token served at the matching path", () => {
  assert.match(INDEXNOW_KEY, /^[a-f0-9]{8,128}$/);
  assert.equal(INDEXNOW_KEY_PATH, `/${INDEXNOW_KEY}.txt`);
});

test("the submission body points keyLocation at the hosted key file", () => {
  const body = buildIndexNowSubmission("https://www.versoair.com", [
    "https://www.versoair.com/",
    "https://www.versoair.com/business/6",
  ]);
  assert.equal(body.host, "www.versoair.com");
  assert.equal(body.key, INDEXNOW_KEY);
  assert.equal(body.keyLocation, `https://www.versoair.com${INDEXNOW_KEY_PATH}`);
  assert.equal(body.urlList.length, 2);
  assert.ok(body.urlList.every((u) => u.startsWith("https://www.versoair.com/")));
});
