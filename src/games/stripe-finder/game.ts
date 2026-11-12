import { Staircase, type Game, type GameContext, type GameInput, type GameStatus, type Renderer, type SavedProgress } from '../../engine/api';
import {
  BLOCK_TRIALS,
  CONTRAST_RULE,
  FEEDBACK_MS,
  FIND_CONTRAST,
  FIXATION_MS,
  PATCH_DEG,
  PERIOD_RULE,
  PUSH_NOISE,
  SHOW_MS,
  START_CPD,
  adjustCpd,
  levelFor,
  orientationFor,
  trainingCpd,
  type Lean,
} from './logic';

type Phase = 'fix' | 'show' | 'answer' | 'feedback';

/**
 * Who sees what (weak-eye training):
 *   weak eye   – the stripes and four fixation dots
 *   both       – the ring, the left/right answer arrows and the feedback
 *   strong eye – nothing, or in Push mode a patch of noise over the stripes (Liu 2020)
 */
export class StripeFinder implements Game {
  private finding: boolean;
  private stair: Staircase;
  private cpd: number;
  private blocks: number;
  private lean: Lean = 'left';
  private phase: Phase = 'fix';
  private phaseMs = 0;
  private done = 0;
  private correct = 0;
  private score = 0;
  private streak = 0;
  private lastRight = true;
  private noiseSeed = 1;
  private phaseOffset = 0;
  private w = 300;
  private h = 300;
  private over = false;
  private maxCpd: number;
  private lastContrast = 1;

  constructor(private ctx: GameContext) {
    const s = ctx.saved ?? {};
    this.maxCpd = ctx.display.devicePxPerDegree / 4;
    this.blocks = typeof s.blocks === 'number' ? s.blocks : 0;
    this.finding = typeof s.cpd !== 'number';
    this.cpd = typeof s.cpd === 'number' ? Math.min(this.maxCpd, s.cpd) : START_CPD;
    this.stair = this.finding
      ? new Staircase(PERIOD_RULE, Math.max(1 / this.maxCpd, 1 / START_CPD))
      : new Staircase(CONTRAST_RULE, typeof s.contrast === 'number' ? Math.min(1, s.contrast * 1.3) : 0.8);
    this.newTrial();
  }

  private newTrial(): void {
    this.lean = this.ctx.rng() < 0.5 ? 'left' : 'right';
    this.noiseSeed = 1 + Math.floor(this.ctx.rng() * 1e6);
    this.phaseOffset = this.ctx.rng() * Math.PI * 2;
  }

  private get push(): boolean {
    return this.ctx.mode === 'push';
  }

  private contrastNow(): number {
    return this.finding ? FIND_CONTRAST : this.stair.value;
  }

  private cpdNow(): number {
    return this.finding ? Math.min(this.maxCpd, 1 / this.stair.value) : this.cpd;
  }

  resize(width: number, height: number): void {
    this.w = width;
    this.h = height;
  }

  private patchPx(): number {
    return Math.min(PATCH_DEG * this.ctx.display.pxPerDegree, Math.min(this.w, this.h) * 0.55);
  }

  input(e: GameInput): void {
    if (this.over) return;
    if (e.kind === 'action') {
      if (!e.pressed) return;
      if (e.action === 'left') this.answer('left');
      else if (e.action === 'right') this.answer('right');
      return;
    }
    if (e.kind === 'pointer' && e.phase === 'down') this.answer(e.x < this.w / 2 ? 'left' : 'right');
  }

  private answer(lean: Lean): void {
    if (this.phase !== 'answer') return;
    const right = lean === this.lean;
    this.done++;
    this.lastRight = right;
    this.lastContrast = this.contrastNow();
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
    if (this.phase === 'fix' && this.phaseMs >= FIXATION_MS) {
      this.phase = 'show';
      this.phaseMs = 0;
    } else if (this.phase === 'show' && this.phaseMs >= SHOW_MS) {
      this.phase = 'answer';
      this.phaseMs = 0;
    } else if (this.phase === 'feedback' && this.phaseMs >= FEEDBACK_MS) {
      if (this.done >= BLOCK_TRIALS) {
        this.endBlock();
        return;
      }
      this.newTrial();
      this.phase = 'fix';
      this.phaseMs = 0;
    }
  }

  private endBlock(): void {
    this.over = true;
    this.blocks++;
    if (this.finding) {
      this.cpd = trainingCpd(this.stair.estimate(), this.maxCpd);
      this.finding = false;
    } else {
      this.cpd = adjustCpd(this.cpd, this.stair.estimate(), this.maxCpd);
    }
    this.ctx.sound('level');
  }

  render(r: Renderer): void {
    r.clear();
    const cx = this.w / 2;
    const cy = this.h * 0.45;
    const size = this.patchPx();
    const ring = size / 2 + 12;
    r.circle('both', cx, cy, ring, { outline: 2, intensity: 0.6 });
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) r.circle('weakEye', cx + dx * ring * 0.8, cy + dy * ring * 0.8, 3);
    if (this.phase === 'fix') {
      r.line('both', cx - 6, cy, cx + 6, cy, 2);
      r.line('both', cx, cy - 6, cx, cy + 6, 2);
    }
    if (this.phase === 'show') {
      r.pattern('weakEye', cx, cy, {
        kind: 'grating',
        size,
        cyclesPerDegree: this.cpdNow(),
        orientation: orientationFor(this.lean),
        phase: this.phaseOffset,
        contrast: this.contrastNow(),
      });
      if (this.push) r.pattern('fellowEye', cx, cy, { kind: 'noise', size, contrast: PUSH_NOISE, seed: this.noiseSeed, grain: 3 });
    }
    if (this.phase === 'answer') r.text('both', 'Which way did the stripes lean?', cx, cy, { align: 'center', size: 16 });
    if (this.phase === 'feedback') r.text('both', this.lastRight ? 'Yes!' : 'Not that time', cx, cy, { align: 'center', size: 20, bold: true });

    // Answer arrows for both eyes: lean left on the left, lean right on the right.
    const ay = Math.min(this.h - 50, cy + ring + 60);
    const active = this.phase === 'answer';
    const arrow = (x: number, dir: -1 | 1) => {
      r.rect('both', x - 60, ay - 34, 120, 68, { outline: 2, radius: 12, intensity: active ? 0.9 : 0.35 });
      r.line('both', x - 20 * dir, ay + 20, x + 20 * dir, ay - 20, 6, { intensity: active ? 1 : 0.4 });
    };
    arrow(this.w * 0.25, -1);
    arrow(this.w * 0.75, 1);
    r.text('both', `${this.done} / ${BLOCK_TRIALS}`, 12, 16, { size: 13, intensity: 0.7 });
    if (this.finding) r.text('both', 'Finding your training level', this.w - 12, 16, { size: 13, intensity: 0.7, align: 'right' });
  }

  status(): GameStatus {
    const accuracy = this.done ? this.correct / this.done : 0;
    return {
      score: this.score,
      level: this.finding ? 1 : levelFor(this.lastContrast),
      over: this.over,
      trials: { done: this.done, correct: this.correct },
      targetMet: this.done >= 10 ? accuracy >= 0.65 : undefined,
    };
  }

  save(): SavedProgress {
    const out: SavedProgress = { blocks: this.blocks };
    if (!this.finding || this.over) out.cpd = this.cpd;
    if (!this.finding && this.blocks > 0 && this.stair.state.trials > 0) out.contrast = this.stair.estimate();
    return out;
  }

  dispose(): void {}
}
