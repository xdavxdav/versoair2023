import assert from "node:assert/strict";
import test from "node:test";

import { buildLlmsTxt, createLlmsTxtHandler } from "./llms-txt.ts";

const origin = "https://www.versoair.com";

test("llms.txt is plain markdown with absolute links to key pages and listings", () => {
  const text = buildLlmsTxt(origin, [
    { id: 6, name: "Persaunafy Inc." },
    { id: 25, name: "Kick & [Tech]\n" },
  ]);
  assert.match(text, /^# Verso Air\n/);
  assert.ok(!/<\w+/.test(text), "no HTML");
  assert.ok(text.includes(`(${origin}/about)`));
  assert.ok(text.includes(`[Persaunafy Inc.](${origin}/business/6)`));
  assert.ok(text.includes(`[Kick & Tech](${origin}/business/25)`));
  assert.ok(text.includes(`(${origin}/sitemap.xml)`));
  for (const link of text.matchAll(/\]\(([^)]+)\)/g)) {
    assert.ok(link[1].startsWith("https://"), link[1]);
  }
});

test("llms.txt is served as text/plain and still works when the database is down", async () => {
  const headers: Record<string, string> = {};
  let status = 0;
  let body = "";
  const res = {
    setHeader: (name: string, value: string) => void (headers[name] = value),
    status(code: number) {
      status = code;
      return this;
    },
    send(payload: string) {
      body = payload;
      return this;
    },
  };
  const handler = createLlmsTxtHandler(async () => {
    throw new Error("db down");
  });
  const quiet = console.error;
  console.error = () => {};
  try {
    await handler({} as never, res as never);
  } finally {
    console.error = quiet;
  }
  assert.equal(status, 200);
  assert.match(headers["Content-Type"], /^text\/plain/);
  assert.ok(body.startsWith("# Verso Air"));
  assert.ok(!body.includes("## Verified business listings"));
});
