import { hsvToRgb, mixGamma, normaliseHex, parseHex, rgbToHsv, toHex, BLACK, WHITE } from '../../core/colour/srgb';
import type { LensColour } from '../../core/settings/schema';
import { button, h } from '../dom';
import { get2d } from './channelCanvas';

const WHEEL_PX = 336; // drawn at 2× for sharpness, shown at 168 CSS px
const RIM = 18; // room for the marker, so it is never clipped at full saturation
const WHEEL_R = WHEEL_PX / 2 - RIM;

/** The colour as it will be drawn: the base faded toward the background by its brightness. */
export function drawnColour(c: LensColour, background: 'dark' | 'light'): string {
  return toHex(mixGamma(background === 'dark' ? BLACK : WHITE, parseHex(c.base), c.brightness));
}

let wheelImage: ImageData | null = null;

function wheelPixels(ctx: CanvasRenderingContext2D): ImageData {
  if (wheelImage) return wheelImage;
  const img = ctx.createImageData(WHEEL_PX, WHEEL_PX);
  const R = WHEEL_PX / 2;
  for (let y = 0; y < WHEEL_PX; y++) {
    for (let x = 0; x < WHEEL_PX; x++) {
      const dx = x + 0.5 - R;
      const dy = y + 0.5 - R;
      const d = Math.hypot(dx, dy) / WHEEL_R;
      const i = (y * WHEEL_PX + x) * 4;
      if (d > 1) {
        img.data[i + 3] = 0;
        continue;
      }
      const hue = (Math.atan2(dy, dx) * 180) / Math.PI;
      const [r, g, b] = hsvToRgb(hue, d, 1);
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  wheelImage = img;
  return img;
}

export interface ColourControl {
  el: HTMLElement;
  /** Re-reads the value (after a reset or a change made elsewhere). */
  refresh(): void;
}

/**
 * One calibrated colour: a hue/saturation wheel, a brightness slider with ±1 steps,
 * and a hex field. One brightness step is one code value (1/255).
 */
export function colourControl(options: {
  title: string;
  help: string;
  background: 'dark' | 'light';
  get(): LensColour;
  set(c: LensColour): void;
}): ColourControl {
  const wheel = h('canvas', {
    class: 'wheel',
    role: 'img',
    'aria-label': `${options.title}: colour wheel. Use the hex field to type an exact colour.`,
  });
  wheel.width = WHEEL_PX;
  wheel.height = WHEEL_PX;
  const ctx = get2d(wheel);

  const swatch = h('div', { class: 'swatch', 'aria-hidden': 'true' });
  swatch.style.height = '56px';
  swatch.style.borderRadius = '8px';
  swatch.style.marginBottom = '8px';
  swatch.style.border = '1px solid #3d3d3d';

  const slider = h('input', { type: 'range', min: '0', max: '255', step: '1', 'aria-label': `${options.title}: brightness` });
  const readout = h('output', null, '');
  const hex = h('input', {
    type: 'text',
    class: 'hex',
    maxLength: 7,
    autocomplete: 'off',
    'aria-label': `${options.title}: hex colour`,
  });
  hex.spellcheck = false;

  const paintWheel = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, WHEEL_PX, WHEEL_PX);
    ctx.putImageData(wheelPixels(ctx), 0, 0);
    const { h: hue, s } = rgbToHsv(parseHex(options.get().base));
    const R = WHEEL_PX / 2;
    const x = R + Math.cos((hue * Math.PI) / 180) * s * WHEEL_R;
    const y = R + Math.sin((hue * Math.PI) / 180) * s * WHEEL_R;
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.stroke();
  };

  const refresh = (skipHex = false) => {
    const c = options.get();
    const steps = Math.round(c.brightness * 255);
    slider.value = String(steps);
    readout.textContent = `${Math.round(c.brightness * 100)}%`;
    const drawn = drawnColour(c, options.background);
    swatch.style.background = drawn;
    if (!skipHex) hex.value = drawn;
    paintWheel();
  };

  const setBrightnessSteps = (steps: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(steps)));
    options.set({ base: options.get().base, brightness: clamped / 255 });
    refresh();
  };

  const pick = (e: PointerEvent) => {
    const rect = wheel.getBoundingClientRect();
    if (rect.width === 0) return;
    const dx = (e.clientX - rect.left) / rect.width - 0.5;
    const dy = (e.clientY - rect.top) / rect.height - 0.5;
    const s = Math.min(1, (Math.hypot(dx, dy) * WHEEL_PX) / WHEEL_R);
    const hue = (Math.atan2(dy, dx) * 180) / Math.PI;
    // Snap to the rim: fully saturated colours are the ones that separate best.
    const sat = s > 0.94 ? 1 : s;
    options.set({ base: toHex(hsvToRgb(hue, sat, 1)), brightness: options.get().brightness });
    refresh();
  };
  let dragging = false;
  wheel.addEventListener('pointerdown', (e) => {
    dragging = true;
    try {
      wheel.setPointerCapture(e.pointerId);
    } catch {
      /* not supported */
    }
    pick(e);
  });
  wheel.addEventListener('pointermove', (e) => {
    if (dragging) pick(e);
  });
  const stop = () => {
    dragging = false;
  };
  wheel.addEventListener('pointerup', stop);
  wheel.addEventListener('pointercancel', stop);

  slider.addEventListener('input', () => setBrightnessSteps(Number(slider.value)));

  const applyHex = () => {
    const typed = normaliseHex(hex.value);
    if (!typed) {
      refresh();
      return;
    }
    if (options.background === 'dark') {
      // Split the typed colour into a full-value base and a brightness.
      const { h: hue, s, v } = rgbToHsv(parseHex(typed));
      options.set({ base: toHex(hsvToRgb(hue, s, 1)), brightness: v });
    } else {
      options.set({ base: typed, brightness: 1 });
    }
    refresh();
  };
  hex.addEventListener('change', applyHex);
  hex.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyHex();
  });

  const el = h(
    'div',
    { class: 'card colour-control' },
    h('h3', null, options.title),
    h('p', { class: 'muted small' }, options.help),
    h(
      'div',
      { class: 'wheel-row' },
      wheel,
      h('div', { class: 'swatch-col' }, swatch, h('label', { class: 'small muted' }, 'Hex colour', hex)),
    ),
    h('div', { class: 'small muted' }, 'Brightness'),
    h(
      'div',
      { class: 'slider-row' },
      button('−', () => setBrightnessSteps(Number(slider.value) - 1), 'plain', { class: 'btn-small', 'aria-label': `${options.title}: one step dimmer` }),
      slider,
      button('+', () => setBrightnessSteps(Number(slider.value) + 1), 'plain', { class: 'btn-small', 'aria-label': `${options.title}: one step brighter` }),
      readout,
    ),
  );
  refresh();
  return { el, refresh: () => refresh() };
}
