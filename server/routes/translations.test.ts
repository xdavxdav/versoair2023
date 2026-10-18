import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import translations from "./translations";
import { nativeDictionary } from "../../shared/public-translations";

test("translation endpoint serves native languages and fails closed without Cloud activation", async () => {
  const before = process.env.CLOUD_TRANSLATION_ENABLED;
  process.env.CLOUD_TRANSLATION_ENABLED = "false";
  const app = express();
  app.use("/api/translations", translations);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}/api/translations`;
  try {
    const response = await fetch(`${url}/en`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.machineTranslated, false);
    assert.deepEqual(payload.dictionary, nativeDictionary("en"));
    const unavailable = await fetch(`${url}/es`);
    assert.equal(unavailable.status, 503);
    assert.equal((await unavailable.json()).code, "TRANSLATION_NOT_CONFIGURED");
    assert.equal(unavailable.headers.get("cache-control"), "no-store");
    assert.equal((await fetch(`${url}/not-a-language`)).status, 400);
    assert.equal((await fetch(`${url}/es?text=private-message`)).status, 400);
    assert.equal((await fetch(`${url}/es`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "private-message" }),
    })).status, 404);
  } finally {
    if (before === undefined) delete process.env.CLOUD_TRANSLATION_ENABLED;
    else process.env.CLOUD_TRANSLATION_ENABLED = before;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
