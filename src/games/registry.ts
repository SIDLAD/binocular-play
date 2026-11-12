import type { GameDefinition } from '../engine/api';
import { depthDuel } from './depth-duel/index';
import { fallingBlocks } from './falling-blocks/index';
import { glowBounce } from './glow-bounce/index';
import { letterCrowd } from './letter-crowd/index';
import { splitLines } from './split-lines/index';
import { starPatrol } from './star-patrol/index';
import { stripeFinder } from './stripe-finder/index';
import { watch } from './watch/index';

/**
 * Every game in the app. The home screen, the play route and the safety tests
 * (flash check, live-colour check) all iterate this list, so a game added here
 * is covered automatically.
 */
export const GAMES: readonly GameDefinition[] = [
  letterCrowd,
  stripeFinder,
  depthDuel,
  watch,
  starPatrol,
  glowBounce,
  fallingBlocks,
  splitLines,
];

export function findGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}
