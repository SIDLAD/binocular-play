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
});
