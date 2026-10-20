import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

type TestScript = {
  id: string;
  src: string;
  async: boolean;
  onerror?: () => void;
};

const trackerSource = await readFile(
  new URL("../../public/consent-trackers.js", import.meta.url),
  "utf8",
);

function createTrackerEnvironment(savedConsent: string | null = null) {
  const scripts: TestScript[] = [];
  const listeners: Record<string, () => void> = {};
  const elements = new Map<string, TestScript>();
  const document = {
    head: {
      appendChild(script: TestScript) {
        scripts.push(script);
        elements.set(script.id, script);
      },
    },
    createElement(): TestScript {
      return { id: "", src: "", async: false };
    },
    getElementById(id: string) {
      return elements.get(id) || null;
    },
  };
  const window: {
    localStorage: { getItem: (key: string) => string | null };
    addEventListener: (name: string, listener: () => void) => void;
    dataLayer?: unknown[];
  } = {
    localStorage: {
      getItem(key) {
        return key === "cookieConsent" ? savedConsent : null;
      },
    },
    addEventListener(name, listener) {
      listeners[name] = listener;
    },
  };

  vm.runInNewContext(trackerSource, { window, document, console, Date });
  return {
    scripts,
    window,
    changeConsent(consent: string) {
      savedConsent = consent;
      listeners["verso-cookie-consent-change"]();
    },
  };
}

test("optional trackers stay unloaded until consent is accepted", () => {
  const env = createTrackerEnvironment();
  assert.deepEqual(env.scripts, []);

  env.changeConsent("declined");
  assert.deepEqual(env.scripts, []);
});

test("accepting consent loads Google Analytics and Klaviyo once", () => {
  const env = createTrackerEnvironment();
  env.changeConsent("accepted");
  env.changeConsent("accepted");

  assert.equal(env.scripts.length, 2);
  assert.equal(
    env.scripts.find((script) => script.id === "verso-google-analytics")?.src,
    "https://www.googletagmanager.com/gtag/js?id=G-V74QCY3MYD",
  );
  assert.match(
    env.scripts.find((script) => script.id === "verso-klaviyo")?.src ?? "",
    /^https:\/\/static\.klaviyo\.com\//,
  );
  assert.equal(env.window.dataLayer?.length, 4);
});

test("a previously accepted preference loads trackers on page startup", () => {
  const env = createTrackerEnvironment("accepted");
  assert.equal(env.scripts.length, 2);
});
