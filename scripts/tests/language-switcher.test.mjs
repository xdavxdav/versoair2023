import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer";
import { createServer } from "vite";
import { LANG_NAMES } from "../../client/src/utils/country-language.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const googleTranslateStub = `
window.google = {translate: {TranslateElement: function(options, elementId) {
  if (new URLSearchParams(window.location.search).get("widget") === "modern") {
    const gadget = document.createElement("div");
    gadget.className = "goog-te-gadget-simple";
    document.getElementById(elementId).appendChild(gadget);
    return;
  }
  const combo = document.createElement("select");
  combo.className = "goog-te-combo";
  ["", ...options.includedLanguages.split(",")].forEach(language => {
    const option = document.createElement("option");
    option.value = language;
    option.textContent = language || "Français";
    combo.appendChild(option);
  });
  combo.addEventListener("change", () => {
    window.__googleTranslateLanguage = combo.value || "fr";
  });
  document.getElementById(elementId).appendChild(combo);
}},};
window.google.translate.TranslateElement.InlineLayout = {SIMPLE: 0};
window.googleTranslateElementInit();
`;

const harness = `<!doctype html><html lang="fr"><body><div id="root"></div>
<script type="module">
import React from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider, useLanguage } from "/src/components/LanguageSwitcher.tsx";
function Controls() {
  const language = useLanguage();
  return React.createElement("main", null,
    React.createElement("output", {id:"current-language"}, language.currentLang),
    React.createElement("output", {id:"machine-translated"}, String(language.machineTranslated)),
    language.showBanner && React.createElement("div", {role:"status"}, language.bannerMessage),
    ...${JSON.stringify(Object.keys(LANG_NAMES))}.map(lang => React.createElement("button", {
      key:lang, id:"select-"+lang, onClick:()=>language.selectLanguage(lang)
    }, lang)),
    React.createElement("p", {id:"sample"},"Bienvenue chez Verso Air"));
}
createRoot(document.getElementById("root")).render(
  React.createElement(LanguageProvider, null, React.createElement(Controls)));
