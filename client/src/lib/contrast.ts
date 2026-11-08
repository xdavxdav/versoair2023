import { cn } from "./utils";

// Floating lists (select, dropdown menu, popover) default to the theme's
// popover colours. Pages often override only the background, e.g.
// className="bg-gray-900". In the light theme the default text is near-black,
// so the options became unreadable (dark ink on a dark list). cnReadable
// merges classes like cn() and, when the final background is explicit and its
// lightness is clear, fixes the text colour so options are always legible.

const DARK_BG =
  /^bg-(?:(?:gray|slate|zinc|neutral|stone)-(?:7|8|9)\d\d|(?:purple|indigo|emerald|rose|fuchsia|amber|blue|red|green|teal|cyan|violet|sky|orange|pink)-(?:8|9)\d\d|black|\[#(?:[0-3][0-9a-f]){3}\]|\[rgba?\(\s*\d{1,2}\s*,\s*\d{1,2}\s*,\s*\d{1,2}[^\]]*\)\])$/i;
const LIGHT_BG =
  /^bg-(?:white|(?:gray|slate|zinc|neutral|stone)-(?:50|100|200)|\[#(?:[e-f][0-9a-f]){3}\])$/i;

// The default text the base components set; replacing it is always intended.
const DEFAULT_TEXT = new Set(["text-popover-foreground", "text-foreground"]);

function plainTokens(classes: string): string[] {
  // Ignore variant-prefixed classes such as hover:bg-x or dark:text-y.
  return classes.split(/\s+/).filter((t) => t && !t.includes(":"));
}

export function readableTextFor(merged: string): "text-white" | "text-gray-900" | null {
  const tokens = plainTokens(merged);
  const bg = [...tokens].reverse().find((t) => t.startsWith("bg-"));
  if (!bg) return null;
  const textToken = [...tokens]
    .reverse()
    .find((t) => /^text-(?!xs|sm|base|lg|xl|\d|left|right|center|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)/.test(t));
  if (textToken && !DEFAULT_TEXT.has(textToken)) return null;
  const base = bg.replace(/\/\d+$/, "");
  if (DARK_BG.test(base)) return "text-white";
  if (LIGHT_BG.test(base)) return "text-gray-900";
  return null;
}

export function cnReadable(...inputs: Parameters<typeof cn>): string {
  const merged = cn(...inputs);
  const fix = readableTextFor(merged);
  return fix ? cn(merged, fix) : merged;
}
