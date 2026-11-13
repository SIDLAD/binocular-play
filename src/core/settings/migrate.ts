import { GLASSES, type Glasses } from '../colour/presets';
import { normaliseHex } from '../colour/srgb';
import {
  AVATAR_COUNT,
  MIN_CONTRAST,
  createProfile,
  defaultCalibration,
  emptyAppData,
  randomId,
  type AppData,
  type Calibration,
  type EndedBy,
  type LensColour,
  type Profile,
  type SessionRecord,
} from './schema';

const MAX_SESSIONS = 5000;
const MAX_EVENTS = 200;
const MAX_PROFILES = 12;

type Obj = Record<string, unknown>;

function obj(v: unknown): Obj {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {};
}
function str(v: unknown, def: string, max = 200): string {
  return typeof v === 'string' ? v.slice(0, max) : def;
}
function bool(v: unknown, def: boolean): boolean {
  return typeof v === 'boolean' ? v : def;
}
function triBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}
function num(v: unknown, def: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : def;
}
function oneOf<T extends string>(v: unknown, options: readonly T[], def: T): T {
  return options.includes(v as T) ? (v as T) : def;
}
function isoOrNull(v: unknown): string | null {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null;
}
function dayOrNull(v: unknown): string | null {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function lensColour(v: unknown, def: LensColour): LensColour {
  const o = obj(v);
  const base = typeof o.base === 'string' ? normaliseHex(o.base) : null;
  return { base: base ?? def.base, brightness: num(o.brightness, def.brightness, 0, 1) };
}

function calibration(v: unknown, glasses: Glasses): Calibration {
  const o = obj(v);
  const def = defaultCalibration(glasses);
  return {
    redLens: lensColour(o.redLens, def.redLens),
    otherLens: lensColour(o.otherLens, def.otherLens),
    bothBrightness: num(o.bothBrightness, def.bothBrightness, 0.1, 1),
    calibratedAt: isoOrNull(o.calibratedAt),
    needsCheck: bool(o.needsCheck, false),
  };
}

const ENDED_BY: readonly EndedBy[] = ['gameOver', 'quit', 'timer', 'doubleVision'];

function sessionRecord(v: unknown): SessionRecord | null {
  const o = obj(v);
  const date = isoOrNull(o.date);
  if (!date || typeof o.gameId !== 'string') return null;
  return {
    id: str(o.id, randomId(), 80),
    date,
    gameId: str(o.gameId, '', 80),
    seconds: Math.round(num(o.seconds, 0, 0, 86400)),
    score: Math.round(num(o.score, 0, 0, 1e12)),
    level: Math.round(num(o.level, 1, 0, 1e6)),
    fellowContrast: num(o.fellowContrast, 1, 0, 1),
    endedBy: oneOf(o.endedBy, ENDED_BY, 'quit'),
    // Records from before Milestone 3 had no idle tracking: all their time counts as active.
    activeSeconds: Math.round(num(o.activeSeconds, num(o.seconds, 0, 0, 86400), 0, 86400)),
    catchShown: Math.round(num(o.catchShown, 0, 0, 1e6)),
    catchCaught: Math.round(num(o.catchCaught, 0, 0, 1e6)),
    trialsDone: Math.round(num(o.trialsDone, 0, 0, 1e6)),
    trialsCorrect: Math.round(num(o.trialsCorrect, 0, 0, 1e6)),
  };
}

const MAX_GAMES = 40;
const MAX_KEYS = 24;
const MAX_CONTRAST_LOG = 200;

function gameProgress(v: unknown): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [game, raw] of Object.entries(obj(v)).slice(0, MAX_GAMES)) {
    const inner: Record<string, number> = {};
    for (const [k, val] of Object.entries(obj(raw)).slice(0, MAX_KEYS)) {
      if (typeof val === 'number' && Number.isFinite(val)) inner[k.slice(0, 40)] = val;
    }
    out[game.slice(0, 80)] = inner;
  }
  return out;
}

/** Whole numbers 1–500 per game id. Whether a value is one of the task's choices is checked at play time. */
function blockTrials(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [game, val] of Object.entries(obj(v)).slice(0, MAX_GAMES)) {
    if (typeof val === 'number' && Number.isFinite(val)) out[game.slice(0, 80)] = Math.round(num(val, 1, 1, 500));
  }
  return out;
}

function autoContrast(v: unknown): Profile['autoContrast'] {
  const o = obj(v);
  const balance = o.balanceMax;
  return {
    enabled: bool(o.enabled, false),
    hold: bool(o.hold, false),
    balanceMax: typeof balance === 'number' && Number.isFinite(balance) ? num(balance, 1, MIN_CONTRAST, 1) : null,
    balanceCheckedAt: isoOrNull(o.balanceCheckedAt),
    lastDay: dayOrNull(o.lastDay),
    log: (Array.isArray(o.log) ? o.log : [])
      .map((e) => {
        const eo = obj(e);
        const at = isoOrNull(eo.at);
        if (!at) return null;
        return {
          at,
          from: num(eo.from, 1, 0, 1),
          to: num(eo.to, 1, 0, 1),
          reason: oneOf(eo.reason, ['rise', 'fall', 'balance-check'] as const, 'rise'),
        };
      })
      .filter((e): e is Profile['autoContrast']['log'][number] => e !== null)
      .slice(-MAX_CONTRAST_LOG),
  };
}

