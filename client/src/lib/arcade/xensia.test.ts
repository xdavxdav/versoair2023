import assert from "node:assert/strict";
import test from "node:test";
import {
  createXensiaState,
  setXensiaDirection,
  stepXensia,
} from "./xensia";

test("xensia captures enclosed territory via flood-fill and auto-stops on safe border re-entry", () => {
  // 16x12 board with one orb far on the right so cutting at x=4 captures left side cleanly
  let state = createXensiaState(16, 12, () => 0.8);
  state = {
    ...state,
    playerX: 4,
    playerY: 1,
    voidOrbs: [{ x: 11, y: 6, vx: 1, vy: 1 }],
  };
  state = setXensiaDirection(state, "down");
  for (let i = 0; i < 12; i++) {
    state = stepXensia(state);
    if (!state.drawing && state.dir === null && state.score > 0) break;
  }
  assert.equal(state.drawing, false);
  assert.equal(state.dir, null);
  assert.ok(state.score > 0);
  assert.ok(state.claimedPct > 0);
});

test("xensia loses a life when a void orb hits the active trail", () => {
  let state = createXensiaState(12, 12, () => 0.5);
  state = {
    ...state,
    playerX: 5,
    playerY: 2,
    drawing: true,
    dir: "down",
    voidOrbs: [{ x: 4, y: 3, vx: 1, vy: 1 }],
    lives: 1,
  };
  state.grid[3][5] = 2;
  const next = stepXensia(state);
  assert.equal(next.lives, 0);
  assert.equal(next.over, true);
});
