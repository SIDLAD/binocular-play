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
}): SessionRecord {
  return {
    id: randomId(),
    date: input.now.toISOString(),
    gameId: input.gameId,
    seconds: Math.max(0, Math.round(input.seconds)),
    score: Math.max(0, Math.round(input.score)),
    level: Math.max(0, Math.round(input.level)),
    fellowContrast: input.fellowContrast,
    endedBy: input.endedBy,
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
