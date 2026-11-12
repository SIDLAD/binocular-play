import type { SettingsStore } from '../settings/store';
import { NEUTRAL_PALETTE, PaletteSource, resolvePalette } from './palette';

/**
 * A palette that follows the active profile. Every settings change recomputes it
 * synchronously, so anything drawing through the channel renderer picks it up on
 * its next draw call with no reload.
 */
export function createLivePalette(store: SettingsStore, opts: { fullFellow?: boolean } = {}): PaletteSource & { dispose(): void } {
  const compute = () => {
    const p = store.activeProfile;
    return p ? resolvePalette(p, opts) : NEUTRAL_PALETTE;
  };
  const source = new PaletteSource(compute()) as PaletteSource & { dispose(): void };
  source.dispose = store.subscribe(() => source.set(compute()));
  return source;
}
