import type { Palette } from '../core/colour/palette';
import { mixGamma, toHex } from '../core/colour/srgb';
import type { BlobMask, Channel, DrawOpts, ImageSource, PatternSpec, Renderer, TextOpts, Transform } from './api';
import { ditherField, fieldMean, maskField, maskedChannel, patternField } from './pixels';
import { domSurfaces, stubSurfaces, type SurfaceFactory } from './surfaces';

/** The part of CanvasRenderingContext2D the renderer uses. The recording context implements it too. */
export interface Ctx2D {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  globalCompositeOperation: GlobalCompositeOperation;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  rotate(angle: number): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void;
  arc(x: number, y: number, r: number, start: number, end: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  imageSmoothingEnabled: boolean;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
}

/** Default display numbers before the screen-size check: 96 px/in at 60 cm. */
const DEFAULT_PX_PER_DEGREE = 39.6;
const PATTERN_CACHE = 48;
/** Longest side, in pixels, of the working image for video and scenes. */
const IMAGE_MAX_SIDE = 480;

export interface PaletteProvider {
  readonly current: Palette;
}

export const UI_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * Draws in three channels only. It stores no colours: the palette is looked up at every
 * draw call, so calibration, eye swaps and contrast changes show up on the next frame
 * (hard rule 3).
 *
 * Eye channels are composited with "lighten" on a dark background and "darken" on a light
 * one. Where a weak-eye shape overlaps a fellow-eye shape, each primary keeps the value of
 * whichever shape uses it, so each eye still sees its own shape.
 */
export class CanvasChannelRenderer implements Renderer {
  pxPerDegree = DEFAULT_PX_PER_DEGREE;
  pixelRatio = 1;
  private surfaces: SurfaceFactory;
  private patterns = new Map<string, { img: CanvasImageSource; n: number }>();
  private frame = 0;
  private lumaCache: { key: string; luma: Float32Array | null } | null = null;
  private maskCache = new Map<string, { blobs: BlobMask['from']; field: Float32Array }>();

  constructor(
    private ctx: Ctx2D,
    private palette: PaletteProvider,
    public width: number,
    public height: number,
    surfaces?: SurfaceFactory,
  ) {
    this.surfaces = surfaces ?? domSurfaces() ?? stubSurfaces;
  }

  setSize(width: number, height: number, pixelRatio = this.pixelRatio): void {
    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;
  }

  setDisplay(pxPerDegree: number): void {
    if (Number.isFinite(pxPerDegree) && pxPerDegree > 0) this.pxPerDegree = pxPerDegree;
  }

  private colour(ch: Channel, intensity: number | undefined): string {
    const p = this.palette.current;
    const c = p[ch];
    return toHex(intensity === undefined ? c : mixGamma(p.background, c, intensity));
  }

  private blend(ch: Channel): void {
    const mode = this.palette.current.mode;
    this.ctx.globalCompositeOperation =
      ch === 'both' ? 'source-over' : mode === 'dark' ? 'lighten' : 'darken';
  }

  private paint(ch: Channel, o: DrawOpts | undefined): void {
    const colour = this.colour(ch, o?.intensity);
    this.blend(ch);
    if (o?.outline !== undefined) {
      this.ctx.strokeStyle = colour;
      this.ctx.lineWidth = o.outline;
      this.ctx.lineJoin = 'round';
      this.ctx.stroke();
    } else {
      this.ctx.fillStyle = colour;
      this.ctx.fill();
    }
    this.ctx.globalCompositeOperation = 'source-over';
  }

  clear(): void {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = toHex(this.palette.current.background);
    ctx.fillRect(0, 0, this.width, this.height);
    this.frame++;
  }

  rect(ch: Channel, x: number, y: number, w: number, h: number, o?: DrawOpts): void {
    const ctx = this.ctx;
    const r = Math.max(0, Math.min(o?.radius ?? 0, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    if (r > 0) {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
    }
    ctx.closePath();
    this.paint(ch, o);
  }

  circle(ch: Channel, x: number, y: number, r: number, o?: DrawOpts): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    this.ctx.closePath();
    this.paint(ch, o);
  }

  line(ch: Channel, x1: number, y1: number, x2: number, y2: number, width: number, o?: DrawOpts): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineCap = 'round';
    this.paint(ch, { intensity: o?.intensity, outline: width });
  }

  poly(ch: Channel, pts: readonly number[], o?: DrawOpts): void {
    if (pts.length < 4) return;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i + 1 < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    this.paint(ch, o);
  }

  measure(s: string, o?: TextOpts): number {
    this.ctx.font = `${o?.bold ? '700 ' : ''}${o?.size ?? 16}px ${UI_FONT}`;
    return this.ctx.measureText(s).width;
  }

