import puppeteer from "puppeteer";

(async function () {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

  await page.goto("http://localhost:5003/versoai", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  // give React/Vite some extra time to hydrate and render components
  await new Promise((r) => setTimeout(r, 3000));

  // Quick immediate inspection for debugging
  const _immediateCount = await page.evaluate(
    () => document.querySelectorAll(".planet").length,
  );
  console.log("PAGE LOG: immediate planet count ->", _immediateCount);
  const _hasReady = await page.evaluate(
    () => !!document.querySelector('[data-solar-ready="1"]'),
  );
  console.log("PAGE LOG: data-solar-ready present ->", _hasReady);

  // Wait for either explicit readiness signal (data-solar-ready="1") or for planet nodes
  // to appear in the DOM (some environments may not set the readiness attribute).
  try {
    await page.waitForFunction(
      () =>
        !!document.querySelector('[data-solar-ready="1"]') ||
        !!document.querySelector(".planet"),
      { timeout: 60000 },
    );
  } catch (err) {
    console.log(
      "PAGE LOG: waitForFunction timed out; dumping body snippet for debug...",
    );
    const bodySnippet = await page.evaluate(() =>
      document.body.innerHTML.slice(0, 4000),
    );
    console.log("PAGE LOG: body snippet:", bodySnippet);
    throw err;
  }

  // Give a short pause for any first-frame layout work
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(1000);

  // Now query planets (should be present once solar-ready is set)
  const planets = await page.$$eval(".planet", (els) =>
    els.map((el) => el.getAttribute("data-planet-id")),
  );
  console.log("Planets found:", planets);

  const results = [];

  for (const planetId of planets) {
    console.log(`-- Testing planet: ${planetId}`);
    const planetSelector = `.planet[data-planet-id="${planetId}"] .planet-hit`;
    await page.waitForSelector(planetSelector, { timeout: 5000 });

    // Click and allow UI to render/present info card
    // Try dispatching a DOM click event directly (more robust across environments)
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.click();
    }, planetSelector);
    await sleep(1400);

    // Inspect the planet info card content and visibility
    const infoSelector = `.planet[data-planet-id="${planetId}"] .planet-info`;
    const got = await page.evaluate(
      (sel, planetId) => {
        const el = document.querySelector(sel);
        const planetNode = document.querySelector(
          `.planet[data-planet-id="${planetId}"]`,
        );
        const active = planetNode
          ? planetNode.getAttribute("data-active")
          : null;
        if (!el) return { visible: false, text: null, active };
        const style = window.getComputedStyle(el);
        const visible =
          Number(style.opacity) > 0 ||
          String(style.transform).includes("scale(1)");
        return {
          visible,
          text: el.innerText.slice(0, 800),
          active,
          computed: {
            opacity: style.opacity,
            transform: style.transform,
            pointerEvents: style.pointerEvents,
            display: style.display,
            visibility: style.visibility,
          },
        };
      },
      infoSelector,
      planetId,
    );

    results.push({ planetId, info: got });
  }

  console.log("Verification results:");
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();
