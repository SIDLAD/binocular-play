import { describe, expect, it } from 'vitest';
import { CatchSchedule, catchFlagged } from '../../engine/catchTargets';
import { seededRng } from '../../engine/api';
import { CAP, dayOutcome, nextContrast } from './contrastPolicy';

describe('contrast policy', () => {
  const opts = { hold: false, balanceMax: null };

  it('rises by 2 points after a qualifying day', () => {
    expect(nextContrast(0.3, 'qualified', opts)).toBe(0.32);
  });

  it('falls by 5 points after a failed day, never below 10 %', () => {
    expect(nextContrast(0.3, 'failed', opts)).toBe(0.25);
    expect(nextContrast(0.12, 'failed', opts)).toBe(0.1);
  });

  it('never rises above 80 % or the balance-check value', () => {
    expect(nextContrast(0.79, 'qualified', opts)).toBe(CAP);
    expect(nextContrast(0.8, 'qualified', opts)).toBe(0.8);
    expect(nextContrast(0.5, 'qualified', { hold: false, balanceMax: 0.51 })).toBe(0.51);
    expect(nextContrast(0.51, 'qualified', { hold: false, balanceMax: 0.51 })).toBe(0.51);
  });

  it('does not lower a value set by hand above the cap', () => {
    expect(nextContrast(1, 'qualified', opts)).toBe(1);
  });

  it('hold keeps the value', () => {
    expect(nextContrast(0.3, 'qualified', { hold: true, balanceMax: null })).toBe(0.3);
    expect(nextContrast(0.3, 'failed', { hold: true, balanceMax: null })).toBe(0.3);
  });

  it('a day counts only after 15 active minutes, and only when the game reports a target', () => {
    expect(dayOutcome(14.9, true)).toBeNull();
    expect(dayOutcome(15, true)).toBe('qualified');
    expect(dayOutcome(20, false)).toBe('failed');
    expect(dayOutcome(20, undefined)).toBeNull();
  });
});

describe('weak-eye catch checks', () => {
  it('shows a prompt every 20–40 s and counts catches and misses', () => {
    const c = new CatchSchedule(seededRng(1));
    let shows = 0;
    let firstAt = -1;
    for (let t = 0; t < 600_000; t += 100) {
      const e = c.update(100);
      if (e === 'show') {
        shows++;
        if (firstAt < 0) firstAt = t;
        if (shows % 2 === 0) c.catch();
      }
    }
    expect(firstAt).toBeGreaterThanOrEqual(19_900);
    expect(firstAt).toBeLessThanOrEqual(40_000);
    expect(shows).toBeGreaterThan(10);
    expect(c.shown).toBe(shows);
    expect(c.caught).toBe(Math.floor(shows / 2));
  });

  it('catching when nothing is up does nothing', () => {
    const c = new CatchSchedule(seededRng(1));
    expect(c.catch()).toBe(false);
    expect(c.caught).toBe(0);
  });

  it('flags a session only with enough prompts and a low catch rate', () => {
    expect(catchFlagged({ shown: 3, caught: 0 })).toBe(false);
    expect(catchFlagged({ shown: 6, caught: 2 })).toBe(true);
    expect(catchFlagged({ shown: 6, caught: 3 })).toBe(false);
    expect(catchFlagged(undefined)).toBe(false);
  });
});
