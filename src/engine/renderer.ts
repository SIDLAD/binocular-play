import type { Palette } from '../core/colour/palette';
import { mixGamma, toHex } from '../core/colour/srgb';
import type { Channel, DrawOpts, Renderer, TextOpts, Transform } from './api';

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
}

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
  constructor(
    private ctx: Ctx2D,
    private palette: PaletteProvider,
    public width: number,
    public height: number,
  ) {}

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
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
}
