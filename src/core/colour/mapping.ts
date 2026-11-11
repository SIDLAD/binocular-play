import type { Vision } from '../settings/schema';

/** Which of the two calibrated colours: the red one, or the other lens's colour. */
export type ColourKey = 'red' | 'other';
export type Eye = 'left' | 'right';

export function otherEye(eye: Eye): Eye {
  return eye === 'left' ? 'right' : 'left';
}

export function otherKey(key: ColourKey): ColourKey {
  return key === 'red' ? 'other' : 'red';
}

/** The lens sitting in front of the given eye. */
export function lensOverEye(vision: Pick<Vision, 'redLensEye'>, eye: Eye): ColourKey {
  return vision.redLensEye === eye ? 'red' : 'other';
}

/**
 * The colour that only the eye behind `lens` can see.
 * Dark background: the lens's own colour (red light passes the red lens and is black through the other).
 * Light background: the opposite colour (a red shape on white vanishes through the red lens and
 * looks dark through the other lens).
 */
export function colourSeenOnlyThrough(lens: ColourKey, background: Vision['background']): ColourKey {
  return background === 'dark' ? lens : otherKey(lens);
}

/**
 * Hard rule 2. This is the ONLY place that decides which colour each eye channel draws with.
 */
export function channelLens(vision: Vision): { weakEye: ColourKey; fellowEye: ColourKey } {
  const weakLens = lensOverEye(vision, vision.weakEye);
  const weak = colourSeenOnlyThrough(weakLens, vision.background);
  return { weakEye: weak, fellowEye: otherKey(weak) };
}
