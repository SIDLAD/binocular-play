export type Glasses = 'red-cyan' | 'red-blue' | 'red-green';
export const GLASSES: readonly Glasses[] = ['red-cyan', 'red-blue', 'red-green'];

export interface GlassesPreset {
  label: string;
  /** Plain name of the non-red lens, for on-screen text. */
  otherName: string;
  redLens: string;
  otherLens: string;
  note: string;
}

/** Starting colours only. There is no published standard; calibration tunes them per screen. */
export const PRESETS: Record<Glasses, GlassesPreset> = {
  'red-cyan': {
    label: 'Red and cyan',
    otherName: 'cyan',
    redLens: '#ff0000',
    otherLens: '#00ffff',
    note: 'The most common kind, often made of card.',
  },
  'red-blue': {
    label: 'Red and blue',
    otherName: 'blue',
    redLens: '#ff0000',
    otherLens: '#0000ff',
    note: 'Common in eye clinics. Blue looks dim, so it may need tuning.',
  },
  'red-green': {
    label: 'Red and green',
    otherName: 'green',
    redLens: '#ff0000',
    otherLens: '#00ff00',
    note: 'Green lenses often leak a little.',
  },
};
