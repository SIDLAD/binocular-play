import { describe, expect, it } from 'vitest';
import { srgbToLinear, type RGB } from '../core/colour/srgb';
import { randomBlobs, seededRng } from './api';
import { ditherField, fieldMean, maskField, maskWeight, maskedChannel, patternField } from './pixels';

const RED: RGB = [255, 0, 0];
const CYAN: RGB = [0, 255, 255];
const BLACK: RGB = [0, 0, 0];

/** Mean and Michelson contrast (by projection onto the sinusoid) of one primary, in linear light. */
function measure(data: Uint8ClampedArray, w: number, h: number, primary: number, cyclesPerPx: number) {
  let sum = 0;
  let proj = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = srgbToLinear(data[(y * w + x) * 4 + primary]);
      sum += l;
      proj += l * Math.cos(2 * Math.PI * cyclesPerPx * (x + 0.5));
    }
  }
  const mean = sum / (w * h);
  const amplitude = (2 * proj) / (w * h);
  return { mean, contrast: amplitude / mean };
}

function flatGrating(w: number, h: number, cyclesPerPx: number, contrast: number): Float32Array {
  const t = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) t[y * w + x] = 0.5 + 0.5 * contrast * Math.cos(2 * Math.PI * cyclesPerPx * (x + 0.5));
  }
  return t;
}

describe('dithered patterns', () => {
  for (const contrast of [0.5, 0.2, 0.08, 0.03]) {
    it(`keep the mean light and a ${contrast * 100} % contrast within 1 %`, () => {
      const w = 256;
      const h = 64;
      const f = 1 / 16;
      const data = ditherField(flatGrating(w, h, f, contrast), w, h, RED, BLACK);
      const m = measure(data, w, h, 0, f);
      expect(Math.abs(m.mean - 0.5) / 0.5).toBeLessThan(0.01);
      expect(Math.abs(m.contrast - contrast)).toBeLessThan(0.01);
    });
  }

  it('dim channel colours work too (the fellow eye at 30 %)', () => {
    const w = 256;
    const h = 64;
    const dim: RGB = [0, 149, 149];
    const data = ditherField(flatGrating(w, h, 1 / 8, 0.25), w, h, dim, BLACK);
    const m = measure(data, w, h, 1, 1 / 8);
    expect(Math.abs(m.mean - srgbToLinear(149) * 0.5) / (srgbToLinear(149) * 0.5)).toBeLessThan(0.01);
    expect(Math.abs(m.contrast - 0.25)).toBeLessThan(0.01);
  });

  it('never touches a primary the colour shares with the background (eye separation)', () => {
    const w = 64;
    const data = ditherField(flatGrating(w, w, 0.1, 1), w, w, RED, BLACK);
    for (let i = 0; i < w * w; i++) {
      expect(data[i * 4 + 1]).toBe(0);
      expect(data[i * 4 + 2]).toBe(0);
    }
    const cyan = ditherField(flatGrating(w, w, 0.1, 1), w, w, CYAN, BLACK);
    for (let i = 0; i < w * w; i++) expect(cyan[i * 4]).toBe(0);
  });

  it('a windowed patch fades to the background at its edge', () => {
    const n = 64;
    const t = patternField({ kind: 'grating', size: n, contrast: 1, cyclesPerDegree: 4 }, n, 0.1, 1);
    expect(t[0]).toBe(0);
    expect(t[(n / 2) * n + n / 2]).toBeGreaterThan(0);
    expect(fieldMean(t)).toBeGreaterThan(0.2);
    expect(fieldMean(t)).toBeLessThan(0.5);
  });

  it('noise is the same for the same seed and different for another', () => {
    const spec = { kind: 'noise' as const, size: 32, contrast: 0.5, seed: 3 };
    const a = patternField(spec, 32, 0, 2);
    const b = patternField(spec, 32, 0, 2);
    const c = patternField({ ...spec, seed: 4 }, 32, 0, 2);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(c));
  });
});

describe('blob masks', () => {
  it('the two eyes get exact complements at every pixel', () => {
    const rng = seededRng(11);
    const a = maskField(randomBlobs(rng), 80, 45);
    const b = maskField(randomBlobs(rng), 80, 45);
    for (const mix of [0, 0.3, 0.5, 1]) {
      for (let i = 0; i < a.length; i++) {
        const m = a[i] + (b[i] - a[i]) * mix;
        expect(maskWeight(m, 'inside') + maskWeight(m, 'outside')).toBe(1);
      }
    }
  });

  it('cover a fair share of the picture and stay within 0–1', () => {
    const field = maskField(randomBlobs(seededRng(2)), 120, 80);
    const mean = fieldMean(field);
    expect(mean).toBeGreaterThan(0.2);
    expect(mean).toBeLessThan(0.8);
    expect(Math.min(...field)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...field)).toBeLessThanOrEqual(1);
  });

  it('masked channel light adds up to the picture: inside + outside = whole', () => {
    const w = 40;
    const h = 30;
    const luma = new Float32Array(w * h).fill(0.6);
    const a = maskField(randomBlobs(seededRng(5)), w, h);
    const b = maskField(randomBlobs(seededRng(6)), w, h);
    const out = new Uint8ClampedArray(w * h * 4);
    const inside = maskedChannel(luma, a, b, 0.4, 'inside', RED, BLACK, out);
    const outside = maskedChannel(luma, a, b, 0.4, 'outside', CYAN, BLACK, out);
    expect(inside + outside).toBeCloseTo(0.6, 5);
    // Cyan output never has red light.
    for (let i = 0; i < w * h; i++) expect(out[i * 4]).toBe(0);
  });
});
