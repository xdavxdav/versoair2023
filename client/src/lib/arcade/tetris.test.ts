import assert from "node:assert/strict";
import test from "node:test";
import {
  createTetrisState,
  getTetrisGhostY,
  hardDropTetris,
  holdTetrisPiece,
  moveTetrisHorizontal,
  rotateTetris,
} from "./tetris";

test("tetris clears full rows and awards score", () => {
  const state = createTetrisState(10, 20, () => 0);
  // Fill bottom row except columns 4..5 and drop an O-piece (2x2) or I-piece
  for (let x = 0; x < 10; x++) {
    if (x < 3 || x > 6) state.board[19][x] = "J";
  }
  state.active = {
    key: "I",
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    x: 3,
    y: 0,
  };
  const next = hardDropTetris(state, () => 0);
  assert.equal(next.lines, 1);
  assert.ok(next.score >= 100);
});

test("tetris wall-kick rotation stays inside bounds and hold swaps once per lock", () => {
  let state = createTetrisState(10, 20, () => 0);
  state.active = {
    key: "T",
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    x: 0,
    y: 2,
  };
  const rotated = rotateTetris(state, "cw");
  assert.ok(rotated.active.x >= 0);

  const ghostY = getTetrisGhostY(rotated);
  assert.ok(ghostY >= rotated.active.y);

  const held = holdTetrisPiece(rotated, () => 0);
  assert.equal(held.hold, "T");
  assert.equal(held.holdUsed, true);

  const heldAgain = holdTetrisPiece(held, () => 0);
  assert.equal(heldAgain.active.key, held.active.key);

  const moved = moveTetrisHorizontal(held, 1);
  assert.equal(moved.active.x, held.active.x + 1);
});
