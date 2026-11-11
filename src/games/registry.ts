import type { GameDefinition } from '../engine/api';

/**
 * Every game in the app. The home screen, the play route and the safety tests
 * (flash check, live-colour check) all iterate this list, so a game added here
 * is covered automatically.
 */
export const GAMES: readonly GameDefinition[] = [];

export function findGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}
