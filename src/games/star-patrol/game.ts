import { Staircase, type Game, type GameContext, type GameInput, type GameStatus, type Renderer, type SavedProgress } from '../../engine/api';
import {
  FIRE_EVERY_MS,
  GATE_CPD,
  GATE_MAX_GAP_MS,
  GATE_MIN_GAP_MS,
  GATE_RULE,
  GATE_START_CONTRAST,
  HURT_MS,
  ADAPT_EVERY,
  SHIELDS,
  adaptDifficulty,
  caveAt,
  circlesTouch,
  makeGate,
  spawnGapMs,
  throughCorrect,
  type Gate,
} from './logic';

interface Enemy {
  x: number;
  y: number;
  r: number;
  wobble: number;
  /** Counts down after a hit; the enemy fades out instead of flashing. 0 = alive. */
  dying: number;
  gone: boolean;
}

interface Shot {
  x: number;
  y: number;
}

const FADE_MS = 300;

/**
 * Who sees what:
 *   weak eye   – enemies, shield pickups, the striped gate windows and the shield count
 *   strong eye – your ship, its shots and the cave walls
 *   both       – the frame and the arrow that says which way the gate stripes should lean
 * You need the strong eye to steer and the weak eye to aim.
 */
export class StarPatrol implements Game {
  private w = 400;
  private h = 300;
  private shipY = 0.5;
  private targetY: number | null = null;
  private held = { up: false, down: false };
  private shots: Shot[] = [];
  private enemies: Enemy[] = [];
  private pickups: { x: number; y: number }[] = [];
  private gate: Gate | null = null;
  private gateIn: number;
  private gateStair: Staircase;
  private gatesShown = 0;
  private gatesPassed = 0;
  private lastGateText = '';
  private lastGateMs = 0;
  private world = 0;
  private seed: number;
  private spawnIn = 1000;
  private fireIn = 0;
  private hurt = 0;
  private shields = SHIELDS;
  private score = 0;
  private difficulty: number;
  private destroyed = 0;
  private outcomes = 0;
  private over = false;

  constructor(private ctx: GameContext) {
    const s = ctx.saved ?? {};
    this.difficulty = typeof s.difficulty === 'number' ? s.difficulty : 1;
    this.gateStair = new Staircase(GATE_RULE, typeof s.gateContrast === 'number' ? Math.min(1, s.gateContrast * 1.2) : GATE_START_CONTRAST);
    this.seed = ctx.rng() * 10;
    this.gateIn = this.gateGap();
  }

  private gateGap(): number {
    return GATE_MIN_GAP_MS + this.ctx.rng() * (GATE_MAX_GAP_MS - GATE_MIN_GAP_MS);
  }

  resize(width: number, height: number): void {
    this.w = width;
    this.h = height;
  }

  private shipX(): number {
    return this.w * 0.15;
  }

  private shipR(): number {
    return Math.max(10, Math.min(this.w, this.h) * 0.035);
  }

  private cave(screenX: number) {
    const c = caveAt(this.world + screenX, this.seed);
    return { top: c.top * this.h, bottom: c.bottom * this.h };
  }

  input(e: GameInput): void {
    if (this.over) return;
    if (e.kind === 'action') {
      if (e.action === 'up') this.held.up = e.pressed;
      if (e.action === 'down') this.held.down = e.pressed;
      if (e.pressed && (e.action === 'up' || e.action === 'down')) this.targetY = null;
      return;
    }
    if (e.kind === 'pointer') {
      if (e.phase === 'up') this.targetY = null;
      else this.targetY = e.y / this.h;
    }
  }

