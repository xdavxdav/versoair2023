import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeHtml,
  multiLine,
  oneLine,
  renderRequestEmail,
  safeHttpUrl,
} from "./request-email";

test("escapeHtml neutralises markup and quotes", () => {
  assert.equal(
    escapeHtml(`<script>alert("x")</script> & 'y'`),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;",
  );
});

test("escapeHtml turns anything that is not text into an empty string", () => {
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml({ toString: () => "<b>" }), "");
  assert.equal(escapeHtml(["<b>"]), "");
  assert.equal(escapeHtml(42), "42");
});

test("oneLine collapses whitespace, strips control characters and caps the length", () => {
  assert.equal(oneLine("  Café \n\t du   Port\u0000 "), "Café du Port");
  assert.equal(oneLine("x".repeat(500), 10), "x".repeat(10));
  assert.equal(oneLine({ not: "text" }), "");
});

test("multiLine keeps line breaks but not carriage returns or control characters", () => {
  assert.equal(multiLine("line one\r\nline two\u0007"), "line one\nline two");
  assert.equal(multiLine("a".repeat(5000), 100).length, 100);
});

test("safeHttpUrl only accepts http and https links", () => {
  assert.equal(safeHttpUrl("https://open.spotify.com/artist/1"), "https://open.spotify.com/artist/1");
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,<b>x</b>"), null);
  assert.equal(safeHttpUrl("not a url"), null);
  assert.equal(safeHttpUrl(""), null);
});

const baseSpec = {
  kind: "business" as const,
  heading: "📋 Business Registration Request",
  subheading: "A new business submission requires your review",
  intro: "Please review.",
  title: "Café du Port",
  refId: "REQ-BIZ-ABC123",
  fields: [],
  note: "Create it manually after review.",
  dashboardUrl: "https://app.example.com/geo-admin/dashboard",
  year: 2030,
};

test("renderRequestEmail escapes every visitor-supplied value", () => {
  const html = renderRequestEmail({
    ...baseSpec,
    title: `<img src=x onerror=alert(1)>`,
    subtitle: `<b>Acme</b>`,
    fields: [
      { label: "Description", value: `<script>steal()</script>` },
      { label: "Submitted By", value: `"><a href="https://evil.example">x</a>` },
    ],
  });

  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(!html.includes('href="https://evil.example"'));
  assert.ok(html.includes("&lt;script&gt;steal()&lt;/script&gt;"));
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(html.includes("&lt;b&gt;Acme&lt;/b&gt;"));
});

test("renderRequestEmail leaves out empty fields and keeps the reference", () => {
  const html = renderRequestEmail({
    ...baseSpec,
    fields: [
      { label: "Phone", value: "" },
      { label: "Address", value: undefined },
      { label: "City", value: "Abidjan" },
    ],
  });

  assert.ok(html.includes("REQ-BIZ-ABC123"));
  assert.ok(html.includes("Abidjan"));
  assert.ok(!html.includes("Phone"));
  assert.ok(!html.includes("Address"));
  assert.ok(html.includes("© 2030 Verso Air"));
});

test("renderRequestEmail only links http(s) URLs", () => {
  const withLink = renderRequestEmail({
    ...baseSpec,
    fields: [{ label: "Spotify", value: "https://open.spotify.com/artist/1", link: true }],
  });
  assert.ok(withLink.includes('<a href="https://open.spotify.com/artist/1"'));

  const withoutLink = renderRequestEmail({
    ...baseSpec,
    fields: [{ label: "Spotify", value: "javascript:alert(1)", link: true }],
  });
  assert.ok(!withoutLink.includes('href="javascript:'));
  assert.ok(withoutLink.includes("javascript:alert(1)"));
});

test("each request kind has its own accent colour", () => {
  const colours = (["business", "artist", "job"] as const).map((kind) => {
    const html = renderRequestEmail({ ...baseSpec, kind });
    return /\.btn \{[^}]*background: (#[0-9a-f]{6})/i.exec(html)?.[1];
  });
  assert.equal(new Set(colours).size, 3);
  assert.ok(colours.every(Boolean));
});
