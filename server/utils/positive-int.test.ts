import assert from "node:assert/strict";
import test from "node:test";
import { parsePositiveInt } from "./positive-int";

test("parsePositiveInt accepts positive safe integers and digit-only strings", () => {
  assert.equal(parsePositiveInt(1), 1);
  assert.equal(parsePositiveInt(42), 42);
  assert.equal(parsePositiveInt("7"), 7);
  assert.equal(parsePositiveInt(" 12 "), 12);
  assert.equal(parsePositiveInt(String(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
});

test("parsePositiveInt rejects everything Number() would quietly coerce", () => {
  const rejected: unknown[] = [
    true,
    false,
    null,
    undefined,
    "",
    "   ",
    "0",
    0,
    -1,
    "-1",
    1.5,
    "1.5",
    "1e3",
    1e300,
    "0x10",
    "12abc",
    NaN,
    Infinity,
    [],
    [5],
    {},
    "9007199254740993",
    Number.MAX_SAFE_INTEGER + 1,
  ];
  for (const value of rejected) {
    assert.equal(parsePositiveInt(value), null, `expected ${String(value)} to be rejected`);
  }
});
