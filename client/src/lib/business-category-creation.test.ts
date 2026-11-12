import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const section = readFileSync(
  new URL("../components/sections/BusinessesSection.tsx", import.meta.url),
  "utf8",
);
const dashboard = readFileSync(
  new URL("../pages/dashboard-admin.tsx", import.meta.url),
  "utf8",
);

test("admin creation requires choosing a category rather than defaulting to Commerce", () => {
  assert.doesNotMatch(section, /categoryId:\s*1\b/);
  assert.match(section, /Select the closest category/);
  assert.match(section, /categories\.some/);
  assert.match(dashboard, /categoryId:\s*0\b/);
  assert.doesNotMatch(dashboard, /categoryId:\s*1\b/);
});

test("obsolete category slug mapping is removed", () => {
  assert.equal(existsSync(new URL("./categoryMap.ts", import.meta.url)), false);
});
