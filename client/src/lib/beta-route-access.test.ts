import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isBetaRoute, isRouteReachable } from "./beta-route-access";

function readSource(relativePath: string): string {
  return readFileSync(new URL(`../../../${relativePath}`, import.meta.url), "utf8");
}

// `<Route path="/old">{() => <Redirect to="/new" />}</Route>`, on one line or several.
function findRedirectAliases(appSource: string) {
  const pattern =
    /<Route\s+path="([^"]+)"\s*>\s*\{\(\)\s*=>\s*(?:\(\s*)?<Redirect\s+to="([^"]+)"\s*\/>\s*(?:\)\s*)?\}\s*<\/Route>/g;
  return [...appSource.matchAll(pattern)].map((match) => ({
    from: match[1],
    to: match[2],
  }));
}

test("legacy sign-in and jobs routes pass the beta route gate", () => {
  assert.equal(isBetaRoute("/signin?redirect=%2Fcontracts"), true);
  assert.equal(isBetaRoute("/jobs"), true);
});

test("protected contractor routes reach their route-level auth guard", () => {
  assert.equal(isBetaRoute("/contracts"), true);
  assert.equal(isBetaRoute("/contracts/quotes"), true);
  assert.equal(isBetaRoute("/artisans-portal"), true);
});

test("route prefixes do not accidentally allow similarly named paths", () => {
  assert.equal(isBetaRoute("/contracts-preview"), false);
  assert.equal(isBetaRoute("/jobs-board"), false);
  assert.equal(isBetaRoute("/ad-campaigns-old"), false);
  assert.equal(isBetaRoute("/inventory-export"), false);
});

test("the campaign and inventory management pages are reachable while the beta scope is frozen", () => {
  for (const path of ["/ad-campaigns", "/ad-campaigns/", "/ad-campaigns?new=1", "/inventory", "/inventory/"]) {
    assert.equal(isBetaRoute(path), true, path);
    assert.equal(isRouteReachable(path), true, path);
  }
});

test("the business request page is reachable while the beta scope is frozen", () => {
  assert.equal(isBetaRoute("/apply/business"), true);
  assert.equal(isBetaRoute("/apply/business?from=careers"), true);
});

test("short and legacy URLs reach their redirect instead of bouncing to the home page", () => {
  for (const alias of ["/support", "/careers", "/contractor", "/signup", "/artisan", "/billing"]) {
    assert.equal(isBetaRoute(alias), true, alias);
    assert.equal(isBetaRoute(`${alias}/`), true, `${alias}/`);
  }
  assert.equal(isBetaRoute("/signup?plan=free"), true);
});

test("aliases are exact, so deeper or similarly named paths stay outside the beta", () => {
  assert.equal(isBetaRoute("/support/tickets"), false);
  assert.equal(isBetaRoute("/careers-board"), false);
  assert.equal(isBetaRoute("/signup/step-2"), false);
});

test("every redirect in App.tsx to a beta page is itself reachable", () => {
  const aliases = findRedirectAliases(readSource("client/src/App.tsx"));
  assert.ok(aliases.length > 10, "the redirect table could not be read from App.tsx");

  const swallowed = aliases
    .filter(({ from, to }) => isBetaRoute(to) && !isBetaRoute(from))
    .map(({ from, to }) => `${from} -> ${to}`);
  assert.deepEqual(swallowed, [], "these redirects are blocked by the beta scope before they can run");
});

test("links in the main navigation never point outside the beta scope", () => {
  const navigationFiles = [
    "client/src/components/ui/navbar.tsx",
    "client/src/components/ui/mobile-menu-bubble.tsx",
    "client/src/components/TopNav.tsx",
    "client/src/components/InstagramNav.tsx",
    "client/src/components/BlogNavbar.tsx",
    "client/src/components/ContentNav.tsx",
    "client/src/components/SmartNavDock.tsx",
  ];
  const link = /\b(?:href|path|to)\s*[:=]\s*\{?\s*["'](\/[^"'$`?#]*)["']/g;

  const deadEnds: string[] = [];
  for (const file of navigationFiles) {
    const targets = [...readSource(file).matchAll(link)].map((match) => match[1]);
    assert.ok(targets.length > 0, `no navigation links found in ${file}`);
    for (const target of targets) {
      if (!isBetaRoute(target)) deadEnds.push(`${file}: ${target}`);
    }
  }
  assert.deepEqual(deadEnds, []);
});

test("isRouteReachable tells links apart from pages the beta scope hides", () => {
  assert.equal(isRouteReachable("/support"), true);
  assert.equal(isRouteReachable("/services/contractors"), true);
  assert.equal(isRouteReachable("/user/"), false);
  assert.equal(isRouteReachable("/user/42"), false);
});
