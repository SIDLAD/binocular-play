import { linearToSrgb, srgbToLinear, type RGB } from '../core/colour/srgb';
import { seededRng, type MaskBlob, type PatternSpec } from './api';

/**
 * Pixel work for the pattern and image primitives. Pure: no canvas, no DOM.
 *
 * Every pixel is a fraction `t` (0–1) of the channel colour's light, mixed in linear light
 * between the background and that colour. A primary the channel colour shares with the
 * background is written as the background value exactly, so eye separation survives.
 */

/** Linear light of every 8-bit code value. */
const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) LIN[i] = srgbToLinear(i);

/**
 * Turns a field of light fractions into RGBA bytes in the channel colour, with
 * Floyd–Steinberg error diffusion done in linear light (Hussain 2014 dithered its stimuli
 * the same way). This keeps the mean light and the contrast of fine patterns close to
 * the target on an ordinary 8-bit screen.
 */
export function ditherField(t: Float32Array, w: number, h: number, colour: RGB, bg: RGB): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) out[i * 4 + 3] = 255;
  for (let p = 0; p < 3; p++) {
    const b = bg[p];
    const c = colour[p];
    if (b === c) {
      for (let i = 0; i < w * h; i++) out[i * 4 + p] = b;
      continue;
    }
    const lb = LIN[b];
    const lc = LIN[c];
    let errRow = new Float32Array(w + 2);
    let nextRow = new Float32Array(w + 2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const want = lb + (lc - lb) * t[i] + errRow[x + 1];
        const code = linearToSrgb(Math.max(0, Math.min(1, want)));
        out[i * 4 + p] = code;
        const e = want - LIN[code];
        errRow[x + 2] += (e * 7) / 16;
        nextRow[x] += (e * 3) / 16;
        nextRow[x + 1] += (e * 5) / 16;
        nextRow[x + 2] += e / 16;
      }
      const swap = errRow;
      errRow = nextRow;
      nextRow = swap;
      nextRow.fill(0);
    }
  }
  return out;
}

/** Edge window of a patch: 1 in the middle, 0 at radius 1. */
export function windowAt(kind: 'disc' | 'gauss', r: number): number {
  if (r >= 1) return 0;
  if (kind === 'gauss') return Math.exp(-(r * r) / (2 * 0.33 * 0.33));
  if (r <= 0.8) return 1;
  return 0.5 * (1 + Math.cos((Math.PI * (r - 0.8)) / 0.2));
}

/**
 * Light fractions for a grating or noise patch of `size` device px.
 * `cyclesPerPx` is per device px. Mean level is half the channel's light; contrast is
 * Michelson contrast around that mean, faded out by the window.
 */
export function patternField(spec: PatternSpec, size: number, cyclesPerPx: number, grainPx: number): Float32Array {
  const n = Math.max(1, Math.round(size));
  const t = new Float32Array(n * n);
  const c = Math.max(0, Math.min(1, spec.contrast));
  const theta = spec.orientation ?? 0;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const phase = spec.phase ?? 0;
  const half = n / 2;
  const win = spec.window ?? 'disc';
  let noise: Float32Array | null = null;
  let cells = 0;
  if (spec.kind === 'noise') {
    const rng = seededRng(spec.seed ?? 1);
    cells = Math.max(1, Math.ceil(n / Math.max(1, grainPx)));
    noise = new Float32Array(cells * cells);
    for (let i = 0; i < noise.length; i++) {
      // Roughly Gaussian (sum of three uniforms), clipped to ±1.
      const g = (rng() + rng() + rng() - 1.5) / 0.75;
      noise[i] = Math.max(-1, Math.min(1, g));
    }
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = x + 0.5 - half;
      const v = y + 0.5 - half;
      const w = windowAt(win, Math.hypot(u, v) / half);
      let g: number;
      if (noise) {
        const cx = Math.min(cells - 1, Math.floor(x / Math.max(1, grainPx)));
        const cy = Math.min(cells - 1, Math.floor(y / Math.max(1, grainPx)));
        g = noise[cy * cells + cx];
      } else {
        g = Math.cos(2 * Math.PI * cyclesPerPx * (u * cos + v * sin) + phase);
      }
      t[y * n + x] = w * (0.5 + 0.5 * c * g);
    }
  }
  return t;
}

/** Mean of a field (0–1): how much of the channel's full light a patch carries. */
export function fieldMean(t: Float32Array): number {
  let s = 0;
  for (let i = 0; i < t.length; i++) s += t[i];
  return t.length ? s / t.length : 0;
}

/**
 * Soft blob mask over a w×h grid. Each blob is a Gaussian; overlapping blobs combine as
 * 1 − Π(1 − g), so the value stays in 0–1. Blob radius is a fraction of the shorter side.
 */
export function maskField(blobs: readonly MaskBlob[], w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  const side = Math.min(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let keep = 1;
      for (const b of blobs) {
        const dx = (x + 0.5 - b.x * w) / (b.r * side);
        const dy = (y + 0.5 - b.y * h) / (b.r * side);
        keep *= 1 - Math.exp(-(dx * dx + dy * dy));
      }
      out[y * w + x] = 1 - keep;
    }
  }
  return out;
}

/**
 * The share of the picture one eye gets at a mask value. `inside` and `outside` are
 * exact complements: weight(m, 'inside') + weight(m, 'outside') === 1.
 */
export function maskWeight(m: number, part: 'inside' | 'outside'): number {
  return part === 'inside' ? m : 1 - m;
}

/** Linear luminance of RGBA bytes (Rec. 709 weights). */
export function lumaFromRgba(data: Uint8ClampedArray | Uint8Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    out[i] = 0.2126 * LIN[data[i * 4]] + 0.7152 * LIN[data[i * 4 + 1]] + 0.0722 * LIN[data[i * 4 + 2]];
  }
  return out;
}

const LUT_SIZE = 1024;

/**
 * Luminance × mask weight → RGBA bytes in the channel colour, through a lookup table.
 * Returns the mean light fraction too.
 */
export function maskedChannel(
  luma: Float32Array,
  maskA: Float32Array,
  maskB: Float32Array,
  mix: number,
  part: 'inside' | 'outside',
  colour: RGB,
  bg: RGB,
  out: Uint8ClampedArray,
): number {
  const lut = new Uint8ClampedArray(LUT_SIZE * 3);
  for (let p = 0; p < 3; p++) {
    const b = bg[p];
    const c = colour[p];
    for (let k = 0; k < LUT_SIZE; k++) {
      lut[k * 3 + p] = b === c ? b : linearToSrgb(LIN[b] + (LIN[c] - LIN[b]) * (k / (LUT_SIZE - 1)));
    }
  }
  const k = Math.max(0, Math.min(1, mix));
  let sum = 0;
  for (let i = 0; i < luma.length; i++) {
    const m = maskA[i] + (maskB[i] - maskA[i]) * k;
    const t = Math.max(0, Math.min(1, luma[i] * maskWeight(m, part)));
    sum += t;
    const j = Math.round(t * (LUT_SIZE - 1)) * 3;
    out[i * 4] = lut[j];
    out[i * 4 + 1] = lut[j + 1];
    out[i * 4 + 2] = lut[j + 2];
    out[i * 4 + 3] = 255;
  }
  return luma.length ? sum / luma.length : 0;
}