  update(dtMs: number): void {
    if (this.over) return;
    const s = dtMs / 1000;
    const speed = this.w * 0.18 * this.difficulty;
    this.world += speed * s;

    // Ship.
    const move = 0.7 * s;
    if (this.targetY !== null) {
      const d = this.targetY - this.shipY;
      this.shipY += Math.sign(d) * Math.min(Math.abs(d), move * 1.4);
    } else {
      if (this.held.up) this.shipY -= move;
      if (this.held.down) this.shipY += move;
    }
    const sx = this.shipX();
    const r = this.shipR();
    const cave = this.cave(sx);
    const minY = (cave.top + r) / this.h;
    const maxY = (cave.bottom - r) / this.h;
    if (this.shipY < minY || this.shipY > maxY) {
      this.shipY = Math.max(minY, Math.min(maxY, this.shipY));
      this.damage();
    }
    const sy = this.shipY * this.h;
    if (this.hurt > 0) this.hurt -= dtMs;

    // Shooting, about three shots a second.
    this.fireIn -= dtMs;
    if (this.fireIn <= 0) {
      this.fireIn = FIRE_EVERY_MS;
      this.shots.push({ x: sx + r, y: sy });
    }
    for (const shot of this.shots) shot.x += this.w * 0.9 * s;
    this.shots = this.shots.filter((shot) => shot.x < this.w + 10);

    // Enemies.
    this.spawnIn -= dtMs;
    if (this.spawnIn <= 0) {
      this.spawnIn = spawnGapMs(this.difficulty) * (0.7 + this.ctx.rng() * 0.6);
      const c = this.cave(this.w);
      const er = r * (0.8 + this.ctx.rng() * 0.5);
      this.enemies.push({ x: this.w + er, y: c.top + er + this.ctx.rng() * (c.bottom - c.top - 2 * er), r: er, wobble: this.ctx.rng() * 6, dying: 0, gone: false });
      if (this.ctx.rng() < 0.08) this.pickups.push({ x: this.w + 20, y: (c.top + c.bottom) / 2 });
    }
    for (const en of this.enemies) {
      en.x -= speed * 1.3 * s;
      en.wobble += s * 1.5;
      en.y += Math.sin(en.wobble) * this.h * 0.04 * s;
      if (en.dying > 0) {
        en.dying -= dtMs;
        if (en.dying <= 0) en.gone = true;
        continue;
      }
      if (en.x < -en.r) {
        // Got past: counts as a miss for the difficulty, no penalty.
        en.gone = true;
        this.record(false);
        continue;
      }
      for (const shot of this.shots) {
        if (circlesTouch(shot.x, shot.y, 3, en.x, en.y, en.r)) {
          en.dying = FADE_MS;
          shot.x = this.w + 100;
          this.score += 10;
          this.record(true);
          break;
        }
      }
      if (en.dying <= 0 && circlesTouch(sx, sy, r * 0.8, en.x, en.y, en.r)) {
        en.dying = FADE_MS;
        this.damage();
        this.record(false);
      }
    }
    this.enemies = this.enemies.filter((en) => !en.gone);

    // Shield pickups.
    for (const p of this.pickups) {
      p.x -= speed * s;
      if (circlesTouch(sx, sy, r, p.x, p.y, r)) {
        p.x = -100;
        this.shields = Math.min(SHIELDS, this.shields + 1);
        this.ctx.sound('good');
      }
    }
    this.pickups = this.pickups.filter((p) => p.x > -20);

    this.updateGate(dtMs, speed * s, sx, sy);
    if (this.lastGateMs > 0) this.lastGateMs -= dtMs;
  }

  private updateGate(dtMs: number, dx: number, sx: number, sy: number): void {
    if (!this.gate) {
      this.gateIn -= dtMs;
      if (this.gateIn <= 0) {
        this.gate = makeGate(this.ctx.rng, this.w + 60);
        this.gatesShown++;
      }
      return;
    }
    const g = this.gate;
    g.x -= dx;
    if (!g.done && g.x <= sx) {
      g.done = true;
      const c = this.cave(sx);
      const ok = throughCorrect(g, sy, (c.top + c.bottom) / 2);
      this.gateStair.answer(ok);
      if (ok) {
        this.gatesPassed++;
        this.score += 50;
        this.ctx.sound('level');
      } else this.ctx.sound('bad');
      this.lastGateText = ok ? 'Through the right stripes!' : 'The other window';
      this.lastGateMs = 1500;
    }
    if (g.x < -80) {
      this.gate = null;
      this.gateIn = this.gateGap();
    }
  }

  private record(win: boolean): void {
    this.outcomes++;
    if (win) this.destroyed++;
    if (this.outcomes >= ADAPT_EVERY) {
      this.difficulty = adaptDifficulty(this.difficulty, this.destroyed, this.outcomes);
      this.outcomes = 0;
      this.destroyed = 0;
    }
  }

  private damage(): void {
    if (this.hurt > 0) return;
    this.hurt = HURT_MS;
    this.shields--;
    this.ctx.sound('bad');
    if (this.shields <= 0) this.over = true;
  }

