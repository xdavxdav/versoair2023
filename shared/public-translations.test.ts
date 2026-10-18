import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { getPublicCopyId, PUBLIC_COPY } from "./public-translations";

test("legal page static copy has native FR/EN coverage, excluding brands and punctuation", () => {
  const fixed = new Set([
    "support@versoair.com", "Verso Air", '"Straight to the point"', "Stripe:",
    "Groq / Ollama:", "Google Analytics:", "Neon / PostgreSQL:", "Render:",
    "connect.sid", "Essential", "token", "verso_portal", "verso_theme", "_ga / _gid", "_gat",
    "verso_favorites", "verso_search_history", "verso_notification_prefs", "tanstack_query_cache",
    "Chrome:", "Firefox:", "Safari:", "Edge:", "GDPR",
  ]);
  for (const file of ["terms", "privacy", "cookies"]) {
    const path = new URL(`../client/src/pages/${file}.tsx`, import.meta.url);
    const source = ts.createSourceFile(String(path), readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const missing: string[] = [];
    function visit(node: ts.Node) {
      if (ts.isJsxText(node)) {
        const text = node.text.replace(/\s+/g, " ").trim();
        if (text && /[a-z]/i.test(text) && !fixed.has(text) && getPublicCopyId(text) === undefined) {
          missing.push(text);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.deepEqual(missing, [], `${file} needs native copy for these strings`);
  }
});

test("every catalogue phrase has nonempty native translations and stable lookup in both languages", () => {
  for (const [en, fr] of PUBLIC_COPY) {
    assert.ok(en.trim());
    assert.ok(fr.trim());
    assert.notEqual(getPublicCopyId(en), undefined);
    assert.notEqual(getPublicCopyId(fr), undefined);
  }
});
