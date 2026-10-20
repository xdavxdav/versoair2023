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
  window.__googleTranslateOptions = options;
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
import { CountryProvider, useCountry } from "/src/contexts/CountryContext.tsx";
import { useLocalizedContent } from "/src/hooks/use-localized-content.tsx";
import { CountryDropdown } from "/src/components/CountryDropdown.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
function Controls() {
  const language = useLanguage();
  const country = useCountry();
  const localize = useLocalizedContent(false);
  return React.createElement("main", null,
    React.createElement(CountryDropdown),
    React.createElement("output", {id:"current-country"}, country.selectedCountry),
    React.createElement("output", {id:"current-language"}, language.currentLang),
    React.createElement("output", {id:"machine-translated"}, String(language.machineTranslated)),
    language.showBanner && React.createElement("div", {role:"status"}, language.bannerMessage),
    ...${JSON.stringify(Object.keys(LANG_NAMES))}.map(lang => React.createElement("button", {
      key:lang, id:"select-"+lang, onClick:()=>language.selectLanguage(lang)
    }, lang)),
    React.createElement("p", {id:"sample"},"Bienvenue chez Verso Air"),
    localize(React.createElement("section", {id:"native-copy"},
      React.createElement("h1", null, "Privacy Policy"),
      React.createElement("p", null, "Sign In"),
      React.createElement("p", null, "Custom quote"),
      React.createElement("p", {id:"unknown-copy"}, "Unknown authored sample"),
      React.createElement("input", {id:"private-input", defaultValue:"Private account value"}))));
}
createRoot(document.getElementById("root")).render(
  React.createElement(QueryClientProvider, {client:new QueryClient()},
    React.createElement(CountryProvider, null,
      React.createElement(LanguageProvider, null, React.createElement(Controls)))));
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

