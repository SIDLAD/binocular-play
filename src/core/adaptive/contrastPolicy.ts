import { MIN_CONTRAST } from '../settings/schema';

/**
 * Optional slow rise of the stronger eye's brightness. Off by default.
 *
 * A trial comparing 0 %, +5 % and +10 % daily increments found no difference (PMC8328197),
 * so the steps here are small: +2 points after a qualifying day, −5 after a failed one.
 * Never above 80 %, and never above the value from the latest balance check.
 * The app never sets a dose; a grown-up turns this on and can hold it.
 */
export const RISE = 0.02;
export const FALL = 0.05;
export const CAP = 0.8;
/** Active minutes in a day before the day counts. */
export const QUALIFY_MIN = 15;

export type DayOutcome = 'qualified' | 'failed';

export function capFor(balanceMax: number | null): number {
  return balanceMax === null ? CAP : Math.min(CAP, balanceMax);
}

/** The new contrast. A value already above the cap (set by hand) is never lowered by a rise. */
export function nextContrast(current: number, outcome: DayOutcome, opts: { hold: boolean; balanceMax: number | null }): number {
  if (opts.hold) return current;
  const round = (v: number) => Math.round(v * 100) / 100;
  if (outcome === 'qualified') {
    const cap = capFor(opts.balanceMax);
    if (current >= cap) return current;
    return round(Math.min(cap, current + RISE));
  }
  return round(Math.max(MIN_CONTRAST, current - FALL));
}

/**
 * Whether today counts. Decided once per day, when the day's active minutes first reach
 * QUALIFY_MIN, from the round that crossed it: target met → qualified, missed → failed.
 * A game that reports no target leaves the day undecided.
 */
export function dayOutcome(activeMinutesToday: number, targetMet: boolean | undefined): DayOutcome | null {
  if (activeMinutesToday < QUALIFY_MIN || targetMet === undefined) return null;
  return targetMet ? 'qualified' : 'failed';
}
