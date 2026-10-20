import assert from "node:assert/strict";
import test from "node:test";

import { injectBusinessRouteSeoMeta } from "./business-route-seo.ts";

test("renders crawlable metadata and LocalBusiness JSON-LD for a public business", () => {
  const html = "<html><head><title>Default</title></head><body></body></html>";
  const result = injectBusinessRouteSeoMeta(html, {
    id: 42,
    name: `A&B <Studio>`,
    description: "A <strong>verified</strong> business & community studio.",
    category: "Professional Service",
    city: "Toronto",
    country: "Canada",
    countryCode: "CA",
    rating: 4.8,
    reviewCount: 12,
  });

  assert.ok(result.includes("<title>A&amp;B &lt;Studio&gt; | Professional Service in Toronto, Canada | VersoAir</title>"));
  assert.ok(
    result.includes(
      '<link rel="canonical" href="https://www.versoair.com/business/42" data-rh="true">',
    ),
  );
  assert.ok(result.includes('content="A verified business &amp; community studio."'));

  const jsonLdMatch = result.match(
    /<script type="application\/ld\+json" data-rh="true">([\s\S]*?)<\/script>/,
  );
  assert.ok(jsonLdMatch);
  const jsonLd = JSON.parse(jsonLdMatch[1]);
  assert.equal(jsonLd["@type"], "LocalBusiness");
  assert.equal(jsonLd.name, "A&B <Studio>");
  assert.equal(jsonLd.url, "https://www.versoair.com/business/42");
  assert.equal(jsonLd.aggregateRating.ratingCount, 12);
});
