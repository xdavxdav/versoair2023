export type XensiaDir = "up" | "down" | "left" | "right" | null;

/** 0 = unclaimed void, 1 = claimed safe territory, 2 = active vulnerable trail */
export type XensiaCell = 0 | 1 | 2;

export interface XensiaOrb {
  x: number;
  y: number;
  vx: -1 | 1;
  vy: -1 | 1;
}

export interface XensiaState {
  cols: number;
  rows: number;
  grid: XensiaCell[][];
  playerX: number;
  playerY: number;
  dir: XensiaDir;
  drawing: boolean;
  voidOrbs: XensiaOrb[];
  claimedCount: number;
  totalInterior: number;
  claimedPct: number;
  targetPct: number;
  score: number;
  lives: number;
  level: number;
  over: boolean;
}

const BORDER_THICKNESS = 2;

function createGridWithBorder(cols: number, rows: number): XensiaCell[][] {
  const grid: XensiaCell[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: XensiaCell[] = [];
    for (let x = 0; x < cols; x++) {
      const isBorder =
        x < BORDER_THICKNESS ||
        x >= cols - BORDER_THICKNESS ||
        y < BORDER_THICKNESS ||
        y >= rows - BORDER_THICKNESS;
      row.push(isBorder ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

function countInteriorStats(
  grid: readonly XensiaCell[][],
  cols: number,
  rows: number,
): { claimedCount: number; totalInterior: number; claimedPct: number } {
  let claimed = 0;
  let total = 0;
  for (let y = BORDER_THICKNESS; y < rows - BORDER_THICKNESS; y++) {
    for (let x = BORDER_THICKNESS; x < cols - BORDER_THICKNESS; x++) {
      total++;
      if (grid[y][x] === 1) claimed++;
    }
  }
  const claimedPct = total > 0 ? Math.floor((claimed / total) * 100) : 0;
  return { claimedCount: claimed, totalInterior: total, claimedPct };
}

function spawnVoidOrbs(
  level: number,
  cols: number,
  rows: number,
  rng: () => number,
): XensiaOrb[] {
  const count = Math.min(6, 2 + (level - 1));
  const orbs: XensiaOrb[] = [];
  for (let i = 0; i < count; i++) {
    const x =
      BORDER_THICKNESS +
      2 +
      Math.floor(rng() * (cols - BORDER_THICKNESS * 2 - 4));
    const y =
      BORDER_THICKNESS +
      2 +
      Math.floor(rng() * (rows - BORDER_THICKNESS * 2 - 4));
    orbs.push({
      x,
      y,
      vx: i % 2 === 0 ? 1 : -1,
      vy: i % 3 === 0 ? -1 : 1,
    });
  }
  return orbs;
}

export function createXensiaState(
  cols = 44,
  rows = 56,
  rng: () => number = Math.random,
): XensiaState {
  const grid = createGridWithBorder(cols, rows);
  const stats = countInteriorStats(grid, cols, rows);
  return {
    cols,
    rows,
    grid,
    playerX: Math.floor(cols / 2),
    playerY: 1,
    dir: null,
    drawing: false,
    voidOrbs: spawnVoidOrbs(1, cols, rows, rng),
    ...stats,
    targetPct: 75,
    score: 0,
    lives: 3,
    level: 1,
    over: false,
  };
}

export function setXensiaDirection(
  state: XensiaState,
  dir: Exclude<XensiaDir, null>,
): XensiaState {
  if (state.over) return state;
  if (
    state.drawing &&
    ((state.dir === "left" && dir === "right") ||
      (state.dir === "right" && dir === "left") ||
      (state.dir === "up" && dir === "down") ||
      (state.dir === "down" && dir === "up"))
  ) {
    return state;
  }
  return { ...state, dir };
}

/**
 * Flood-fill from every void orb over unclaimed (0) cells.
 * Any 0 cell unreachable from all void orbs is enclosed and becomes claimed (1).
 */
export function closeXensiaTerritory(
  gridInput: XensiaCell[][],
  orbs: readonly XensiaOrb[],
  cols: number,
  rows: number,
): { grid: XensiaCell[][]; capturedCells: number } {
  const grid = gridInput.map((row) => [...row]);
  let trailCells = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === 2) {
        grid[y][x] = 1;
        trailCells++;
      }
    }
  }

  const reachable = Array.from({ length: rows }, () =>
    Array<boolean>(cols).fill(false),
  );
  const queue: [number, number][] = [];

  for (const orb of orbs) {
    if (
      orb.x >= 0 &&
      orb.x < cols &&
      orb.y >= 0 &&
      orb.y < rows &&
      grid[orb.y][orb.x] === 0 &&
      !reachable[orb.y][orb.x]
    ) {
      reachable[orb.y][orb.x] = true;
      queue.push([orb.x, orb.y]);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const neighbors: [number, number][] = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (
        nx >= 0 &&
        nx < cols &&
        ny >= 0 &&
        ny < rows &&
        grid[ny][nx] === 0 &&
        !reachable[ny][nx]
      ) {
        reachable[ny][nx] = true;
        queue.push([nx, ny]);
      }
    }
  }

  let enclosed = 0;
  for (let y = BORDER_THICKNESS; y < rows - BORDER_THICKNESS; y++) {
    for (let x = BORDER_THICKNESS; x < cols - BORDER_THICKNESS; x++) {
      if (grid[y][x] === 0 && !reachable[y][x]) {
        grid[y][x] = 1;
        enclosed++;
      }
    }
  }

  return { grid, capturedCells: trailCells + enclosed };
}

function loseLife(state: XensiaState): XensiaState {
  const grid = state.grid.map((row) =>
    row.map((cell) => (cell === 2 ? 0 : cell)),
  );
  const lives = state.lives - 1;
  return {
    ...state,
    grid,
    playerX: Math.floor(state.cols / 2),
    playerY: 1,
    dir: null,
    drawing: false,
    lives,
    over: lives <= 0,
  };
}

export function stepXensia(
  state: XensiaState,
  rng: () => number = Math.random,
): XensiaState {
  if (state.over) return state;

  let { playerX, playerY, dir, drawing, grid, score, level } = state;
  let nextGrid = grid;

  if (dir !== null) {
    const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    const nx = Math.max(0, Math.min(state.cols - 1, playerX + dx));
    const ny = Math.max(0, Math.min(state.rows - 1, playerY + dy));

    if (nx !== playerX || ny !== playerY) {
      const targetCell = nextGrid[ny][nx];
      if (targetCell === 2) {
        return loseLife(state);
      }

      playerX = nx;
      playerY = ny;

      if (targetCell === 0) {
        nextGrid = nextGrid.map((row) => [...row]);
        nextGrid[playerY][playerX] = 2;
        drawing = true;
      } else if (targetCell === 1 && drawing) {
        const closed = closeXensiaTerritory(
          nextGrid,
          state.voidOrbs,
          state.cols,
          state.rows,
        );
        nextGrid = closed.grid;
        drawing = false;
        dir = null;
        const stats = countInteriorStats(nextGrid, state.cols, state.rows);
        score += closed.capturedCells * 3 * level;

        if (stats.claimedPct >= state.targetPct) {
          const nextLevel = level + 1;
          const freshGrid = createGridWithBorder(state.cols, state.rows);
          const freshStats = countInteriorStats(
            freshGrid,
            state.cols,
            state.rows,
          );
          return {
            ...state,
            grid: freshGrid,
            playerX: Math.floor(state.cols / 2),
            playerY: 1,
            dir: null,
            drawing: false,
            voidOrbs: spawnVoidOrbs(nextLevel, state.cols, state.rows, rng),
            ...freshStats,
            score: score + 500 * level,
            level: nextLevel,
          };
        }

        const updated: XensiaState = {
          ...state,
          grid: nextGrid,
          playerX,
          playerY,
          dir,
          drawing,
          ...stats,
          score,
        };
        return advanceVoidOrbs(updated);
      }
    }
  }

  return advanceVoidOrbs({
    ...state,
    grid: nextGrid,
    playerX,
    playerY,
    dir,
    drawing,
    score,
  });
}

function advanceVoidOrbs(state: XensiaState): XensiaState {
  const nextOrbs: XensiaOrb[] = [];
  for (const orb of state.voidOrbs) {
    let { x, y, vx, vy } = orb;

    const testX = x + vx;
    if (
      testX < 0 ||
      testX >= state.cols ||
      state.grid[y][testX] === 1
    ) {
      vx = (vx * -1) as -1 | 1;
    } else {
      x = testX;
    }

    const testY = y + vy;
    if (
      testY < 0 ||
      testY >= state.rows ||
      state.grid[testY][x] === 1
    ) {
      vy = (vy * -1) as -1 | 1;
    } else {
      y = testY;
    }

    if (
      state.grid[y][x] === 2 ||
      (state.drawing && x === state.playerX && y === state.playerY)
    ) {
      return loseLife({ ...state, voidOrbs: [...nextOrbs, { x, y, vx, vy }] });
    }
    nextOrbs.push({ x, y, vx, vy });
  }
  return { ...state, voidOrbs: nextOrbs };
}
