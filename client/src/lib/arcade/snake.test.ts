import assert from "node:assert/strict";
import test from "node:test";
import { createSnakeState, queueSnakeTurn, stepSnake } from "./snake";

test("snake grows and scores when eating food", () => {
  let state = createSnakeState(10, 10, () => 0);
  const head = state.snake[0];
  state = { ...state, food: { x: head.x + 1, y: head.y } };
  const next = stepSnake(state, () => 0);
  assert.equal(next.snake.length, 4);
  assert.equal(next.score, 10);
  assert.equal(next.over, false);
});

test("snake turn queue prevents 180 reversal and buffers two-step corners", () => {
  let state = createSnakeState(10, 10, () => 0);
  state = queueSnakeTurn(state, "left"); // 180 reversal ignored
  assert.equal(state.turnQueue.length, 0);

  state = queueSnakeTurn(state, "up");
  state = queueSnakeTurn(state, "left");
  assert.deepEqual(state.turnQueue, ["up", "left"]);

  const s1 = stepSnake(state, () => 0);
  assert.equal(s1.direction, "up");
  const s2 = stepSnake(s1, () => 0);
  assert.equal(s2.direction, "left");
});

test("snake ends on wall collision", () => {
  let state = createSnakeState(6, 6, () => 0);
  for (let i = 0; i < 6; i++) {
    state = stepSnake(state, () => 0);
    if (state.over) break;
  }
  assert.equal(state.over, true);
});
