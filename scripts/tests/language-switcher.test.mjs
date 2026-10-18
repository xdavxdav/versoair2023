import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer";
import { createServer } from "vite";
import { PUBLIC_COPY } from "../../shared/public-translations.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
let server;
let browser;
let origin;
let cacheDir;

const harness = `<!doctype html><html><body><div id="root"></div>
<script type="module">
import React, {useState} from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CountryProvider } from "/src/contexts/CountryContext.tsx";
import { LanguageProvider, useLanguage } from "/src/components/LanguageSwitcher.tsx";
import { CountryDropdown } from "/src/components/CountryDropdown.tsx";
import { useLocalizedContent } from "/src/hooks/use-localized-content.tsx";
import GeoAdminPromoCard from "/src/components/GeoAdminPromoCard.tsx";
import { TierComparisonModal } from "/src/components/TierComparisonModal.tsx";
import HelpCenter from "/src/pages/help.tsx";
import Pricing from "/src/pages/pricing.tsx";
import SignIn from "/src/pages/signin.tsx";
import Terms from "/src/pages/terms.tsx";
import About from "/src/pages/about.tsx";
import { AuthProvider } from "/src/contexts/AuthContext.tsx";
import { HelmetProvider } from "react-helmet-async";
import "/src/index.css";
function Controls() {
  const language = useLanguage();
  const localize = useLocalizedContent();
  const [late,setLate] = useState(false);
  const [value,setValue] = useState("private@example.com");
  const [screen,setScreen] = useState("sample");
  return React.createElement("div", {style:{paddingTop:"320px"}},
    React.createElement("output", {id:"current-language"}, language.currentLang),
    ...["fr","en","es","de"].map(lang => React.createElement("button", {
      key:lang, id:"select-"+lang, onClick:()=>language.selectLanguage(lang)
    }, lang)),
    React.createElement("button", {id:"late",onClick:()=>setLate(true)}, "Mount content"),
    ...["pricing","signin","terms","comparison","about"].map(screen=>React.createElement("button", {
      key:screen,id:"screen-"+screen,onClick:()=>setScreen(screen)
    },screen)),
    React.createElement("div", {style:{position:"fixed",top:0,left:0,transform:"translateZ(0)",width:"250px",background:"#172033"}},
      React.createElement(CountryDropdown)),
    localize(React.createElement("div", null,
      React.createElement("input", {id:"private-value",value,onChange:e=>setValue(e.target.value),placeholder:"Enter your full name"}),
      React.createElement("p", {id:"unknown"},"Private message outside the public catalogue"),
      React.createElement("p", {id:"protected",translate:"no"},"Contact Us"))),
    React.createElement("div", {id:"promo-card",style:{maxWidth:"600px"}}, React.createElement(GeoAdminPromoCard)),
    late && React.createElement(HelpCenter),
    React.createElement("div", {id:"real-screen"},screen==="pricing"?React.createElement(Pricing):
      screen==="signin"?React.createElement(SignIn):screen==="terms"?React.createElement(Terms):
      screen==="about"?React.createElement(About):
      screen==="comparison"?React.createElement(TierComparisonModal,{isOpen:true,currentTier:"essential",onClose:()=>setScreen("sample")}):null));
}
createRoot(document.getElementById("root")).render(
  React.createElement(QueryClientProvider, {client:new QueryClient({defaultOptions:{queries:{retry:false}}})},
    React.createElement(CountryProvider, null,
      React.createElement(LanguageProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(HelmetProvider, null, React.createElement(Controls)))))));
</script></body></html>`;

