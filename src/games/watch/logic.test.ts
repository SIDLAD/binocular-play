import { describe, expect, it } from 'vitest';
import { seededRng, testGameContext } from '../../engine/api';
import { Watch } from './game';
import { CHANGE_EVERY_MS, FADE_MS, MaskTimer, fitRect } from './logic';

describe('Watch mode rules', () => {
  it('masks move every 10 s with a 1 s cross-fade', () => {
    const t = new MaskTimer(seededRng(1));
    expect(t.mask().mix).toBe(1);
    t.update(CHANGE_EVERY_MS - 1);
    expect(t.changes).toBe(0);
    const before = t.mask().to;
    t.update(1);
    expect(t.changes).toBe(1);
    expect(t.mask().from).toBe(before);
    expect(t.mask().mix).toBe(0);
    t.update(FADE_MS / 2);
    expect(t.mask().mix).toBeCloseTo(0.5);
    t.update(FADE_MS);
    expect(t.mask().mix).toBe(1);
  });

  it('the picture keeps its shape and fits', () => {
    const r = fitRect(400, 800, 16 / 9, 10);
    expect(r.w / r.h).toBeCloseTo(16 / 9);
    expect(r.w).toBeLessThanOrEqual(380);
    expect(r.x).toBeCloseTo((400 - r.w) / 2);
  });

  it('counts caught and missed stars', () => {
    const g = new Watch(testGameContext({ mode: 'reef' }));
    g.resize(800, 450);
    let shown = 0;
    for (let i = 0; i < 6000; i++) {
      g.update(100);
      const s = g.status().catches;
      if (s && s.shown > shown) {
        shown = s.shown;
        if (shown % 2 === 1) g.input({ kind: 'action', action: 'primary', pressed: true });
      }
    }
    const c = g.status().catches;
    expect(c?.shown).toBeGreaterThan(5);
    expect(c?.caught).toBe(Math.ceil((c?.shown ?? 0) / 2));
    expect(g.status().over).toBe(false);
  });
});
