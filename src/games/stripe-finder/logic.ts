/**
 * Stripe Finder: which way do the stripes lean?
 *
 * Copies grating training at the cut-off spatial frequency (Huang 2008; Zhou 2006): the
 * training frequency is the one where the player needs about half contrast to see the
 * stripes, then a contrast staircase runs at that frequency (×0.9 after 3 right, ×1.1 after
 * a miss). "Push" mode adds noise for the stronger eye, as in dichoptic training (Liu 2020).
 *
 * Gratings are capped at 4 device pixels per stripe cycle, so the screen can draw them.
 * Everything here is a training level, never an eye test.
 */
import type { StaircaseRule } from '../../engine/api';

export const CONTRAST_RULE: StaircaseRule = { down: 3, harder: 0.9, easier: 1.1, min: 0.01, max: 1 };
/** Stripe period in degrees: smaller = finer = harder. Used to find the training frequency. */
export const PERIOD_RULE: StaircaseRule = { down: 3, harder: 0.9, easier: 1.1, min: 0.02, max: 2 };
export const FIND_CONTRAST = 0.5;
export const START_CPD = 1.5;
export const PATCH_DEG = 3;
export const TILT = Math.PI / 4;
export const BLOCK_TRIALS = 60;
export const FIXATION_MS = 500;
export const SHOW_MS = 400;
export const FEEDBACK_MS = 400;
/** Push mode: noise contrast for the stronger eye (fixed). */
export const PUSH_NOISE = 0.5;

export type Lean = 'left' | 'right';

/** Orientation in radians for the renderer: positive tilts the top to the right. */
export function orientationFor(lean: Lean): number {
  return lean === 'right' ? TILT : -TILT;
}

/** The training frequency from the found period, within what the screen can draw. */
export function trainingCpd(periodEstimateDeg: number, maxCpd: number): number {
  return Math.max(0.5, Math.min(maxCpd, 1 / periodEstimateDeg));
}

/**
 * After a contrast block: keep the training near the cut-off. If the stripes are easy
 * even at low contrast, make them 10 % finer; if they need nearly full contrast, 10 % coarser.
 */
export function adjustCpd(cpd: number, contrastEstimate: number, maxCpd: number): number {
  let next = cpd;
  if (contrastEstimate < 0.25) next = cpd * 1.1;
  else if (contrastEstimate > 0.8) next = cpd / 1.1;
  return Math.max(0.5, Math.min(maxCpd, next));
}

/** Level shown to the player: contrast steps below full. */
export function levelFor(contrast: number): number {
  return Math.max(1, 1 + Math.round(Math.log(1 / contrast) / Math.log(1 / 0.9)));
}
