/**
 * Adaptive staircase shared by the training tasks.
 *
 * "Value" is the stimulus level (contrast, spacing, disparity …). Lower is always harder.
 * After `down` correct answers in a row the value is multiplied by `harder` (< 1);
 * after any error it is multiplied by `easier` (> 1).
 *  - 3-down-1-up converges near 79 % correct (Hussain 2012; Huang 2008 used ×0.9 / ×1.1).
 *  - 2-down-1-up converges near 71 % correct (Xi 2014; Liu 2020).
 * This is a training level only. It is never shown as an acuity or a diagnosis.
 */
export interface StaircaseRule {
  down: number;
  harder: number;
  easier: number;
  min: number;
  max: number;
}

export interface StaircaseState {
  value: number;
  /** Correct answers in a row since the last change. */
  run: number;
  /** Direction of the last change: -1 harder, 1 easier, 0 none yet. */
  lastDir: -1 | 0 | 1;
  /** Values at which the direction changed. */
  reversals: number[];
  trials: number;
  correct: number;
}

const MAX_REVERSALS = 40;
/** Reversals before a block's level counts as settled (short blocks may not get there). */
export const SETTLED_REVERSALS = 4;

export class Staircase {
  readonly rule: StaircaseRule;
  private s: StaircaseState;

  constructor(rule: StaircaseRule, start: number) {
    this.rule = rule;
    this.s = { value: clamp(start, rule.min, rule.max), run: 0, lastDir: 0, reversals: [], trials: 0, correct: 0 };
  }

  get value(): number {
    return this.s.value;
  }

  get state(): Readonly<StaircaseState> {
    return this.s;
  }

  /** Records one answer and returns the new value. */
  answer(correct: boolean): number {
    const s = this.s;
    const r = this.rule;
    s.trials++;
    let dir: -1 | 0 | 1 = 0;
    if (correct) {
      s.correct++;
      s.run++;
      if (s.run >= r.down) {
        s.run = 0;
        dir = -1;
      }
    } else {
      s.run = 0;
      dir = 1;
    }
    if (dir !== 0) {
      if (s.lastDir !== 0 && dir !== s.lastDir) {
        s.reversals.push(s.value);
        if (s.reversals.length > MAX_REVERSALS) s.reversals.shift();
      }
      s.lastDir = dir;
      s.value = clamp(s.value * (dir < 0 ? r.harder : r.easier), r.min, r.max);
    }
    return s.value;
  }

  /** True once there are enough reversals for estimate() to mean something. */
  settled(n = SETTLED_REVERSALS): boolean {
    return this.s.reversals.length >= n;
  }

  /**
   * The training level reached: the geometric mean of the last `n` reversals, or the
   * current value when there are too few reversals yet.
   */
  estimate(n = 6): number {
    const rev = this.s.reversals.slice(-n);
    if (rev.length < 2) return this.s.value;
    const logMean = rev.reduce((a, v) => a + Math.log(v), 0) / rev.length;
    return clamp(Math.exp(logMean), this.rule.min, this.rule.max);
  }
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return hi;
  return Math.max(lo, Math.min(hi, v));
}
