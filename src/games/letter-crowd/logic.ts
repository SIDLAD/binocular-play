/**
 * Letter Crowd: name the middle letter of a crowded group.
 *
 * Copies the design of crowded-letter training (Hussain 2012; Chung 2012; the home browser
 * version in Hussain 2014): ten letters, four flankers, a brief target, and a spacing
 * staircase (3-down-1-up) from twice the letter size down to touching. When the player
 * holds near-touching spacing, the letters shrink by 10 %.
 *
 * The letter shapes are our own strokes on a 5 × 5 grid, not a font.
 * Everything here is a training level, never an acuity.
 */
import type { StaircaseRule } from '../../engine/api';

export const LETTERS = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'] as const;
export type Letter = (typeof LETTERS)[number];

/** Stroke width as a fraction of letter height (one grid square of five). */
export const STROKE = 0.2;

function arc(cx: number, cy: number, rx: number, ry: number, fromDeg: number, toDeg: number, steps = 16): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((fromDeg + ((toDeg - fromDeg) * i) / steps) * Math.PI) / 180;
    pts.push(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
  }
  return pts;
}

/** Each letter as polylines (flat x, y lists) in a unit box, y down. Lines are stroke centres. */
export const STROKES: Record<Letter, number[][]> = {
  C: [arc(0.5, 0.5, 0.4, 0.4, 40, 320)],
  D: [[0.1, 0.1, 0.1, 0.9], [0.1, 0.1, 0.5, 0.1, ...arc(0.5, 0.5, 0.4, 0.4, -90, 90).slice(2), 0.1, 0.9]],
  H: [[0.1, 0.1, 0.1, 0.9], [0.9, 0.1, 0.9, 0.9], [0.1, 0.5, 0.9, 0.5]],
  K: [[0.1, 0.1, 0.1, 0.9], [0.9, 0.1, 0.12, 0.62], [0.42, 0.42, 0.9, 0.9]],
  N: [[0.1, 0.9, 0.1, 0.1, 0.9, 0.9, 0.9, 0.1]],
  O: [arc(0.5, 0.5, 0.4, 0.4, 0, 360, 24)],
  R: [[0.1, 0.9, 0.1, 0.1, 0.62, 0.1, ...arc(0.62, 0.3, 0.28, 0.2, -90, 90, 10).slice(2), 0.1, 0.5], [0.5, 0.5, 0.9, 0.9]],
  S: [[...arc(0.5, 0.3, 0.4, 0.2, -20, -270, 14), ...arc(0.5, 0.7, 0.4, 0.2, -90, 160, 14).slice(2)]],
  V: [[0.1, 0.1, 0.5, 0.9, 0.9, 0.1]],
  Z: [[0.1, 0.1, 0.9, 0.1, 0.1, 0.9, 0.9, 0.9]],
};

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** The letter drawn on an n × n grid (1 = ink), for tests. */
export function rasterLetter(l: Letter, n: number): Uint8Array {
  const out = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const px = (x + 0.5) / n;
      const py = (y + 0.5) / n;
      for (const line of STROKES[l]) {
        for (let i = 0; i + 3 < line.length; i += 2) {
          if (segDist(px, py, line[i], line[i + 1], line[i + 2], line[i + 3]) <= STROKE / 2) {
            out[y * n + x] = 1;
            break;
          }
        }
        if (out[y * n + x]) break;
      }
    }
  }
  return out;
}

export interface Trial {
  target: Letter;
  /** Left, right, above, below. */
  flankers: [Letter, Letter, Letter, Letter];
}

/** A random target with four flankers, none of them the target and no two the same. */
export function makeTrial(rng: () => number): Trial {
  const pick = (exclude: Letter[]): Letter => {
    const options = LETTERS.filter((l) => !exclude.includes(l));
    return options[Math.floor(rng() * options.length) % options.length];
  };
  const target = pick([]);
  const used: Letter[] = [target];
  const flankers = [0, 1, 2, 3].map(() => {
    const l = pick(used);
    used.push(l);
    return l;
  }) as Trial['flankers'];
  return { target, flankers };
}

/** Spacing = centre-to-centre distance in letter heights: 2 = one letter gap, 1 = touching. */
export const SPACING_RULE: StaircaseRule = { down: 3, harder: 0.92, easier: 1 / 0.92, min: 1, max: 2.5 };
export const START_SPACING = 2;
/** Letter height in arcmin to begin with: large, so nobody starts at a level that feels like a test. */
export const START_SIZE_ARCMIN = 60;
export const MAX_SIZE_ARCMIN = 150;
export const BLOCK_TRIALS = 50;
export const FIXATION_MS = 500;
export const FEEDBACK_MS = 500;

/** How long the middle letter shows. Classic: 300 ms for the first two blocks, then 150 ms (Hussain 2012). */
export function targetMs(mode: string, blocksDone: number): number {
  if (mode === 'relaxed') return Infinity;
  return blocksDone < 2 ? 300 : 150;
}

/**
 * After a block: shrink the letters 10 % when the player held near-touching spacing with
 * good accuracy; grow them 10 % when even wide spacing was hard. Never below the size the
 * screen can draw (a stroke of at least one device pixel).
 */
export function nextSize(sizeArcmin: number, spacingEstimate: number, accuracy: number, minArcmin: number): number {
  let size = sizeArcmin;
  if (spacingEstimate <= 1.2 && accuracy >= 0.7) size *= 0.9;
  else if (spacingEstimate >= 2.3 && accuracy < 0.6) size *= 1.1;
  return Math.max(minArcmin, Math.min(MAX_SIZE_ARCMIN, size));
}

/** The level shown to the player: how many 10 % steps smaller than the start. */
export function levelFor(sizeArcmin: number): number {
  return Math.max(1, 1 + Math.round(Math.log(START_SIZE_ARCMIN / sizeArcmin) / Math.log(1 / 0.9)));
}
