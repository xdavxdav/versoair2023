import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { cn } from "./utils";
import { cnReadable, readableTextFor } from "./contrast";

const BASE = "bg-popover text-popover-foreground";

test("a dark background override gets light text", () => {
  for (const bg of [
    "bg-gray-900",
    "bg-slate-800",
    "bg-slate-900/95",
    "bg-black",
    "bg-[#0b1020]",
    "bg-purple-950",
  ]) {
    const out = cnReadable(BASE, `${bg} border-white/20`);
    assert.ok(out.split(" ").includes("text-white"), `${bg} -> ${out}`);
    assert.ok(!out.includes("text-popover-foreground"), out);
  }
});

test("a light background override gets dark text", () => {
  for (const bg of ["bg-white", "bg-gray-100", "bg-slate-50"]) {
    const out = cnReadable(BASE, bg);
    assert.ok(out.split(" ").includes("text-gray-900"), `${bg} -> ${out}`);
  }
});

test("explicit text colours and the default theme are left alone", () => {
  assert.equal(cnReadable(BASE, "bg-gray-900 text-gray-200").includes("text-white"), false);
  assert.equal(cnReadable(BASE), cn(BASE));
  assert.equal(cnReadable(BASE, "p-0 w-auto"), cn(BASE, "p-0 w-auto"));
  assert.equal(readableTextFor("bg-gray-900 text-sm"), "text-white");
});

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

test("select values and options are protected from browser translation", () => {
  const src = readFileSync("client/src/components/ui/select.tsx", "utf8");
  assert.match(src, /<SelectPrimitive\.Value[^>]*translate="no"/s);
  assert.match(src, /<span translate="no" className="notranslate">/);
});

test("every dropdown/select/popover with a custom background is legible", () => {
  const re =
    /<(SelectContent|DropdownMenuContent|DropdownMenuSubContent|PopoverContent)\b([^>]*?)>/gs;
  const problems: string[] = [];
  for (const f of sourceFiles("client/src")) {
    if (f.includes("components/ui/")) continue;
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(re)) {
      const cls = (m[2].match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/) ?? [])[1];
      if (!cls) continue;
      const tokens = cls.split(/\s+/).filter((t) => t && !t.includes(":"));
      const bg = tokens.find((t) => t.startsWith("bg-"));
      if (!bg || /^bg-(popover|background|card|transparent)$/.test(bg)) continue;
      const hasText = tokens.some((t) =>
        /^text-(?!xs|sm|base|lg|xl|\d|left|right|center)/.test(t),
      );
      if (hasText) continue;
      const out = cnReadable(BASE, cls);
      if (!/\btext-(white|gray-900)\b/.test(out)) {
        const line = src.slice(0, m.index).split("\n").length;
        problems.push(`${f}:${line} ${m[1]} "${cls}" has an unclassified background and no text colour`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
