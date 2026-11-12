/**
 * Weak-eye catch checks: now and then a prompt appears that only the weak eye can see
 * ("tap the star"). If the player almost never catches them, the grown-ups page says the
 * glasses may be off or the weak eye may not be taking part. Nothing is diagnosed.
 *
 * Pure: the game draws the prompt and reports taps.
 */
export class CatchSchedule {
  shown = 0;
  caught = 0;
  private untilNext: number;
  private left = 0;

  constructor(
    private rng: () => number,
    private minGapMs = 20000,
    private maxGapMs = 40000,
    /** How long a prompt stays up. */
    readonly windowMs = 5000,
  ) {
    this.untilNext = this.gap();
  }

  private gap(): number {
    return this.minGapMs + this.rng() * (this.maxGapMs - this.minGapMs);
  }

  /** True while a prompt is up. */
  get active(): boolean {
    return this.left > 0;
  }

  /** 0–1: how far through its window the current prompt is. */
  get progress(): number {
    return this.active ? 1 - this.left / this.windowMs : 0;
  }

  /** Advances time. Returns 'show' when a prompt appears and 'missed' when one runs out. */
  update(dtMs: number): 'show' | 'missed' | null {
    if (this.left > 0) {
      this.left -= dtMs;
      if (this.left <= 0) {
        this.left = 0;
        this.untilNext = this.gap();
        return 'missed';
      }
      return null;
    }
    this.untilNext -= dtMs;
    if (this.untilNext <= 0) {
      this.left = this.windowMs;
      this.shown++;
      return 'show';
    }
    return null;
  }

  /** The player tapped the prompt. Returns true if one was up. */
  catch(): boolean {
    if (!this.active) return false;
    this.caught++;
    this.left = 0;
    this.untilNext = this.gap();
    return true;
  }

  stats(): { shown: number; caught: number } {
    return { shown: this.shown, caught: this.caught };
  }
}

/** At least this many prompts before a low catch rate is flagged. */
export const CATCH_MIN_SHOWN = 4;
/** Below this share caught, the session is flagged for the grown-ups page. */
export const CATCH_FLAG_BELOW = 0.5;

export function catchFlagged(c: { shown: number; caught: number } | undefined | null): boolean {
  return !!c && c.shown >= CATCH_MIN_SHOWN && c.caught / c.shown < CATCH_FLAG_BELOW;
}
