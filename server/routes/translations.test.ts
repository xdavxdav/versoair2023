import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import translations from "./translations";
import { BUNDLED_LANGUAGES, nativeDictionary, PUBLIC_COPY } from "../../shared/public-translations";

test("translation endpoint serves complete bundled dictionaries regardless of legacy Cloud activation", async () => {
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
    for (const flag of ["false", "true"]) {
      process.env.CLOUD_TRANSLATION_ENABLED = flag;
      for (const language of BUNDLED_LANGUAGES) {
        const response = await fetch(`${url}/${language}`);
        const payload = await response.json();
        assert.equal(response.status, 200);
        assert.equal(payload.success, true);
        assert.equal(payload.language, language);
        assert.equal(payload.machineTranslated, false);
        assert.deepEqual(payload.dictionary, nativeDictionary(language));
        assert.equal(Object.keys(payload.dictionary).length, PUBLIC_COPY.length);
      }
    }
    const unavailable = await fetch(`${url}/de`);
    assert.equal(unavailable.status, 400);
    assert.equal((await unavailable.json()).code, "TRANSLATION_LANGUAGE_NOT_BUNDLED");
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