before(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), "versoair-translation-test-"));
  server = await createServer({
    configFile: `${root}vite.config.ts`,
    envFile: false,
    cacheDir,
    resolve: { dedupe: ["react", "react-dom"] },
    optimizeDeps: {
      entries: [], noDiscovery: true,
      include: ["react", "react-dom", "react-dom/client", "react/jsx-dev-runtime",
        "react/jsx-runtime", "@tanstack/react-query", "lucide-react", "transliteration", "framer-motion", "wouter",
        "react-helmet-async", "@radix-ui/react-slot", "class-variance-authority",
        "@radix-ui/react-dialog", "@radix-ui/react-tabs", "clsx", "tailwind-merge"],
    },
    define: { "import.meta.env.VITE_API_URL": JSON.stringify("") },
    server: { host: "127.0.0.1", port: 0, hmr: false },
    plugins: [{
      name: "translation-test-harness",
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith("/api/")) {
            res.writeHead(503, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: "Backend disabled in translation tests" }));
          } else if (req.url?.startsWith("/__translation-test")) {
            res.setHeader("Content-Type", "text/html");
            res.end(await vite.transformIndexHtml(req.url, harness));
          } else next();
        });
      },
    }],
  });
  server.config.server.proxy = {};
  await server.listen();
  origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await puppeteer.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  await server?.close();
  if (cacheDir) await rm(cacheDir, { recursive: true, force: true });
});

async function openHarness({ fail = false, delay = 0, malformed = false, country = "FR", cached = null, mode = "" } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => {
    errors.push(error.message);
    console.error("Translation harness:", error.message);
  });
  await page.setViewport({ width: 375, height: 800 });
  await page.evaluateOnNewDocument((country, cached) => {
    localStorage.clear();
    localStorage.setItem("fsa_detected_country_v2", JSON.stringify({ code: country, ts: Date.now(), manual: true }));
    if (cached) {
      localStorage.setItem("fsa_selected_language", cached);
      localStorage.setItem("fsa_language_override", "true");
    }
  }, country, cached);
  const translations = [];
  const external = [];
  await page.setRequestInterception(true);
  page.on("request", async request => {
    if (request.url().startsWith(`${origin}/api/translations/`)) {
      translations.push({ url: request.url(), body: request.postData() });
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      const language = new URL(request.url()).pathname.split("/").pop();
      const dictionary = Object.fromEntries(PUBLIC_COPY.map(([en, fr], index) => [
        String(index), language === "es"
          ? en === "Custom quote" ? "Presupuesto personalizado"
          : en === "Help Center" ? "Centro de ayuda" : `ES ${fr}`
          : `DE ${fr}`,
      ]));
      try {
        await request.respond({
          status: fail ? 503 : 200, contentType: "application/json",
          body: JSON.stringify(fail ? { success: false } : {
            success: true, language, machineTranslated: true,
            dictionary: malformed ? {} : dictionary,
          }),
        });
      } catch (error) {
        if (!request.isInterceptResolutionHandled()) throw error;
      }
      return;
    }
    if (request.url().startsWith(origin)) return void request.continue();
    external.push(request.url());
    return void request.abort();
  });
  await page.goto(`${origin}/__translation-test${mode ? "?mode=" + mode : ""}`);
  await page.waitForSelector("#select-en", { timeout: 15_000 });
  return { page, translations, external, errors };
}

const waitForLanguage = (page, language) => page.waitForFunction(
  language => document.querySelector("#current-language")?.textContent === language, {}, language,
);
const cardText = page => page.$eval("#promo-card", element => element.textContent);
async function clickButtonWithText(page, selector, text) {
  const handle = await page.waitForFunction((selector, text) =>
    [...document.querySelectorAll(selector)].find(button => button.textContent.includes(text)),
    { timeout: 5000 }, selector, text);
  try {
    await handle.asElement().click();
  } finally {
    await handle.dispose();
  }
}

