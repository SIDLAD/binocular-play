import type { Calibration, Profile, Vision } from '../settings/schema';
import { channelLens, type ColourKey } from './mapping';
import { BLACK, WHITE, mixGamma, mixLinear, parseHex, type RGB } from './srgb';

export interface Palette {
  readonly weakEye: RGB;
  readonly fellowEye: RGB;
  readonly both: RGB;
  readonly background: RGB;
  readonly mode: 'dark' | 'light';
}

export type PaletteInput = Pick<Profile, 'vision' | 'calibration' | 'fellowContrast'>;

export function backgroundOf(vision: Pick<Vision, 'background'>): RGB {
  return vision.background === 'light' ? WHITE : BLACK;
}

/** A calibrated colour as it is drawn: the base colour faded toward the background by its brightness. */
export function calibratedColour(cal: Calibration, key: ColourKey, background: RGB): RGB {
  const lens = key === 'red' ? cal.redLens : cal.otherLens;
  return mixGamma(background, parseHex(lens.base), lens.brightness);
}

export function resolvePalette(p: PaletteInput): Palette {
  const background = backgroundOf(p.vision);
  const map = channelLens(p.vision);
  const weakEye = calibratedColour(p.calibration, map.weakEye, background);
  const fellowFull = calibratedColour(p.calibration, map.fellowEye, background);
  // Hard rule 4: fellowContrast is read here and nowhere else.
  const fellowEye = mixLinear(background, fellowFull, p.fellowContrast);
  const foreground = p.vision.background === 'light' ? BLACK : WHITE;
  const both = mixGamma(background, foreground, p.calibration.bothBrightness);
  return { weakEye, fellowEye, both, background, mode: p.vision.background };
}

/** Used when no profile exists yet (the first screen of onboarding). */
export const NEUTRAL_PALETTE: Palette = {
  weakEye: [255, 0, 0],
  fellowEye: [0, 255, 255],
  both: [153, 153, 153],
  background: BLACK,
  mode: 'dark',
};

/** Live palette. The renderer reads `current` at every draw call (hard rule 3). */
export class PaletteSource {
  private palette: Palette;
  private listeners = new Set<() => void>();

  constructor(initial: Palette = NEUTRAL_PALETTE) {
    this.palette = initial;
  }

  get current(): Palette {
    return this.palette;
  }

  set(p: Palette): void {
    this.palette = p;
    for (const fn of [...this.listeners]) fn();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}
