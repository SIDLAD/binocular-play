import { eyeTurnCaution } from '../core/safety/screening';
import type { Profile } from '../core/settings/schema';
import type { EyeMode, GameDefinition, GameGroup } from '../engine/api';
import { GAMES } from '../games/registry';

/**
 * The games a player is shown. Games with `requiresNoEyeTurn` (depth training) are hidden
 * when screening reported an eye turn, double vision or "not sure".
 */
export function gamesFor(p: Profile | null, all: readonly GameDefinition[] = GAMES): GameDefinition[] {
  const caution = !p || eyeTurnCaution(p.onboarding.screening);
  return all.filter((g) => !(g.requiresNoEyeTurn && caution));
}

export const GROUPS: { id: GameGroup; title: string; blurb: string }[] = [
  { id: 'training', title: 'Training tasks', blurb: 'Short blocks copied from published training studies.' },
  { id: 'watch', title: 'Watch', blurb: 'Nothing to press. Good for tired days.' },
  { id: 'games', title: 'Games', blurb: 'Arcade games that need both eyes.' },
  { id: 'reading', title: 'Reading', blurb: 'Words shared between the eyes.' },
];

export function eyeTag(mode: EyeMode): string {
  switch (mode) {
    case 'weakEyeOnly':
      return 'Weaker eye only';
    case 'stereo':
      return 'Depth, both eyes';
    case 'dichoptic':
      return 'Both eyes, split';
  }
}

/** Days since 1 Jan 1970 in local time. */
function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/**
 * "Today's pick": a different activity leads each day, so the week has variety
 * (engagement in trials dropped after weeks 3–4). The same pick all day.
 */
export function todaysPick(games: readonly GameDefinition[], now: Date): GameDefinition | null {
  if (games.length === 0) return null;
  return games[dayNumber(now) % games.length];
}
