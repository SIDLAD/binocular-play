import type { Game, GameAction, GameContext, GameInput, GameStatus, Renderer } from '../../engine/api';
import {
  CLEAR_FADE_MS,
  COLS,
  ROWS,
  advance,
  createState,
  hardDrop,
  landingY,
  move,
  rotate,
  type State,
} from './logic';

const REPEAT_DELAY_MS = 170;
const REPEAT_EVERY_MS = 50;
const TAP_MS = 300;
const SIDE_CELLS = 5; // room beside the well for the "next" preview

interface Layout {
  cell: number;
  /** Top-left of the well. */
  x: number;
  y: number;
  /** Top-left of the preview box. */
  px: number;
  py: number;
}

interface Drag {
  startX: number;
  startY: number;
  startMs: number;
  /** Columns and rows already applied during this drag. */
  cols: number;
  rows: number;
  moved: boolean;
}

/**
 * Who sees what:
 *   weak eye   – the falling piece, its landing shadow and the "next" preview
 *   fellow eye – the settled stack
 *   both       – the frame and a faint grid
 * The landing shadow is weak-eye only on purpose: in "both" the stronger eye could play alone.
 */
export class TumbleStack implements Game {
  private state: State;
  private layout: Layout = { cell: 20, x: 0, y: 0, px: 0, py: 0 };
  private held = new Set<GameAction>();
  private repeatMs = 0;
  private repeatDir = 0;
  private clockMs = 0;
  private drag: Drag | null = null;
  private fadeMs: number;
  private sawClearing = false;
  private lastLevel = 1;

  constructor(private ctx: GameContext) {
    this.fadeMs = ctx.reducedMotion ? 0 : CLEAR_FADE_MS;
    this.state = createState(ctx.mode, ctx.rng, ctx.startLevel);
  }

  resize(width: number, height: number): void {
    const cell = Math.max(4, Math.floor(Math.min(width / (COLS + SIDE_CELLS + 1), (height - 8) / ROWS)));
    const total = (COLS + SIDE_CELLS) * cell;
    const x = Math.floor((width - total) / 2);
    const y = Math.floor((height - ROWS * cell) / 2);
    this.layout = { cell, x, y, px: x + (COLS + 1) * cell, py: y + cell };
  }

  input(e: GameInput): void {
    if (e.kind === 'action') this.action(e.action, e.pressed);
    else if (e.kind === 'pointer') this.pointer(e.phase, e.x, e.y);
  }

  private action(action: GameAction, pressed: boolean): void {
    if (!pressed) {
      this.held.delete(action);
      if ((action === 'left' && this.repeatDir === -1) || (action === 'right' && this.repeatDir === 1)) {
        this.repeatDir = this.held.has('left') ? -1 : this.held.has('right') ? 1 : 0;
        this.repeatMs = -REPEAT_DELAY_MS;
      }
      return;
    }
    if (this.held.has(action)) return;
    this.held.add(action);
    switch (action) {
      case 'left':
      case 'right':
        this.repeatDir = action === 'left' ? -1 : 1;
        this.repeatMs = -REPEAT_DELAY_MS;
        move(this.state, this.repeatDir);
        break;
      case 'up':
      case 'secondary':
        rotate(this.state);
        break;
      case 'primary':
        hardDrop(this.state, this.ctx.rng, this.fadeMs);
        break;
      case 'down':
        break;
    }
  }

  private pointer(phase: 'down' | 'move' | 'up', x: number, y: number): void {
    if (phase === 'down') {
      this.drag = { startX: x, startY: y, startMs: this.clockMs, cols: 0, rows: 0, moved: false };
      return;
    }
    const d = this.drag;
    if (!d) return;
    const cell = this.layout.cell;
    const dx = x - d.startX;
    const dy = y - d.startY;
    if (Math.abs(dx) > cell * 0.4 || Math.abs(dy) > cell * 0.4) d.moved = true;

    if (phase === 'move') {
      // One column per cell width dragged.
      const cols = Math.trunc(dx / cell);
      while (d.cols < cols && move(this.state, 1)) d.cols++;
      while (d.cols > cols && move(this.state, -1)) d.cols--;
      d.cols = cols;
      // A slow drag downward lowers the piece row by row (never locks it).
      const rows = Math.trunc(dy / cell);
      const p = this.state.active;
      while (p && d.rows < rows && Math.abs(dy) > Math.abs(dx) && p.y < landingY(this.state)) {
        p.y++;
        d.rows++;
      }
      return;
    }

    // phase === 'up'
    const elapsed = this.clockMs - d.startMs;
    this.drag = null;
    if (!d.moved && elapsed <= TAP_MS) rotate(this.state);
    else if (dy > cell * 3 && dy > Math.abs(dx) * 1.5 && elapsed <= TAP_MS) {
      hardDrop(this.state, this.ctx.rng, this.fadeMs);
    }
  }