function display(v: unknown): AppData['device']['display'] {
  const o = obj(v);
  if (typeof o.pxPerMm !== 'number' || !Number.isFinite(o.pxPerMm)) return null;
  return {
    pxPerMm: num(o.pxPerMm, 3.78, 1, 40),
    viewingDistanceCm: Math.round(num(o.viewingDistanceCm, 60, 20, 300)),
    checkedAt: isoOrNull(o.checkedAt),
  };
}

export function sanitizeProfile(v: unknown): Profile | null {
  const o = obj(v);
  if (typeof o.id !== 'string' || o.id.length === 0) return null;
  const def = createProfile({ name: 'Player', kind: 'child', id: o.id.slice(0, 80) });
  const ob = obj(o.onboarding);
  const sc = obj(ob.screening);
  const vi = obj(o.vision);
  const se = obj(o.session);
  const pr = obj(se.patchReminder);
  const sa = obj(o.safety);
  const pg = obj(o.progress);
  const ui = obj(o.ui);
  const glasses = oneOf(vi.glasses, GLASSES, def.vision.glasses);

  const best: Record<string, number> = {};
  for (const [k, val] of Object.entries(obj(pg.best))) {
    if (typeof val === 'number' && Number.isFinite(val)) best[k.slice(0, 80)] = val;
  }

  return {
    id: def.id,
    name: str(o.name, def.name, 24).trim() || def.name,
    avatar: Math.floor(num(o.avatar, 0, 0, AVATAR_COUNT - 1)),
    kind: oneOf(o.kind, ['child', 'adult'] as const, 'child'),
    createdAt: isoOrNull(o.createdAt) ?? def.createdAt,
    onboarding: {
      disclaimerAcceptedAt: isoOrNull(ob.disclaimerAcceptedAt),
      completedAt: isoOrNull(ob.completedAt),
      screening: {
        eyeTurn: triBool(sc.eyeTurn),
        everDouble: triBool(sc.everDouble),
        clinicianOk: triBool(sc.clinicianOk),
        parentConfirmedAt: isoOrNull(sc.parentConfirmedAt),
      },
    },
    vision: {
      glasses,
      redLensEye: oneOf(vi.redLensEye, ['left', 'right'] as const, def.vision.redLensEye),
      weakEye: oneOf(vi.weakEye, ['left', 'right'] as const, def.vision.weakEye),
      background: oneOf(vi.background, ['dark', 'light'] as const, 'dark'),
    },
    calibration: calibration(o.calibration, glasses),
    fellowContrast: num(o.fellowContrast, 1, MIN_CONTRAST, 1),
    autoContrast: autoContrast(o.autoContrast),
    gameProgress: gameProgress(o.gameProgress),
    blockTrials: blockTrials(o.blockTrials),
    goal: {
      daysPerWeek: Math.round(num(obj(o.goal).daysPerWeek, 5, 1, 7)),
      minutesPerDay: Math.round(num(obj(o.goal).minutesPerDay, 20, 5, 120)),
    },
    session: {
      lengthMin: Math.round(num(se.lengthMin, 20, 5, 60)),
      breakReminder: bool(se.breakReminder, true),
      patchReminder: { enabled: bool(pr.enabled, false), note: str(pr.note, '', 120) },
    },
    safety: {
      doubleVisionBlockedOn: dayOrNull(sa.doubleVisionBlockedOn),
      events: (Array.isArray(sa.events) ? sa.events : [])
        .map((e) => {
          const eo = obj(e);
          const at = isoOrNull(eo.at);
          return at ? { at, kind: str(eo.kind, 'unknown', 40) } : null;
        })
        .filter((e): e is { at: string; kind: string } => e !== null)
        .slice(-MAX_EVENTS),
    },
    progress: {
      sessions: (Array.isArray(pg.sessions) ? pg.sessions : [])
        .map(sessionRecord)
        .filter((r): r is SessionRecord => r !== null)
        .slice(-MAX_SESSIONS),
      best,
    },
    ui: {
      sound: bool(ui.sound, true),
      reducedMotion: oneOf(ui.reducedMotion, ['system', 'on', 'off'] as const, 'system'),
    },
  };
}

/**
 * Every load, import and update passes through here. Unknown or damaged fields
 * fall back to their defaults; nothing is ever thrown.
 * Migrations from older versions go at the top of this function (there are none yet).
 */
export function sanitizeAppData(v: unknown): AppData {
  const o = obj(v);
  const def = emptyAppData();
  const seen = new Set<string>();
  const profiles: Profile[] = [];
  for (const raw of Array.isArray(o.profiles) ? o.profiles : []) {
    const p = sanitizeProfile(raw);
    if (p && !seen.has(p.id) && profiles.length < MAX_PROFILES) {
      seen.add(p.id);
      profiles.push(p);
    }
  }
  let active = typeof o.activeProfileId === 'string' ? o.activeProfileId : null;
  if (active === null || !seen.has(active)) active = profiles[0]?.id ?? null;
  return {
    version: 1,
    deviceId: str(o.deviceId, def.deviceId, 80) || def.deviceId,
    device: { display: display(obj(o.device).display) },
    activeProfileId: active,
    profiles,
  };
}
