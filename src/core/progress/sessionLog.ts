import { localDay } from '../safety/guards';
import { randomId, type EndedBy, type Profile, type SessionRecord } from '../settings/schema';

export function makeRecord(input: {
  gameId: string;
  seconds: number;
  score: number;
  level: number;
  fellowContrast: number;
  endedBy: EndedBy;
  now: Date;
  activeSeconds?: number;
  catches?: { shown: number; caught: number };
  trials?: { done: number; correct: number };
}): SessionRecord {
  const int = (v: number | undefined) => Math.max(0, Math.round(v ?? 0));
  return {
    id: randomId(),
    date: input.now.toISOString(),
    gameId: input.gameId,
    seconds: Math.max(0, Math.round(input.seconds)),
    score: Math.max(0, Math.round(input.score)),
    level: Math.max(0, Math.round(input.level)),
    fellowContrast: input.fellowContrast,
    endedBy: input.endedBy,
    activeSeconds: Math.min(int(input.seconds), int(input.activeSeconds ?? input.seconds)),
    catchShown: int(input.catches?.shown),
    catchCaught: Math.min(int(input.catches?.shown), int(input.catches?.caught)),
    trialsDone: int(input.trials?.done),
    trialsCorrect: Math.min(int(input.trials?.done), int(input.trials?.correct)),
  };
}

/** Mutates a draft profile. Returns true when the score is a new personal best for that game. */
export function addSessionRecord(p: Profile, rec: SessionRecord): boolean {
  p.progress.sessions.push(rec);
  const previous = p.progress.best[rec.gameId] ?? 0;
  if (rec.score > previous) {
    p.progress.best[rec.gameId] = rec.score;
    return previous > 0 || rec.score > 0;
  }
  return false;
}

/** Seconds of logged play on the given local day. */
export function secondsOnDay(p: Profile, day: string): number {
  let total = 0;
  for (const r of p.progress.sessions) {
    if (localDay(new Date(r.date)) === day) total += r.seconds;
  }
  return total;
}

/** Number of days in a row, ending today or yesterday, with any logged play. */
export function currentStreak(p: Profile, now: Date): number {
  const days = new Set(p.progress.sessions.map((r) => localDay(new Date(r.date))));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDay(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Active seconds on the given local day. */
export function activeSecondsOnDay(p: Profile, day: string): number {
  let total = 0;
  for (const r of p.progress.sessions) {
    if (localDay(new Date(r.date)) === day) total += r.activeSeconds;
  }
  return total;
}

/** Monday of the week containing `d`, at local midnight. */
export function weekStart(d: Date): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow);
  return start;
}

export interface WeekSummary {
  /** Monday as a local date. */
  start: string;
  activeMinutes: number;
  /** Days this week with at least the goal's minutes of active play. */
  goalDays: number;
  /** Days this week with any play. */
  playDays: number;
}

/** The week (Monday to Sunday) containing `now`, against the goal. */
export function weekSummary(p: Profile, now: Date): WeekSummary {
  const start = weekStart(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const perDay = new Map<string, number>();
  for (const r of p.progress.sessions) {
    const d = new Date(r.date);
    if (d < start || d >= end) continue;
    const key = localDay(d);
    perDay.set(key, (perDay.get(key) ?? 0) + r.activeSeconds);
  }
  let total = 0;
  let goalDays = 0;
  for (const s of perDay.values()) {
    total += s;
    if (s >= p.goal.minutesPerDay * 60) goalDays++;
  }
  return { start: localDay(start), activeMinutes: Math.round(total / 60), goalDays, playDays: perDay.size };
}

/** Weeks in a row in which the goal was met, counting this week only once it is met. */
export function weekStreak(p: Profile, now: Date): number {
  let streak = 0;
  const cursor = weekStart(now);
  if (weekSummary(p, cursor).goalDays >= p.goal.daysPerWeek) streak++;
  for (let i = 0; i < 104; i++) {
    cursor.setDate(cursor.getDate() - 7);
    if (weekSummary(p, cursor).goalDays >= p.goal.daysPerWeek) streak++;
    else break;
  }
  return streak;
}