</script></body></html>`;

let server;
let browser;
let origin;
let cacheDir;

before(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), "versoair-gtranslate-test-"));
  server = await createServer({
    configFile: `${root}vite.config.ts`,
    envFile: false,
    cacheDir,
    resolve: { dedupe: ["react", "react-dom"] },
    optimizeDeps: {
      entries: [],
      noDiscovery: true,
      include: ["react", "react-dom", "react-dom/client", "react/jsx-dev-runtime", "react/jsx-runtime"],
    },
    server: { host: "127.0.0.1", port: 0, hmr: false },
    plugins: [{
      name: "gtranslate-test-harness",
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith("/__gtranslate-test")) {
            res.setHeader("Content-Type", "text/html");
            res.end(await vite.transformIndexHtml(req.url, harness));
          } else {
            next();
          }
        });
      },
    }],
  });
  await server.listen();
  origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await puppeteer.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  await server?.close();
  if (cacheDir) await rm(cacheDir, { recursive: true, force: true });
});

async function openHarness({ cached = null, widget = "select" } = {}) {
  const page = await browser.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.evaluateOnNewDocument((cachedLanguage) => {
    localStorage.clear();
    if (cachedLanguage) {
      localStorage.setItem("fsa_selected_language", cachedLanguage);
      localStorage.setItem("fsa_language_override", "true");
    }
    if (window.location.search.includes("widget=modern")) {
      const nativeSetInterval = window.setInterval.bind(window);
      window.setInterval = (callback, delay, ...args) =>
        nativeSetInterval(callback, Math.min(delay, 5), ...args);
    }
  }, cached);
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    if (request.url().startsWith("https://translate.google.com/translate_a/element.js")) {
      requests.push(request.url());
      await request.respond({
        status: 200,
        contentType: "application/javascript",
        body: googleTranslateStub,
      });
      return;
    }
    if (request.url().startsWith(origin)) {
      await request.continue();
      return;
    }
    await request.abort();
  });
  await page.goto(`${origin}/__gtranslate-test?widget=${widget}`);
  await page.waitForSelector("#current-language", { timeout: 15_000 });
  return { page, errors, requests };
}

test("Google Translate engine loads into an active hidden widget", async () => {
  const { page, errors, requests } = await openHarness();
  try {
    await page.waitForSelector(".goog-te-combo");
    assert.equal(requests.length, 1);
    assert.match(requests[0], /translate_a\/element\.js/);
    assert.equal(await page.$eval("#google_translate_element", element =>
      getComputedStyle(element).display === "none"), false);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("choosing a language updates Google Translate and persists its cookie", async () => {
  const { page, errors } = await openHarness();
  try {
    await page.waitForSelector(".goog-te-combo");
    await page.click("#select-de");
    await page.waitForFunction(() =>
      window.__googleTranslateLanguage === "de" &&
      document.querySelector("#current-language")?.textContent === "de");
    assert.match(await page.evaluate(() => document.cookie), /googtrans=%2Ffr%2Fde|googtrans=\/fr\/de/);
    assert.equal(await page.evaluate(() => localStorage.getItem("fsa_selected_language")), "de");
    assert.equal(await page.$eval("#machine-translated", element => element.textContent), "true");
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("every language offered by the selector can be applied by the widget", async () => {
  const { page, errors } = await openHarness();
  try {
    await page.waitForSelector(".goog-te-combo");
    for (const language of Object.keys(LANG_NAMES)) {
      await page.click(`#select-${language}`);
      await page.waitForFunction(
        (selected) =>
          window.__googleTranslateLanguage === selected &&
          document.querySelector("#current-language")?.textContent === selected,
        {},
        language,
      );
      const cookie = await page.evaluate(() => document.cookie);
      if (language === "fr") {
        assert.equal(cookie.includes("googtrans="), false);
      } else {
        assert.match(
          cookie,
          new RegExp(
            `googtrans=%2Ffr%2F${language}|googtrans=\\/fr\\/${language}`,
          ),
        );
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("modern widget without a language select does not trigger a reload loop", async () => {
  const { page, errors } = await openHarness({
    cached: "de",
    widget: "modern",
  });
  try {
    await page.waitForSelector(".goog-te-gadget-simple");
    let reloads = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) reloads += 1;
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    assert.equal(reloads, 0);
    assert.equal(await page.$('[role="status"]'), null);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("returning to French resets Google Translate and clears its cookie", async () => {
  const { page, errors } = await openHarness({ cached: "de" });
  try {
    await page.waitForSelector(".goog-te-combo");
    await page.waitForFunction(() => window.__googleTranslateLanguage === "de");
    await page.click("#select-fr");
    await page.waitForFunction(() =>
      window.__googleTranslateLanguage === "fr" &&
      document.querySelector("#current-language")?.textContent === "fr");
    assert.equal(await page.evaluate(() => document.cookie.includes("googtrans=")), false);
    assert.equal(await page.$eval("#machine-translated", element => element.textContent), "false");
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("a cached translation is applied when the widget initializes", async () => {
  const { page, errors } = await openHarness({ cached: "ar" });
  try {
    await page.waitForSelector(".goog-te-combo");
    await page.waitForFunction(() => window.__googleTranslateLanguage === "ar");
    assert.equal(await page.$eval("#current-language", element => element.textContent), "ar");
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("Google Translate load failures are reported to the user", async () => {
  const { page, errors, requests } = await openHarness();
  try {
    await page.waitForSelector(".goog-te-combo");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("google-translate-load-error"));
    });
    await page.waitForSelector('[role="status"]');
    assert.match(
      await page.$eval('[role="status"]', element => element.textContent),
      /Google Translate could not load/,
    );
    assert.equal(requests.length, 1);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});
