import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("every shell exposes a theme toggle", () => {
  assert.match(read("../components/vxpp/VxppShell.tsx"), /<ThemeToggle/);
  const app = read("../App.tsx");
  assert.match(app, /!showFixedHeaderBlock &&\s+!isVxppPage &&\s+!isImmersivePage &&\s+!currentPath\.startsWith\("\/artist-portal"\)/);
});

test("saved theme is applied before first paint and local choice beats account default", () => {
  assert.match(read("../../index.html"), /verso_theme/);
  assert.match(read("../contexts/ThemeContext.tsx"), /addEventListener\("storage"/);
});

test("TMU light theme remaps pastel accent foregrounds and preserves white text inside solid gradients", () => {
  const css = read("../styles/tmu-theme.css");
  for (const token of [
    ".text-amber-200",
    ".text-cyan-300",
    ".text-emerald-200",
    ".text-rose-200",
    ".text-blue-300",
    ".text-pink-300",
    ".from-purple-600",
    'bg-[#120929]',
    'bg-[#0a0518]',
    'bg-[#0c0520]',
  ]) {
    assert.ok(css.includes(token), `tmu-theme.css must handle ${token} in .tmu-light`);
  }
  assert.match(css, /\.tmu-light\s+\.tmu-hero-title:not\(\.tmu-dark-panel \*\)/);
  assert.match(read("../pages/artist-bio.tsx"), /tmu-dark-panel/);
});
