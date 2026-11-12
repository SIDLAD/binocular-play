import { describe, expect, it } from 'vitest';
import { seededRng, testGameContext as testContext } from '../../engine/api';
import { LetterCrowd } from './game';
import { BLOCK_TRIALS, LETTERS, START_SIZE_ARCMIN, levelFor, makeTrial, nextSize, rasterLetter, targetMs } from './logic';

describe('Letter Crowd rules', () => {
  it('all ten letter shapes are clearly different from each other', () => {
    const n = 24;
    const shapes = LETTERS.map((l) => rasterLetter(l, n));
    for (let i = 0; i < shapes.length; i++) {
      const ink = shapes[i].reduce((a, v) => a + v, 0);
      expect(ink, LETTERS[i]).toBeGreaterThan(n * n * 0.12);
      for (let j = i + 1; j < shapes.length; j++) {
        let diff = 0;
        for (let k = 0; k < n * n; k++) diff += shapes[i][k] !== shapes[j][k] ? 1 : 0;
        expect(diff, `${LETTERS[i]} vs ${LETTERS[j]}`).toBeGreaterThan(n * n * 0.05);
      }
    }
  });

  it('a trial has four different flankers, none the target', () => {
    const rng = seededRng(9);
    for (let i = 0; i < 200; i++) {
      const t = makeTrial(rng);
      expect(new Set([t.target, ...t.flankers]).size).toBe(5);
    }
  });

  it('the target is brief in Classic and untimed in Relaxed', () => {
    expect(targetMs('classic', 0)).toBe(300);
    expect(targetMs('classic', 2)).toBe(150);
    expect(targetMs('relaxed', 5)).toBe(Infinity);
  });

  it('letters shrink 10 % at near-touching spacing, grow when wide spacing is hard, never below the screen limit', () => {
    expect(nextSize(60, 1.1, 0.8, 5)).toBeCloseTo(54);
    expect(nextSize(60, 1.6, 0.8, 5)).toBe(60);
    expect(nextSize(60, 2.4, 0.5, 5)).toBeCloseTo(66);
    expect(nextSize(5.2, 1.0, 0.9, 5)).toBe(5);
    expect(levelFor(START_SIZE_ARCMIN)).toBe(1);
    expect(levelFor(START_SIZE_ARCMIN * 0.9)).toBe(2);
  });

  it('a block ends after 50 answers and saves the level', () => {
    const g = new LetterCrowd(testContext({ mode: 'classic' }));
    g.resize(400, 700);
    let guard = 0;
    while (!g.status().over && guard++ < 100_000) {
      g.update(50);
      g.input({ kind: 'key', key: 'K' });
    }
    expect(g.status().trials?.done).toBe(BLOCK_TRIALS);
    expect(g.save().blocks).toBe(1);
  });

  it('answers in Classic only count after the letter has gone', () => {
    const g = new LetterCrowd(testContext({ mode: 'classic' }));
    g.resize(400, 700);
    g.update(600); // into "show"
    g.input({ kind: 'key', key: 'K' });
    expect(g.status().trials?.done).toBe(0);
  });
});
