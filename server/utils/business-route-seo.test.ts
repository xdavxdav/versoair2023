import assert from "node:assert/strict";
import test from "node:test";

import { getTableColumns } from "drizzle-orm";

import { businesses } from "../../shared/schema";
import {
  buildBusinessSeoQuery,
  businessSeoRecordFromRow,
  injectBusinessNotFoundSeoMeta,
  injectBusinessRouteSeoMeta,
  parseBusinessSeoPath,
} from "./business-route-seo.ts";

process.env.PRODUCTION_URL = "https://www.versoair.com";
process.env.VITE_DIRECTORY_COUNTRY_CODE = "CA";

const shell = "<html><head><title>Default</title></head><body></body></html>";

const publicBusiness = {
  id: 42,
  name: "A&B <Studio>",
  description: "A <strong>verified</strong> business & community studio.",
  address: "1 Main St",
  location: "Toronto, CA",
  phone: "+1 416 555 0100",
  email: "hello@example.ca",
  rating: 4.8,
  reviewCount: 12,
};

function parseJsonLd(html: string): Record<string, any> {
  const match = html.match(
    /<script type="application\/ld\+json" data-rh="true">([\s\S]*?)<\/script>/,
  );
  assert.ok(match, "missing LocalBusiness JSON-LD");
  return JSON.parse(match[1]);
}

test("renders crawlable metadata and LocalBusiness JSON-LD for a public business", () => {
  const html = injectBusinessRouteSeoMeta(shell, publicBusiness);

  assert.ok(html.includes("<title>A&amp;B &lt;Studio&gt; | VersoAir</title>"));
  assert.ok(
    html.includes(
      '<link rel="canonical" href="https://www.versoair.com/business/42" data-rh="true">',
    ),
  );
  assert.ok(
    html.includes(
      '<meta name="description" content="A &lt;strong&gt;verified&lt;/strong&gt; business &amp; community studio. Toronto, CA • 1 Main St" data-rh="true">',
    ),
  );
  assert.ok(
    html.includes(
      '<meta property="og:image" content="https://www.versoair.com/Logo-page.png" data-rh="true">',
    ),
  );
  assert.deepEqual(parseJsonLd(html), {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "A&B <Studio>",
    description: "A <strong>verified</strong> business & community studio.",
    url: "https://www.versoair.com/business/42",
    telephone: "+1 416 555 0100",
    email: "hello@example.ca",
    address: {
      "@type": "PostalAddress",
      streetAddress: "1 Main St",
      addressLocality: "Toronto, CA",
    },
    aggregateRating: { "@type": "AggregateRating", ratingValue: 4.8, reviewCount: 12 },
  });
});

test("business names containing replacement patterns are inserted literally", () => {
  const name = "Save $1 $& $' $$ Co";
  const html = injectBusinessRouteSeoMeta(shell, { ...publicBusiness, name });

  assert.ok(html.includes("<title>Save $1 $&amp; $&#39; $$ Co | VersoAir</title>"));
  assert.equal(parseJsonLd(html).name, name);
});

test("LocalBusiness JSON-LD cannot close its own script tag", () => {
  const name = "</script><script>alert(1)</script>";
  const html = injectBusinessRouteSeoMeta(shell, { ...publicBusiness, name });

  assert.equal(html.split("<script").length - 1, 1);
  assert.equal(parseJsonLd(html).name, name);
});

test("meta description is capped at 160 characters", () => {
  const html = injectBusinessRouteSeoMeta(shell, {
    ...publicBusiness,
    description: "x".repeat(300),
    location: null,
    address: null,
  });
  const content = html.match(/<meta name="description" content="([^"]*)"/)?.[1];

  assert.equal(content?.length, 160);
});

test("falls back to the default description and omits empty optional fields", () => {
  const html = injectBusinessRouteSeoMeta(shell, {
    ...publicBusiness,
    description: null,
    location: null,
    address: null,
    phone: null,
    email: null,
    rating: 0,
    reviewCount: 0,
  });

  assert.ok(
    html.includes(
      '<meta name="description" content="Discover business details, contact information, and service highlights on VersoAir." data-rh="true">',
    ),
  );
  const jsonLd = parseJsonLd(html);
  for (const key of ["description", "telephone", "email", "address", "aggregateRating"]) {
    assert.equal(jsonLd[key], undefined, key);
  }
});

test("aggregateRating needs both a stored rating and stored reviews", () => {
  assert.equal(
    parseJsonLd(injectBusinessRouteSeoMeta(shell, { ...publicBusiness, reviewCount: 0 }))
      .aggregateRating,
    undefined,
  );
  assert.equal(
    parseJsonLd(injectBusinessRouteSeoMeta(shell, { ...publicBusiness, rating: 0 }))
      .aggregateRating,
    undefined,
  );
  assert.deepEqual(
    parseJsonLd(
      injectBusinessRouteSeoMeta(shell, { ...publicBusiness, rating: 4.84, reviewCount: 3 }),
    ).aggregateRating,
    { "@type": "AggregateRating", ratingValue: 4.8, reviewCount: 3 },
  );
});

