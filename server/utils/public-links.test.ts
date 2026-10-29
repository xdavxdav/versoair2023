import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SOURCE_DIRS = ["client/src", "server", "shared"];
const SOURCE_FILE = /\.(tsx?|cjs|mjs|js)$/;

// URLs that a logged-out visitor cannot open: unregistered domains, a guessed
// X handle that does not exist, and LinkedIn's numeric company URL (sign-in wall).
const DEAD_PUBLIC_URLS: Array<[RegExp, string]> = [
  [/verso-air\.com/i, "verso-air.com is not a registered domain; use versoair.com"],
  [/versoair\.app/i, "versoair.app does not resolve; use www.versoair.com"],
  [/(twitter|x)\.com\/versoair\b/i, "x.com/versoair does not exist"],
  [
    /linkedin\.com\/company\/\d+/i,
    "numeric LinkedIn company URLs require sign-in; use /company/verso-air-inc/",
  ],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(rel);
      if (!SOURCE_FILE.test(entry.name) || /\.test\.[a-z]+$/.test(entry.name)) {
        return [];
      }
      return [rel];
    },
  );
}

test("source links never point at dead or sign-in-walled public URLs", () => {
  const files = SOURCE_DIRS.flatMap(sourceFiles);
  assert.ok(files.length > 100, "source scan found too few files");

  const problems: string[] = [];
  for (const file of files) {
    const lines = readFileSync(path.join(ROOT, file), "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const [pattern, reason] of DEAD_PUBLIC_URLS) {
        if (pattern.test(line)) problems.push(`${file}:${index + 1} ${reason}`);
      }
    });
  }
  assert.deepEqual(problems, []);
});
