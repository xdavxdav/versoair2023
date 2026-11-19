import assert from "node:assert/strict";
import test from "node:test";
import { parseByteRange } from "./byte-range";

const SIZE = 100;

test("parseByteRange resolves the range forms browsers send", () => {
  assert.deepEqual(parseByteRange("bytes=0-1", SIZE), { start: 0, end: 1 });
  assert.deepEqual(parseByteRange("bytes=10-19", SIZE), { start: 10, end: 19 });
  assert.deepEqual(parseByteRange("bytes=0-", SIZE), { start: 0, end: 99 });
  assert.deepEqual(parseByteRange("bytes=90-", SIZE), { start: 90, end: 99 });
  assert.deepEqual(parseByteRange("bytes=-5", SIZE), { start: 95, end: 99 });
  assert.deepEqual(parseByteRange("Bytes=1-2", SIZE), { start: 1, end: 2 });
});

test("parseByteRange clamps a range that runs past the end of the file", () => {
  assert.deepEqual(parseByteRange("bytes=90-500", SIZE), { start: 90, end: 99 });
  assert.deepEqual(parseByteRange("bytes=-500", SIZE), { start: 0, end: 99 });
});

test("parseByteRange flags ranges that start outside the file as unsatisfiable", () => {
  assert.equal(parseByteRange("bytes=100-", SIZE), "unsatisfiable");
  assert.equal(parseByteRange("bytes=100-200", SIZE), "unsatisfiable");
  assert.equal(parseByteRange("bytes=-0", SIZE), "unsatisfiable");
  assert.equal(parseByteRange("bytes=-5", 0), "unsatisfiable");
});

test("parseByteRange ignores headers it cannot honour so the whole file is sent", () => {
  const ignored: Array<string | undefined> = [
    undefined,
    "",
    "bytes=",
    "bytes=-",
    "bytes=20-10",
    "bytes=0-1,5-6",
    "items=0-1",
    "bytes=a-b",
    "0-1",
  ];
  for (const header of ignored) {
    assert.equal(parseByteRange(header, SIZE), null, `expected ${String(header)} to be ignored`);
  }
});
