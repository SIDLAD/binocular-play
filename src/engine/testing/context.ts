import { seededRng, type GameContext } from '../api';

/** A GameContext for tests: seeded, silent, estimated display, no saved progress. */
export function testContext(over: Partial<GameContext> = {}): GameContext {
  return {
    rng: seededRng(7),
    startLevel: 1,
    reducedMotion: true,
    mode: 'default',
    saved: null,
    display: { pxPerDegree: 40, devicePxPerDegree: 80, measured: false },
    media: null,
    sound: () => {},
    ...over,
  };
}
