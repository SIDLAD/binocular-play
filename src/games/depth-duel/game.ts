import { Staircase, type Game, type GameContext, type GameInput, type GameStatus, type Renderer, type SavedProgress } from '../../engine/api';
import {
  BLOCK_TRIALS,
  DISPARITY_RULE,
  FEEDBACK_MS,
  INTRO_MS,
  MIN_SHOW_MS,
  PATCH_DEG,
  START_DISPARITY,
  levelFor,
  makeDots,
  nearSign,
  shiftPx,
} from './logic';

type Phase = 'intro' | 'show' | 'feedback';
type Which = 'top' | 'bottom';

interface Patch {
  dots: number[];
  /** Whole-patch sideways jitter in device px, the same for both eyes (hides position cues). */
  jitter: number;
}

/**
 * Who sees what (stereo):
 *   weak eye and strong eye – the same two dotted patches; the weak eye's copy of the nearer
 *                             patch is shifted by a few whole pixels
 *   both                    – the fixation cross, the patch frames and the answer labels
 * The play screen draws this game with the strong eye at full brightness, since depth needs
 * the two pictures to match.
 */
export class DepthDuel implements Game {
  private stair: Staircase;
  private blocks: number;
  private phase: Phase = 'intro';
  private phaseMs = 0;
  private near: Which = 'top';
  private patches: [Patch, Patch];
  private done = 0;
  private correct = 0;
  private score = 0;
  private streak = 0;
  private lastRight = true;
  private w = 300;
  private h = 300;
  private over = false;

  constructor(private ctx: GameContext) {
    const s = ctx.saved ?? {};
    this.blocks = typeof s.blocks === 'number' ? s.blocks : 0;
    this.stair = new Staircase(DISPARITY_RULE, typeof s.disparity === 'number' ? Math.min(DISPARITY_RULE.max, s.disparity * 1.5) : START_DISPARITY);
    this.patches = [this.newPatch(), this.newPatch()];
    this.newTrial();
  }

  private newPatch(): Patch {
    const maxJ = shiftPx(this.stair?.value ?? START_DISPARITY) + 3;
    return { dots: makeDots(this.ctx.rng), jitter: Math.round((this.ctx.rng() * 2 - 1) * maxJ) };
  }

  private newTrial(): void {
    this.near = this.ctx.rng() < 0.5 ? 'top' : 'bottom';
    this.patches = [this.newPatch(), this.newPatch()];
  }

  resize(width: number, height: number): void {
    this.w = width;
    this.h = height;
  }

  input(e: GameInput): void {
    if (this.over) return;
    if (this.phase === 'intro') {
      if (this.phaseMs > 800 && (e.kind !== 'action' || e.pressed)) {
        this.phase = 'show';
        this.phaseMs = 0;
      }
      return;
    }
    if (e.kind === 'action') {
      if (!e.pressed) return;
      if (e.action === 'up') this.answer('top');
      else if (e.action === 'down') this.answer('bottom');
      return;
    }
    if (e.kind === 'pointer' && e.phase === 'down') this.answer(e.y < this.h * 0.45 ? 'top' : 'bottom');
  }

  private answer(which: Which): void {
    if (this.phase !== 'show' || this.phaseMs < MIN_SHOW_MS) return;
    const right = which === this.near;
    this.done++;
    this.lastRight = right;
    if (right) {
      this.correct++;
      this.streak++;
      this.score += 10 + (this.streak >= 5 ? 5 : 0);
      this.ctx.sound('good');
    } else {
      this.streak = 0;
      this.ctx.sound('bad');
    }
    this.stair.answer(right);
    this.phase = 'feedback';
    this.phaseMs = 0;
  }

  update(dtMs: number): void {
    if (this.over) return;
    this.phaseMs += dtMs;
    if (this.phase === 'intro' && this.phaseMs >= INTRO_MS) {
      this.phase = 'show';
      this.phaseMs = 0;
    } else if (this.phase === 'feedback' && this.phaseMs >= FEEDBACK_MS) {
      if (this.done >= BLOCK_TRIALS) {
        this.over = true;
        this.blocks++;
        this.ctx.sound('level');
        return;
      }
      this.newTrial();
      this.phase = 'show';
      this.phaseMs = 0;
    }
  }

  private layout() {
    const size = Math.min(PATCH_DEG * this.ctx.display.pxPerDegree, this.w * 0.6, this.h * 0.3);
    const cx = this.w / 2;
    const cy = this.h * 0.45;
    const off = size * 0.65 + 14;
    return { size, cx, top: cy - off, bottom: cy + off, cy };
  }

  private drawPatch(r: Renderer, p: Patch, cx: number, cy: number, size: number, isNear: boolean): void {
    const dpr = r.pixelRatio;
    const snap = (v: number) => Math.round(v * dpr) / dpr;
    const dot = Math.max(1 / dpr, snap(Math.max(2, size * 0.035)));
    const shift = isNear ? (nearSign(this.ctx.weakEyeSide) * shiftPx(this.stair.value)) / dpr : 0;
    const base = p.jitter / dpr;
    const x0 = cx - size / 2;
    const y0 = cy - size / 2;
    r.rect('both', x0 - 10, y0 - 10, size + 20, size + 20, { outline: 2, radius: 6, intensity: 0.5 });
    for (let i = 0; i + 1 < p.dots.length; i += 2) {
      const x = snap(x0 + p.dots[i] * (size - dot) + base);
      const y = snap(y0 + p.dots[i + 1] * (size - dot));
      r.rect('fellowEye', x, y, dot, dot);
      r.rect('weakEye', x + shift, y, dot, dot);
    }
  }

  render(r: Renderer): void {
    r.clear();
    const { size, cx, top, bottom, cy } = this.layout();
    if (this.phase === 'intro') {
      r.text('both', 'Which patch looks nearer to you?', cx, cy - 40, { align: 'center', size: 18, bold: true });
      r.text('both', 'If anything looks double, stop: Pause, then "I see double".', cx, cy, { align: 'center', size: 14 });
      r.text('both', 'Tap to start', cx, cy + 36, { align: 'center', size: 14, intensity: 0.7 });
      // Something for each eye while the message shows.
      r.circle('weakEye', cx - 30, cy + 80, 6);
      r.circle('fellowEye', cx + 30, cy + 80, 6);
      return;
    }
    this.drawPatch(r, this.patches[0], cx, top, size, this.near === 'top');
    this.drawPatch(r, this.patches[1], cx, bottom, size, this.near === 'bottom');
    r.line('both', cx - 8, cy, cx + 8, cy, 2);
    r.line('both', cx, cy - 8, cx, cy + 8, 2);
    if (this.phase === 'feedback') {
      r.text('both', this.lastRight ? 'Yes!' : 'The other one', this.w - 12, cy, { align: 'right', size: 16, bold: true });
    }
    r.text('both', `${this.done} / ${BLOCK_TRIALS}`, 12, 16, { size: 13, intensity: 0.7 });
  }

  status(): GameStatus {
    const accuracy = this.done ? this.correct / this.done : 0;
    return {
      score: this.score,
      level: levelFor(this.stair.value),
      over: this.over,
      trials: { done: this.done, correct: this.correct },
      targetMet: this.done >= 10 ? accuracy >= 0.6 : undefined,
    };
  }

  save(): SavedProgress {
    return { blocks: this.blocks, disparity: this.stair.estimate() };
  }

  dispose(): void {}
}
