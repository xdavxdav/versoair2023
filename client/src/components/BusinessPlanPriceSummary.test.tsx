import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BusinessPlanPriceSummary from "./BusinessPlanPriceSummary";

Object.assign(globalThis, { React });

test("BusinessPlanPriceSummary shows combined monthly and annual figures when cycle is omitted", () => {
  const html = renderToStaticMarkup(<BusinessPlanPriceSummary offer="essential" />);
  assert.match(html, /CA\$43\/mo · CA\$430\/yr/);
  assert.match(html, /180,000 FCFA\/yr/);
  assert.match(html, /€27\.44\/mo · €274\.41\/yr/);
});

test("BusinessPlanPriceSummary shows only monthly CAD and derived EUR amounts in monthly mode", () => {
  const html = renderToStaticMarkup(
    <BusinessPlanPriceSummary offer="verified" cycle="monthly" />,
  );
  assert.match(html, /CA\$96\/mo/);
  assert.doesNotMatch(html, /CA\$960\/yr/);
  assert.match(html, /400,000 FCFA\/yr/);
  assert.match(html, /€60\.98\/mo/);
  assert.doesNotMatch(html, /€609\.80\/yr/);
});

test("BusinessPlanPriceSummary shows only annual CAD and derived EUR amounts in annual mode", () => {
  const html = renderToStaticMarkup(
    <BusinessPlanPriceSummary offer="max" cycle="annual" />,
  );
  assert.match(html, /CA\$1870\/yr/);
  assert.doesNotMatch(html, /CA\$187\/mo/);
  assert.match(html, /780,000 FCFA\/yr/);
  assert.match(html, /€1189\.10\/yr/);
  assert.doesNotMatch(html, /€118\.91\/mo/);
});

test("BusinessPlanPriceSummary preserves Standard free and Enterprise custom-quote copy across cycles", () => {
  assert.match(
    renderToStaticMarkup(<BusinessPlanPriceSummary offer="free" cycle="annual" />),
    /Free everywhere/,
  );
  assert.match(
    renderToStaticMarkup(
      <BusinessPlanPriceSummary offer="enterprise" cycle="monthly" />,
    ),
    /Custom quote in CAD, FCFA, or EUR/,
  );
});

test("pricing page renders a single unified offer grid and PlanCheckoutButton guards dynamic cycle labels from Google Translate", () => {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const pricingSource = fs.readFileSync(
    path.join(repoRoot, "client/src/pages/pricing.tsx"),
    "utf8",
  );
  const mapCount = (pricingSource.match(/GEOADMIN_OFFER_ORDER\.map/g) ?? []).length;
  assert.equal(mapCount, 1);
  assert.match(pricingSource, /<BusinessPlanPriceSummary offer=\{tier\} cycle=\{cycle\} \/>/);

  const buttonSource = fs.readFileSync(
    path.join(repoRoot, "client/src/components/PlanCheckoutButton.tsx"),
    "utf8",
  );
  assert.match(buttonSource, /key=\{`\$\{tier\}-\$\{cycle\}-\$\{currentLang\}`\}/);
  assert.match(buttonSource, /translate=\{native \? "no" : undefined\}/);
  assert.match(buttonSource, /className=\{native \? "notranslate" : undefined\}/);
});
