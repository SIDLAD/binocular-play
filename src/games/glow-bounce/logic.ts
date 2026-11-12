/**
 * Glow Bounce: bounce the ball to break the bricks.
 *
 * Uses the split from the Dig Rush trials (Kelly 2016): the things you must track (ball and
 * paddle) go to the weaker eye at full brightness, the bricks to the stronger eye at reduced
 * brightness, the walls to both. A later trial of that game found no benefit over glasses
 * alone in 7–12-year-olds (Holmes 2019); the Evidence page says so.
 *
 * Ball speed and paddle width adapt: easier after a lost ball, harder after a cleared wall.
 */
export const COLS = 8;
export const LIVES = 3;
export const BRICK_FADE_MS = 250;
export const MIN_SPEED = 0.6;
export const MAX_SPEED = 1.8;
export const MIN_WIDTH = 0.7;
export const MAX_WIDTH = 1.6;
export const AUTO_LAUNCH_MS = 3000;

export interface Tuning {
  speed: number;
  width: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function afterLostBall(t: Tuning): Tuning {
  return { speed: clamp(t.speed * 0.9, MIN_SPEED, MAX_SPEED), width: clamp(t.width * 1.08, MIN_WIDTH, MAX_WIDTH) };
}

export function afterClearedWall(t: Tuning): Tuning {
  return { speed: clamp(t.speed * 1.08, MIN_SPEED, MAX_SPEED), width: clamp(t.width * 0.96, MIN_WIDTH, MAX_WIDTH) };
}

/** Brick layout for a wall: rows × COLS, true = brick. Patterns change with the wall number. */
export function layout(wall: number): boolean[][] {
  const rows = Math.min(7, 4 + Math.floor(wall / 2));
  const out: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < COLS; c++) {
      switch (wall % 4) {
        case 1:
          row.push((r + c) % 2 === 0 || r === 0);
          break;
        case 2:
          row.push(Math.abs(c - (COLS - 1) / 2) <= r + 0.5);
          break;
        case 3:
          row.push(c !== 3 && c !== 4 ? true : r % 2 === 0);
          break;
        default:
          row.push(true);
      }
    }
    out.push(row);
  }
  return out;
}

/**
 * Bounce angle off the paddle: hitting near the edge sends the ball off at up to 60°.
 * Returns the new velocity (vx, vy) with the same speed, always going up.
 */
export function paddleBounce(hitOffset: number, speed: number): { vx: number; vy: number } {
  const a = Math.max(-1, Math.min(1, hitOffset)) * (Math.PI / 3);
  return { vx: Math.sin(a) * speed, vy: -Math.cos(a) * speed };
}
