import type { Palette } from '../../core/colour/palette';
import type { Renderer } from '../../engine/api';
import { CanvasChannelRenderer, type Ctx2D } from '../../engine/renderer';
import type { Scope } from '../dom';

export interface LivePalette {
  readonly current: Palette;
  subscribe(fn: () => void): () => void;
}

/** jsdom and very old browsers have no 2D context; callers must cope with null. */
export function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext('2d');
  } catch {
    return null;
  }
}

export function devicePixelRatioNow(): number {
  return typeof window !== 'undefined' && window.devicePixelRatio > 0 ? Math.min(window.devicePixelRatio, 3) : 1;
}

export interface ChannelCanvas {
  el: HTMLCanvasElement;
  redraw(): void;
}

/**
 * A canvas that is drawn only through the three channels and repaints whenever the palette
 * changes. All colour in the app's UI (avatars, tiles, previews, eye tests) comes from here.
 *
 * Fixed size: pass width and height in CSS px.
 * `fill: true`: the canvas takes the size of its parent and follows window resizes.
 */
export function channelCanvas(
  palette: LivePalette,
  scope: Scope,
  options: {
    width?: number;
    height?: number;
    fill?: boolean;
    className?: string;
    label?: string;
    draw: (r: Renderer) => void;
  },
): ChannelCanvas {
  const el = document.createElement('canvas');
  if (options.className) el.className = options.className;
  if (options.label) {
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', options.label);
  } else {
    el.setAttribute('aria-hidden', 'true');
  }
  const ctx = get2d(el);
  let width = options.width ?? 300;
  let height = options.height ?? 150;
  const renderer = ctx ? new CanvasChannelRenderer(ctx as unknown as Ctx2D, palette, width, height) : null;

  const size = () => {
    if (options.fill) {
      const parent = el.parentElement;
      if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) {
        width = parent.clientWidth;
        height = parent.clientHeight;
      }
    }
    const dpr = devicePixelRatioNow();
    const w = Math.max(1, Math.round(width * dpr));
    const hgt = Math.max(1, Math.round(height * dpr));
    if (el.width !== w) el.width = w;
    if (el.height !== hgt) el.height = hgt;
    renderer?.setSize(width, height);
  };

  const redraw = () => {
    if (!ctx || !renderer) return;
    size();
    const dpr = devicePixelRatioNow();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderer.clear();
    options.draw(renderer);
  };

  scope.onDispose(palette.subscribe(redraw));
  if (options.fill && typeof window !== 'undefined') {
    const onResize = () => redraw();
    window.addEventListener('resize', onResize);
    scope.onDispose(() => window.removeEventListener('resize', onResize));
    // The parent has no size until it is attached.
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(redraw);
  }
  redraw();
  return { el, redraw };
}
