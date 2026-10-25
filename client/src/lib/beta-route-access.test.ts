import assert from "node:assert/strict";
import test from "node:test";
import { isBetaRoute } from "./beta-route-access";

test("legacy sign-in and jobs routes pass the beta route gate", () => {
  assert.equal(isBetaRoute("/signin?redirect=%2Fcontracts"), true);
  assert.equal(isBetaRoute("/jobs"), true);
});

test("protected contractor routes reach their route-level auth guard", () => {
  assert.equal(isBetaRoute("/contracts"), true);
  assert.equal(isBetaRoute("/contracts/quotes"), true);
  assert.equal(isBetaRoute("/artisans-portal"), true);
});

test("route prefixes do not accidentally allow similarly named paths", () => {
  assert.equal(isBetaRoute("/contracts-preview"), false);
  assert.equal(isBetaRoute("/jobs-board"), false);
});