  text(ch: Channel, s: string, x: number, y: number, o?: TextOpts): void {
    const ctx = this.ctx;
    ctx.font = `${o?.bold ? '700 ' : ''}${o?.size ?? 16}px ${UI_FONT}`;
    ctx.textAlign = o?.align ?? 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.colour(ch, o?.intensity);
    this.blend(ch);
    ctx.fillText(s, x, y);
    ctx.globalCompositeOperation = 'source-over';
  }

  group(t: Transform, draw: () => void): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(t.x ?? 0, t.y ?? 0);
    if (t.rotate) ctx.rotate(t.rotate);
    if (t.scale !== undefined && t.scale !== 1) ctx.scale(t.scale, t.scale);
    try {
      draw();
    } finally {
      ctx.restore();
    }
  }

  pattern(ch: Channel, cx: number, cy: number, spec: PatternSpec, o?: { intensity?: number }): void {
    const p = this.palette.current;
    const colour = o?.intensity === undefined ? p[ch] : mixGamma(p.background, p[ch], o.intensity);
    const dpr = this.pixelRatio;
    const n = Math.max(2, Math.round(spec.size * dpr));
    const cyclesPerPx = (spec.cyclesPerDegree ?? 0) / (this.pxPerDegree * dpr);
    const grain = Math.max(1, Math.round((spec.grain ?? 2) * dpr));
    const key = `${JSON.stringify(spec)}|${toHex(colour)}|${toHex(p.background)}|${n}|${cyclesPerPx.toFixed(6)}|${grain}`;
    let entry = this.patterns.get(key);
    if (!entry) {
      const field = patternField(spec, n, cyclesPerPx, grain);
      const data = ditherField(field, n, n, colour, p.background);
      entry = { img: this.surfaces.bitmap(n, n, data, toHex(colour), fieldMean(field)), n };
      this.patterns.set(key, entry);
      if (this.patterns.size > PATTERN_CACHE) {
        const oldest = this.patterns.keys().next().value;
        if (oldest !== undefined) this.patterns.delete(oldest);
      }
    }
    const size = n / dpr;
    // Snap to whole device pixels so the dithered pattern is not resampled.
    const left = Math.round((cx - size / 2) * dpr) / dpr;
    const top = Math.round((cy - size / 2) * dpr) / dpr;
    this.blit(ch, entry.img, left, top, size, size, false);
  }

  image(ch: Channel, src: ImageSource, x: number, y: number, w: number, h: number, mask: BlobMask, part: 'inside' | 'outside'): void {
    if (w <= 0 || h <= 0) return;
    const p = this.palette.current;
    const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(w, h)) * Math.min(this.pixelRatio, 2);
    let iw = Math.max(1, Math.round(w * scale));
    let ih = Math.max(1, Math.round(h * scale));
    const lumaKey = `${src.id}|${iw}x${ih}|${this.frame}`;
    if (!this.lumaCache || this.lumaCache.key !== lumaKey) {
      this.lumaCache = { key: lumaKey, luma: this.surfaces.luma(src, iw, ih) };
    }
    let luma = this.lumaCache.luma;
    if (!luma) {
      // No canvas to read (tests): a coarse, flat mid-grey picture keeps the masks testable.
      const k = 64 / Math.max(iw, ih);
      iw = Math.max(1, Math.round(iw * k));
      ih = Math.max(1, Math.round(ih * k));
      luma = new Float32Array(iw * ih).fill(0.5);
    }
    const a = this.mask(mask.from, iw, ih);
    const b = this.mask(mask.to, iw, ih);
    const out = new Uint8ClampedArray(iw * ih * 4);
    const coverage = maskedChannel(luma, a, b, mask.mix, part, p[ch], p.background, out);
    const img = this.surfaces.bitmap(iw, ih, out, toHex(p[ch]), coverage, `img:${ch}:${part}`);
    this.blit(ch, img, x, y, w, h, true);
  }

  private mask(blobs: BlobMask['from'], w: number, h: number): Float32Array {
    const key = `${w}x${h}|${JSON.stringify(blobs)}`;
    let m = this.maskCache.get(key);
    if (!m) {
      m = { blobs, field: maskField(blobs, w, h) };
      this.maskCache.set(key, m);
      if (this.maskCache.size > 8) {
        const oldest = this.maskCache.keys().next().value;
        if (oldest !== undefined) this.maskCache.delete(oldest);
      }
    }
    return m.field;
  }

  private blit(ch: Channel, img: CanvasImageSource, x: number, y: number, w: number, h: number, smooth: boolean): void {
    const ctx = this.ctx;
    this.blend(ch);
    const before = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = smooth;
    ctx.drawImage(img, x, y, w, h);
    ctx.imageSmoothingEnabled = before;
    ctx.globalCompositeOperation = 'source-over';
  }
}
