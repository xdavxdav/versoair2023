import assert from "node:assert/strict";
import test from "node:test";

import { injectRouteSeoMeta, ROUTE_SEO_META } from "./route-seo-meta.ts";
import { PUBLIC_STATIC_ROUTES } from "./seo-routes.ts";

const html = "<html><head><title>Default</title></head><body></body></html>";

test("every public sitemap route has server-injected SEO metadata", () => {
  assert.deepEqual(
    Object.keys(ROUTE_SEO_META).sort(),
    PUBLIC_STATIC_ROUTES.map(({ path }) => path).sort(),
  );
});

test("only the homepage carries server-rendered Organization and WebSite JSON-LD", () => {
  const home = injectRouteSeoMeta(html, "/");
  const match = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(home);
  assert.ok(match, "homepage has JSON-LD");
  const nodes = JSON.parse(match[1]) as Array<{ "@type": string; url: string }>;
  assert.deepEqual(nodes.map((node) => node["@type"]), ["Organization", "WebSite"]);
  assert.ok(nodes.every((node) => node.url === "https://www.versoair.com"));
  assert.ok(!match[0].includes("data-rh"), "react-helmet-async must not strip it");
  assert.ok(!match[1].includes("<"), "no raw < inside the script");
  assert.ok(!injectRouteSeoMeta(html, "/about").includes("ld+json"));
});

test("injects complete canonical metadata for every supported route", () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const [route, meta] of Object.entries(ROUTE_SEO_META)) {
    const canonical = `https://www.versoair.com${route}`;
    const result = injectRouteSeoMeta(html, route);

    const escapedTitle = meta.title.replace(/&/g, "&amp;");
    const escapedDescription = meta.description.replace(/&/g, "&amp;");
    assert.ok(result.includes(`<title>${escapedTitle}</title>`), route);
    assert.ok(
      result.includes(
        `<meta name="description" content="${escapedDescription}" data-rh="true">`,
      ),
      route,
    );
    assert.ok(
      result.includes(`<link rel="canonical" href="${canonical}" data-rh="true">`),
      route,
    );
    assert.ok(
      result.includes(`<meta property="og:url" content="${canonical}" data-rh="true">`),
      route,
    );
    assert.ok(
      result.includes(
        `<meta property="og:title" content="${escapedTitle}" data-rh="true">`,
      ),
      route,
    );
    assert.ok(
      result.includes('<meta name="twitter:card" content="summary_large_image" data-rh="true">'),
      route,
    );
    assert.ok(!titles.has(meta.title.toLowerCase()), `duplicate title: ${route}`);
    assert.ok(
      !descriptions.has(meta.description.toLowerCase()),
      `duplicate description: ${route}`,
    );
    titles.add(meta.title.toLowerCase());
    descriptions.add(meta.description.toLowerCase());
  }
});

test("only the homepage carries the Google Search Console verification tag", () => {
  const home = injectRouteSeoMeta(html, "/");
  const tag =
    '<meta name="google-site-verification" content="TMuw3uv9xRLhhm5pjMzM197ZWA5csbpxRzf2YGV9_S4">';
  assert.ok(home.includes(tag), "homepage has the verification meta tag");
  assert.ok(!home.includes(`${tag.slice(0, -1)} data-rh`), "no data-rh so it is not stripped");
  assert.ok(!injectRouteSeoMeta(html, "/about").includes("google-site-verification"));
});

test("normalizes trailing slashes", () => {
  const result = injectRouteSeoMeta(html, "/commerce/");

  assert.ok(result.includes("https://www.versoair.com/commerce"));
  assert.ok(!result.includes("/commerce/"));
});

test("leaves unknown routes unchanged", () => {
  assert.equal(injectRouteSeoMeta(html, "/not-a-listed-route"), html);
});
