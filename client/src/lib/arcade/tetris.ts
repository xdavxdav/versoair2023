export type TetrominoKey = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export interface ActivePiece {
  key: TetrominoKey;
  matrix: number[][];
  x: number;
  y: number;
}

export interface TetrisState {
  cols: number;
  rows: number;
  board: (TetrominoKey | null)[][];
  active: ActivePiece;
  next: TetrominoKey;
  hold: TetrominoKey | null;
  holdUsed: boolean;
  bag: TetrominoKey[];
  score: number;
  lines: number;
  level: number;
  over: boolean;
}

const SHAPES: Record<TetrominoKey, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export const TETROMINO_KEYS: readonly TetrominoKey[] = [
  "I",
  "O",
  "T",
  "S",
  "Z",
  "J",
  "L",
];

function cloneShape(key: TetrominoKey): number[][] {
  return SHAPES[key].map((row) => [...row]);
}

function createBag(rng: () => number): TetrominoKey[] {
  const arr: TetrominoKey[] = [...TETROMINO_KEYS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawFromBag(
  bag: TetrominoKey[],
  rng: () => number,
): { piece: TetrominoKey; nextBag: TetrominoKey[] } {
  const pool = bag.length > 0 ? [...bag] : createBag(rng);
  const [piece, ...rest] = pool;
  return {
    piece,
    nextBag: rest.length > 0 ? rest : createBag(rng),
  };
}

function spawnPiece(key: TetrominoKey, cols: number): ActivePiece {
  const matrix = cloneShape(key);
  return {
    key,
    matrix,
    x: Math.floor((cols - matrix[0].length) / 2),
    y: 0,
  };
}

export function canPlacePiece(
  board: (TetrominoKey | null)[][],
  matrix: number[][],
  offsetX: number,
  offsetY: number,
): boolean {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const x = offsetX + c;
      const y = offsetY + r;
      if (x < 0 || x >= cols || y >= rows) return false;
      if (y >= 0 && board[y][x] !== null) return false;
    }
  }
  return true;
}

export function createTetrisState(
  cols = 10,
  rows = 20,
  rng: () => number = Math.random,
): TetrisState {
  const board = Array.from({ length: rows }, () =>
    Array<TetrominoKey | null>(cols).fill(null),
  );
  const first = drawFromBag([], rng);
  const second = drawFromBag(first.nextBag, rng);
  return {
    cols,
    rows,
    board,
    active: spawnPiece(first.piece, cols),
    next: second.piece,
    hold: null,
    holdUsed: false,
    bag: second.nextBag,
    score: 0,
    lines: 0,
    level: 1,
    over: false,
  };
}

function rotateMatrixCW(matrix: number[][]): number[][] {
  const n = matrix.length;
  const out = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[c][n - 1 - r] = matrix[r][c];
    }
  }
  return out;
}

function rotateMatrixCCW(matrix: number[][]): number[][] {
  const n = matrix.length;
  const out = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[n - 1 - c][r] = matrix[r][c];
    }
  }
  return out;
}

export function moveTetrisHorizontal(
  state: TetrisState,
  dx: -1 | 1,
): TetrisState {
  if (state.over) return state;
  if (
    canPlacePiece(
      state.board,
      state.active.matrix,
      state.active.x + dx,
      state.active.y,
    )
  ) {
    return {
      ...state,
      active: { ...state.active, x: state.active.x + dx },
    };
  }
  return state;
}

export function rotateTetris(
  state: TetrisState,
  dir: "cw" | "ccw" = "cw",
): TetrisState {
  if (state.over || state.active.key === "O") return state;
  const rotated =
    dir === "cw"
      ? rotateMatrixCW(state.active.matrix)
      : rotateMatrixCCW(state.active.matrix);
  const kicks = [0, -1, 1, -2, 2];
  for (const dx of kicks) {
    if (canPlacePiece(state.board, rotated, state.active.x + dx, state.active.y)) {
      return {
        ...state,
        active: { ...state.active, matrix: rotated, x: state.active.x + dx },
      };
    }
  }
  return state;
}

export function getTetrisGhostY(state: TetrisState): number {
  let y = state.active.y;
  while (canPlacePiece(state.board, state.active.matrix, state.active.x, y + 1)) {
    y++;
  }
  return y;
}

function lockPiece(
  state: TetrisState,
  rng: () => number,
  dropBonus = 0,
): TetrisState {
  const nextBoard = state.board.map((row) => [...row]);
  const { matrix, x, y, key } = state.active;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const by = y + r;
      const bx = x + c;
      if (by < 0) {
        return { ...state, over: true };
      }
      nextBoard[by][bx] = key;
    }
  }

  let cleared = 0;
  const remaining = nextBoard.filter((row) => {
    const full = row.every((cell) => cell !== null);
    if (full) cleared++;
    return !full;
  });
  while (remaining.length < state.rows) {
    remaining.unshift(Array<TetrominoKey | null>(state.cols).fill(null));
  }

  const lineTable = [0, 100, 300, 500, 800];
  const lines = state.lines + cleared;
  const level = 1 + Math.floor(lines / 10);
  const score = state.score + dropBonus + lineTable[cleared] * state.level;

  const drawn = drawFromBag(state.bag, rng);
  const nextActive = spawnPiece(state.next, state.cols);
  const over = !canPlacePiece(
    remaining,
    nextActive.matrix,
    nextActive.x,
    nextActive.y,
  );

  return {
    ...state,
    board: remaining,
    active: nextActive,
    next: drawn.piece,
    holdUsed: false,
    bag: drawn.nextBag,
    score,
    lines,
    level,
    over,
  };
}

export function stepTetrisDown(
  state: TetrisState,
  softDrop = false,
  rng: () => number = Math.random,
): TetrisState {
  if (state.over) return state;
  if (
    canPlacePiece(
      state.board,
      state.active.matrix,
      state.active.x,
      state.active.y + 1,
    )
  ) {
    return {
      ...state,
      active: { ...state.active, y: state.active.y + 1 },
      score: softDrop ? state.score + 1 : state.score,
    };
  }
  return lockPiece(state, rng);
}

export function hardDropTetris(
  state: TetrisState,
  rng: () => number = Math.random,
): TetrisState {
  if (state.over) return state;
  const targetY = getTetrisGhostY(state);
  const cells = Math.max(0, targetY - state.active.y);
  return lockPiece(
    {
      ...state,
      active: { ...state.active, y: targetY },
    },
    rng,
    cells * 2,
  );
}

export function holdTetrisPiece(
  state: TetrisState,
  rng: () => number = Math.random,
): TetrisState {
  if (state.over || state.holdUsed) return state;
  const currentKey = state.active.key;
  if (state.hold === null) {
    const drawn = drawFromBag(state.bag, rng);
    const nextActive = spawnPiece(state.next, state.cols);
    return {
      ...state,
      active: nextActive,
      next: drawn.piece,
      hold: currentKey,
      holdUsed: true,
      bag: drawn.nextBag,
    };
  }
  const swapped = spawnPiece(state.hold, state.cols);
  if (!canPlacePiece(state.board, swapped.matrix, swapped.x, swapped.y)) {
    return state;
  }
  return {
    ...state,
    active: swapped,
    hold: currentKey,
    holdUsed: true,
  };
}

export function tetrisGravityMs(level: number): number {
  return Math.max(100, 720 - (level - 1) * 58);
}