  update(dtMs: number): void {
    this.clockMs += dtMs;
    if (this.state.over) return;
    if (this.repeatDir !== 0) {
      this.repeatMs += dtMs;
      while (this.repeatMs >= REPEAT_EVERY_MS) {
        this.repeatMs -= REPEAT_EVERY_MS;
        move(this.state, this.repeatDir);
      }
    }
    advance(this.state, dtMs, this.ctx.rng, { softDrop: this.held.has('down'), fadeMs: this.fadeMs });
    // Soft tones: one when rows clear, a little tune on a new level.
    const clearing = this.state.clearing !== null && this.state.clearing !== undefined;
    if (this.state.level > this.lastLevel) this.ctx.sound('level');
    else if (clearing && !this.sawClearing) this.ctx.sound('good');
    this.sawClearing = clearing;
    this.lastLevel = this.state.level;
  }

  render(r: Renderer): void {
    const s = this.state;
    const { cell, x, y, px, py } = this.layout;
    const gap = Math.max(1, Math.round(cell * 0.06));
    const radius = cell * 0.18;
    const block = (ch: 'weakEye' | 'fellowEye', gx: number, gy: number, intensity?: number) =>
      r.rect(ch, x + gx * cell + gap, y + gy * cell + gap, cell - 2 * gap, cell - 2 * gap, { radius, intensity });

    r.clear();

    // Faint grid and frame: seen by both eyes, they help the two images fuse.
    for (let c = 1; c < COLS; c++) r.line('both', x + c * cell, y, x + c * cell, y + ROWS * cell, 1, { intensity: 0.25 });
    for (let row = 1; row < ROWS; row++) r.line('both', x, y + row * cell, x + COLS * cell, y + row * cell, 1, { intensity: 0.25 });
    r.rect('both', x - 2, y - 2, COLS * cell + 4, ROWS * cell + 4, { outline: 3, radius: 4 });

    // The settled stack: fellow eye.
    const fading = s.clearing ? s.clearing.rows : [];
    const fade = s.clearing && this.fadeMs > 0 ? Math.max(0, 1 - s.clearing.elapsedMs / this.fadeMs) : 1;
    for (let gy = 0; gy < ROWS; gy++) {
      const intensity = fading.includes(gy) ? fade : undefined;
      for (let gx = 0; gx < COLS; gx++) {
        if (s.grid[gy * COLS + gx] !== 0) block('fellowEye', gx, gy, intensity);
      }
    }

    // The falling piece and its landing shadow: weak eye.
    const p = s.active;
    if (p) {
      const ly = landingY(s);
      if (ly !== p.y && !s.over) {
        for (const [cx, cy] of p.cells) {
          if (ly + cy < 0) continue;
          r.rect('weakEye', x + (p.x + cx) * cell + gap + 1, y + (ly + cy) * cell + gap + 1, cell - 2 * gap - 2, cell - 2 * gap - 2, {
            outline: Math.max(2, cell * 0.08),
            radius,
            intensity: 0.5,
          });
        }
      }
      for (const [cx, cy] of p.cells) {
        if (p.y + cy >= 0) block('weakEye', p.x + cx, p.y + cy);
      }
    }

    // Next piece: weak eye, inside a frame for both eyes.
    const boxSize = cell * 4;
    r.rect('both', px, py, boxSize, boxSize, { outline: 2, radius: 4, intensity: 0.6 });
    const shape = s.shapes[s.next];
    const small = cell * 0.8;
    const w = (Math.max(...shape.cells.map((c) => c[0])) + 1) * small;
    const hgt = (Math.max(...shape.cells.map((c) => c[1])) + 1) * small;
    for (const [cx, cy] of shape.cells) {
      r.rect('weakEye', px + (boxSize - w) / 2 + cx * small + 1, py + (boxSize - hgt) / 2 + cy * small + 1, small - 2, small - 2, {
        radius: small * 0.18,
      });
    }
  }

  status(): GameStatus {
    return { score: this.state.score, level: this.state.level, over: this.state.over };
  }

  dispose(): void {
    this.held.clear();
    this.drag = null;
  }
}
