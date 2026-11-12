import { describe, expect, it } from 'vitest';
import { seededRng, testGameContext } from '../../engine/api';
import { StarPatrol } from './game';
import { MAX_DIFFICULTY, MIN_DIFFICULTY, adaptDifficulty, makeGate, throughCorrect } from './logic';

describe('Star Patrol rules', () => {
  it('difficulty aims for 70–80 % wins and stays in range', () => {
    expect(adaptDifficulty(1, 9, 10)).toBeCloseTo(1.06);
    expect(adaptDifficulty(1, 5, 10)).toBeCloseTo(0.94);
    expect(adaptDifficulty(1, 7.5, 10)).toBe(1);
    expect(adaptDifficulty(MAX_DIFFICULTY, 10, 10)).toBe(MAX_DIFFICULTY);
    expect(adaptDifficulty(MIN_DIFFICULTY, 0, 10)).toBe(MIN_DIFFICULTY);
  });

  it('a gate is passed only through the window with the matching stripes', () => {
    const g = makeGate(seededRng(3), 100);
    const upperY = 10;
    const lowerY = 90;
    expect(throughCorrect(g, upperY, 50)).toBe(g.correct === 'upper');
    expect(throughCorrect(g, lowerY, 50)).toBe(g.correct === 'lower');
  });

  it('gates appear every 20–40 s and are counted as weak-eye checks', () => {
    const g = new StarPatrol(testGameContext());
    g.resize(800, 450);
    for (let i = 0; i < 60 * 120 && !g.status().over; i++) g.update(1000 / 60);
    const c = g.status().catches;
    expect(c).toBeDefined();
    if (!g.status().over) {
      expect(c?.shown).toBeGreaterThanOrEqual(2);
      expect(c?.shown).toBeLessThanOrEqual(6);
    }
  });

  it('saves difficulty and gate contrast', () => {
    const g = new StarPatrol(testGameContext({ saved: { difficulty: 1.5, gateContrast: 0.3 } }));
    expect(g.save().difficulty).toBe(1.5);
    expect(g.save().gateContrast).toBeCloseTo(0.36);
  });
});
