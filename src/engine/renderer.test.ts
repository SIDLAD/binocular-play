import { describe, expect, it } from 'vitest';
import { NEUTRAL_PALETTE } from '../core/colour/palette';
import { testGameContext } from './api';
import { CanvasChannelRenderer } from './renderer';
import { stubSurfaces, type SurfaceFactory } from './surfaces';
import { RecordingContext } from './testing/recordingContext';
import { StarPatrol } from '../games/star-patrol/game';

function countingRenderer(w: number, h: number) {
  let built = 0;
  const surfaces: SurfaceFactory = {
    bitmap: (...a) => {
      built++;
      return stubSurfaces.bitmap(...a);
    },
    luma: () => null,
  };
  const r = new CanvasChannelRenderer(new RecordingContext(), { current: NEUTRAL_PALETTE }, w, h, surfaces);
  return { r, built: () => built };
}

describe('pattern cache', () => {
  it('reuses a pattern when the size only drifts in the last decimal places', () => {
    const { r, built } = countingRenderer(800, 600);
    const spec = { kind: 'grating' as const, size: 284.20260958674965, cyclesPerDegree: 1.5, contrast: 0.7 };
    for (let i = 0; i < 50; i++) r.pattern('weakEye', 100, 100, { ...spec, size: spec.size + i * 1e-13 });
    expect(built()).toBe(1);
  });

  it('builds a new pattern when the size really changes', () => {
    const { r, built } = countingRenderer(800, 600);
    r.pattern('weakEye', 100, 100, { kind: 'grating', size: 100, contrast: 0.7 });
    r.pattern('weakEye', 100, 100, { kind: 'grating', size: 120, contrast: 0.7 });
    expect(built()).toBe(2);
  });

  it('Star Patrol builds each gate window once, not every frame', () => {
    const W = 1280;
    const H = 720;
    const { r, built } = countingRenderer(W, H);
    const g = new StarPatrol(testGameContext());
    g.resize(W, H);
    const gateOf = () => (g as unknown as { gate: { x: number; done: boolean } | null }).gate;
    // Play until the first gate has scrolled in, been flown through and left the screen.
    let seen = false;
    for (let i = 0; i < 5000; i++) {
      g.update(16);
      g.render(r);
      if (gateOf()) seen = true;
      else if (seen) break;
    }
    expect(seen).toBe(true);
    expect(g.status().catches?.shown).toBe(1);
    // Two windows (two stripe directions), each built once when the gate appears. Passing
    // the gate moves the staircase, but the gate on screen keeps its contrast.
    expect(built()).toBe(2);
  });
});
