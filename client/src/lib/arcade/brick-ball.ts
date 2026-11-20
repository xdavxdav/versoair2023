export interface Brick {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  row: number;
}

export interface BrickBallState {
  width: number;
  height: number;
  paddleX: number;
  paddleW: number;
  paddleH: number;
  paddleY: number;
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  ballR: number;
  docked: boolean;
  bricks: Brick[];
  score: number;
  lives: number;
  level: number;
  combo: number;
  over: boolean;
}

function buildBricks(level: number, width: number): Brick[] {
  const cols = 8;
  const rows = Math.min(7, 5 + Math.floor((level - 1) / 2));
  const padX = 12;
  const gap = 6;
  const w = (width - padX * 2 - gap * (cols - 1)) / cols;
  const h = 16;
  const bricks: Brick[] = [];
  let id = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let hp = 1;
      if (r === 0 && level >= 2) hp = 3;
      else if (r <= 1) hp = 2;
      else if (level >= 3 && (r + c) % 4 === 0) hp = 2;
      bricks.push({
        id: id++,
        x: padX + c * (w + gap),
        y: 44 + r * (h + gap),
        w,
        h,
        hp,
        maxHp: hp,
        row: r,
      });
    }
  }
  return bricks;
}

export function createBrickBallState(
  width = 360,
  height = 480,
): BrickBallState {
  const paddleW = 86;
  const paddleH = 12;
  const paddleY = height - 34;
  const paddleX = (width - paddleW) / 2;
  const ballR = 6;
  return {
    width,
    height,
    paddleX,
    paddleW,
    paddleH,
    paddleY,
    ballX: paddleX + paddleW / 2,
    ballY: paddleY - ballR - 1,
    ballVx: 145,
    ballVy: -255,
    ballR,
    docked: true,
    bricks: buildBricks(1, width),
    score: 0,
    lives: 3,
    level: 1,
    combo: 0,
    over: false,
  };
}

export function setBrickPaddleNormalized(
  state: BrickBallState,
  normX: number,
): BrickBallState {
  if (state.over) return state;
  const clampedNorm = Math.max(0, Math.min(1, normX));
  const paddleX = clampedNorm * (state.width - state.paddleW);
  return {
    ...state,
    paddleX,
    ballX: state.docked ? paddleX + state.paddleW / 2 : state.ballX,
  };
}

export function moveBrickPaddleBy(
  state: BrickBallState,
  deltaPx: number,
): BrickBallState {
  if (state.over) return state;
  const paddleX = Math.max(
    0,
    Math.min(state.width - state.paddleW, state.paddleX + deltaPx),
  );
  return {
    ...state,
    paddleX,
    ballX: state.docked ? paddleX + state.paddleW / 2 : state.ballX,
  };
}

export function launchBrickBall(state: BrickBallState): BrickBallState {
  if (state.over || !state.docked) return state;
  const speed = 285 + (state.level - 1) * 20;
  return {
    ...state,
    docked: false,
    ballVx: speed * 0.45,
    ballVy: -speed * 0.89,
  };
}

export function stepBrickBall(
  state: BrickBallState,
  dtSec: number,
): BrickBallState {
  if (state.over || state.docked) return state;
  const dt = Math.min(0.032, Math.max(0.001, dtSec));

  let { ballX, ballY, ballVx, ballVy, score, lives, level, combo } = state;
  const r = state.ballR;

  ballX += ballVx * dt;
  ballY += ballVy * dt;

  // Side walls
  if (ballX - r < 0) {
    ballX = r;
    ballVx = Math.abs(ballVx);
  } else if (ballX + r > state.width) {
    ballX = state.width - r;
    ballVx = -Math.abs(ballVx);
  }

  // Top wall
  if (ballY - r < 0) {
    ballY = r;
    ballVy = Math.abs(ballVy);
  }

  // Paddle collision
  if (
    ballVy > 0 &&
    ballY + r >= state.paddleY &&
    ballY - r <= state.paddleY + state.paddleH &&
    ballX + r >= state.paddleX &&
    ballX - r <= state.paddleX + state.paddleW
  ) {
    const hitOffset =
      (ballX - (state.paddleX + state.paddleW / 2)) / (state.paddleW / 2);
    const clampedOffset = Math.max(-0.92, Math.min(0.92, hitOffset));
    const speed = Math.hypot(ballVx, ballVy);
    const angle = clampedOffset * (Math.PI / 3);
    ballVx = speed * Math.sin(angle);
    ballVy = -Math.abs(speed * Math.cos(angle));
    ballY = state.paddleY - r - 0.5;
    combo = 0;
  }

  // Brick collision (one brick per substep for deterministic bounces)
  let hitIndex = -1;
  for (let i = 0; i < state.bricks.length; i++) {
    const b = state.bricks[i];
    const nearestX = Math.max(b.x, Math.min(ballX, b.x + b.w));
    const nearestY = Math.max(b.y, Math.min(ballY, b.y + b.h));
    const dx = ballX - nearestX;
    const dy = ballY - nearestY;
    if (dx * dx + dy * dy <= r * r) {
      hitIndex = i;
      const overlapLeft = ballX + r - b.x;
      const overlapRight = b.x + b.w - (ballX - r);
      const overlapTop = ballY + r - b.y;
      const overlapBottom = b.y + b.h - (ballY - r);
      const minX = Math.min(overlapLeft, overlapRight);
      const minY = Math.min(overlapTop, overlapBottom);
      if (minX < minY) ballVx = -ballVx;
      else ballVy = -ballVy;
      break;
    }
  }

  let nextBricks = state.bricks;
  if (hitIndex >= 0) {
    const target = state.bricks[hitIndex];
    combo += 1;
    const bonus = Math.min(40, (combo - 1) * 5);
    if (target.hp <= 1) {
      nextBricks = state.bricks.filter((_, idx) => idx !== hitIndex);
      score += (20 + (target.maxHp - 1) * 15 + bonus) * level;
    } else {
      nextBricks = state.bricks.map((b, idx) =>
        idx === hitIndex ? { ...b, hp: b.hp - 1 } : b,
      );
      score += 10 * level;
    }
  }

  // Level cleared
  if (nextBricks.length === 0) {
    const nextLevel = level + 1;
    const paddleW = Math.max(64, 86 - (nextLevel - 1) * 3);
    const paddleX = Math.min(state.paddleX, state.width - paddleW);
    return {
      ...state,
      paddleW,
      paddleX,
      ballX: paddleX + paddleW / 2,
      ballY: state.paddleY - r - 1,
      docked: true,
      bricks: buildBricks(nextLevel, state.width),
      score: score + 150 * level,
      level: nextLevel,
      combo: 0,
    };
  }

  // Bottom miss
  if (ballY - r > state.height) {
    const nextLives = lives - 1;
    if (nextLives <= 0) {
      return {
        ...state,
        bricks: nextBricks,
        score,
        lives: 0,
        combo: 0,
        over: true,
      };
    }
    return {
      ...state,
      bricks: nextBricks,
      ballX: state.paddleX + state.paddleW / 2,
      ballY: state.paddleY - r - 1,
      docked: true,
      score,
      lives: nextLives,
      combo: 0,
    };
  }

  return {
    ...state,
    bricks: nextBricks,
    ballX,
    ballY,
    ballVx,
    ballVy,
    score,
    combo,
  };
}
