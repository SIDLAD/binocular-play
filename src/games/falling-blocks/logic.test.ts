import { describe, expect, it } from 'vitest';
import { seededRng } from '../../engine/api';
import {
  CLASSIC_SHAPES,
  COLS,
  EASY_SHAPES,
  ROWS,
  advance,
  collides,
  createState,
  fullRows,
  gravityInterval,
  hardDrop,
  landingY,
  levelFor,
  move,
  pickShape,
  rotate,
  rotateCells,
  scoreForRows,
  stepDown,
  type Cell,
  type State,
} from './logic';

const key = (cells: readonly Cell[]) =>
  cells
    .map(([x, y]) => `${x},${y}`)
    .sort()
    .join(' ');

/** Fills a row except for the given columns. */
function fillRow(state: State, y: number, holes: number[] = []): void {
  for (let x = 0; x < COLS; x++) state.grid[y * COLS + x] = holes.includes(x) ? 0 : 1;
}

function stateWith(shape: string, mode = 'classic'): State {
  const state = createState(mode, seededRng(1));
  const index = state.shapes.findIndex((s) => s.name === shape);
  const s = state.shapes[index];
  state.active = { shape: index, cells: s.cells.map((c) => [c[0], c[1]] as const), pivot: s.pivot, x: 3, y: 0 };
  return state;
}

describe('shapes', () => {
  it('classic pieces have four cells; easy pieces have one to three', () => {
    for (const s of CLASSIC_SHAPES) expect(s.cells.length, s.name).toBe(4);
    for (const s of EASY_SHAPES) {
      expect(s.cells.length, s.name).toBeGreaterThanOrEqual(1);
      expect(s.cells.length, s.name).toBeLessThanOrEqual(3);
    }
  });

  it('four quarter turns bring every piece back to where it started', () => {
    for (const s of [...CLASSIC_SHAPES, ...EASY_SHAPES]) {
      let cells: Cell[] = [...s.cells];
      const seen = new Set<string>();
      for (let i = 0; i < 4; i++) {
        cells = rotateCells(cells, s.pivot);
        expect(cells.length).toBe(s.cells.length);
        expect(new Set(cells.map(([x, y]) => `${x},${y}`)).size, `${s.name} keeps distinct cells`).toBe(s.cells.length);
        for (const [x, y] of cells) expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
        seen.add(key(cells));
      }
      expect(key(cells), s.name).toBe(key(s.cells));
    }
  });

  it('the box does not move when turned', () => {
    const box = CLASSIC_SHAPES.find((s) => s.name === 'box');
    expect(box).toBeDefined();
    if (box) expect(key(rotateCells(box.cells, box.pivot))).toBe(key(box.cells));
  });
});

describe('dealing', () => {
  it('never deals the same piece three times running', () => {
    const rng = seededRng(5);
    let recent: number[] = [];
    let run = 1;
    for (let i = 0; i < 5000; i++) {
      const next = pickShape(3, recent, rng);
      run = recent[0] === next ? run + 1 : 1;
      expect(run).toBeLessThan(3);
      recent = [next, ...recent].slice(0, 2);
    }
  });

  it('is deterministic for a given seed', () => {
    const deal = (seed: number) => {
      const rng = seededRng(seed);
      const s = createState('classic', rng);
      const out: number[] = [];
      for (let i = 0; i < 12 && !s.over; i++) {
        out.push(s.active?.shape ?? -1);
        hardDrop(s, rng, 0);
      }
      return out;
    };
    expect(deal(11)).toEqual(deal(11));
    expect(deal(11)).not.toEqual(deal(12));
  });

  it('a new piece starts at the top, centred', () => {
    const s = createState('classic', seededRng(3));
    const p = s.active;
    expect(p).not.toBeNull();
    if (!p) return;
    const xs = p.cells.map((c) => p.x + c[0]);
    expect(p.y).toBe(0);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(3);
    expect(Math.max(...xs)).toBeLessThanOrEqual(6);
  });
});

describe('moving and turning', () => {
  it('stops at the walls', () => {
    const s = stateWith('box');
    let moves = 0;
    while (move(s, -1)) moves++;
    expect(s.active?.x).toBe(0);
    expect(moves).toBe(3);
    while (move(s, 1));
    expect(s.active?.x).toBe(COLS - 2);
  });

  it('stops at the stack', () => {
    const s = stateWith('box');
    s.grid[0 * COLS + 5] = 1;
    expect(move(s, 1)).toBe(false);
    expect(move(s, -1)).toBe(true);
  });

  it('nudges away from a wall when a turn would not fit', () => {
    const s = stateWith('bar');
    expect(rotate(s)).toBe(true); // now upright
    while (move(s, 1));
    const p = s.active;
    expect(p && Math.max(...p.cells.map((c) => p.x + c[0]))).toBe(COLS - 1);
    expect(rotate(s)).toBe(true); // flat again: must be pushed left to fit
    const q = s.active;
    expect(q && collides(s.grid, q.cells, q.x, q.y)).toBe(false);
    expect(q && Math.max(...q.cells.map((c) => q.x + c[0]))).toBe(COLS - 1);
  });

  it('refuses a turn that fits nowhere', () => {
    const s = stateWith('bar');
    s.active = { ...(s.active as NonNullable<State['active']>), y: 5 };
    // Wall the bar in above and below so no upright position is free.
    fillRow(s, 4);
    fillRow(s, 6);
    const before = key(s.active?.cells ?? []);
    expect(rotate(s)).toBe(false);
    expect(key(s.active?.cells ?? [])).toBe(before);
  });
});

