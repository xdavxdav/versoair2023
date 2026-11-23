export type SnakeDirection = "up" | "down" | "left" | "right";

export interface GridPoint {
  x: number;
  y: number;
}

export interface SnakeState {
  cols: number;
  rows: number;
  snake: GridPoint[];
  direction: SnakeDirection;
  turnQueue: SnakeDirection[];
  food: GridPoint;
  score: number;
  foodsEaten: number;
  level: number;
  over: boolean;
}

const OPPOSITE: Record<SnakeDirection, SnakeDirection> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const DELTA: Record<SnakeDirection, GridPoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function spawnSnakeFood(
  snake: readonly GridPoint[],
  cols: number,
  rows: number,
  rng: () => number = Math.random,
): GridPoint {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: GridPoint[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return { x: 0, y: 0 };
  const idx = Math.min(free.length - 1, Math.floor(rng() * free.length));
  return free[idx];
}

export function createSnakeState(
  cols = 18,
  rows = 22,
  rng: () => number = Math.random,
): SnakeState {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const snake: GridPoint[] = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  return {
    cols,
    rows,
    snake,
    direction: "right",
    turnQueue: [],
    food: spawnSnakeFood(snake, cols, rows, rng),
    score: 0,
    foodsEaten: 0,
    level: 1,
    over: false,
  };
}

export function queueSnakeTurn(
  state: SnakeState,
  nextDir: SnakeDirection,
): SnakeState {
  if (state.over) return state;
  const lastScheduled =
    state.turnQueue.length > 0
      ? state.turnQueue[state.turnQueue.length - 1]
      : state.direction;
  if (nextDir === lastScheduled || OPPOSITE[lastScheduled] === nextDir) {
    return state;
  }
  if (state.turnQueue.length >= 2) return state;
  return { ...state, turnQueue: [...state.turnQueue, nextDir] };
}

export function stepSnake(
  state: SnakeState,
  rng: () => number = Math.random,
): SnakeState {
  if (state.over) return state;

  const [nextTurn, ...restQueue] = state.turnQueue;
  const direction = nextTurn ?? state.direction;
  const delta = DELTA[direction];
  const head = state.snake[0];
  const nextHead: GridPoint = { x: head.x + delta.x, y: head.y + delta.y };

  if (
    nextHead.x < 0 ||
    nextHead.x >= state.cols ||
    nextHead.y < 0 ||
    nextHead.y >= state.rows
  ) {
    return { ...state, direction, turnQueue: restQueue, over: true };
  }

  const eating =
    nextHead.x === state.food.x && nextHead.y === state.food.y;
  const bodyToCheck = eating
    ? state.snake
    : state.snake.slice(0, state.snake.length - 1);
  if (bodyToCheck.some((p) => p.x === nextHead.x && p.y === nextHead.y)) {
    return { ...state, direction, turnQueue: restQueue, over: true };
  }

  const nextSnake = eating
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];

  if (!eating) {
    return {
      ...state,
      snake: nextSnake,
      direction,
      turnQueue: restQueue,
    };
  }

  const foodsEaten = state.foodsEaten + 1;
  const level = 1 + Math.floor(foodsEaten / 5);
  const score = state.score + 10 * level;
  const wonBoard = nextSnake.length >= state.cols * state.rows;
  const food = wonBoard
    ? state.food
    : spawnSnakeFood(nextSnake, state.cols, state.rows, rng);

  return {
    ...state,
    snake: nextSnake,
    direction,
    turnQueue: restQueue,
    food,
    score,
    foodsEaten,
    level,
    over: wonBoard,
  };
}

export function snakeTickMs(level: number): number {
  return Math.max(68, 155 - (level - 1) * 10);
}
