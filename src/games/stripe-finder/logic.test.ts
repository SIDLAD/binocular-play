import { describe, expect, it } from 'vitest';
import { testGameContext } from '../../engine/api';
import { StripeFinder } from './game';
import { BLOCK_TRIALS, adjustCpd, levelFor, orientationFor, trainingCpd } from './logic';

function playBlock(g: StripeFinder, answer: (i: number) => 'left' | 'right') {
  g.resize(400, 700);
  let i = 0;
  let guard = 0;
  while (!g.status().over && guard++ < 100_000) {
    g.update(50);
    g.input({ kind: 'action', action: answer(i++), pressed: true });
  }
}

describe('Stripe Finder rules', () => {
  it('leans are ±45°', () => {
    expect(orientationFor('right')).toBeCloseTo(Math.PI / 4);
    expect(orientationFor('left')).toBeCloseTo(-Math.PI / 4);
  });

  it('the training frequency never needs fewer than 4 device px per stripe cycle', () => {
    expect(trainingCpd(0.05, 10)).toBe(10);
    expect(trainingCpd(0.25, 10)).toBe(4);
    expect(adjustCpd(9.5, 0.1, 10)).toBe(10);
  });

  it('keeps training near the cut-off', () => {
    expect(adjustCpd(4, 0.2, 20)).toBeCloseTo(4.4);
    expect(adjustCpd(4, 0.9, 20)).toBeCloseTo(4 / 1.1);
    expect(adjustCpd(4, 0.5, 20)).toBe(4);
    expect(levelFor(1)).toBe(1);
    expect(levelFor(0.9)).toBe(2);
  });

  it('the first block finds the frequency, the next ones train contrast', () => {
    const g = new StripeFinder(testGameContext({ mode: 'weak' }));
    playBlock(g, () => 'left');
    expect(g.status().trials?.done).toBe(BLOCK_TRIALS);
    const saved = g.save();
    expect(saved.cpd).toBeGreaterThan(0);
    expect(saved.cpd).toBeLessThanOrEqual(80 / 4);
    const next = new StripeFinder(testGameContext({ mode: 'weak', saved }));
    playBlock(next, () => 'right');
    expect(next.save().contrast).toBeGreaterThan(0);
  });

  it('a block lasts as many answers as picked', () => {
    const g = new StripeFinder(testGameContext({ mode: 'weak', blockTrials: 10 }));
    playBlock(g, () => 'left');
    expect(g.status().trials?.done).toBe(10);
    expect(g.save().cpd).toBeGreaterThan(0);
  });

  it('a finding block ended very early keeps finding next time, from where it got to', () => {
    const g = new StripeFinder(testGameContext({ mode: 'weak' }));
    g.resize(400, 700);
    // Answer three trials, then end from the pause menu.
    let guard = 0;
    while ((g.status().trials?.done ?? 0) < 3 && guard++ < 100_000) {
      g.update(100);
      g.input({ kind: 'action', action: 'left', pressed: true });
    }
    g.endNow();
    expect(g.status().over).toBe(true);
    const saved = g.save();
    expect(saved.cpd).toBeUndefined();
    expect(saved.period).toBeGreaterThan(0);
    expect(saved.blocks).toBe(1);
    const next = new StripeFinder(testGameContext({ mode: 'weak', saved }));
    expect(next.status().level).toBe(1); // still finding
  });
});
