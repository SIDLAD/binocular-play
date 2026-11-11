import type { StorageLike } from '../settings/store';

/**
 * A session is a continuous period of play with gaps shorter than 30 minutes.
 * It is kept in memory and mirrored to sessionStorage so a reload does not reset it.
 */
export interface SessionState {
  profileId: string;
  /** ms timestamp of the "Do you see double right now?" → "No" answer, or null. */
  checkPassedAt: number | null;
  lastActivityAt: number;
  /** Active, unpaused game time across games. */
  playedMs: number;
  /** Time added with "Keep playing". */
  extraMs: number;
  /** True once the break overlay has been shown for the current allowance. */
  breakShown: boolean;
}

export const IDLE_GAP_MS = 30 * 60 * 1000;
export const EXTEND_MS = 5 * 60 * 1000;
const KEY = 'binocular-play-session';

export function freshSession(profileId: string, nowMs: number): SessionState {
  return {
    profileId,
    checkPassedAt: null,
    lastActivityAt: nowMs,
    playedMs: 0,
    extraMs: 0,
    breakShown: false,
  };
}

export function isSessionCurrent(s: SessionState | null, profileId: string, nowMs: number): boolean {
  return s !== null && s.profileId === profileId && nowMs - s.lastActivityAt < IDLE_GAP_MS;
}

/** True when the pre-session double-vision check was passed in the current session. */
export function sessionCheckPassed(s: SessionState | null, profileId: string, nowMs: number): boolean {
  return isSessionCurrent(s, profileId, nowMs) && s !== null && s.checkPassedAt !== null;
}

export function remainingMs(lengthMin: number, s: SessionState | null): number {
  const total = lengthMin * 60 * 1000 + (s?.extraMs ?? 0);
  return Math.max(0, total - (s?.playedMs ?? 0));
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export class SessionManager {
  private state: SessionState | null = null;

  constructor(private storage: StorageLike | null = null) {
    try {
      const text = storage?.getItem(KEY);
      const raw = text ? (JSON.parse(text) as Partial<SessionState>) : null;
      if (
        raw &&
        typeof raw.profileId === 'string' &&
        typeof raw.lastActivityAt === 'number' &&
        typeof raw.playedMs === 'number'
      ) {
        this.state = {
          profileId: raw.profileId,
          checkPassedAt: typeof raw.checkPassedAt === 'number' ? raw.checkPassedAt : null,
          lastActivityAt: raw.lastActivityAt,
          playedMs: Math.max(0, raw.playedMs),
          extraMs: typeof raw.extraMs === 'number' ? Math.max(0, raw.extraMs) : 0,
          breakShown: raw.breakShown === true,
        };
      }
    } catch {
      this.state = null;
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.state));
    } catch {
      /* session state is best-effort */
    }
  }

  /** The current session for this profile, or null if there is none or it went stale. */
  peek(profileId: string, nowMs: number): SessionState | null {
    return isSessionCurrent(this.state, profileId, nowMs) ? this.state : null;
  }

  private ensure(profileId: string, nowMs: number): SessionState {
    if (!isSessionCurrent(this.state, profileId, nowMs) || this.state === null) {
      this.state = freshSession(profileId, nowMs);
    }
    return this.state;
  }

  passCheck(profileId: string, nowMs: number): void {
    const s = this.ensure(profileId, nowMs);
    s.checkPassedAt = nowMs;
    s.lastActivityAt = nowMs;
    this.save();
  }

  addPlay(profileId: string, ms: number, nowMs: number): void {
    const s = this.ensure(profileId, nowMs);
    s.playedMs += ms;
    s.lastActivityAt = nowMs;
    this.save();
  }

  markBreakShown(profileId: string, nowMs: number): void {
    const s = this.ensure(profileId, nowMs);
    s.breakShown = true;
    this.save();
  }

  /** "Keep playing": adds five minutes and allows the break overlay to show again. */
  extend(profileId: string, nowMs: number): void {
    const s = this.ensure(profileId, nowMs);
    s.extraMs += EXTEND_MS;
    s.breakShown = false;
    s.lastActivityAt = nowMs;
    this.save();
  }

  reset(): void {
    this.state = null;
    this.save();
  }
}
