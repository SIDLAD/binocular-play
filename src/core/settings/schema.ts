import { PRESETS, type Glasses } from '../colour/presets';

export const STORAGE_KEY = 'binocular-play';
export const SCHEMA_VERSION = 1;

export type Eye = 'left' | 'right';

/** One calibrated colour: `base` (#rrggbb) faded toward the background by `brightness` (0–1). */
export interface LensColour {
  base: string;
  brightness: number;
}

export interface Vision {
  glasses: Glasses;
  redLensEye: Eye;
  weakEye: Eye;
  background: 'dark' | 'light';
}

/** Stored per lens, not per eye: it describes the glasses and the screen. */
export interface Calibration {
  redLens: LensColour;
  otherLens: LensColour;
  bothBrightness: number;
  calibratedAt: string | null;
  /** True after an import from another device: colours must be checked on this screen. */
  needsCheck: boolean;
}

export interface Screening {
  eyeTurn: boolean | null;
  everDouble: boolean | null;
  clinicianOk: boolean | null;
  parentConfirmedAt: string | null;
}

export type EndedBy = 'gameOver' | 'quit' | 'timer' | 'doubleVision';

export interface SessionRecord {
  id: string;
  date: string;
  gameId: string;
  seconds: number;
  score: number;
  level: number;
  fellowContrast: number;
  endedBy: EndedBy;
  /** Unpaused time minus idle stretches (10 s with no input in active games). */
  activeSeconds: number;
  /** Weak-eye-only prompts shown and caught, when the game has them. */
  catchShown: number;
  catchCaught: number;
  /** Trials answered and correct (training tasks). */
  trialsDone: number;
  trialsCorrect: number;
}

export interface ContrastChange {
  at: string;
  from: number;
  to: number;
  reason: 'rise' | 'fall' | 'balance-check';
}

export interface DisplaySettings {
  /** CSS px per mm, from the bank-card check. */
  pxPerMm: number;
  viewingDistanceCm: number;
  checkedAt: string | null;
}

export interface Profile {
  id: string;
  name: string;
  avatar: number;
  kind: 'child' | 'adult';
  createdAt: string;
  onboarding: {
    disclaimerAcceptedAt: string | null;
    completedAt: string | null;
    screening: Screening;
  };
  vision: Vision;
  calibration: Calibration;
  /** 0.1–1. Dims only the fellow-eye channel. */
  fellowContrast: number;
  autoContrast: {
    enabled: boolean;
    /** Keep the current value: no rises or falls. */
    hold: boolean;
    /** Highest level from the latest balance check; rises never go above it. */
    balanceMax: number | null;
    balanceCheckedAt: string | null;
    /** Local YYYY-MM-DD of the last day the policy was applied (once per day). */
    lastDay: string | null;
    log: ContrastChange[];
  };
  /** Difficulty and progress kept per game (numbers only). */
  gameProgress: Record<string, Record<string, number>>;
  /** Trials per block the player picked on a training task's start card, per game id. */
  blockTrials: Record<string, number>;
  /** Weekly goal set by a grown-up (or the adult player). */
  goal: { daysPerWeek: number; minutesPerDay: number };
  session: {
    lengthMin: number;
    breakReminder: boolean;
    patchReminder: { enabled: boolean; note: string };
  };
  safety: {
    /** Local YYYY-MM-DD of the day play is blocked after a double-vision report. */
    doubleVisionBlockedOn: string | null;
    events: { at: string; kind: string }[];
  };
  progress: { sessions: SessionRecord[]; best: Record<string, number> };
  ui: { sound: boolean; reducedMotion: 'system' | 'on' | 'off' };
}

export interface AppData {
  version: 1;
  deviceId: string;
  /** Per device, not per profile: the screen-size check. */
  device: { display: DisplaySettings | null };
  activeProfileId: string | null;
  profiles: Profile[];
}

export const AVATAR_COUNT = 8;
export const MIN_CONTRAST = 0.1;
export const DEFAULT_BOTH_BRIGHTNESS = 0.6;

export function randomId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function defaultCalibration(glasses: Glasses): Calibration {
  const preset = PRESETS[glasses];
  return {
    redLens: { base: preset.redLens, brightness: 1 },
    otherLens: { base: preset.otherLens, brightness: 1 },
    bothBrightness: DEFAULT_BOTH_BRIGHTNESS,
    calibratedAt: null,
    needsCheck: false,
  };
}

export function createProfile(init: {
  name: string;
  kind: 'child' | 'adult';
  avatar?: number;
  now?: Date;
  id?: string;
}): Profile {
  const glasses: Glasses = 'red-cyan';
  return {
    id: init.id ?? randomId(),
    name: init.name,
    avatar: init.avatar ?? 0,
    kind: init.kind,
    createdAt: (init.now ?? new Date()).toISOString(),
    onboarding: {
      disclaimerAcceptedAt: null,
      completedAt: null,
      screening: { eyeTurn: null, everDouble: null, clinicianOk: null, parentConfirmedAt: null },
    },
    // Suggested default: red lens over the weak eye. The eye doctor's instruction wins.
    vision: { glasses, redLensEye: 'left', weakEye: 'left', background: 'dark' },
    calibration: defaultCalibration(glasses),
    fellowContrast: 1,
    autoContrast: { enabled: false, hold: false, balanceMax: null, balanceCheckedAt: null, lastDay: null, log: [] },
    gameProgress: {},
    blockTrials: {},
    goal: { daysPerWeek: 5, minutesPerDay: 20 },
    session: { lengthMin: 20, breakReminder: true, patchReminder: { enabled: false, note: '' } },
    safety: { doubleVisionBlockedOn: null, events: [] },
    progress: { sessions: [], best: {} },
    ui: { sound: true, reducedMotion: 'system' },
  };
}

export function emptyAppData(): AppData {
  return { version: 1, deviceId: randomId(), device: { display: null }, activeProfileId: null, profiles: [] };
}
