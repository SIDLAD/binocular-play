/**
 * Depth Duel: which of two dotted patches looks nearer?
 *
 * Copies anaglyph stereo training (Xi 2014): "which is nearer", a 2-down-1-up staircase with
 * ×0.9 / ×1.1 steps, blocks of 40. Depth comes from shifting the weak eye's copy of one
 * patch sideways by whole device pixels (one device pixel is roughly 30–60 seconds of arc
 * on a laptop at arm's length).
 *
 * Shown only when screening reported no eye turn and no double vision.
 * The level is a training level, never a stereo-acuity measurement.
 */
import type { StaircaseRule } from '../../engine/api';

/** Disparity in device pixels. The drawn shift is always a whole number of pixels, at least 1. */
export const DISPARITY_RULE: StaircaseRule = { down: 2, harder: 0.9, easier: 1.1, min: 1, max: 24 };
export const START_DISPARITY = 8;
export const BLOCK_TRIALS = 40;
export const PATCH_DEG = 2.5;
export const DOTS = 110;
export const INTRO_MS = 3000;
export const FEEDBACK_MS = 500;
export const MIN_SHOW_MS = 300;

/** Whole device pixels to shift by. */
export function shiftPx(value: number): number {
  return Math.max(1, Math.round(value));
}

/**
 * Sign of the weak eye's shift that makes a patch look NEARER (crossed disparity):
 * the left eye's picture moves right and the right eye's picture moves left.
 */
export function nearSign(weakEyeSide: 'left' | 'right'): 1 | -1 {
  return weakEyeSide === 'left' ? 1 : -1;
}

/** Random dots in a unit square, as x, y pairs. */
export function makeDots(rng: () => number, n = DOTS): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(rng(), rng());
  return out;
}

/** Level shown to the player: steps below the starting shift. */
export function levelFor(value: number): number {
  return Math.max(1, 1 + Math.round(Math.log(START_DISPARITY / value) / Math.log(1 / 0.9)));
}
