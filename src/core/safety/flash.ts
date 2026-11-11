/**
 * Flash detector for the photosensitivity rule: nothing may flash more than 3 times per second.
 *
 * Input is the mean luminance (0–1) of each frame. A "transition" is a swing of at least
 * `threshold` away from the running extreme, in the opposite direction to the last one.
 * One flash is a pair of opposing transitions, so more than 6 transitions in any one-second
 * window means more than 3 flashes per second.
 */
export const FLASH_THRESHOLD = 0.1;
export const MAX_TRANSITIONS_PER_SECOND = 6;

/** Returns the frame index of every transition. */
export function findTransitions(series: readonly number[], threshold = FLASH_THRESHOLD): number[] {
  const out: number[] = [];
  if (series.length === 0) return out;
  let extreme = series[0];
  let direction: 1 | -1 | 0 = 0;
  for (let i = 1; i < series.length; i++) {
    const v = series[i];
    if (direction >= 0 && v > extreme) extreme = v; // still rising: follow the peak
    else if (direction <= 0 && v < extreme) extreme = v; // still falling: follow the trough
    if (direction === 0) {
      // No direction yet: wait for the first swing from the starting value.
      const d = v - series[0];
      if (Math.abs(d) >= threshold) {
        direction = d > 0 ? 1 : -1;
        extreme = v;
        out.push(i);
      }
      continue;
    }
    if (direction === 1 && extreme - v >= threshold) {
      direction = -1;
      extreme = v;
      out.push(i);
    } else if (direction === -1 && v - extreme >= threshold) {
      direction = 1;
      extreme = v;
      out.push(i);
    }
  }
  return out;
}

export interface FlashReport {
  ok: boolean;
  /** The largest number of transitions found in any one-second window. */
  worstWindow: number;
  /** Frame index where the worst window starts. */
  worstAt: number;
}

export function analyseFlashing(
  series: readonly number[],
  framesPerSecond: number,
  threshold = FLASH_THRESHOLD,
): FlashReport {
  const transitions = findTransitions(series, threshold);
  let worstWindow = 0;
  let worstAt = 0;
  let start = 0;
  for (let end = 0; end < transitions.length; end++) {
    while (transitions[end] - transitions[start] >= framesPerSecond) start++;
    const count = end - start + 1;
    if (count > worstWindow) {
      worstWindow = count;
      worstAt = transitions[start];
    }
  }
  return { ok: worstWindow <= MAX_TRANSITIONS_PER_SECOND, worstWindow, worstAt };
}
