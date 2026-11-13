import { Staircase, type Channel, type Game, type GameContext, type GameInput, type GameStatus, type Renderer, type SavedProgress } from '../../engine/api';
import {
  BLOCK_TRIALS,
  FEEDBACK_MS,
  FIXATION_MS,
  LETTERS,
  SPACING_RULE,
  START_SIZE_ARCMIN,
  START_SPACING,
  STROKE,
  STROKES,
  levelFor,
  makeTrial,
  nextSize,
  targetMs,
  type Letter,
  type Trial,
} from './logic';

type Phase = 'fix' | 'show' | 'answer' | 'feedback';

interface Button {
  letter: Letter;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Draws one of our stroke letters centred on (cx, cy) with height `size`. */
export function drawLetter(r: Renderer, ch: Channel, l: Letter, cx: number, cy: number, size: number, intensity?: number): void {
  const x0 = cx - size / 2;
  const y0 = cy - size / 2;
  const width = Math.max(1, STROKE * size);
  for (const line of STROKES[l]) {
    for (let i = 0; i + 3 < line.length; i += 2) {
      r.line(ch, x0 + line[i] * size, y0 + line[i + 1] * size, x0 + line[i + 2] * size, y0 + line[i + 3] * size, width, intensity === undefined ? undefined : { intensity });
    }
  }
}

/**
 * Who sees what (a weak-eye-only training task):
 *   weak eye – the letters and the four fixation dots
 *   both     – the frame, the answer buttons and the feedback text
 *   strong eye – nothing
 */
export class LetterCrowd implements Game {
  private stair: Staircase;
  private sizeArcmin: number;
  private blocks: number;
  private trial: Trial;
  private phase: Phase = 'fix';
  private phaseMs = 0;
  private done = 0;
  private correct = 0;
  private score = 0;
  private streak = 0;
  private lastRight = true;
  private choice = 0;
  private buttons: Button[] = [];
  private w = 300;
  private h = 300;
  private over = false;
  private minArcmin: number;
  private readonly trials: number;

  constructor(private ctx: GameContext) {
    const s = ctx.saved ?? {};
    this.trials = ctx.blockTrials ?? BLOCK_TRIALS;
    this.sizeArcmin = typeof s.sizeArcmin === 'number' ? s.sizeArcmin : START_SIZE_ARCMIN;
    this.blocks = typeof s.blocks === 'number' ? s.blocks : 0;
    // Smallest letter the screen can draw: a stroke of at least one device pixel.
    this.minArcmin = (5 / ctx.display.devicePxPerDegree) * 60;
    this.sizeArcmin = Math.max(this.minArcmin, this.sizeArcmin);
    this.stair = new Staircase(SPACING_RULE, START_SPACING);
    this.trial = makeTrial(ctx.rng);
  }

  private get relaxed(): boolean {
    return this.ctx.mode === 'relaxed';
  }

  /** Letter height in logical px, kept to what fits on screen. */
  private letterPx(): number {
    const px = (this.sizeArcmin / 60) * this.ctx.display.pxPerDegree * (this.relaxed ? 1.5 : 1);
    const room = Math.min(this.w, this.h * 0.55) / (2 * 2.5 + 1);
    return Math.max(4, Math.min(px, room));
  }

  resize(width: number, height: number): void {
    this.w = width;
    this.h = height;
    const cols = 5;
    const gap = 8;
    const bw = Math.min(72, (width - gap * (cols + 1)) / cols);
    const bh = Math.min(64, Math.max(44, height * 0.1));
    const totalW = cols * bw + (cols - 1) * gap;
    const x0 = (width - totalW) / 2;
    const y0 = height - 2 * bh - gap - 12;
    this.buttons = LETTERS.map((letter, i) => ({
      letter,
      x: x0 + (i % cols) * (bw + gap),
      y: y0 + Math.floor(i / cols) * (bh + gap),
      w: bw,
      h: bh,
    }));
  }

  private centre(): { x: number; y: number } {
    const top = this.buttons[0]?.y ?? this.h;
    return { x: this.w / 2, y: Math.max(40, top / 2) };
  }

  input(e: GameInput): void {
    if (this.over) return;
    if (e.kind === 'key') {
      const l = LETTERS.find((x) => x === e.key);
      if (l) this.answer(l);
      return;
    }
    if (e.kind === 'action') {
      if (!e.pressed) return;
      if (e.action === 'left') this.choice = (this.choice + LETTERS.length - 1) % LETTERS.length;
      else if (e.action === 'right') this.choice = (this.choice + 1) % LETTERS.length;
      else if (e.action === 'up' || e.action === 'down') this.choice = (this.choice + 5) % LETTERS.length;
      else this.answer(LETTERS[this.choice]);
      return;
    }
    if (e.phase !== 'down') return;
    const b = this.buttons.find((b) => e.x >= b.x && e.x <= b.x + b.w && e.y >= b.y && e.y <= b.y + b.h);
    if (b) {
      this.choice = LETTERS.indexOf(b.letter);
      this.answer(b.letter);
    }
  }

