import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import { LOCAL_PREVIEW_ONLY_PATHS } from "@shared/page-readiness";
import { pageReadinessNotFound } from "./page-readiness-404";

async function withServer(
  isProduction: boolean,
  run: (origin: string) => Promise<void>,
) {
  const app = express();
  app.use(pageReadinessNotFound(isProduction));
  app.use((_req, res) => res.status(200).send("SPA"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("production shows a readiness notice and redirects to home after five seconds", async () => {
  await withServer(true, async (origin) => {
    for (const path of LOCAL_PREVIEW_ONLY_PATHS) {
      for (const route of [path, `${path}/child?preview=1`]) {
        for (const method of ["GET", "HEAD"] as const) {
          const response = await fetch(`${origin}${route}`, { method });
          assert.equal(response.status, 404, `${method} ${route} should return 404`);
          if (method === "GET") {
            const body = await response.text();
            assert.match(body, /Will be ready soon/);
            assert.match(body, /We're preparing this part of Verso Air/);
            assert.match(body, /href="\/"/);
            assert.match(body, /setTimeout\(returnHome, 5000\)/);
            assert.match(body, /Review Verso Air/);
            assert.doesNotMatch(body, /Stay on this page|You're staying here/);
          }
          assert.equal(response.headers.get("cache-control"), "no-store");
          assert.match(
            response.headers.get("content-type") ?? "",
            /^text\/html/,
          );
        }
      }
    }

    const getInvolvedPage = await fetch(`${origin}/get-involved`);
    const getInvolvedHtml = await getInvolvedPage.text();
    assert.match(getInvolvedHtml, /<title>Get Involved \| Will be ready soon \| Verso Air<\/title>/);
    assert.match(getInvolvedHtml, /<h1>Get Involved<\/h1>/);

    const nestedPage = await fetch(`${origin}/get-involved/opportunities`);
    const nestedHtml = await nestedPage.text();
    assert.match(nestedHtml, /<title>Get Involved \/ Opportunities \| Will be ready soon \| Verso Air<\/title>/);
    assert.match(nestedHtml, /<h1>Get Involved \/ Opportunities<\/h1>/);

    const brandedPage = await fetch(`${origin}/vheartz`);
    const brandedHtml = await brandedPage.text();
    assert.match(brandedHtml, /<h1>vHeartz<\/h1>/);

    const openResponse = await fetch(`${origin}/about`);
    assert.equal(openResponse.status, 200);
  });
});

test("development leaves local-preview-only routes available", async () => {
  await withServer(false, async (origin) => {
    const response = await fetch(`${origin}/vheartz`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "SPA");
  });
});
