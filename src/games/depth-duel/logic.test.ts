import { describe, expect, it } from 'vitest';
import { testGameContext, type Renderer } from '../../engine/api';
import { DepthDuel } from './game';
import { BLOCK_TRIALS, nearSign, shiftPx } from './logic';

/** Records weak-eye and strong-eye rects in device pixels. */
function recorder(dpr: number) {
  const weak: number[] = [];
  const fellow: number[] = [];
  const r = {
    width: 400,
    height: 700,
    pxPerDegree: 40,
    pixelRatio: dpr,
    clear() {},
    rect(ch: string, x: number) {
      if (ch === 'weakEye') weak.push(x * dpr);
      if (ch === 'fellowEye') fellow.push(x * dpr);
    },
    circle() {},
    line() {},
    poly() {},
    text() {},
    group(_t: unknown, d: () => void) {
      d();
    },
    pattern() {},
    image() {},
  } as unknown as Renderer;
  return { r, weak, fellow };
}

describe('Depth Duel rules', () => {
  it('disparity is always a whole number of device pixels, at least one', () => {
    for (const v of [0.2, 1, 1.4, 2.6, 7.5, 24]) {
      expect(Number.isInteger(shiftPx(v))).toBe(true);
      expect(shiftPx(v)).toBeGreaterThanOrEqual(1);
    }
  });

  it('nearer means crossed disparity: the weak-eye copy moves away from its own side', () => {
    expect(nearSign('left')).toBe(1);
    expect(nearSign('right')).toBe(-1);
  });

  for (const dpr of [1, 2, 3]) {
    it(`drawn shifts are whole device pixels at pixel ratio ${dpr}`, () => {
      const g = new DepthDuel(testGameContext({ weakEyeSide: 'right' }));
      g.resize(400, 700);
      g.update(3100); // past the intro
      const { r, weak, fellow } = recorder(dpr);
      g.render(r);
      expect(weak.length).toBe(fellow.length);
      const shifts = weak.map((x, i) => x - fellow[i]);
      for (const s of shifts) expect(Math.abs(s - Math.round(s))).toBeLessThan(1e-6);
      // One patch is shifted (negative for a right weak eye), the other is not.
      expect(shifts.some((s) => s < 0)).toBe(true);
      expect(shifts.some((s) => s === 0)).toBe(true);
      expect(shifts.every((s) => s <= 0)).toBe(true);
    });
  }

  it('a block is 40 answers', () => {
    const g = new DepthDuel(testGameContext());
    g.resize(400, 700);
    let guard = 0;
    while (!g.status().over && guard++ < 100_000) {
      g.update(100);
      g.input({ kind: 'action', action: 'up', pressed: true });
    }
    expect(g.status().trials?.done).toBe(BLOCK_TRIALS);
    expect(g.save().blocks).toBe(1);
  });

  const play = (g: DepthDuel, answers: (i: number) => 'up' | 'down', max = 1000) => {
    g.resize(400, 700);
    let guard = 0;
    let i = 0;
    while (!g.status().over && guard++ < 100_000 && i < max) {
      g.update(100);
      const before = g.status().trials?.done ?? 0;
      g.input({ kind: 'action', action: answers(i), pressed: true });
      if ((g.status().trials?.done ?? 0) > before) i++;
    }
  };

  it('a block lasts as many answers as the player picked', () => {
    const g = new DepthDuel(testGameContext({ blockTrials: 5 }));
    play(g, () => 'up');
    expect(g.status().trials?.done).toBe(5);
    expect(g.save().blocks).toBe(1);
  });

  it('"End now" ends the block, counts it, and keeps the level it reached', () => {
    const g = new DepthDuel(testGameContext({ blockTrials: 40 }));
    play(g, () => 'up', 3);
    expect(g.status().over).toBe(false);
    g.endNow();
    const s = g.status();
    expect(s.over).toBe(true);
    expect(s.trials?.done).toBe(3);
    expect(s.settled).toBe(false);
    expect(g.save().blocks).toBe(1);
    expect(Number.isFinite(g.save().disparity)).toBe(true);
  });

  it('ending before any answer does not count a block', () => {
    const g = new DepthDuel(testGameContext({ saved: { blocks: 2, disparity: 4 } }));
    g.endNow();
    expect(g.status().over).toBe(true);
    expect(g.save()).toEqual({ blocks: 2, disparity: 4 });
  });

  it('a short block that does not settle moves the saved level only half way', () => {
    const g = new DepthDuel(testGameContext({ blockTrials: 5, saved: { blocks: 1, disparity: 4 } }));
    let near: 'up' | 'down' = 'up';
    play(g, () => (near = near === 'up' ? 'down' : 'up'));
    const st = g.status();
    expect(st.trials?.done).toBe(5);
    expect(st.settled).toBe(false);
    const saved = g.save().disparity;
    expect(saved).toBeGreaterThan(0);
    // Five answers move the staircase at most 1.1^5 easier or 0.9^2 harder; half of that in log steps.
    expect(saved).toBeLessThanOrEqual(4 * 1.1 ** 2.5 + 1e-9);
    expect(saved).toBeGreaterThanOrEqual(4 * 0.9 + 1e-9 - 1e-6);
  });
});
