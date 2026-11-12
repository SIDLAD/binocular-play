import { hsvToRgb, mixGamma, normaliseHex, parseHex, rgbToHsv, toHex, BLACK, WHITE, type RGB } from '../../core/colour/srgb';
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

/**
 * The stored form of a colour that should be drawn exactly as `rgb`.
 * Dark background: a full-value base plus a brightness, so the brightness slider keeps the mix.
 */
export function lensColourFromDrawn(rgb: RGB, background: 'dark' | 'light'): LensColour {
  if (background === 'light') return { base: toHex(rgb), brightness: 1 };
  const { h: hue, s, v } = rgbToHsv(rgb);
  return { base: toHex(hsvToRgb(hue, s, 1)), brightness: v };
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

/** Which eye should see this colour and which should not, in words. */
export interface EyeGuide {
  /** "LEFT" / "RIGHT": the eye that should see this colour. */
  sees: string;
  /** "LEFT" / "RIGHT": the eye that should not see it. */
  hidden: string;
  /** The lens in front of each, e.g. "red" and "cyan". */
  seesLens: string;
  hiddenLens: string;
  /** True when the eye that should see it is the weaker eye. */
  seesIsWeak: boolean;
}

/** How long the colour must stay still before a separation hint is shown. */
const HINT_DELAY_MS = 1200;

const CHANNELS = [
  { name: 'Red', track: '#ff0000' },
  { name: 'Green', track: '#00ff00' },
  { name: 'Blue', track: '#0000ff' },
] as const;

/**
 * One calibrated colour: a test patch on the real background with "cover one eye"
 * steps, red/green/blue sliders, a brightness slider with ±1 steps, and (folded away)
 * a hue/saturation wheel and a hex field. One step is one code value (1/255).
 */
export function colourControl(options: {
  title: string;
  background: 'dark' | 'light';
  eyes: EyeGuide;
  get(): LensColour;
  set(c: LensColour): void;
  /** Separation problems for this colour under the ideal lens model. */
  issues(): ('leak' | 'invisible')[];
}): ColourControl {
  const { eyes } = options;
  const bgHex = options.background === 'dark' ? '#000000' : '#ffffff';

  const wheel = h('canvas', {
    class: 'wheel',
    role: 'img',
    'aria-label': `${options.title}: colour wheel. Use the sliders or the hex field to set an exact colour.`,
  });
  wheel.width = WHEEL_PX;
  wheel.height = WHEEL_PX;
  const ctx = get2d(wheel);

  // The test patch sits on the real background, so it can vanish into it through the wrong lens.
  const patch = h('div', { class: 'patch-colour', 'aria-hidden': 'true' });
  const patchBox = h('div', { class: 'patch-box', 'aria-hidden': 'true' }, patch);
  patchBox.style.background = bgHex;

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

  const rgbSliders = CHANNELS.map((c) => {
    const lower = c.name.toLowerCase();
    const range = h('input', { type: 'range', min: '0', max: '255', step: '1', class: 'rgb-range', 'aria-label': `${options.title}: ${lower} amount` });
    range.style.setProperty('--track', `linear-gradient(to right, ${bgHex}, ${c.track})`);
    const num = h('input', { type: 'number', min: '0', max: '255', step: '1', class: 'rgb-num', 'aria-label': `${options.title}: ${lower} value, 0 to 255` });
    return { ...c, range, num };
  });

  const hint = h('p', { class: 'colour-hint small', 'aria-live': 'polite' });

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

  // The hint waits until the colour has stopped changing, so it never pops up while dragging.
  // It sits in a reserved line inside this card, so nothing on the page jumps when it appears.
  let hintTimer: ReturnType<typeof setTimeout> | null = null;
  const renderHint = () => {
    const issues = options.issues();
    if (issues.includes('invisible')) {
      hint.textContent = `Your ${eyes.sees} eye may not see this at all: it has no light the ${eyes.seesLens} lens lets through. Make it brighter.`;
      hint.dataset.state = 'warn';
    } else if (issues.includes('leak')) {
      hint.textContent = `Note: this mix has a little light the ${eyes.hiddenLens} lens lets through. That is fine as long as the patch still vanishes in step 1.`;
      hint.dataset.state = 'info';
    } else {
      hint.textContent = '';
      delete hint.dataset.state;
    }
  };
  const scheduleHint = () => {
    if (hintTimer) clearTimeout(hintTimer);
    hint.textContent = '';
    delete hint.dataset.state;
    hintTimer = setTimeout(() => {
      hintTimer = null;
      if (hint.isConnected) renderHint();
    }, HINT_DELAY_MS);
  };

  const refresh = (o: { skipHex?: boolean; keepRgb?: boolean; immediateHint?: boolean } = {}) => {
    const c = options.get();
    const steps = Math.round(c.brightness * 255);
    slider.value = String(steps);
    readout.textContent = `${Math.round(c.brightness * 100)}%`;
    const drawn = drawnColour(c, options.background);
    patch.style.background = drawn;
    if (!o.skipHex) hex.value = drawn;
    const rgb = parseHex(drawn);
    rgbSliders.forEach((s, i) => {
      if (!o.keepRgb) s.range.value = String(rgb[i]);
      if (document.activeElement !== s.num) s.num.value = s.range.value;
    });
    paintWheel();
    if (o.immediateHint) renderHint();
    else scheduleHint();
  };

  const setDrawn = (rgb: RGB) => options.set(lensColourFromDrawn(rgb, options.background));

  const setBrightnessSteps = (steps: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(steps)));
    options.set({ base: options.get().base, brightness: clamped / 255 });
    refresh();
  };

  const fromSliders = (): RGB => [Number(rgbSliders[0].range.value), Number(rgbSliders[1].range.value), Number(rgbSliders[2].range.value)];
  for (const s of rgbSliders) {
    s.range.addEventListener('input', () => {
      setDrawn(fromSliders());
      // Keep the sliders where the finger is; rounding is tidied up when it lets go.
      refresh({ keepRgb: true });
    });
    s.range.addEventListener('change', () => refresh());
    const applyNum = () => {
      const n = Number(s.num.value);
      if (s.num.value.trim() === '' || !Number.isFinite(n)) {
        refresh();
        return;
      }
      s.range.value = String(Math.max(0, Math.min(255, Math.round(n))));
      setDrawn(fromSliders());
      refresh({ keepRgb: true });
      s.num.value = s.range.value;
    };
    s.num.addEventListener('change', applyNum);
    s.num.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyNum();
    });
  }

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
    setDrawn(parseHex(typed));
    refresh();
  };
  hex.addEventListener('change', applyHex);
  hex.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyHex();
  });

  const vanish = options.background === 'dark' ? 'into the black' : 'into the white';
  const el = h(
    'div',
    { class: 'card colour-control' },
    h('h3', null, options.title),
    h(
      'p',
      { class: 'eye-for small' },
      'For your ',
      h('strong', null, `${eyes.sees} eye`),
      ` (${eyes.seesLens} lens${eyes.seesIsWeak ? ', weaker eye' : ', stronger eye'}) only.`,
    ),
    patchBox,
    h(
      'ol',
      { class: 'cover-steps small' },
      h(
        'li',
        null,
        h('strong', null, `Cover your ${eyes.sees} eye.`),
        ` Look with your ${eyes.hidden} eye (${eyes.hiddenLens} lens): the patch should vanish ${vanish}. If you still see it, move the sliders until it is gone.`,
      ),
      h(
        'li',
        null,
        h('strong', null, `Now cover your ${eyes.hidden} eye.`),
        ` With your ${eyes.sees} eye the patch should be clear. If it is too faint, make it brighter, then check step 1 again.`,
      ),
    ),
    h(
      'div',
      { class: 'rgb-sliders' },
      ...rgbSliders.map((s) => h('label', { class: 'rgb-row' }, h('span', { class: 'rgb-name small' }, s.name), s.range, s.num)),
    ),
    h('div', { class: 'small muted' }, 'Brightness (keeps the mix, makes all of it dimmer or brighter)'),
    h(
      'div',
      { class: 'slider-row' },
      button('−', () => setBrightnessSteps(Number(slider.value) - 1), 'plain', { class: 'btn-small', 'aria-label': `${options.title}: one step dimmer` }),
      slider,
      button('+', () => setBrightnessSteps(Number(slider.value) + 1), 'plain', { class: 'btn-small', 'aria-label': `${options.title}: one step brighter` }),
      readout,
    ),
    hint,
    h(
      'details',
      { class: 'more-colour' },
      h('summary', { class: 'small' }, 'Colour wheel and hex code'),
      h('div', { class: 'wheel-row' }, wheel, h('div', { class: 'swatch-col' }, h('label', { class: 'small muted' }, 'Hex colour', hex))),
    ),
  );
  refresh({ immediateHint: true });
  return { el, refresh: () => refresh({ immediateHint: true }) };
}
