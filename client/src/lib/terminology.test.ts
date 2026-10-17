import assert from "node:assert/strict";
import test from "node:test";
import { getMarketLabel } from "./terminology";

test("uses the proper localized market label", () => {
  assert.equal(getMarketLabel("fr"), "Marché");
  assert.equal(getMarketLabel("en"), "Market");
  assert.equal(getMarketLabel("es"), "Mercado");
});

test("falls back to the English label for unsupported languages", () => {
  assert.equal(getMarketLabel("unknown"), "Market");
});
