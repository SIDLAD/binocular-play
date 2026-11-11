import type { Profile } from '../settings/schema';
import { screeningCleared } from './screening';
import { sessionCheckPassed, type SessionState } from './session';

/** Local calendar day as YYYY-MM-DD. */
export function localDay(now: Date): string {
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type GuardReason =
  | 'no-profile'
  | 'disclaimer'
  | 'screening'
  | 'onboarding'
  | 'blocked-today'
  | 'session-check';

export type GuardResult = { ok: true } | { ok: false; reason: GuardReason };

export function isBlockedToday(p: Profile, now: Date): boolean {
  return p.safety.doubleVisionBlockedOn === localDay(now);
}

/**
 * Hard rule 5. The play route calls only this. It checks every condition itself
 * rather than trusting `completedAt`, so a damaged or hand-edited profile cannot skip a step.
 */
export function canStartGame(p: Profile | null, session: SessionState | null, now: Date): GuardResult {
  if (!p) return { ok: false, reason: 'no-profile' };
  if (p.onboarding.disclaimerAcceptedAt === null) return { ok: false, reason: 'disclaimer' };
  if (!screeningCleared(p.onboarding.screening)) return { ok: false, reason: 'screening' };
  if (p.onboarding.completedAt === null) return { ok: false, reason: 'onboarding' };
  if (isBlockedToday(p, now)) return { ok: false, reason: 'blocked-today' };
  if (!sessionCheckPassed(session, p.id, now.getTime())) return { ok: false, reason: 'session-check' };
  return { ok: true };
}

export type SafetyEventKind = 'double-at-check' | 'double-or-pain-in-game' | 'block-cleared-by-parent';

/** Mutates a draft profile: logs the report and blocks play for the rest of the day. */
export function reportDoubleVision(p: Profile, kind: SafetyEventKind, now: Date): void {
  p.safety.doubleVisionBlockedOn = localDay(now);
  p.safety.events.push({ at: now.toISOString(), kind });
}

/** Parent-gated "that was a mis-tap". */
export function clearDoubleVisionBlock(p: Profile, now: Date): void {
  p.safety.doubleVisionBlockedOn = null;
  p.safety.events.push({ at: now.toISOString(), kind: 'block-cleared-by-parent' });
}
