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

/**
 * A grating or noise patch, drawn in one channel at a set contrast around that channel's
 * mean level. Sizes are logical px; spatial frequency is in cycles per degree of visual
 * angle and is converted with the screen-size check.
 */
export interface PatternSpec {
  kind: 'grating' | 'noise';
  /** Diameter of the patch in logical px. */
  size: number;
  /** Grating only. */
  cyclesPerDegree?: number;
  /** Radians. 0 = vertical bars; positive tilts the top to the right. */
  orientation?: number;
  /** Radians. */
  phase?: number;
  /** Michelson contrast, 0–1, around the channel's mean level. */
  contrast: number;
  /** 'disc' (soft edge, default) or 'gauss' (a Gabor-like fade). */
  window?: 'disc' | 'gauss';
  /** Noise only: the same seed draws the same noise. */
  seed?: number;
  /** Noise only: size of one noise check in logical px. Default 2. */
  grain?: number;
}

/** A soft blob, in 0–1 coordinates of the image rectangle. */
export interface MaskBlob {
  x: number;
  y: number;
  r: number;
}

/**
 * Splits a picture between the eyes. `inside` gets the blobs, `outside` gets the rest,
 * and the two are exact complements at every pixel. `mix` cross-fades from `from` to `to`.
 */
export interface BlobMask {
  from: readonly MaskBlob[];
  to: readonly MaskBlob[];
  /** 0 = all `from`, 1 = all `to`. */
  mix: number;
}

/** A video the player picked from their own device. Opaque to games. */
export interface MediaSource {
  readonly kind: 'media';
  readonly id: string;
  /** width / height, or 0 until the video has loaded. */
  readonly aspect: number;
  ready(): boolean;
}

/**
 * A picture a game draws itself, used as a luminance image. Draw it in the `both`
 * channel; `intensity` is how bright each part is.
 */
export interface SceneSource {
  readonly kind: 'scene';
  readonly id: string;
  draw(r: Renderer): void;
}

export type ImageSource = MediaSource | SceneSource;

/** No method accepts a colour. */
export interface Renderer {
  /** Logical size in px. */
  readonly width: number;
  readonly height: number;
  /** Logical px per degree of visual angle at the viewing distance. */
  readonly pxPerDegree: number;
  /** Device px per logical px. */
  readonly pixelRatio: number;
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
  /** A dithered grating or noise patch centred on (cx, cy). */
  pattern(ch: Channel, cx: number, cy: number, spec: PatternSpec, o?: { intensity?: number }): void;
  /**
   * A picture (video or scene) as luminance in one channel, multiplied by the mask:
   * `part: 'inside'` keeps the blobs, `'outside'` keeps the rest.
   */
  image(ch: Channel, src: ImageSource, x: number, y: number, w: number, h: number, mask: BlobMask, part: 'inside' | 'outside'): void;
}

export type GameAction = 'left' | 'right' | 'up' | 'down' | 'primary' | 'secondary';

export type GameInput =
  | { kind: 'action'; action: GameAction; pressed: boolean }
  /** A letter key A–Z, sent as well as any action the key maps to. */
  | { kind: 'key'; key: string }
  | { kind: 'pointer'; phase: 'down' | 'move' | 'up'; x: number; y: number };

/** Saved difficulty and progress for one game, kept per profile. Numbers only. */
export type SavedProgress = Record<string, number>;

export interface DisplayInfo {
  /** Logical px per degree of visual angle. */
  pxPerDegree: number;
  /** Device px per degree (for the 4-px-per-cycle limit on gratings). */
  devicePxPerDegree: number;
  /** False when the screen-size check has not been done (sizes are estimates). */
  measured: boolean;
}

export interface GameContext {
  /** Seeded random numbers in [0, 1). Games must not call Math.random. */
  rng(): number;
  startLevel: number;
  reducedMotion: boolean;
  /** One of the definition's mode ids. */
  mode: string;
  /** What `Game.save()` returned last time for this profile, or null. */
  saved: SavedProgress | null;
  display: DisplayInfo;
  /** The player's own video, for modes with `needsVideo`. */
  media: MediaSource | null;
  /**
   * Which side the weak eye is on. Not a colour: depth tasks need it to make a patch look
   * nearer (crossed disparity) rather than farther.
   */
  weakEyeSide: 'left' | 'right';
  /** Gentle feedback tones. The app mutes them when sound is off. */
  sound(kind: SoundKind): void;
}

export type SoundKind = 'good' | 'bad' | 'tick' | 'level';

export interface GameStatus {
  score: number;
  level: number;
  over: boolean;
  /** Weak-eye-only prompts: how many were shown and how many the player caught. */
  catches?: { shown: number; caught: number };
  /** Trials answered and how many were right (training tasks). */
  trials?: { done: number; correct: number };
  /** Whether this round met the game's target (used by the optional contrast policy). */
  targetMet?: boolean;
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
  /** Progress to keep for next time (difficulty level, staircase value). */
  save?(): SavedProgress;
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
  /** The start card asks for a video file before this mode can start. */
  needsVideo?: boolean;
  /** Shown with a warning, or hidden, when screening reported an eye turn or double vision. */
  riskyWithEyeTurn?: boolean;
}

/**
 * How a game uses the eyes. Decides what the live-colour rule test expects on screen.
 *  dichoptic   – each eye gets its own part; both lens channels are used.
 *  weakEyeOnly – training for the weak eye alone (monocular perceptual learning).
 *  stereo      – the same picture to both eyes with a small shift (depth).
 */
export type EyeMode = 'dichoptic' | 'weakEyeOnly' | 'stereo';

/** How strong the evidence is for the kind of task, shown as a badge on the tile. */
export type EvidenceBadge = 'trial' | 'small' | 'untested';

export type GameGroup = 'training' | 'watch' | 'games' | 'reading';

export interface GameDefinition {
  id: string;
  title: string;
  blurb: string;
  /** Shown to parents: who sees what. */
  eyeRule: string;
  /** One line per control scheme, shown on the start card. */
  controls: string[];
  modes?: GameMode[];
  eyeMode: EyeMode;
  /** Hidden when screening reported an eye turn, double vision or "not sure" (stereo tasks). */
  requiresNoEyeTurn?: boolean;
  /** Sizes are set in degrees, so the start card asks for the screen-size check. */
  usesVisualAngle?: boolean;
  /** Passive games: idle time still counts as active (nothing to press). */
  passive?: boolean;
  group: GameGroup;
  evidence: { badge: EvidenceBadge; note: string };
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

/** A GameContext for tests: seeded, silent, estimated display, no saved progress. */
export function testGameContext(over: Partial<GameContext> = {}): GameContext {
  return {
    rng: seededRng(7),
    startLevel: 1,
    reducedMotion: true,
    mode: 'default',
    saved: null,
    display: { pxPerDegree: 40, devicePxPerDegree: 80, measured: false },
    media: null,
    weakEyeSide: 'left',
    sound: () => {},
    ...over,
  };
}

/** A fresh random set of soft blobs covering roughly half a picture (Watch mode masks). */
export function randomBlobs(rng: () => number, count = 6): MaskBlob[] {
  const out: MaskBlob[] = [];
  for (let i = 0; i < count; i++) out.push({ x: 0.1 + rng() * 0.8, y: 0.1 + rng() * 0.8, r: 0.16 + rng() * 0.12 });
  return out;
}

export { Staircase, type StaircaseRule, type StaircaseState } from '../core/adaptive/staircase';
export { CatchSchedule } from './catchTargets';
