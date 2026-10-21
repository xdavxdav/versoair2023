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

test("normalizes trailing slashes", () => {
  const result = injectRouteSeoMeta(html, "/commerce/");

  assert.ok(result.includes("https://www.versoair.com/commerce"));
  assert.ok(!result.includes("/commerce/"));
});

test("leaves unknown routes unchanged", () => {
  assert.equal(injectRouteSeoMeta(html, "/not-a-listed-route"), html);
});