describe('falling, locking and clearing', () => {
  it('the landing row is the lowest free one', () => {
    const s = stateWith('box');
    expect(landingY(s)).toBe(ROWS - 2);
    fillRow(s, ROWS - 1, [9]);
    expect(landingY(s)).toBe(ROWS - 3);
  });

  it('a hard drop locks the piece, scores the rows fallen and deals the next one', () => {
    const rng = seededRng(2);
    const s = stateWith('box');
    const upcoming = s.next;
    hardDrop(s, rng, 0);
    expect(s.score).toBe(ROWS - 2);
    expect(s.grid[(ROWS - 1) * COLS + 3]).toBe(1);
    expect(s.grid[(ROWS - 2) * COLS + 4]).toBe(1);
    expect(s.grid.reduce((a, b) => a + b, 0)).toBe(4);
    expect(s.active?.shape).toBe(upcoming);
  });

  it('gravity moves the piece one row per interval, and soft drop is faster', () => {
    const rng = seededRng(2);
    const s = stateWith('box');
    advance(s, gravityInterval(1) - 1, rng, { softDrop: false, fadeMs: 0 });
    expect(s.active?.y).toBe(0);
    advance(s, 1, rng, { softDrop: false, fadeMs: 0 });
    expect(s.active?.y).toBe(1);
    advance(s, 200, rng, { softDrop: true, fadeMs: 0 });
    expect(s.active?.y).toBe(5);
  });

  it('a full row fades for 400 ms, then is removed, scored, and the rows above fall', () => {
    const rng = seededRng(2);
    const s = stateWith('box');
    fillRow(s, ROWS - 1, [3, 4]);
    fillRow(s, ROWS - 2, [3, 4]);
    s.grid[(ROWS - 3) * COLS + 0] = 1; // a block resting above the rows that will clear
    hardDrop(s, rng);
    expect(s.clearing?.rows).toEqual([ROWS - 2, ROWS - 1]);
    expect(s.active).toBeNull();
    expect(fullRows(s.grid)).toEqual([ROWS - 2, ROWS - 1]);

    advance(s, 399, rng, { softDrop: false, fadeMs: 400 });
    expect(s.clearing).not.toBeNull();
    advance(s, 1, rng, { softDrop: false, fadeMs: 400 });
    expect(s.clearing).toBeNull();
    expect(s.active).not.toBeNull();
    expect(s.rowsCleared).toBe(2);
    expect(s.score).toBe(ROWS - 2 + scoreForRows(2, 1));
    expect(s.grid.reduce((a, b) => a + b, 0)).toBe(1);
    expect(s.grid[(ROWS - 1) * COLS + 0]).toBe(1); // fell two rows
  });

  it('clears at once with reduced motion', () => {
    const rng = seededRng(2);
    const s = stateWith('box');
    fillRow(s, ROWS - 1, [3, 4]);
    fillRow(s, ROWS - 2, [3, 4]);
    hardDrop(s, rng, 0);
    expect(s.clearing).toBeNull();
    expect(s.rowsCleared).toBe(2);
    expect(s.grid.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('nothing can be moved while rows are fading', () => {
    const rng = seededRng(2);
    const s = stateWith('box');
    fillRow(s, ROWS - 1, [3, 4]);
    fillRow(s, ROWS - 2, [3, 4]);
    hardDrop(s, rng);
    expect(move(s, 1)).toBe(false);
    expect(rotate(s)).toBe(false);
    expect(stepDown(s, rng)).toBe(false);
  });

  it('scores 100 × rows² × level and levels up every 8 rows', () => {
    expect(scoreForRows(1, 1)).toBe(100);
    expect(scoreForRows(2, 1)).toBe(400);
    expect(scoreForRows(4, 3)).toBe(4800);
    expect(levelFor(1, 7)).toBe(1);
    expect(levelFor(1, 8)).toBe(2);
    expect(levelFor(3, 17)).toBe(5);
  });

  it('gets faster with each level but never faster than 90 ms', () => {
    expect(gravityInterval(1)).toBe(800);
    for (let level = 2; level < 40; level++) {
      expect(gravityInterval(level)).toBeLessThanOrEqual(gravityInterval(level - 1));
      expect(gravityInterval(level)).toBeGreaterThanOrEqual(90);
    }
    expect(gravityInterval(40)).toBe(90);
  });

  it('the game ends when a new piece has no room', () => {
    const rng = seededRng(4);
    const s = createState('classic', rng);
    let drops = 0;
    while (!s.over && drops < 200) {
      hardDrop(s, rng, 0);
      drops++;
    }
    expect(s.over).toBe(true);
    expect(drops).toBeLessThan(60);
    const score = s.score;
    hardDrop(s, rng, 0);
    advance(s, 5000, rng, { softDrop: true, fadeMs: 0 });
    expect(move(s, 1)).toBe(false);
    expect(s.score).toBe(score);
  });

  it('easy mode uses only the small pieces', () => {
    const rng = seededRng(8);
    const s = createState('easy', rng);
    for (let i = 0; i < 30 && !s.over; i++) {
      expect(s.active?.cells.length).toBeLessThanOrEqual(3);
      hardDrop(s, rng, 0);
    }
  });
});
