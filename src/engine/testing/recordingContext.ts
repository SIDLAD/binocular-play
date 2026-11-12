import { luminance, parseHex } from '../../core/colour/srgb';
import type { Ctx2D } from '../renderer';

/** One painted shape, as seen by tests. */
export interface PaintOp {
  kind: 'fill' | 'stroke' | 'text' | 'image';
  /** Lowercase #rrggbb. */
  style: string;
  blend: string;
  /** Approximate painted area in output px². */
  area: number;
}

/**
 * A hand-written fake of the 2D context methods the channel renderer uses.
 * It records every fill and stroke with its colour, blend mode and approximate area,
 * so tests can check colours and estimate each frame's mean luminance without a real canvas.
 */
export class RecordingContext implements Ctx2D {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  lineWidth = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  font = '10px sans-serif';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  globalCompositeOperation: GlobalCompositeOperation = 'source-over';
  imageSmoothingEnabled = true;

  ops: PaintOp[] = [];

  private scaleNow = 1;
  private stack: number[] = [];
  private points: number[] = [];
  private circleArea = 0;
  private circlePerimeter = 0;
  private closed = false;

  /** Forgets everything recorded so far (call between frames). */
  reset(): void {
    this.ops = [];
  }

  save(): void {
    this.stack.push(this.scaleNow);
  }
  restore(): void {
    this.scaleNow = this.stack.pop() ?? 1;
  }
  translate(): void {
    /* position does not affect area or colour */
  }
  rotate(): void {
    /* rotation does not affect area or colour */
  }
  scale(x: number, y: number): void {
    this.scaleNow *= Math.sqrt(Math.abs(x * y));
  }
  setTransform(a: number, _b: number, _c: number, d: number): void {
    this.scaleNow = Math.sqrt(Math.abs(a * d));
  }

  private record(kind: PaintOp['kind'], style: unknown, area: number): void {
    this.ops.push({
      kind,
      style: String(style).toLowerCase(),
      blend: this.globalCompositeOperation,
      area: area * this.scaleNow * this.scaleNow,
    });
  }

  fillRect(_x: number, _y: number, w: number, h: number): void {
    this.record('fill', this.fillStyle, Math.abs(w * h));
  }

  beginPath(): void {
    this.points = [];
    this.circleArea = 0;
    this.circlePerimeter = 0;
    this.closed = false;
  }
  moveTo(x: number, y: number): void {
    this.points.push(x, y);
  }
  lineTo(x: number, y: number): void {
    this.points.push(x, y);
  }
  arcTo(x1: number, y1: number): void {
    // A rounded corner is treated as a sharp one: close enough for area estimates.
    this.points.push(x1, y1);
  }
  arc(_x: number, _y: number, r: number, start: number, end: number): void {
    const fraction = Math.min(1, Math.abs(end - start) / (Math.PI * 2));
    this.circleArea += Math.PI * r * r * fraction;
    this.circlePerimeter += 2 * Math.PI * r * fraction;
  }
  closePath(): void {
    this.closed = true;
  }

  private polygonArea(): number {
    const p = this.points;
    const n = p.length / 2;
    if (n < 3) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      sum += p[i * 2] * p[j * 2 + 1] - p[j * 2] * p[i * 2 + 1];
    }
    return Math.abs(sum) / 2;
  }

  private pathLength(): number {
    const p = this.points;
    const n = p.length / 2;
    let len = 0;
    const last = this.closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const j = (i + 1) % n;
      len += Math.hypot(p[j * 2] - p[i * 2], p[j * 2 + 1] - p[i * 2 + 1]);
    }
    return len;
  }

  fill(): void {
    this.record('fill', this.fillStyle, this.polygonArea() + this.circleArea);
  }
  stroke(): void {
    this.record('stroke', this.strokeStyle, (this.pathLength() + this.circlePerimeter) * this.lineWidth);
  }
  fillText(text: string): void {
    const size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? '10');
    // Glyphs cover very roughly a quarter of their em box.
    this.record('text', this.fillStyle, text.length * size * size * 0.25);
  }

  /**
   * Images are the pattern and video primitives. Their stand-in bitmap carries the channel
   * colour (`peak`) and the share of that colour's light it carries (`coverage`), so the
   * recorded area is scaled to give the right mean brightness.
   */
  drawImage(image: CanvasImageSource, _x: number, _y: number, w: number, h: number): void {
    const stub = image as unknown as { peak?: string; coverage?: number };
    this.record('image', stub.peak ?? '#000000', Math.abs(w * h) * (stub.coverage ?? 1));
  }

  /** The set of colours painted since the last reset. */
  colours(): Set<string> {
    return new Set(this.ops.map((o) => o.style));
  }
}

/**
 * Estimates the mean luminance (0–1) of a recorded frame.
 * A fill that covers the whole surface resets the estimate; every other shape moves the
 * mean toward its own luminance in proportion to its area. Overlaps are counted twice,
 * which is fine for spotting large, fast swings.
 */
export function meanLuminance(ops: readonly PaintOp[], width: number, height: number): number {
  const total = width * height;
  let base = 0;
  let mean = 0;
  for (const op of ops) {
    const lum = luminance(parseHex(op.style));
    if (op.kind === 'fill' && op.area >= total * 0.999) {
      base = lum;
      mean = lum;
    } else {
      mean += (Math.min(op.area, total) / total) * (lum - base);
    }
  }
  return Math.max(0, Math.min(1, mean));
}
