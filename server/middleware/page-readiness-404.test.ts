import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import { LOCAL_PREVIEW_ONLY_PATHS, RELEASED_PAGE_PATHS } from "@shared/page-readiness";
import { pageReadinessNotFound, pickNoticeLanguage } from "./page-readiness-404";

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

    const sponsorshipPage = await fetch(`${origin}/sponsorship`);
    const sponsorshipHtml = await sponsorshipPage.text();
    assert.match(sponsorshipHtml, /<title>Sponsorship \| Will be ready soon \| Verso Air<\/title>/);
    assert.match(sponsorshipHtml, /<h1>Sponsorship<\/h1>/);

    const nestedPage = await fetch(`${origin}/programs/opportunities`);
    const nestedHtml = await nestedPage.text();
    assert.match(nestedHtml, /<title>Programs \/ Opportunities \| Will be ready soon \| Verso Air<\/title>/);
    assert.match(nestedHtml, /<h1>Programs \/ Opportunities<\/h1>/);

    const openResponse = await fetch(`${origin}/about`);
    assert.equal(openResponse.status, 200);
  });
});

test("development leaves local-preview-only routes available", async () => {
  await withServer(false, async (origin) => {
    const response = await fetch(`${origin}/programs`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "SPA");
  });
});

test("the notice speaks the visitor's language and defaults to English", async () => {
  await withServer(true, async (origin) => {
    const load = async (path: string, acceptLanguage?: string) => {
      const response = await fetch(
        `${origin}${path}`,
        acceptLanguage === undefined
          ? undefined
          : { headers: { "Accept-Language": acceptLanguage } },
      );
      return { response, html: await response.text() };
    };

    const french = await load("/programs", "fr-CI,fr;q=0.9,en;q=0.5");
    assert.equal(french.response.status, 404);
    assert.match(french.html, /<html lang="fr">/);
    assert.match(french.html, /<title>Programmes \| Bientôt disponible \| Verso Air<\/title>/);
    assert.match(french.html, /Nous préparons cette partie de Verso Air/);
    assert.match(french.html, /Retour à l'accueil dans 5 secondes\./);
    assert.match(french.html, /href="\/">Retour à l'accueil<\/a>/);
    assert.match(french.html, /setTimeout\(returnHome, 5000\)/);
    assert.match(
      french.html,
      /const countdownCopy = \{"one":"Retour à l'accueil dans \{n\} seconde\.","other":"Retour à l'accueil dans \{n\} secondes\."\};/,
    );
    assert.match(french.response.headers.get("vary") ?? "", /Accept-Language/i);
    assert.equal(french.response.headers.get("cache-control"), "no-store");

    const spanish = await load("/programs", "es-ES,es;q=0.9");
    assert.match(spanish.html, /<html lang="es">/);
    assert.match(spanish.html, /<title>Programas \| Próximamente \| Verso Air<\/title>/);

    const weighted = await load("/programs", "en;q=0.4, fr;q=0.8");
    assert.match(weighted.html, /<html lang="fr">/);

    for (const header of [undefined, "*", "de-DE,de;q=0.9", "fr;q=0"]) {
      const fallback = await load("/programs", header);
      assert.match(fallback.html, /<html lang="en">/, `Accept-Language ${header} stays English`);
      assert.match(fallback.html, /Will be ready soon/);
    }
  });
});

test("page names come from the table, never from object prototypes", async () => {
  await withServer(true, async (origin) => {
    const html = await (await fetch(`${origin}/programs/constructor`)).text();
    assert.match(
      html,
      /<title>Programs \/ Constructor \| Will be ready soon \| Verso Air<\/title>/,
    );
  });
});

test("released pages stay open in production", async () => {
  await withServer(true, async (origin) => {
    for (const path of RELEASED_PAGE_PATHS) {
      const response = await fetch(`${origin}${path}`);
      assert.equal(response.status, 200, `${path} should be open`);
      assert.equal(await response.text(), "SPA");
    }
  });
});

test("pickNoticeLanguage picks the first supported language by weight", () => {
  assert.equal(pickNoticeLanguage(undefined), "en");
  assert.equal(pickNoticeLanguage(""), "en");
  assert.equal(pickNoticeLanguage("fr-FR,fr;q=0.9"), "fr");
  assert.equal(pickNoticeLanguage("de, es;q=0.8"), "es");
  assert.equal(pickNoticeLanguage("en;q=0.2, es;q=0.9"), "es");
  assert.equal(pickNoticeLanguage("fr;q=0, en;q=0.5"), "en");
  assert.equal(pickNoticeLanguage("fr;q=abc, es"), "es");
  assert.equal(pickNoticeLanguage("*"), "en");
});
