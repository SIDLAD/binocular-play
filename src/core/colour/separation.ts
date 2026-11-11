import type { Profile } from '../settings/schema';
import type { Glasses } from './presets';
import { colourSeenOnlyThrough, otherKey, type ColourKey } from './mapping';
import { backgroundOf, calibratedColour } from './palette';
import type { RGB } from './srgb';

/**
 * Ideal lens model. Real lenses leak; this only proves that our own maths never
 * puts light where an ideal lens of the other colour would pass it.
 */
export type LensKind = 'red' | 'cyan' | 'blue' | 'green';

/** Indexes into RGB that each ideal lens lets through. */
export const LENS_PASS: Record<LensKind, readonly number[]> = {
  red: [0],
  cyan: [1, 2],
  blue: [2],
  green: [1],
};

export function lensKind(glasses: Glasses, key: ColourKey): LensKind {
  if (key === 'red') return 'red';
  return glasses === 'red-cyan' ? 'cyan' : glasses === 'red-blue' ? 'blue' : 'green';
}

/** A colour on a background can be told apart through a lens when any passed primary differs. */
export function visibleThrough(colour: RGB, background: RGB, lens: LensKind): boolean {
  return LENS_PASS[lens].some((p) => colour[p] !== background[p]);
}

export interface SeparationIssue {
  colour: ColourKey;
  /** leak: the other eye can see it too. invisible: its own eye cannot see it. */
  kind: 'leak' | 'invisible';
}

/** Checks the two calibrated colours of a profile against the ideal lens model. */
export function checkSeparation(p: Pick<Profile, 'vision' | 'calibration'>): SeparationIssue[] {
  const bg = backgroundOf(p.vision);
  const issues: SeparationIssue[] = [];
  for (const lens of ['red', 'other'] as const) {
    // `colour` is the calibrated colour meant to be seen only through `lens`.
    const colour = colourSeenOnlyThrough(lens, p.vision.background);
    const rgb = calibratedColour(p.calibration, colour, bg);
    if (!visibleThrough(rgb, bg, lensKind(p.vision.glasses, lens))) {
      issues.push({ colour, kind: 'invisible' });
    }
    if (visibleThrough(rgb, bg, lensKind(p.vision.glasses, otherKey(lens)))) {
      issues.push({ colour, kind: 'leak' });
    }
  }
  return issues;
}