async function openHarness({
  cached = null,
  widget = "select",
  country = "FR",
  detectedCountries = ["CA"],
  failGoogle = false,
} = {}) {
  const page = await browser.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let detections = 0;
  await page.evaluateOnNewDocument((cachedLanguage, cachedCountry) => {
    localStorage.clear();
    if (cachedCountry) {
      localStorage.setItem("fsa_detected_country_v2", JSON.stringify({
        code: cachedCountry, ts: Date.now(), manual: true,
      }));
    }
    if (cachedLanguage) {
      localStorage.setItem("fsa_selected_language", cachedLanguage);
      localStorage.setItem("fsa_language_override", "true");
    }
    if (window.location.search.includes("widget=modern")) {
      const nativeSetInterval = window.setInterval.bind(window);
      window.setInterval = (callback, delay, ...args) =>
        nativeSetInterval(callback, Math.min(delay, 5), ...args);
    }
  }, cached, country);
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    if (request.url().startsWith("https://translate.google.com/translate_a/element.js")) {
      requests.push(request.url());
      if (failGoogle) {
        await request.abort();
        return;
      }
      await request.respond({
        status: 200,
        contentType: "application/javascript",
        body: googleTranslateStub,
      });
      return;
    }
    if (request.url().startsWith(`${origin}/api/location/country`)) {
      const countryCode = detectedCountries[Math.min(detections++, detectedCountries.length - 1)];
      await request.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({countryCode}),
      });
      return;
    }
    if (request.url().startsWith(`${origin}/api/countries`)) {
      await request.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {id:1, code:"CA", name:"Canada"},
          {id:2, code:"FR", name:"France"},
          {id:3, code:"DE", name:"Germany"},
        ]),
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
    assert.deepEqual(
      await page.evaluate(() => ({
        source: window.__googleTranslateOptions.pageLanguage,
        layout: window.__googleTranslateOptions.layout ?? null,
      })),
      { source: "auto", layout: null },
    );
    assert.equal(requests.length, 1);
    assert.match(requests[0], /translate_a\/element\.js/);
    assert.equal(await page.$eval("#google_translate_element", element =>
      getComputedStyle(element).display === "none"), false);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("country refresh preserves a manually selected language", async () => {
  const { page, errors } = await openHarness({ cached: "es" });
  try {
    await page.waitForSelector(".goog-te-combo");
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    await page.click('[aria-label="Reload location detection"]');
    await page.waitForFunction(() =>
      document.querySelector("#current-country")?.textContent === "CA");
    assert.equal(await page.$eval("#current-language", el => el.textContent), "es");
    assert.equal(await page.evaluate(() => localStorage.getItem("fsa_language_override")), "true");
    assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("country refresh updates automatic language suggestions across countries", async () => {
  const { page, errors } = await openHarness({
    detectedCountries: ["CA", "FR"],
  });
  try {
    await page.waitForSelector(".goog-te-combo");
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    for (const [country, language] of [["CA", "en"], ["FR", "fr"]]) {
      await page.click('[aria-label="Reload location detection"]');
      await page.waitForFunction(
        ([code, lang]) =>
          document.querySelector("#current-country")?.textContent === code &&
          document.querySelector("#current-language")?.textContent === lang,
        {},
        [country, language],
      );
    }
    assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("explicit country selection resets the manual language override", async () => {
  const { page, errors } = await openHarness({ cached: "es" });
  try {
    await page.waitForSelector(".goog-te-combo");
    await page.click('[aria-label="Change country or language"]');
    await page.click('[aria-label="Select country: Canada"]');
    await page.waitForFunction(() =>
      document.querySelector("#current-language")?.textContent === "en");
    assert.equal(await page.evaluate(() => localStorage.getItem("fsa_language_override")), "false");
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("native public copy works without Google and stays protected across language switches", async () => {
  const { page, errors } = await openHarness({ failGoogle: true });
  try {
    const expected = [
      ["fr", "Politique de confidentialité", "Se connecter", "Sur devis"],
      ["en", "Privacy Policy", "Sign In", "Custom quote"],
      ["es", "Política de privacidad", "Iniciar sesión", "Presupuesto personalizado"],
    ];
    for (const [language, heading, signIn, quote] of expected) {
      await page.click(`#select-${language}`);
      await page.waitForFunction(
        text => document.querySelector("#native-copy h1")?.textContent.trim() === text,
        {},
        heading,
      );
      assert.equal(await page.$eval("#native-copy h1 span", el => el.getAttribute("translate")), "no");
      assert.equal(await page.$eval("#native-copy h1 span", el => el.classList.contains("notranslate")), true);
      assert.equal(await page.$eval("#native-copy h1 span", el => el.lang), language);
      assert.equal(await page.$eval("#native-copy p:nth-child(2)", el => el.textContent), signIn);
      assert.equal(await page.$eval("#native-copy p:nth-child(3)", el => el.textContent), quote);
    }
    assert.equal(await page.$eval("#unknown-copy", el => el.textContent), "Unknown authored sample");
    assert.equal(await page.$eval("#private-input", el => el.value), "Private account value");
    await page.waitForSelector('[role="status"]');
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("catalogue nodes survive provider DOM changes when switching back to native copy", async () => {
  const { page, errors } = await openHarness();
  try {
    await page.waitForSelector(".goog-te-combo");
    await page.click("#select-de");
    await page.waitForFunction(() =>
      document.querySelector("#current-language")?.textContent === "de");
    await page.evaluate(() => {
      for (const span of document.querySelectorAll("#native-copy span")) {
        if (span.closest('[translate="no"], .notranslate')) continue;
        const translated = document.createElement("font");
        translated.textContent = "Provider translation";
        const source = document.createElement("font");
        source.hidden = true;
        source.append(...span.childNodes);
        span.append(source, translated);
      }
    });
    await page.click("#select-fr");
    await page.waitForFunction(() =>
      document.querySelector("#native-copy h1")?.textContent === "Politique de confidentialité");
    assert.equal(await page.$eval("#native-copy h1 span", el => el.getAttribute("translate")), "no");
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
    assert.match(await page.evaluate(() => document.cookie), /googtrans=%2Fauto%2Fde|googtrans=\/auto\/de/);
    assert.equal(await page.evaluate(() => localStorage.getItem("fsa_selected_language")), "de");
    assert.equal(await page.$eval("#machine-translated", element => element.textContent), "true");
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("language information disappears after three seconds without resetting translation", async () => {
  const { page, errors } = await openHarness();
  try {
    await page.waitForSelector(".goog-te-combo");
    await page.click("#select-en");
    await page.waitForSelector('[role="status"]');
    assert.match(
      await page.$eval('[role="status"]', element => element.textContent),
      /Translating to EN/,
    );
    await page.waitForSelector('[role="status"]', {
      hidden: true,
      timeout: 4000,
    });
    assert.equal(await page.$eval("#current-language", element => element.textContent), "en");
    assert.equal(await page.evaluate(() => window.__googleTranslateLanguage), "en");
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
          window.__googleTranslateLanguage === (selected === "he" ? "iw" : selected) &&
          document.querySelector("#current-language")?.textContent === selected,
        {},
        language,
      );
      const cookie = await page.evaluate(() => document.cookie);
      const providerLanguage = language === "he" ? "iw" : language;
      assert.match(
        cookie,
        new RegExp(
          `googtrans=%2Fauto%2F${providerLanguage}|googtrans=\\/auto\\/${providerLanguage}`,
        ),
      );
    }
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("a missing language control reports failure without reloading", async () => {
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
    assert.match(
      await page.$eval('[role="status"]', element => element.textContent),
      /language control could not load/,
    );
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("French is a translation target, including after another language", async () => {
  const { page, errors } = await openHarness({ cached: "de" });
  try {
    await page.waitForSelector(".goog-te-combo");
    await page.waitForFunction(() => window.__googleTranslateLanguage === "de");
    await page.click("#select-fr");
    await page.waitForFunction(() =>
      window.__googleTranslateLanguage === "fr" &&
      document.querySelector("#current-language")?.textContent === "fr");
    assert.match(await page.evaluate(() => document.cookie), /googtrans=\/auto\/fr/);
    assert.equal(await page.$eval("#machine-translated", element => element.textContent), "true");
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("French is applied on first load without a stored language", async () => {
  const { page, errors } = await openHarness();
  try {
    await page.waitForFunction(() => window.__googleTranslateLanguage === "fr");
    assert.match(await page.evaluate(() => document.cookie), /googtrans=\/auto\/fr/);
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
