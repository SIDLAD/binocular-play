import { describe, expect, it } from 'vitest';
import {
  CARD_WIDTH_MM,
  arcminToPx,
  devicePxToArcsec,
  displayInfo,
  maxCyclesPerDegree,
  pxPerDegree,
  pxPerMmFromCard,
  pxToArcmin,
} from './visualAngle';

describe('visual angle', () => {
  it('card width gives px per mm', () => {
    expect(pxPerMmFromCard(CARD_WIDTH_MM * 4)).toBeCloseTo(4);
  });

  it('one degree at 57.3 cm is about 10 mm', () => {
    expect(pxPerDegree(1, 57.29578)).toBeCloseTo(10, 2);
  });

  it('px per degree scales with distance and density', () => {
    expect(pxPerDegree(4, 120) / pxPerDegree(4, 60)).toBeCloseTo(2, 3);
    expect(pxPerDegree(8, 60) / pxPerDegree(4, 60)).toBeCloseTo(2, 6);
  });

  it('arcmin and px round-trip', () => {
    const ppd = pxPerDegree(3.78, 60);
    expect(pxToArcmin(arcminToPx(5, ppd), ppd)).toBeCloseTo(5);
    expect(arcminToPx(60, ppd)).toBeCloseTo(ppd);
  });

  it('a one-device-pixel shift on a typical laptop is roughly 30–65 arcsec', () => {
    const ppd = pxPerDegree(96 / 25.4, 60);
    expect(devicePxToArcsec(1, ppd * 1.5)).toBeGreaterThan(30);
    expect(devicePxToArcsec(1, ppd * 1.5)).toBeLessThan(65);
  });

  it('grating frequency is capped at 4 device px per cycle', () => {
    expect(maxCyclesPerDegree(80)).toBe(20);
  });

  it('displayInfo falls back to estimates and says so', () => {
    const est = displayInfo(null, 2, 375);
    expect(est.measured).toBe(false);
    expect(est.viewingDistanceCm).toBe(50);
    expect(est.devicePxPerDegree).toBeCloseTo(est.pxPerDegree * 2);
    const real = displayInfo({ pxPerMm: 6, viewingDistanceCm: 40, checkedAt: '2026-11-12T00:00:00Z' }, 1, 1000);
    expect(real.measured).toBe(true);
    expect(real.pxPerDegree).toBeCloseTo(pxPerDegree(6, 40));
  });
});