  private answer(l: Letter): void {
    if (this.phase !== 'answer' && this.phase !== 'show') return;
    if (this.phase === 'show' && !this.relaxed) return;
    const right = l === this.trial.target;
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

  private endBlock(): void {
    this.over = true;
    if (this.done > 0) this.blocks++;
    // The letter size moves (by one 10 % step at most) only once the spacing has turned
    // round at least twice; a very short block leaves it as it was.
    if (!this.relaxed && this.stair.settled(2)) {
      const accuracy = this.done ? this.correct / this.done : 0;
      const before = this.sizeArcmin;
      this.sizeArcmin = nextSize(this.sizeArcmin, this.stair.estimate(), accuracy, this.minArcmin);
      if (this.sizeArcmin < before) this.ctx.sound('level');
    }
  }

  endNow(): void {
    if (!this.over) this.endBlock();
  }

  update(dtMs: number): void {
    if (this.over) return;
    this.phaseMs += dtMs;
    switch (this.phase) {
      case 'fix':
        if (this.phaseMs >= FIXATION_MS) {
          this.phase = 'show';
          this.phaseMs = 0;
        }
        break;
      case 'show':
        if (this.phaseMs >= targetMs(this.ctx.mode, this.blocks)) {
          this.phase = 'answer';
          this.phaseMs = 0;
        }
        break;
      case 'answer':
        break;
      case 'feedback':
        if (this.phaseMs >= FEEDBACK_MS) {
          if (this.done >= this.trials) {
            this.endBlock();
            return;
          }
          this.trial = makeTrial(this.ctx.rng);
          this.phase = 'fix';
          this.phaseMs = 0;
        }
        break;
    }
  }

  render(r: Renderer): void {
    r.clear();
    const { x, y } = this.centre();
    const size = this.letterPx();
    const gap = this.stair.value * size;
    const box = Math.max(size * 2 + gap * 2, size * 3);
    // Frame for both eyes, and four weak-eye dots that are always there to look between.
    r.rect('both', x - box / 2 - 10, y - box / 2 - 10, box + 20, box + 20, { outline: 2, radius: 8, intensity: 0.6 });
    const d = box / 2 + 2;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) r.circle('weakEye', x + dx * d, y + dy * d, 3);
    if (this.phase === 'fix') {
      r.line('both', x - 6, y, x + 6, y, 2);
      r.line('both', x, y - 6, x, y + 6, 2);
    }
    if (this.phase === 'show') {
      const t = this.trial;
      drawLetter(r, 'weakEye', t.target, x, y, size);
      drawLetter(r, 'weakEye', t.flankers[0], x - gap, y, size);
      drawLetter(r, 'weakEye', t.flankers[1], x + gap, y, size);
      drawLetter(r, 'weakEye', t.flankers[2], x, y - gap, size);
      drawLetter(r, 'weakEye', t.flankers[3], x, y + gap, size);
    }
    if (this.phase === 'answer') r.text('both', 'Which letter was in the middle?', x, y, { align: 'center', size: 16 });
    if (this.phase === 'feedback') {
      r.text('both', this.lastRight ? 'Yes!' : `It was ${this.trial.target}`, x, y, { align: 'center', size: 20, bold: true });
    }
    r.text('both', `${this.done} / ${this.trials}`, 12, 16, { size: 13, intensity: 0.7 });

    const active = this.phase === 'answer' || (this.phase === 'show' && this.relaxed);
    this.buttons.forEach((b, i) => {
      const chosen = i === this.choice;
      r.rect('both', b.x, b.y, b.w, b.h, { outline: chosen ? 3 : 1.5, radius: 8, intensity: active ? (chosen ? 1 : 0.6) : 0.3 });
      drawLetter(r, 'both', b.letter, b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.55, active ? 1 : 0.35);
    });
  }

  status(): GameStatus {
    const accuracy = this.done ? this.correct / this.done : 0;
    return {
      score: this.score,
      level: levelFor(this.sizeArcmin),
      over: this.over,
      trials: { done: this.done, correct: this.correct },
      targetMet: this.done >= 10 ? accuracy >= 0.65 : undefined,
      settled: this.relaxed ? undefined : this.stair.settled(),
    };
  }

  save(): SavedProgress {
    return { sizeArcmin: this.sizeArcmin, blocks: this.blocks, spacing: this.stair.estimate() };
  }

  dispose(): void {}
}
