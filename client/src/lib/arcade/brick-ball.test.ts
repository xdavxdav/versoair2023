import assert from "node:assert/strict";
import test from "node:test";
import {
  createBrickBallState,
  launchBrickBall,
  setBrickPaddleNormalized,
  stepBrickBall,
} from "./brick-ball";

test("brick-ball launches, breaks bricks, and advances level when cleared", () => {
  let state = createBrickBallState(360, 480);
  state = setBrickPaddleNormalized(state, 0.25);
  assert.equal(state.docked, true);

  // Leave a single 1-HP brick directly above ball
  state.bricks = [
    {
      id: 1,
      x: state.ballX - 20,
      y: state.ballY - 30,
      w: 40,
      h: 16,
      hp: 1,
      maxHp: 1,
      row: 0,
    },
  ];
  state = launchBrickBall(state);
  assert.equal(state.docked, false);

  for (let i = 0; i < 30; i++) {
    state = stepBrickBall(state, 0.016);
    if (state.level === 2) break;
  }
  assert.equal(state.level, 2);
  assert.ok(state.score >= 170);
});

test("brick-ball loses lives when ball falls below paddle", () => {
  let state = launchBrickBall(createBrickBallState(360, 480));
  state = {
    ...state,
    ballX: 20,
    ballY: 482,
    ballVx: 0,
    ballVy: 300,
    lives: 1,
  };
  const next = stepBrickBall(state, 0.02);
  assert.equal(next.lives, 0);
  assert.equal(next.over, true);
});