test("native FR/EN work without Google; Enterprise stays custom and numbers/links are preserved", async () => {
  const { page, translations, external, errors } = await openHarness();
  try {
    assert.match(await cardText(page), /Sur devis/);
    await page.click("#select-en");
    await waitForLanguage(page, "en");
    assert.match(await cardText(page), /Custom quote/);
    assert.match(await cardText(page), /Business Directory & Visibility Platform/);
    for (const price of ["180.000 FCFA", "300.000 FCFA", "400.000 FCFA", "780.000 FCFA"]) {
      assert.ok((await cardText(page)).includes(price));
    }
    assert.equal(await page.$eval('a[href^="https://wa.me/"]', element => element.href), "https://wa.me/14374359726");
    assert.equal(translations.length, 0);
    assert.equal(external.some(url => /translate.*google/.test(url)), false);
    assert.equal(await page.$(".goog-te-combo"), null);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test("native notice fits mobile, retains contrast and Undo returns to French", async () => {
  const { page } = await openHarness();
  try {
    await page.click("#select-en");
    await waitForLanguage(page, "en");
    const measurement = await page.$eval('[role="status"]', element => {
      const rect = element.getBoundingClientRect();
      const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number)
        .map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; })
        .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const bg = luminance(getComputedStyle(element).backgroundColor);
      const contrast = [...element.querySelectorAll("span,button")].map(item => {
        const fg = luminance(getComputedStyle(item).color);
        return (Math.max(bg, fg) + .05) / (Math.min(bg, fg) + .05);
      });
      return { left: rect.left, right: rect.right, width: innerWidth, contrast: Math.min(...contrast) };
    });
    assert.ok(measurement.left >= 0 && measurement.right <= measurement.width);
    assert.ok(measurement.contrast >= 4.5);
    await page.locator('[role="status"] button').filter(button => button.textContent === "Undo").click();
    await waitForLanguage(page, "fr");
    assert.match(await cardText(page), /Sur devis/);
  } finally { await page.close(); }
});

