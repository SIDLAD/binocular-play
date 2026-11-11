/** An sRGB colour as 0–255 integers. */
export type RGB = readonly [number, number, number];

export const BLACK: RGB = [0, 0, 0];
export const WHITE: RGB = [255, 255, 255];

const HEX_RE = /^#[0-9a-f]{6}$/;

export function isHex(s: unknown): s is string {
  return typeof s === 'string' && HEX_RE.test(s);
}

/** Accepts "#rrggbb", "rrggbb" or "#rgb" in any case; returns lowercase "#rrggbb" or null. */
export function normaliseHex(s: string): string | null {
  let v = s.trim().toLowerCase();
  if (v.startsWith('#')) v = v.slice(1);
  if (/^[0-9a-f]{3}$/.test(v)) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
  return /^[0-9a-f]{6}$/.test(v) ? `#${v}` : null;
}

export function parseHex(hex: string): RGB {
  const n = normaliseHex(hex);
  if (!n) return BLACK;
  return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)];
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function toHex(c: RGB): string {
  return '#' + c.map((v) => clampByte(v).toString(16).padStart(2, '0')).join('');
}

export function clamp01(t: number): number {
  return Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
}

/** sRGB transfer function: 0–255 encoded value → 0–1 linear light. */
export function srgbToLinear(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** 0–1 linear light → 0–255 encoded value. */
export function linearToSrgb(l: number): number {
  const s = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  return clampByte(s * 255);
}

/** Plain interpolation of the encoded 0–255 values. One brightness step of 1/255 is one code value. */
export function mixGamma(from: RGB, to: RGB, t: number): RGB {
  const k = clamp01(t);
  if (k >= 1) return to;
  if (k <= 0) return from;
  return [
    clampByte(from[0] + (to[0] - from[0]) * k),
    clampByte(from[1] + (to[1] - from[1]) * k),
    clampByte(from[2] + (to[2] - from[2]) * k),
  ];
}

/** Interpolation in linear light, so t is roughly the fraction of light. */
export function mixLinear(from: RGB, to: RGB, t: number): RGB {
  const k = clamp01(t);
  if (k >= 1) return to;
  if (k <= 0) return from;
  const ch = (a: number, b: number): number => {
    if (a === b) return a; // equal primaries stay exactly equal, so separation survives
    const la = srgbToLinear(a);
    const lb = srgbToLinear(b);
    return linearToSrgb(la + (lb - la) * k);
  };
  return [ch(from[0], to[0]), ch(from[1], to[1]), ch(from[2], to[2])];
}

/** Relative luminance, 0–1. */
export function luminance(c: RGB): number {
  return 0.2126 * srgbToLinear(c[0]) + 0.7152 * srgbToLinear(c[1]) + 0.0722 * srgbToLinear(c[2]);
}

/** h in degrees, s and v in 0–1. */
export function hsvToRgb(h: number, s: number, v: number): RGB {
  const hh = (((h % 360) + 360) % 360) / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = v - c;
  let r: number;
  let g: number;
  let b: number;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [clampByte((r + m) * 255), clampByte((g + m) * 255), clampByte((b + m) * 255)];
}

export function rgbToHsv(c: RGB): { h: number; s: number; v: number } {
  const r = c[0] / 255;
  const g = c[1] / 255;
  const b = c[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}
