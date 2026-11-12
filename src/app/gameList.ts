import { eyeTurnCaution } from '../core/safety/screening';
import type { Profile } from '../core/settings/schema';
import type { GameDefinition } from '../engine/api';
import { GAMES } from '../games/registry';

/**
 * The games a player is shown. Games with `requiresNoEyeTurn` (depth training) are hidden
 * when screening reported an eye turn, double vision or "not sure".
 */
export function gamesFor(p: Profile | null, all: readonly GameDefinition[] = GAMES): GameDefinition[] {
  const caution = !p || eyeTurnCaution(p.onboarding.screening);
  return all.filter((g) => !(g.requiresNoEyeTurn && caution));
}
