/**
 * The ONLY module games may import (hard rule 1).
 *
 * A game is rules plus drawing. It never sees a canvas context, a colour, the DOM or
 * the settings. Everything it draws goes to one of three channels:
 *   weakEye   – seen only by the amblyopic eye
 *   fellowEye – seen only by the stronger eye (dimmed by the contrast setting)
 *   both      – neutral grey, seen by both eyes (frames and grids that help the eyes fuse)
 */
export type Channel = 'weakEye' | 'fellowEye' | 'both';

export interface DrawOpts {
  /** 0–1. Fades the shape toward the background. Default 1. */
  intensity?: number;
  /** When set, the shape is stroked with this line width instead of filled. */
  outline?: number;
  /** Corner radius for rect(). */
  radius?: number;
}

export interface TextOpts {
  /** Font size in logical px. Default 16. */
  size?: number;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  intensity?: number;
}

export interface Transform {
  x?: number;
  y?: number;
  scale?: number;
  /** Radians. */
  rotate?: number;
}

/** No method accepts a colour. */
export interface Renderer {
  /** Logical size in px. */
  readonly width: number;
  readonly height: number;
  /** Fills the whole surface with the background. */
  clear(): void;
  rect(ch: Channel, x: number, y: number, w: number, h: number, o?: DrawOpts): void;
  circle(ch: Channel, x: number, y: number, r: number, o?: DrawOpts): void;
  line(ch: Channel, x1: number, y1: number, x2: number, y2: number, width: number, o?: DrawOpts): void;
  /** pts is a flat list: x0, y0, x1, y1, … */
  poly(ch: Channel, pts: readonly number[], o?: DrawOpts): void;
  /** Text is centred vertically on y. */
  text(ch: Channel, s: string, x: number, y: number, o?: TextOpts): void;
  group(transform: Transform, draw: () => void): void;
}

export type GameAction = 'left' | 'right' | 'up' | 'down' | 'primary' | 'secondary';

export type GameInput =
  | { kind: 'action'; action: GameAction; pressed: boolean }
  | { kind: 'pointer'; phase: 'down' | 'move' | 'up'; x: number; y: number };

export interface GameContext {
  /** Seeded random numbers in [0, 1). Games must not call Math.random. */
  rng(): number;
  startLevel: number;
  reducedMotion: boolean;
  /** One of the definition's mode ids. */
  mode: string;
}

export interface GameStatus {
  score: number;
  level: number;
  over: boolean;
}

export interface Game {
  resize(width: number, height: number): void;
  input(e: GameInput): void;
  /** Fixed 60 Hz step, driven by the shell. */
  update(dtMs: number): void;
  /** May be called while paused. */
  render(r: Renderer): void;
  status(): GameStatus;
  dispose(): void;
}

/** An on-screen button the play screen draws for touch devices. */
export interface TouchButton {
  action: GameAction;
  /** Short text or a single arrow symbol. */
  label: string;
  /** Spoken name for screen readers. */
  name: string;
}

export interface GameMode {
  id: string;
  label: string;
  blurb: string;
}

export interface GameDefinition {
  id: string;
  title: string;
  blurb: string;
  /** Shown to parents: who sees what. */
  eyeRule: string;
  /** One line per control scheme, shown on the start card. */
  controls: string[];
  modes?: GameMode[];
  touchButtons: TouchButton[];
  create(ctx: GameContext): Game;
  /** Tile art, also channel-only. Drawn into a square renderer. */
  icon(r: Renderer): void;
}

/** Small seeded generator (mulberry32) so games and tests are deterministic. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
