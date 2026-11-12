import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  UNCLAIMED_NOTICE,
  businessStatusItems,
  parseClaimed,
} from "./business-status";

const CSS_FILE = "client/src/components/business-status-badges.css";

test("verified and unclaimed each get a visible text label", () => {
  const items = businessStatusItems({ verified: true, claimed: false });
  assert.deepEqual(
    items.map((item) => [item.key, item.label]),
    [
      ["verified", "Verified"],
      ["unclaimed", "Unclaimed"],
    ],
  );
  assert.equal(items[1].help, UNCLAIMED_NOTICE);
});

test("a claimed listing is not labelled unclaimed", () => {
  assert.deepEqual(
    businessStatusItems({ verified: true, claimed: true }).map((i) => i.key),
    ["verified"],
  );
});

test("an unknown claimed state never shows Unclaimed", () => {
  for (const claimed of [undefined, null]) {
    assert.deepEqual(
      businessStatusItems({ verified: true, claimed }).map((i) => i.key),
      ["verified"],
    );
  }
});

test("an unverified listing is not labelled verified", () => {
  assert.deepEqual(businessStatusItems({ verified: false, claimed: false }).map((i) => i.key), ["unclaimed"]);
  assert.deepEqual(businessStatusItems({}), []);
});

test("parseClaimed accepts only booleans and their string forms", () => {
  assert.equal(parseClaimed(true), true);
  assert.equal(parseClaimed("true"), true);
  assert.equal(parseClaimed(false), false);
  assert.equal(parseClaimed("false"), false);
  for (const unknown of [undefined, null, "", "yes", 1, 0, {}]) {
    assert.equal(parseClaimed(unknown), undefined, String(unknown));
  }
});

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The first rule for `selector` that declares the palette variables.
function declarations(css: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rules = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .matchAll(new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, "g"));
  for (const rule of rules) {
    if (rule[1].includes("--biz-fg")) {
      return Object.fromEntries(
        [...rule[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
      );
    }
  }
  assert.fail(`${selector} declares no badge palette in ${CSS_FILE}`);
}

test("every badge palette keeps WCAG AA text contrast (4.5:1)", () => {
  const css = readFileSync(CSS_FILE, "utf8");
  const palettes = {
    "light verified": ".biz-status",
    "light unclaimed": '.biz-status[data-status="unclaimed"]',
    "dark verified": '.dark .biz-status[data-surface="auto"]',
    "dark unclaimed": '.dark .biz-status[data-surface="auto"][data-status="unclaimed"]',
  };
  for (const [name, selector] of Object.entries(palettes)) {
    const vars = declarations(css, selector);
    assert.match(vars["--biz-fg"], /^#[0-9a-f]{6}$/i, `${name} text colour`);
    assert.match(vars["--biz-bg"], /^#[0-9a-f]{6}$/i, `${name} background`);
    const ratio = contrast(vars["--biz-fg"], vars["--biz-bg"]);
    assert.ok(ratio >= 4.5, `${name} contrast is ${ratio.toFixed(2)}:1, below 4.5:1`);
  }
});

test("the badge text is large enough to read", () => {
  const css = readFileSync(CSS_FILE, "utf8");
  const size = /\.biz-status\s*\{[^}]*font-size:\s*(\d+(?:\.\d+)?)px/.exec(css);
  assert.ok(size, "the badge sets a pixel font size");
  assert.ok(Number(size[1]) >= 12, `font size ${size[1]}px is below 12px`);
});
