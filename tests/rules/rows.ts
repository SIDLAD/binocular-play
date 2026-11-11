import type { Glasses } from '../../src/core/colour/presets';
import { createProfile, defaultCalibration, type Profile } from '../../src/core/settings/schema';

type Eye = 'left' | 'right';
export interface Row {
  glasses: Glasses;
  background: 'dark' | 'light';
  redLensEye: Eye;
  weakEye: Eye;
  /** Expected colours at the preset, written out by hand. */
  weak: string;
  fellow: string;
}

const RED = '#ff0000';
const CYAN = '#00ffff';
const BLUE = '#0000ff';
const GREEN = '#00ff00';

/**
 * The truth table of hard rule 2: every glasses type × background × lens side × weak eye.
 * These 24 rows are literal on purpose. They are not computed with the app's formula.
 */
export const ROWS: Row[] = [
  // red / cyan glasses, dark background: the weak eye gets its own lens colour
  { glasses: 'red-cyan', background: 'dark', redLensEye: 'left', weakEye: 'left', weak: RED, fellow: CYAN },
  { glasses: 'red-cyan', background: 'dark', redLensEye: 'left', weakEye: 'right', weak: CYAN, fellow: RED },
  { glasses: 'red-cyan', background: 'dark', redLensEye: 'right', weakEye: 'left', weak: CYAN, fellow: RED },
  { glasses: 'red-cyan', background: 'dark', redLensEye: 'right', weakEye: 'right', weak: RED, fellow: CYAN },
  // red / cyan glasses, light background: flipped
  { glasses: 'red-cyan', background: 'light', redLensEye: 'left', weakEye: 'left', weak: CYAN, fellow: RED },
  { glasses: 'red-cyan', background: 'light', redLensEye: 'left', weakEye: 'right', weak: RED, fellow: CYAN },
  { glasses: 'red-cyan', background: 'light', redLensEye: 'right', weakEye: 'left', weak: RED, fellow: CYAN },
  { glasses: 'red-cyan', background: 'light', redLensEye: 'right', weakEye: 'right', weak: CYAN, fellow: RED },
  // red / blue glasses, dark
  { glasses: 'red-blue', background: 'dark', redLensEye: 'left', weakEye: 'left', weak: RED, fellow: BLUE },
  { glasses: 'red-blue', background: 'dark', redLensEye: 'left', weakEye: 'right', weak: BLUE, fellow: RED },
  { glasses: 'red-blue', background: 'dark', redLensEye: 'right', weakEye: 'left', weak: BLUE, fellow: RED },
  { glasses: 'red-blue', background: 'dark', redLensEye: 'right', weakEye: 'right', weak: RED, fellow: BLUE },
  // red / blue glasses, light
  { glasses: 'red-blue', background: 'light', redLensEye: 'left', weakEye: 'left', weak: BLUE, fellow: RED },
  { glasses: 'red-blue', background: 'light', redLensEye: 'left', weakEye: 'right', weak: RED, fellow: BLUE },
  { glasses: 'red-blue', background: 'light', redLensEye: 'right', weakEye: 'left', weak: RED, fellow: BLUE },
  { glasses: 'red-blue', background: 'light', redLensEye: 'right', weakEye: 'right', weak: BLUE, fellow: RED },
  // red / green glasses, dark
  { glasses: 'red-green', background: 'dark', redLensEye: 'left', weakEye: 'left', weak: RED, fellow: GREEN },
  { glasses: 'red-green', background: 'dark', redLensEye: 'left', weakEye: 'right', weak: GREEN, fellow: RED },
  { glasses: 'red-green', background: 'dark', redLensEye: 'right', weakEye: 'left', weak: GREEN, fellow: RED },
  { glasses: 'red-green', background: 'dark', redLensEye: 'right', weakEye: 'right', weak: RED, fellow: GREEN },
  // red / green glasses, light
  { glasses: 'red-green', background: 'light', redLensEye: 'left', weakEye: 'left', weak: GREEN, fellow: RED },
  { glasses: 'red-green', background: 'light', redLensEye: 'left', weakEye: 'right', weak: RED, fellow: GREEN },
  { glasses: 'red-green', background: 'light', redLensEye: 'right', weakEye: 'left', weak: RED, fellow: GREEN },
  { glasses: 'red-green', background: 'light', redLensEye: 'right', weakEye: 'right', weak: GREEN, fellow: RED },
];

export function rowName(r: Row): string {
  return `${r.glasses}, ${r.background} background, red lens on ${r.redLensEye}, weak eye ${r.weakEye}`;
}

export function profileForRow(r: Row): Profile {
  const p = createProfile({ name: 'Row', kind: 'adult', id: 'row' });
  p.vision = {
    glasses: r.glasses,
    redLensEye: r.redLensEye,
    weakEye: r.weakEye,
    background: r.background,
  };
  p.calibration = defaultCalibration(r.glasses);
  return p;
}
