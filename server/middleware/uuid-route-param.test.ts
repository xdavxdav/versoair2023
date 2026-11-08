import assert from "node:assert/strict";
import test from "node:test";
import { uuidRouteParam } from "./uuid-route-param";

function run(value: string) {
  let status: number | undefined;
  let body: unknown;
  let nextCalled = false;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  };
  uuidRouteParam({} as never, res as never, () => (nextCalled = true), value, "id");
  return { status, body, nextCalled };
}

test("canonical UUIDs pass, in either case", () => {
  for (const id of [
    "3f2a8b9c-1d4e-4f5a-8b6c-7d8e9f0a1b2c",
    "3F2A8B9C-1D4E-4F5A-8B6C-7D8E9F0A1B2C",
    "00000000-0000-0000-0000-000000000000",
  ]) {
    assert.equal(run(id).nextCalled, true, id);
  }
});

test("anything else is a 404 and never reaches a query", () => {
  for (const id of [
    "1",
    "42",
    "abc",
    "3f2a8b9c1d4e4f5a8b6c7d8e9f0a1b2c",
    "{3f2a8b9c-1d4e-4f5a-8b6c-7d8e9f0a1b2c}",
    "3f2a8b9c-1d4e-4f5a-8b6c-7d8e9f0a1b2c0",
    "3f2a8b9c-1d4e-4f5a-8b6c-7d8e9f0a1b2z",
    "x' OR '1'='1",
    "",
  ]) {
    const result = run(id);
    assert.equal(result.nextCalled, false, JSON.stringify(id));
    assert.equal(result.status, 404, JSON.stringify(id));
  }
});
