import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("every shell exposes a theme toggle", () => {
  assert.match(read("../components/vxpp/VxppShell.tsx"), /<ThemeToggle/);
  const app = read("../App.tsx");
  assert.match(app, /!showFixedHeaderBlock && !isVxppPage && !isImmersivePage/);
});

test("saved theme is applied before first paint and local choice beats account default", () => {
  assert.match(read("../../index.html"), /verso_theme/);
  assert.match(read("../contexts/ThemeContext.tsx"), /addEventListener\("storage"/);
});
