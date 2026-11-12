import type { Palette } from '../core/colour/palette';
import { BLACK, WHITE } from '../core/colour/srgb';
import type { ImageSource, Renderer } from './api';
import { VideoMedia } from './media';
import { lumaFromRgba } from './pixels';
import { CanvasChannelRenderer, type Ctx2D } from './renderer';

/**
 * Where the pattern and image primitives get their offscreen pixels.
 * In a browser: small canvases. In tests (no canvas): stand-in bitmaps that carry the
 * colour and coverage, so the recording context can still check colours and brightness.
 */
export interface SurfaceFactory {
  /** Wraps RGBA pixels as an image for drawImage. `slot` reuses one canvas per frame. */
  bitmap(w: number, h: number, data: Uint8ClampedArray, peak: string, coverage: number, slot?: string): CanvasImageSource;
  /** Linear luminance (0–1) of a scene or video frame at w×h, or null when it cannot be read. */
  luma(src: ImageSource, w: number, h: number): Float32Array | null;
}

/** A stand-in image used where there is no canvas. */
export interface StubBitmap {
  width: number;
  height: number;
  peak: string;
  coverage: number;
}

export const stubSurfaces: SurfaceFactory = {
  bitmap: (w, h, _data, peak, coverage) => ({ width: w, height: h, peak, coverage }) as unknown as CanvasImageSource,
  luma: () => null,
};

/** The palette scenes are rasterised in: `both` is white, so intensity is luminance. */
const GREY: Palette = { weakEye: WHITE, fellowEye: WHITE, both: WHITE, background: BLACK, mode: 'dark' };

export function domSurfaces(): SurfaceFactory | null {
  if (typeof document === 'undefined') return null;
  const probe = document.createElement('canvas');
  let ok: boolean;
  try {
    ok = probe.getContext('2d') !== null;
  } catch {
    ok = false;
  }
  if (!ok) return null;

  const slots = new Map<string, HTMLCanvasElement>();
  const make = (w: number, h: number, slot?: string): HTMLCanvasElement => {
    let c = slot ? slots.get(slot) : undefined;
    if (!c) {
      c = document.createElement('canvas');
      if (slot) slots.set(slot, c);
    }
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    return c;
  };
  const read = make(1, 1, '__read');
  const readCtx = read.getContext('2d', { willReadFrequently: true });

  return {
    bitmap(w, h, data, _peak, _coverage, slot) {
      const c = make(w, h, slot);
      const ctx = c.getContext('2d');
      if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
      return c;
    },
    luma(src, w, h) {
      if (!readCtx) return null;
      if (read.width !== w) read.width = w;
      if (read.height !== h) read.height = h;
      readCtx.setTransform(1, 0, 0, 1, 0, 0);
      readCtx.globalCompositeOperation = 'source-over';
      readCtx.fillStyle = '#000';
      readCtx.fillRect(0, 0, w, h);
      if (src.kind === 'media') {
        if (!(src instanceof VideoMedia) || !src.ready()) return null;
        readCtx.drawImage(src.video, 0, 0, w, h);
      } else {
        const r: Renderer = new CanvasChannelRenderer(readCtx as unknown as Ctx2D, { current: GREY }, w, h);
        src.draw(r);
      }
      try {
        return lumaFromRgba(readCtx.getImageData(0, 0, w, h).data, w, h);
      } catch {
        return null;
      }
    },
  };
}