test("every SEO tag except the title carries data-rh and appears once", () => {
  const html = injectBusinessRouteSeoMeta(shell, publicBusiness);
  const tags = html.match(/<(meta|link|script)\b[^>]*>/g) ?? [];

  assert.equal(tags.length, 13);
  for (const tag of tags) assert.ok(tag.includes('data-rh="true"'), tag);
  for (const marker of [
    'name="description"',
    'rel="canonical"',
    'property="og:url"',
    'name="twitter:card"',
    "application/ld+json",
  ]) {
    assert.equal(html.split(marker).length - 1, 1, marker);
  }
});

test("not-found shell carries generic tags only", () => {
  const html = injectBusinessNotFoundSeoMeta(shell);

  assert.ok(html.includes("<title>Business Not Found | VersoAir</title>"));
  assert.ok(
    html.includes(
      '<meta name="description" content="The requested business profile is unavailable or no longer listed on VersoAir." data-rh="true">',
    ),
  );
  assert.doesNotMatch(html, /rel="canonical"|og:url|application\/ld\+json/);
});

test("parseBusinessSeoPath accepts only numeric business detail paths", () => {
  assert.deepEqual(parseBusinessSeoPath("/business/6"), { kind: "id", id: 6 });
  assert.deepEqual(parseBusinessSeoPath("/business/6/"), { kind: "id", id: 6 });
  assert.deepEqual(parseBusinessSeoPath("/business/6?x=1"), { kind: "id", id: 6 });
  assert.deepEqual(parseBusinessSeoPath("/business/0006"), { kind: "id", id: 6 });
  assert.deepEqual(parseBusinessSeoPath("/business/2147483647"), {
    kind: "id",
    id: 2147483647,
  });

  assert.deepEqual(parseBusinessSeoPath("/business/abc"), { kind: "none" });
  assert.deepEqual(parseBusinessSeoPath("/business/6/edit"), { kind: "none" });
  assert.deepEqual(parseBusinessSeoPath("/businesses/6"), { kind: "none" });

  assert.deepEqual(parseBusinessSeoPath("/business/0"), { kind: "invalid" });
  assert.deepEqual(parseBusinessSeoPath("/business/2147483648"), { kind: "invalid" });
  assert.deepEqual(parseBusinessSeoPath("/business/99999999999999999999"), {
    kind: "invalid",
  });
});

test("buildBusinessSeoQuery selects only publication fields that exist on businesses", () => {
  const { text, values } = buildBusinessSeoQuery(6);
  assert.deepEqual(values, [6]);
  assert.doesNotMatch(text, /\bJOIN\b/i);

  const selectList = text.match(/SELECT([\s\S]*?)FROM/)?.[1] ?? "";
  assert.deepEqual(
    selectList.split(",").map((part) => part.trim()),
    [
      "b.id",
      "b.name",
      "b.description",
      "b.address",
      "b.location",
      "b.phone",
      "b.email",
      "b.rating",
      "b.reviews_count",
    ],
  );

  const columns = new Set(
    Object.values(getTableColumns(businesses)).map((column) => column.name),
  );
  for (const [, column] of text.matchAll(/\bb\.([a-z_]+)\b/g)) {
    assert.ok(columns.has(column), `businesses has no column ${column}`);
  }
});

test("buildBusinessSeoQuery scopes the lookup to one id and the public visibility rule", () => {
  const { text } = buildBusinessSeoQuery(6);

  assert.match(text, /WHERE b\.id = \$1 AND \(b\.is_active = true/);
  assert.match(text, /b\.is_verified = true/);
  assert.match(text, /UPPER\(b\.country_code\) = 'CA'/);
  assert.match(text, /NOT COALESCE\(b\.email ILIKE '%@versoair\.local', false\)/);
});

test("businessSeoRecordFromRow normalises numeric columns from pg", () => {
  const row = {
    id: 6,
    name: "Persaunafy Inc.",
    description: null,
    address: null,
    location: null,
    phone: null,
    email: null,
  };

  assert.deepEqual(businessSeoRecordFromRow({ ...row, rating: "0.0", reviews_count: 0 }), {
    ...row,
    rating: 0,
    reviewCount: 0,
  });
  assert.equal(businessSeoRecordFromRow({ ...row, rating: "4.8", reviews_count: 12 }).rating, 4.8);
  assert.equal(businessSeoRecordFromRow({ ...row, rating: null, reviews_count: null }).rating, 0);
});
