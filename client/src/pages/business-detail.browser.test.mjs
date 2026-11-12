import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { createServer } from "vite";

const BUSINESS_ID = 6;
const BUSINESS_PATH = `/business/${BUSINESS_ID}`;
const OWNER = {
  id: "owner-fixture",
  email: "owner@example.test",
  name: "Owner Fixture",
  role: "user",
};
const SIGNED_IN_OTHER = {
  id: "other-fixture",
  email: "other@example.test",
  name: "Other Fixture",
  role: "user",
};
const FIXTURE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#0ea5e9"/></svg>';

let server;
let browser;
let origin;
let tempDir;
let imageFile;

before(async () => {
  const configFile = fileURLToPath(new URL("../../../vite.config.ts", import.meta.url));
  // node_modules may be symlinked across worktrees, so keep Vite's dependency cache out of it.
  server = await createServer({
    configFile,
    cacheDir: join(tmpdir(), `versoair-vite-test-${createHash("sha1").update(configFile).digest("hex").slice(0, 12)}`),
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await server.listen();
  origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await puppeteer.launch({ headless: true });
  tempDir = mkdtempSync(join(tmpdir(), "business-media-"));
  imageFile = join(tempDir, "fixture.svg");
  writeFileSync(imageFile, FIXTURE_SVG);
});

after(async () => {
  await browser?.close();
  await server?.close();
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

function createFakeApi({ user = null, ownsBusiness = false, canEdit = false, business = {} }) {
  return {
    user,
    access: { canEdit, ownsBusiness },
    business: {
      id: BUSINESS_ID,
      name: "Fixture Business",
      owner_id: OWNER.id,
      status: "approved",
      category_id: null,
      description: "Fixture business for media controls.",
      logo_url: null,
      cover_url: null,
      services: [],
      reviews: [],
      tags: [],
      attributes: {},
      ...business,
    },
    requests: [],
    accessCalls: 0,
    logoUploadRefusal: null,
  };
}

function respondJson(request, status, body) {
  return request.respond({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function openBusinessPage(context, api) {
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument(() => localStorage.setItem("fsa_selected_language", "en"));
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) return void request.abort();
    if (request.resourceType() === "document") return void request.continue();

    if (url.pathname === "/api/page-readiness") {
      return respondJson(request, 200, { blockedPaths: [] });
    }
    if (url.pathname === "/auth/session") {
      return api.user
        ? respondJson(request, 200, { success: true, user: api.user })
        : respondJson(request, 401, { success: false });
    }
    if (url.pathname === `/api/businesses/${BUSINESS_ID}/fiche/access`) {
      api.accessCalls += 1;
      return api.user
        ? respondJson(request, 200, api.access)
        : respondJson(request, 401, { success: false });
    }
    if (url.pathname === `/api/businesses/${BUSINESS_ID}` && request.method() === "GET") {
      return respondJson(request, 200, api.business);
    }

    if (url.pathname === "/api/business-cover/upload" && request.method() === "POST") {
      api.requests.push({ method: "POST", path: url.pathname, body: (await request.fetchPostData()) ?? "" });
      api.business.cover_url = `/api/business-cover/file/${BUSINESS_ID}?v=${api.requests.length}`;
      return respondJson(request, 200, { success: true, message: "Cover photo updated." });
    }
    if (url.pathname === "/api/business-logo/upload" && request.method() === "POST") {
      api.requests.push({ method: "POST", path: url.pathname, body: (await request.fetchPostData()) ?? "" });
      if (api.logoUploadRefusal) {
        return respondJson(request, 403, { success: false, message: api.logoUploadRefusal });
      }
      api.business.logo_url = `/api/business-logo/file/${BUSINESS_ID}?v=${api.requests.length}`;
      return respondJson(request, 200, { success: true, message: "Logo updated." });
    }
    if (url.pathname === `/api/business-logo/${BUSINESS_ID}` && request.method() === "DELETE") {
      api.requests.push({ method: "DELETE", path: url.pathname, body: "" });
      api.business.logo_url = null;
      return respondJson(request, 200, { success: true, message: "Logo removed." });
    }
    if (url.pathname.startsWith("/api/business-cover/file/") || url.pathname.startsWith("/api/business-logo/file/")) {
      return void request.respond({ status: 200, contentType: "image/svg+xml", body: FIXTURE_SVG });
    }

    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
      return respondJson(request, 404, { success: false, message: "Not found" });
    }
    return void request.continue();
  });
  return { page, pageErrors };
}

async function gotoBusiness(page) {
  await page.goto(`${origin}${BUSINESS_PATH}`, { waitUntil: "domcontentloaded" });
  try {
    await page.waitForFunction(
      () => [...document.querySelectorAll("h1")].some((h) => h.textContent?.includes("Fixture Business")),
      { timeout: 15000 },
    );
  } catch (error) {
    const visible = await page.evaluate(() => document.body.innerText.slice(0, 400));
    throw new Error(`Business page did not render. Visible text: ${JSON.stringify(visible)}`, { cause: error });
  }
}

async function waitFor(condition, label) {
  const deadline = Date.now() + 10000;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function clickMenuItem(page, label) {
  const item = await page.waitForFunction(
    (text) => [...document.querySelectorAll('[role="menuitem"]')].find((el) => el.textContent?.trim() === text),
    {},
    label,
  );
  await item.asElement().click();
}

async function menuItemLabels(page, triggerTestId) {
  // A menu that just closed stays mounted during its exit animation, and Radix blocks clicks on the page until it unmounts.
  await page.waitForSelector('[role="menu"]', { hidden: true });
  await page.waitForFunction(
    (id) => !document.querySelector(`[data-testid="${id}"]`)?.disabled,
    {},
    triggerTestId,
  );
  await page.click(`[data-testid="${triggerTestId}"]`);
  await page.waitForSelector('[role="menu"]', { visible: true });
  const labels = await page.$$eval('[role="menuitem"]', (items) =>
    items.map((el) => el.textContent?.trim()),
  );
  await page.keyboard.press("Escape");
  await page.waitForSelector('[role="menu"]', { hidden: true });
  return labels;
}

function assertNoMediaControls(page) {
  return page.evaluate(() => ({
    logoMenu: Boolean(document.querySelector('[data-testid="business-logo-menu"]')),
    coverMenu: Boolean(document.querySelector('[data-testid="business-cover-menu"]')),
    coverBanner: Boolean(document.querySelector('[data-testid="business-cover"]')),
  }));
}

test("visitors see no logo or cover controls", { timeout: 60000 }, async () => {
  const context = await browser.createBrowserContext();
  try {
    const api = createFakeApi({});
    const { page, pageErrors } = await openBusinessPage(context, api);
    await gotoBusiness(page);
    const state = await assertNoMediaControls(page);
    assert.deepEqual(state, { logoMenu: false, coverMenu: false, coverBanner: false });
    assert.equal(api.accessCalls, 0);
    assert.deepEqual(pageErrors, []);
  } finally {
    await context.close();
  }
});

test("signed-in users who do not own the business see no logo or cover controls", { timeout: 60000 }, async () => {
  const context = await browser.createBrowserContext();
  try {
    const api = createFakeApi({ user: SIGNED_IN_OTHER, canEdit: false, ownsBusiness: false });
    const { page } = await openBusinessPage(context, api);
    await gotoBusiness(page);
    await waitFor(() => api.accessCalls > 0, "the fiche access check");
    await new Promise((resolve) => setTimeout(resolve, 300));
    const state = await assertNoMediaControls(page);
    assert.deepEqual(state, { logoMenu: false, coverMenu: false, coverBanner: false });
  } finally {
    await context.close();
  }
});

test("owner adds a cover photo from the cover menu", { timeout: 60000 }, async () => {
  const context = await browser.createBrowserContext();
  try {
    const api = createFakeApi({ user: OWNER, ownsBusiness: true, canEdit: true });
    const { page, pageErrors } = await openBusinessPage(context, api);
    await gotoBusiness(page);
    await page.waitForSelector('[data-testid="business-cover-menu"]', { visible: true });
    assert.equal(await page.$('[data-testid="business-cover"] img'), null);

    const labels = await menuItemLabels(page, "business-cover-menu");
    assert.deepEqual(labels, ["Add cover photo"]);

    await page.click('[data-testid="business-cover-menu"]');
    const [chooser] = await Promise.all([
      page.waitForFileChooser({ timeout: 5000 }),
      clickMenuItem(page, "Add cover photo"),
    ]);
    await chooser.accept([imageFile]);

    await page.waitForSelector('[data-testid="business-cover"] img', { visible: true });
    await page.waitForFunction(() => {
      const img = document.querySelector('[data-testid="business-cover"] img');
      return Boolean(img?.complete && img.naturalWidth > 0);
    });

    const upload = api.requests.find((r) => r.path === "/api/business-cover/upload");
    assert.ok(upload, "cover upload should be sent to /api/business-cover/upload");
    assert.equal(upload.method, "POST");
    assert.match(upload.body, /name="businessId"/);
    assert.match(upload.body, /name="cover"/);
    assert.deepEqual(pageErrors, []);
  } finally {
    await context.close();
  }
});

test("owner sees the paid-tier refusal when a logo upload is rejected", { timeout: 60000 }, async () => {
  const context = await browser.createBrowserContext();
  try {
    const refusal = "Logo uploads require a paid plan (Essential or above).";
    const api = createFakeApi({ user: OWNER, ownsBusiness: true, canEdit: true });
    api.logoUploadRefusal = refusal;
    const { page } = await openBusinessPage(context, api);
    await gotoBusiness(page);
    await page.waitForSelector('[data-testid="business-logo-menu"]', { visible: true });

    await page.click('[data-testid="business-logo-menu"]');
    const [chooser] = await Promise.all([
      page.waitForFileChooser({ timeout: 5000 }),
      clickMenuItem(page, "Add logo"),
    ]);
    await chooser.accept([imageFile]);

    await page.waitForFunction(
      (text) => document.body.innerText.includes(text),
      { timeout: 10000 },
      refusal,
    );
    await page.waitForFunction(() => !document.querySelector('[data-testid="business-logo-menu"]')?.disabled);
    assert.equal(await page.$('[alt="Fixture Business"]'), null, "logo should not change after a refusal");

    const upload = api.requests.find((r) => r.path === "/api/business-logo/upload");
    assert.ok(upload, "logo upload should be attempted");
  } finally {
    await context.close();
  }
});

test("owner removes the logo and the menu reflects it", { timeout: 60000 }, async () => {
  const context = await browser.createBrowserContext();
  try {
    const api = createFakeApi({
      user: OWNER,
      ownsBusiness: true,
      canEdit: true,
      business: { logo_url: `/api/business-logo/file/${BUSINESS_ID}?v=0` },
    });
    const { page } = await openBusinessPage(context, api);
    await gotoBusiness(page);
    await page.waitForSelector('[data-testid="business-logo-menu"]', { visible: true });

    assert.deepEqual(await menuItemLabels(page, "business-logo-menu"), ["Change logo", "Remove logo"]);

    await page.click('[data-testid="business-logo-menu"]');
    await page.waitForSelector('[role="menuitem"]', { visible: true });
    await clickMenuItem(page, "Remove logo");

    await waitFor(() => api.requests.some((r) => r.method === "DELETE"), "the logo delete request");
    await page.waitForFunction(() => !document.querySelector('img[src*="/api/business-logo/file/"]'));
    assert.deepEqual(await menuItemLabels(page, "business-logo-menu"), ["Add logo"]);

    const remove = api.requests.find((r) => r.method === "DELETE");
    assert.equal(remove.path, `/api/business-logo/${BUSINESS_ID}`);
  } finally {
    await context.close();
  }
});

test("business page switches between About, Details and Reviews tabs", { timeout: 60000 }, async () => {
  const context = await browser.createBrowserContext();
  try {
    const api = createFakeApi({
      business: { address: "1 Fixture Street", phone: "+1 555 0100", email: "fixture@example.test" },
    });
    const { page, pageErrors } = await openBusinessPage(context, api);
    await gotoBusiness(page);

    const tabs = await page.$$eval('[role="tab"]', (els) => els.map((el) => el.textContent?.trim()));
    assert.deepEqual(tabs, ["About", "Details", "Reviews"]);

    await clickTab(page, "Details");
    assert.match(await activePanelText(page), /No additional details yet/);
    const rail = await page.$eval('[data-testid="business-fiche"]', (el) => el.textContent || "");
    assert.match(rail, /1 Fixture Street/);
    assert.match(rail, /fixture@example\.test/);
    assert.match(rail, /VI-0101|VI-\d{4}/);

    await clickTab(page, "Reviews");
    const reviews = await activePanelText(page);
    assert.match(reviews, /No reviews yet/);
    assert.doesNotMatch(reviews, /1 Fixture Street/);
    assert.deepEqual(pageErrors, []);
  } finally {
    await context.close();
  }
});

test("commerce sector gives the business page its blue palette", { timeout: 60000 }, async () => {
  await assertFicheSectorPalette(
    { sector_slug: "commerce" },
    {
      accentHex: "#2563eb",
      accentRgb: "rgb(37, 99, 235)",
      softRgb: "rgb(239, 246, 255)",
      borderRgb: "rgb(191, 219, 254)",
    },
  );
});

test("health sector gives the business page its red palette", { timeout: 60000 }, async () => {
  await assertFicheSectorPalette(
    { sector_slug: "health" },
    {
      accentHex: "#b91c1c",
      accentRgb: "rgb(185, 28, 28)",
      softRgb: "rgb(254, 242, 242)",
      borderRgb: "rgb(254, 202, 202)",
    },
  );
});

test("businesses without a sector keep the house palette", { timeout: 60000 }, async () => {
  await assertFicheSectorPalette(
    {},
    {
      accentHex: "#4b5563",
      accentRgb: "rgb(75, 85, 99)",
      softRgb: "rgb(249, 250, 251)",
      borderRgb: "rgb(229, 231, 235)",
    },
  );
});

async function assertFicheSectorPalette(business, expected) {
  const context = await browser.createBrowserContext();
  try {
    const api = createFakeApi({ business: { phone: "+1 555 0100", ...business } });
    const { page, pageErrors } = await openBusinessPage(context, api);
    await gotoBusiness(page);

    const accent = await page.$eval('[data-testid="business-fiche"]', (el) =>
      el.style.getPropertyValue("--fiche-accent").trim(),
    );
    assert.equal(accent, expected.accentHex);

    const ctaBackgrounds = await page.$$eval('[data-testid="business-fiche"] a.bg-fiche-accent', (els) =>
      els.map((el) => getComputedStyle(el).backgroundColor),
    );
    assert.ok(ctaBackgrounds.length > 0, "expected at least one accent call-to-action");
    assert.deepEqual([...new Set(ctaBackgrounds)], [expected.accentRgb]);

    const pageBackground = await page.$eval('[data-testid="business-fiche"]', (el) =>
      getComputedStyle(el).backgroundColor,
    );
    assert.equal(pageBackground, "rgb(246, 241, 233)");

    const borderColours = await page.$$eval('[data-testid="business-fiche"] .border-fiche-border', (els) =>
      els.map((el) => getComputedStyle(el).borderTopColor),
    );
    assert.ok(borderColours.length > 0, "expected sector-bordered cards");
    assert.deepEqual([...new Set(borderColours)], [expected.borderRgb]);
    assert.deepEqual(pageErrors, []);
  } finally {
    await context.close();
  }
}

async function clickTab(page, label) {
  const tab = await page.waitForFunction(
    (text) => [...document.querySelectorAll('[role="tab"]')].find((el) => el.textContent?.trim() === text),
    {},
    label,
  );
  await tab.asElement().click();
  await page.waitForFunction(
    (text) =>
      [...document.querySelectorAll('[role="tab"]')]
        .find((el) => el.textContent?.trim() === text)
        ?.getAttribute("aria-selected") === "true",
    {},
    label,
  );
}

function activePanelText(page) {
  return page.$eval('[role="tabpanel"][data-state="active"]', (el) => el.innerText);
}
