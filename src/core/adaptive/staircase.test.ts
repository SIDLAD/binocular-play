import { describe, expect, it } from 'vitest';
import { seededRng } from '../../engine/api';
import { Staircase } from './staircase';

/** A simulated observer with a logistic psychometric function on log value. */
function observer(threshold: number, rng: () => number) {
  return (value: number) => rng() < 1 / (1 + Math.exp(-6 * Math.log(value / threshold)));
}

describe('staircase', () => {
  it('3-down-1-up converges near 79 % correct on a simulated observer', () => {
    const rng = seededRng(3);
    const see = observer(0.2, rng);
    const st = new Staircase({ down: 3, harder: 0.9, easier: 1.1, min: 0.01, max: 1 }, 1);
    let correct = 0;
    let counted = 0;
    for (let i = 0; i < 4000; i++) {
      const ok = see(st.value);
      if (i > 500) {
        counted++;
        if (ok) correct++;
      }
      st.answer(ok);
    }
    expect(correct / counted).toBeGreaterThan(0.74);
    expect(correct / counted).toBeLessThan(0.84);
    expect(st.estimate()).toBeGreaterThan(0.2);
    expect(st.estimate()).toBeLessThan(0.4);
  });

  it('2-down-1-up converges near 71 %', () => {
    const rng = seededRng(5);
    const see = observer(0.3, rng);
    const st = new Staircase({ down: 2, harder: 0.9, easier: 1.1, min: 0.01, max: 1 }, 1);
    let correct = 0;
    for (let i = 0; i < 4000; i++) {
      const ok = see(st.value);
      if (ok) correct++;
      st.answer(ok);
    }
    expect(correct / 4000).toBeGreaterThan(0.66);
    expect(correct / 4000).toBeLessThan(0.76);
  });

  it('steps are multiplicative and clamped', () => {
    const st = new Staircase({ down: 3, harder: 0.5, easier: 2, min: 0.1, max: 1 }, 1);
    st.answer(true);
    st.answer(true);
    expect(st.value).toBe(1);
    st.answer(true);
    expect(st.value).toBe(0.5);
    st.answer(false);
    expect(st.value).toBe(1);
    st.answer(false);
    expect(st.value).toBe(1);
    for (let i = 0; i < 30; i++) st.answer(true);
    expect(st.value).toBe(0.1);
  });

  it('records reversals and uses them for the estimate', () => {
    const st = new Staircase({ down: 1, harder: 0.5, easier: 2, min: 0.001, max: 100 }, 8);
    st.answer(true); // 4
    st.answer(false); // reversal at 4 → 8
    st.answer(true); // reversal at 8 → 4
    expect(st.state.reversals).toEqual([4, 8]);
    expect(st.estimate()).toBeCloseTo(Math.sqrt(32));
  });

  it('counts as settled only after enough reversals', () => {
    const st = new Staircase({ down: 1, harder: 0.5, easier: 2, min: 0.001, max: 100 }, 8);
    expect(st.settled()).toBe(false);
    for (let i = 0; i < 4; i++) st.answer(i % 2 === 0);
    expect(st.state.reversals.length).toBe(3);
    expect(st.settled(2)).toBe(true);
    expect(st.settled()).toBe(false);
    st.answer(true);
    expect(st.settled()).toBe(true);
  });
});