  render(r: Renderer): void {
    r.clear();
    const w = this.w;
    const h = this.h;
    // Cave walls (strong eye).
    const step = Math.max(12, w / 40);
    const ceiling: number[] = [0, 0];
    const floor: number[] = [0, h];
    for (let x = 0; x <= w + step; x += step) {
      const c = this.cave(x);
      ceiling.push(x, c.top);
      floor.push(x, c.bottom);
    }
    ceiling.push(w + step, 0);
    floor.push(w + step, h);
    r.poly('fellowEye', ceiling, { intensity: 0.7 });
    r.poly('fellowEye', floor, { intensity: 0.7 });

    // Gate (weak eye stripes; the frames and the arrow are for both eyes).
    if (this.gate) {
      const g = this.gate;
      const c = this.cave(Math.max(0, Math.min(w, g.x)));
      const mid = (c.top + c.bottom) / 2;
      const size = Math.min((c.bottom - c.top) / 2 - 8, w * 0.25);
      const other = g.lean === 'left' ? 'right' : 'left';
      const lean = (win: 'upper' | 'lower') => (win === g.correct ? g.lean : other);
      for (const win of ['upper', 'lower'] as const) {
        const cy = win === 'upper' ? (c.top + mid) / 2 : (mid + c.bottom) / 2;
        r.pattern('weakEye', g.x, cy, {
          kind: 'grating',
          size,
          cyclesPerDegree: GATE_CPD,
          orientation: lean(win) === 'right' ? Math.PI / 4 : -Math.PI / 4,
          contrast: this.gateStair.value,
        });
        r.circle('both', g.x, cy, size / 2 + 4, { outline: 2, intensity: 0.5 });
      }
      this.drawArrow(r, w / 2, 22, g.lean);
    }

    // Shots and ship (strong eye).
    for (const s of this.shots) r.rect('fellowEye', s.x - 6, s.y - 1.5, 12, 3);
    const sx = this.shipX();
    const sy = this.shipY * h;
    const rr = this.shipR();
    r.poly('fellowEye', [sx + rr * 1.3, sy, sx - rr, sy - rr * 0.8, sx - rr * 0.5, sy, sx - rr, sy + rr * 0.8], { intensity: this.hurt > 0 ? 0.5 : 1 });

    // Enemies and pickups (weak eye). A hit enemy fades out; nothing flashes.
    for (const en of this.enemies) {
      const fade = en.dying > 0 ? Math.max(0, en.dying / FADE_MS) : 1;
      r.poly('weakEye', [en.x - en.r, en.y, en.x, en.y - en.r, en.x + en.r, en.y, en.x, en.y + en.r], { intensity: fade });
    }
    for (const p of this.pickups) r.circle('weakEye', p.x, p.y, rr * 0.6, { outline: 3 });

    // Shields (weak eye) and frame (both).
    for (let i = 0; i < SHIELDS; i++) r.circle('weakEye', 16 + i * 18, h - 16, 6, i < this.shields ? undefined : { outline: 1.5, intensity: 0.5 });
    r.rect('both', 1, 1, w - 2, h - 2, { outline: 2, radius: 6, intensity: 0.5 });
    if (this.lastGateMs > 0) r.text('both', this.lastGateText, w / 2, h - 18, { align: 'center', size: 14 });
  }

  private drawArrow(r: Renderer, x: number, y: number, lean: 'left' | 'right'): void {
    const d = lean === 'right' ? 1 : -1;
    r.text('both', 'Fly through', x - 26, y, { align: 'right', size: 13 });
    r.line('both', x - 8 * d, y + 8, x + 8 * d, y - 8, 3);
    r.line('both', x + 8 * d, y - 8, x + 1 * d, y - 8, 3);
    r.line('both', x + 8 * d, y - 8, x + 8 * d, y - 1, 3);
  }

  status(): GameStatus {
    const catches = { shown: this.gatesShown, caught: this.gatesPassed };
    return {
      score: this.score,
      level: Math.max(1, Math.round(1 + (this.difficulty - 1) / 0.12)),
      over: this.over,
      catches,
      targetMet: catches.shown >= 2 ? catches.caught / catches.shown >= 0.5 : undefined,
    };
  }

  save(): SavedProgress {
    return { difficulty: this.difficulty, gateContrast: this.gateStair.value };
  }

  dispose(): void {}
}
