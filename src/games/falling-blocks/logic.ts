/**
 * Tumble Stack: pure rules. No drawing, no timers of its own, no randomness except
 * the rng passed in, so every test is deterministic.
 */
export const COLS = 10;
export const ROWS = 18;
export const ROWS_PER_LEVEL = 8;
export const CLEAR_FADE_MS = 400;
export const SOFT_DROP_MS = 50;

export type Cell = readonly [number, number];

export interface Shape {
  name: string;
  /** Cells in the spawn orientation, with the top-left of the bounding box at 0,0. */
  cells: readonly Cell[];
  /** Centre of rotation, in the same coordinates (may be a half cell). */
  pivot: Cell;
}

/** Four-cell pieces. */
export const CLASSIC_SHAPES: readonly Shape[] = [
  { name: 'bar', cells: [[0, 0], [1, 0], [2, 0], [3, 0]], pivot: [1.5, 0.5] },
  { name: 'box', cells: [[0, 0], [1, 0], [0, 1], [1, 1]], pivot: [0.5, 0.5] },
  { name: 'tee', cells: [[1, 0], [0, 1], [1, 1], [2, 1]], pivot: [1, 1] },
  { name: 'hook-left', cells: [[0, 0], [0, 1], [1, 1], [2, 1]], pivot: [1, 1] },
  { name: 'hook-right', cells: [[2, 0], [0, 1], [1, 1], [2, 1]], pivot: [1, 1] },
  { name: 'step-left', cells: [[0, 0], [1, 0], [1, 1], [2, 1]], pivot: [1, 1] },
  { name: 'step-right', cells: [[1, 0], [2, 0], [0, 1], [1, 1]], pivot: [1, 1] },
];

/** One to three cells, for small children. */
export const EASY_SHAPES: readonly Shape[] = [
  { name: 'dot', cells: [[0, 0]], pivot: [0, 0] },
  { name: 'pair', cells: [[0, 0], [1, 0]], pivot: [0, 0] },
  { name: 'short-bar', cells: [[0, 0], [1, 0], [2, 0]], pivot: [1, 0] },
  { name: 'corner', cells: [[0, 0], [0, 1], [1, 1]], pivot: [0, 1] },
];

export function shapesFor(mode: string): readonly Shape[] {
  return mode === 'easy' ? EASY_SHAPES : CLASSIC_SHAPES;
}

export interface Piece {
  shape: number;
  /** Current cells relative to (x, y). */
  cells: Cell[];
  pivot: Cell;
  x: number;
  y: number;
}

export interface State {
  shapes: readonly Shape[];
  /** COLS × ROWS, row by row from the top. 0 = empty, 1 = filled. */
  grid: number[];
  active: Piece | null;
  next: number;
  /** The last two shapes dealt, so the same one never comes three times running. */
  recent: number[];
  score: number;
  startLevel: number;
  level: number;
  rowsCleared: number;
  over: boolean;
  /** Full rows fading out, and how long they have been fading. */
  clearing: { rows: number[]; elapsedMs: number } | null;
  gravityMs: number;
}

export type Rng = () => number;

export function gravityInterval(level: number): number {
  return Math.max(90, 800 * Math.pow(0.86, level - 1));
}

export function scoreForRows(rows: number, level: number): number {
  return 100 * rows * rows * level;
}

export function levelFor(startLevel: number, rowsCleared: number): number {
  return startLevel + Math.floor(rowsCleared / ROWS_PER_LEVEL);
}

/** Uniform choice, except that a shape dealt twice in a row cannot come a third time. */
export function pickShape(count: number, recent: readonly number[], rng: Rng): number {
  const banned = recent.length >= 2 && recent[0] === recent[1] ? recent[0] : -1;
  const options: number[] = [];
  for (let i = 0; i < count; i++) if (i !== banned || count === 1) options.push(i);
  return options[Math.min(options.length - 1, Math.floor(rng() * options.length))];
}

export function cellAt(grid: readonly number[], x: number, y: number): number {
  return grid[y * COLS + x];
}

/** True when the cells at (x, y) leave the well or overlap the stack. Cells above the top are allowed. */
export function collides(grid: readonly number[], cells: readonly Cell[], x: number, y: number): boolean {
  for (const [cx, cy] of cells) {
    const gx = x + cx;
    const gy = y + cy;
    if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
    if (gy >= 0 && grid[gy * COLS + gx] !== 0) return true;
  }
  return false;
}

/** A quarter turn clockwise about the pivot. */
export function rotateCells(cells: readonly Cell[], pivot: Cell): Cell[] {
  const [px, py] = pivot;
  // "+ 0" turns a negative zero into a plain zero.
  return cells.map(([x, y]) => [Math.round(px - (y - py)) + 0, Math.round(py + (x - px)) + 0] as const);
}

function makePiece(shapes: readonly Shape[], index: number): Piece {
  const shape = shapes[index];
  const width = Math.max(...shape.cells.map((c) => c[0])) + 1;
  return {
    shape: index,
    cells: shape.cells.map((c) => [c[0], c[1]] as const),
    pivot: shape.pivot,
    x: Math.floor((COLS - width) / 2),
    y: 0,
  };
}