test("automatic language uses only same-origin catalogue requests and updates late React content", async () => {
  const { page, translations, errors } = await openHarness();
  try {
    await page.click("#select-es");
    await waitForLanguage(page, "es");
    assert.match(await cardText(page), /Presupuesto personalizado/);
    assert.equal(translations.length, 1);
    assert.equal(translations[0].body, undefined);
    assert.equal(new URL(translations[0].url).search, "");
    assert.ok(await page.$('a[aria-label^="Automatic translation by Google Translate"]'));
    await page.click("#late");
    await page.waitForFunction(() => document.querySelector("h1")?.textContent.trim() === "Centro de ayuda");
    assert.ok(await page.$('[lang="es-x-mtfrom-fr"]'));
    assert.equal(translations.length, 1);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test("form values, unknown/private text and translate=no are not changed or submitted", async () => {
  const { page, translations } = await openHarness();
  try {
    await page.click("#select-es");
    await waitForLanguage(page, "es");
    assert.equal(await page.$eval("#private-value", element => element.value), "private@example.com");
    assert.equal(await page.$eval("#protected", element => element.textContent), "Contact Us");
    assert.equal(await page.$eval("#unknown", element => element.textContent), "Private message outside the public catalogue");
    assert.equal(translations.some(request => JSON.stringify(request).includes("private")), false);
  } finally { await page.close(); }
});

test("unavailable or incomplete translation retains the previous language and allows native recovery", async () => {
  for (const options of [{ fail: true }, { malformed: true }]) {
    const { page } = await openHarness(options);
    try {
      await page.click("#select-en");
      await waitForLanguage(page, "en");
      await page.click("#select-es");
      await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent.includes("Translation unavailable"));
      await waitForLanguage(page, "en");
      assert.match(await cardText(page), /Custom quote/);
      assert.equal(await page.evaluate(() => localStorage.getItem("fsa_selected_language")), "en");
      await page.click("#select-fr");
      await waitForLanguage(page, "fr");
      assert.match(await cardText(page), /Sur devis/);
    } finally { await page.close(); }
  }
});

test("a stale delayed Cloud result cannot overwrite a newer native choice", async () => {
  const { page } = await openHarness({ delay: 500 });
  try {
    await page.click("#select-es");
    await page.click("#select-en");
    await waitForLanguage(page, "en");
    await new Promise(resolve => setTimeout(resolve, 800));
    assert.equal(await page.$eval("#current-language", element => element.textContent), "en");
    assert.match(await cardText(page), /Custom quote/);
  } finally { await page.close(); }
});

test("dismissing a pending notice does not cancel translation or reopen the notice", async () => {
  const { page } = await openHarness({ delay: 500 });
  try {
    await page.click("#select-es");
    await page.click('[aria-label="Dismiss translation notification"]');
    await waitForLanguage(page, "es");
    assert.equal(await page.$('[role="status"]'), null);
  } finally { await page.close(); }
});

test("manual cached language wins over country detection", async () => {
  const { page, translations } = await openHarness({ country: "ES", cached: "en" });
  try {
    await waitForLanguage(page, "en");
    await new Promise(resolve => setTimeout(resolve, 500));
    assert.equal(await page.$eval("#current-language", element => element.textContent), "en");
    assert.equal(translations.length, 0);
  } finally { await page.close(); }
});

test("country detection can request its language without a manual override", async () => {
  const { page } = await openHarness({ country: "ES" });
  try {
    await waitForLanguage(page, "es");
    assert.match(await cardText(page), /Presupuesto personalizado/);
  } finally { await page.close(); }
});

test("five paid/custom promotional offers fit small and wide screens", async () => {
  const { page } = await openHarness();
  try {
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewport({ width, height: 900 });
      const result = await page.$eval("#promo-card", element => ({
        articles: element.querySelectorAll("article").length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        titles: [...element.querySelectorAll("h3")].map(node => node.textContent),
      }));
      assert.equal(result.articles, 5);
      assert.ok(result.titles.includes("Premium"));
      assert.ok(result.titles.includes("Enterprise"));
      assert.equal(result.overflow, false, `overflow at ${width}px`);
    }
  } finally { await page.close(); }
});

test("About hero paragraphs and badge meet contrast on the light page", async () => {
  const { page, errors } = await openHarness({ country: "CI" });
  try {
    await page.click("#screen-about");
    await page.waitForSelector("#real-screen h1");
    const checks = await page.$eval("#real-screen", element => {
      const paragraphs = [...element.querySelectorAll("p")].filter(node =>
        /prépare le lancement|Directory listings, categories|Les inscriptions à l'annuaire/.test(node.textContent));
      const badge = [...element.querySelectorAll("div")].find(node =>
        node.textContent.trim() === "Plateforme d'Intelligence Multi-Sectorielle");
      const luminance = rgb => rgb.map(value => value / 255)
        .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
        .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      return [...paragraphs, badge].filter(Boolean).map(node => {
        const foreground = getComputedStyle(node).color.match(/[\d.]+/g).slice(0, 3).map(Number);
        const fg = luminance(foreground);
        const bg = luminance([243, 239, 233]);
        return { text: node.textContent.trim(), contrast: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) };
      });
    });
    assert.equal(checks.length, 3);
    for (const check of checks) assert.ok(check.contrast >= 4.5, JSON.stringify(check));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test("Premium inquiry has six commercial choices and never submits an account upgrade", async () => {
  const { page, translations, errors } = await openHarness({ country: "CI" });
  const mutations = [];
  page.on("request", request => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) mutations.push(request.url());
  });
  try {
    await page.click("#screen-pricing");
    await page.waitForSelector("#real-screen h1");
    await clickButtonWithText(page, "#real-screen button", "Premium");
    await page.waitForSelector('[role="dialog"]');
    assert.equal(await page.$$eval('[role="dialog"] [role="tab"]', tabs => tabs.length), 6);
    const panel = await page.$eval('[role="tabpanel"]', element => element.textContent);
    assert.match(panel, /300[\s\u202f]?000 FCFA/);
    assert.match(panel, /Un entretien de cadrage/);
    assert.match(panel, /cinq fiches produits ou services/);
    assert.match(panel, /Une série de corrections/);
    assert.match(panel, /aucun droit supplémentaire/i);
    assert.match(panel, /confirmation écrite/i);
    const href = await page.$eval('[role="dialog"] a[href^="mailto:"]', element => element.href);
    const inquiry = new URL(href);
    assert.match(inquiry.searchParams.get("subject"), /Premium/);
    assert.match(inquiry.searchParams.get("body"), /five product or service sheets/);
    assert.match(inquiry.searchParams.get("body"), /No account upgrade or subscription activation/);
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewport({ width, height: 900 });
      assert.equal(await page.$eval('[role="dialog"]', element =>
        element.scrollWidth > element.clientWidth), false, `dialog overflow at ${width}px`);
    }
    assert.equal(mutations.length, 0);
    assert.equal(translations.length, 0);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test("account comparison shows six offers with Standard as the only permanently free plan", async () => {
  const { page, errors } = await openHarness({ country: "CI" });
  try {
    await page.click("#screen-comparison");
    await page.waitForSelector('[role="dialog"]');
    assert.equal(await page.$$eval('[role="dialog"] article', elements => elements.length), 6);
    const text = await page.$eval('[role="dialog"]', element => element.textContent);
    assert.match(text, /Essentiel/);
    assert.match(text, /Premium/);
    assert.match(text, /aucun droit supplémentaire/i);
    assert.match(text, /Sur devis/);
    assert.match(text, /Standard est la seule offre entreprise gratuite à vie/);
    assert.match(text, /\b0\s*FCFA/);
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewport({ width, height: 900 });
      assert.equal(await page.$eval('[role="dialog"]', element =>
        element.scrollWidth > element.clientWidth), false, `comparison overflow at ${width}px`);
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test("actual pricing page and custom-plan dialog switch natively without activating a purchase", async () => {
  const { page, translations, errors } = await openHarness({ country: "CI" });
  let stage = "opening pricing";
  try {
    await page.click("#screen-pricing");
    await page.waitForFunction(() => document.querySelector("#real-screen h1")?.textContent.trim() === "Choisissez la visibilité adaptée à votre entreprise");
    const text = await page.$eval("#real-screen", element => element.textContent);
    assert.ok(text.includes("aucun paiement n'est prélevé"));
    assert.match(text, /Standard est la seule offre entreprise gratuite à vie/);
    assert.match(text, /\b0\s*FCFA/);
    assert.equal(await page.$$eval("#real-screen article h3", nodes =>
      nodes.filter(node => node.textContent.trim() === "Standard").length), 1);
    stage = "opening French dialog";
    await clickButtonWithText(page, "#real-screen button", "En savoir plus");
    await page.waitForSelector('[role="dialog"]');
    assert.match(await page.$eval('[role="dialog"]', element => element.textContent), /Sur devis/);
    stage = "closing French dialog";
    await clickButtonWithText(page, '[role="dialog"] button', "Fermer");
    await page.waitForSelector('[role="dialog"]', { hidden: true });
    stage = "selecting English";
    await page.click("#select-en");
    await waitForLanguage(page, "en");
    assert.match(await page.$eval("#real-screen", element => element.textContent), /Standard is the only permanently free business plan/);
    stage = "opening English dialog";
    await clickButtonWithText(page, "#real-screen button", "Learn more");
    await page.waitForSelector('[role="dialog"]');
    assert.match(await page.$eval('[role="dialog"]', element => element.textContent), /Custom quote/);
    assert.equal(translations.length, 0);
    assert.deepEqual(errors, []);
  } catch (error) {
    console.error("Pricing test failed at:", stage, await page.$$eval('#real-screen button, [role="dialog"] button', buttons => buttons.map(button => button.textContent)));
    throw error;
  } finally { await page.close(); }
});

test("actual registration keeps entered values when native language changes", async () => {
  const { page, translations, errors } = await openHarness({ mode: "register" });
  try {
    await page.click("#screen-signin");
    await page.waitForSelector('input[placeholder="John"]');
    await page.type('input[placeholder="John"]', "Private Name");
    await page.type('input[type="email"]', "private@example.com");
    await page.click("#select-en");
    await waitForLanguage(page, "en");
    assert.match(await page.$eval("#real-screen", element => element.textContent), /Create Your Account/);
    assert.equal(await page.$eval('input[placeholder="John"]', element => element.value), "Private Name");
    assert.equal(await page.$eval('input[type="email"]', element => element.value), "private@example.com");
    await page.click("#select-fr");
    await waitForLanguage(page, "fr");
    assert.match(await page.$eval("#real-screen", element => element.textContent), /Créez votre compte/);
    assert.equal(translations.length, 0);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test("actual terms page has native no-payment wording in both languages", async () => {
  const { page, errors } = await openHarness();
  try {
    await page.click("#screen-terms");
    await page.waitForFunction(() => document.querySelector("#real-screen h1")?.textContent.trim() === "Conditions d'utilisation");
    assert.match(await page.$eval("#real-screen", element => element.textContent), /Aucun paiement n'est prélevé/);
    await page.click("#select-en");
    await waitForLanguage(page, "en");
    assert.match(await page.$eval("#real-screen", element => element.textContent), /No payment is taken/);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
