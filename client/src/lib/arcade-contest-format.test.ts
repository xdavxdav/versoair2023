import assert from "node:assert/strict";
import test from "node:test";
import {
  contestPanelMode,
  formatMinor,
  majorToMinor,
  minorToMajorText,
  percentToBps,
  previousSeasonKey,
} from "./arcade-contest-format";

const plain = (text: string) => text.replace(/\s/g, " ");

test("the contest panel disappears while no country contest is open", () => {
  assert.equal(contestPanelMode(0, false), "hidden");
  assert.equal(contestPanelMode(0, true), "earnings");
  assert.equal(contestPanelMode(1, false), "full");
  assert.equal(contestPanelMode(2, true), "full");
});

test("minor units are shifted by the currency's own decimals", () => {
  assert.match(plain(formatMinor(1250, "CAD", "en-CA")), /12\.50$/);
  const xof = plain(formatMinor(1250, "XOF", "en-US"));
  assert.match(xof, /1,250$/);
  assert.ok(!xof.includes("."));
  assert.equal(minorToMajorText(1250, "CAD"), "12.50");
  assert.equal(minorToMajorText(1250, "XOF"), "1250");
});

test("typed amounts become exact minor units or are refused", () => {
  assert.equal(majorToMinor("12.5", "CAD"), 1250);
  assert.equal(majorToMinor(" 12,50 ", "CAD"), 1250);
  assert.equal(majorToMinor("1250", "XOF"), 1250);
  assert.equal(majorToMinor("12.505", "CAD"), null);
  assert.equal(majorToMinor("12.5", "XOF"), null);
  assert.equal(majorToMinor("", "CAD"), null);
  assert.equal(majorToMinor("-3", "CAD"), null);
  assert.equal(majorToMinor("abc", "CAD"), null);
});

test("an unknown currency code does not break display", () => {
  assert.equal(formatMinor(1250, "??", "en-US"), "12.50 ??");
});

test("typed percentages become basis points or are refused", () => {
  assert.equal(percentToBps("25"), 2500);
  assert.equal(percentToBps(" 12,5 "), 1250);
  assert.equal(percentToBps("0.05"), 5);
  assert.equal(percentToBps("100"), 10000);
  assert.equal(percentToBps("100.01"), null);
  assert.equal(percentToBps("1.234"), null);
  assert.equal(percentToBps("-1"), null);
  assert.equal(percentToBps(""), null);
});

test("the season before a key rolls over the year", () => {
  assert.equal(previousSeasonKey("2026-03"), "2026-02");
  assert.equal(previousSeasonKey("2026-01"), "2025-12");
  assert.equal(previousSeasonKey("2026-13"), "");
  assert.equal(previousSeasonKey("soon"), "");
});
