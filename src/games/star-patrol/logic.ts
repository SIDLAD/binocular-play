/**
 * Star Patrol: a slow side-scrolling shooter with a built-in weak-eye task.
 *
 * Copies the idea of action-game training with an embedded task for the weaker eye
 * (Vedamurthy 2015): every 20–40 seconds a gate with two striped windows appears that
 * only the weaker eye can see. Fly through the window whose stripes lean the way the
 * arrow shows. The stripe contrast follows a 3-down-1-up staircase, and the gates double
 * as the check that the weaker eye is taking part.
 *
 * Speed and enemy rate adapt so the player wins about three times in four.
 */
import type { StaircaseRule } from '../../engine/api';

export const GATE_RULE: StaircaseRule = { down: 3, harder: 0.9, easier: 1.1, min: 0.05, max: 1 };
export const GATE_START_CONTRAST = 0.7;
export const GATE_CPD = 1.5;
export const GATE_MIN_GAP_MS = 20_000;
export const GATE_MAX_GAP_MS = 40_000;
export const SHIELDS = 3;
export const FIRE_EVERY_MS = 340;
export const HURT_MS = 1500;
/** Outcomes counted before the difficulty is adjusted. */
export const ADAPT_EVERY = 10;
export const MIN_DIFFICULTY = 0.6;
export const MAX_DIFFICULTY = 2.2;

/**
 * Keeps the win rate near 75–80 %: after every ADAPT_EVERY enemies, a little harder
 * if more than 80 % were destroyed, a little easier if fewer than 70 %.
 */
export function adaptDifficulty(difficulty: number, destroyed: number, total: number): number {
  if (total <= 0) return difficulty;
  const rate = destroyed / total;
  let next = difficulty;
  if (rate > 0.8) next *= 1.06;
  else if (rate < 0.7) next *= 0.94;
  return Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, next));
}

/** Seconds between enemies at a difficulty. */
export function spawnGapMs(difficulty: number): number {
  return 1600 / difficulty;
}

/** Cave walls: ceiling and floor as fractions of the height, at a world position. */
export function caveAt(worldX: number, seed: number): { top: number; bottom: number } {
  const a = Math.sin(worldX * 0.004 + seed) * 0.05 + Math.sin(worldX * 0.0011 + seed * 2) * 0.04;
  const b = Math.sin(worldX * 0.0035 + seed * 3) * 0.05 + Math.sin(worldX * 0.0013 + seed) * 0.04;
  return { top: 0.1 + a, bottom: 0.9 + b };
}

export type Lean = 'left' | 'right';

export interface Gate {
  /** Screen x of the gate. */
  x: number;
  /** Which window has the matching stripes. */
  correct: 'upper' | 'lower';
  /** The lean the arrow asks for. */
  lean: Lean;
  done: boolean;
}

export function makeGate(rng: () => number, x: number): Gate {
  return { x, correct: rng() < 0.5 ? 'upper' : 'lower', lean: rng() < 0.5 ? 'left' : 'right', done: false };
}

/** Whether the ship at `y` is in the right window, given the cave's middle. */
export function throughCorrect(g: Gate, shipY: number, midY: number): boolean {
  return (shipY < midY ? 'upper' : 'lower') === g.correct;
}

export function circlesTouch(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  return Math.hypot(ax - bx, ay - by) <= ar + br;
}