function deal(state: State, rng: Rng): void {
  const piece = makePiece(state.shapes, state.next);
  state.recent = [state.next, ...state.recent].slice(0, 2);
  state.next = pickShape(state.shapes.length, state.recent, rng);
  state.active = piece;
  state.gravityMs = 0;
  if (collides(state.grid, piece.cells, piece.x, piece.y)) state.over = true;
}

export function createState(mode: string, rng: Rng, startLevel = 1): State {
  const shapes = shapesFor(mode);
  const state: State = {
    shapes,
    grid: new Array<number>(COLS * ROWS).fill(0),
    active: null,
    next: pickShape(shapes.length, [], rng),
    recent: [],
    score: 0,
    startLevel,
    level: startLevel,
    rowsCleared: 0,
    over: false,
    clearing: null,
    gravityMs: 0,
  };
  deal(state, rng);
  return state;
}

/** Moves the active piece sideways. Returns true if it moved. */
export function move(state: State, dx: number): boolean {
  const p = state.active;
  if (!p || state.over || state.clearing) return false;
  if (collides(state.grid, p.cells, p.x + dx, p.y)) return false;
  p.x += dx;
  return true;
}

const KICKS: readonly Cell[] = [[0, 0], [1, 0], [-1, 0], [2, 0], [-2, 0], [0, -1]];

/** Turns the active piece clockwise, nudging it sideways (or one row up) if it would not fit. */
export function rotate(state: State): boolean {
  const p = state.active;
  if (!p || state.over || state.clearing) return false;
  const turned = rotateCells(p.cells, p.pivot);
  for (const [kx, ky] of KICKS) {
    if (!collides(state.grid, turned, p.x + kx, p.y + ky)) {
      p.cells = turned;
      p.x += kx;
      p.y += ky;
      return true;
    }
  }
  return false;
}

/** The row the active piece would come to rest on. */
export function landingY(state: State): number {
  const p = state.active;
  if (!p) return 0;
  let y = p.y;
  while (!collides(state.grid, p.cells, p.x, y + 1)) y++;
  return y;
}

export function fullRows(grid: readonly number[]): number[] {
  const rows: number[] = [];
  for (let y = 0; y < ROWS; y++) {
    let full = true;
    for (let x = 0; x < COLS; x++) {
      if (grid[y * COLS + x] === 0) {
        full = false;
        break;
      }
    }
    if (full) rows.push(y);
  }
  return rows;
}

function removeRows(grid: number[], rows: readonly number[]): number[] {
  const kept: number[] = [];
  for (let y = 0; y < ROWS; y++) {
    if (!rows.includes(y)) kept.push(...grid.slice(y * COLS, (y + 1) * COLS));
  }
  return [...new Array<number>(rows.length * COLS).fill(0), ...kept];
}

function finishClear(state: State, rng: Rng): void {
  if (!state.clearing) return;
  const count = state.clearing.rows.length;
  state.grid = removeRows(state.grid, state.clearing.rows);
  state.score += scoreForRows(count, state.level);
  state.rowsCleared += count;
  state.level = levelFor(state.startLevel, state.rowsCleared);
  state.clearing = null;
  deal(state, rng);
}

/** Fixes the active piece into the stack, then starts a row clear or deals the next piece. */
function lock(state: State, rng: Rng, fadeMs: number): void {
  const p = state.active;
  if (!p) return;
  let aboveTop = false;
  for (const [cx, cy] of p.cells) {
    const gy = p.y + cy;
    if (gy < 0) aboveTop = true;
    else state.grid[gy * COLS + p.x + cx] = 1;
  }
  state.active = null;
  if (aboveTop) {
    state.over = true;
    return;
  }
  const rows = fullRows(state.grid);
  if (rows.length > 0) {
    state.clearing = { rows, elapsedMs: 0 };
    if (fadeMs <= 0) finishClear(state, rng);
  } else deal(state, rng);
}

/** One row down, or lock if it cannot move. Returns true if the piece locked. */
export function stepDown(state: State, rng: Rng, fadeMs = CLEAR_FADE_MS): boolean {
  const p = state.active;
  if (!p || state.over || state.clearing) return false;
  if (!collides(state.grid, p.cells, p.x, p.y + 1)) {
    p.y += 1;
    return false;
  }
  lock(state, rng, fadeMs);
  return true;
}

/** Drops the piece straight down and locks it. Scores one point per row fallen. */
export function hardDrop(state: State, rng: Rng, fadeMs = CLEAR_FADE_MS): void {
  const p = state.active;
  if (!p || state.over || state.clearing) return;
  const y = landingY(state);
  state.score += y - p.y;
  p.y = y;
  lock(state, rng, fadeMs);
}

/** Advances time: gravity (faster while soft-dropping) and the row-clear fade. */
export function advance(state: State, dtMs: number, rng: Rng, options: { softDrop: boolean; fadeMs: number }): void {
  if (state.over) return;
  if (state.clearing) {
    state.clearing.elapsedMs += dtMs;
    if (state.clearing.elapsedMs >= options.fadeMs) finishClear(state, rng);
    return;
  }
  const interval = options.softDrop ? Math.min(SOFT_DROP_MS, gravityInterval(state.level)) : gravityInterval(state.level);
  state.gravityMs += dtMs;
  while (state.gravityMs >= interval && !state.over && !state.clearing && state.active) {
    state.gravityMs -= interval;
    stepDown(state, rng, options.fadeMs);
  }
}
