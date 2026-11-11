import { describe, expect, it } from 'vitest';
import { resolvePalette } from '../../src/core/colour/palette';
import { luminance, toHex } from '../../src/core/colour/srgb';
import { ROWS, profileForRow, rowName } from './rows';

const palettePy = import.meta.glob('/src/core/colour/palette.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const allSource = import.meta.glob(['/src/**/*.ts', '!/src/**/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const CONTRASTS = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];

describe('rule 4: fellow-eye contrast dims only the fellow eye', () => {
  for (const row of ROWS) {
    it(rowName(row), () => {
      const full = resolvePalette(profileForRow(row));
      let previousDistance = Infinity;
      for (const contrast of CONTRASTS) {
        const p = profileForRow(row);
        p.fellowContrast = contrast;
        const palette = resolvePalette(p);

        // Never touched by the contrast slider:
        expect(toHex(palette.weakEye)).toBe(toHex(full.weakEye));
        expect(toHex(palette.both)).toBe(toHex(full.both));
        expect(toHex(palette.background)).toBe(toHex(full.background));

        // The fellow eye moves steadily toward the background as contrast falls.
        const distance = Math.abs(luminance(palette.fellowEye) - luminance(palette.background));
        expect(distance).toBeLessThan(previousDistance);
        expect(distance).toBeGreaterThan(0);
        previousDistance = distance;
      }
    });
  }

  it('20 % contrast is roughly 20 % of the light, not 3 %', () => {
    const p = profileForRow(ROWS[0]);
    const full = luminance(resolvePalette(p).fellowEye);
    p.fellowContrast = 0.2;
    const dim = luminance(resolvePalette(p).fellowEye);
    expect(dim / full).toBeGreaterThan(0.18);
    expect(dim / full).toBeLessThan(0.22);
  });

  it('100 % contrast returns the calibrated colour exactly', () => {
    const p = profileForRow(ROWS[1]);
    p.calibration.redLens.brightness = 0.5;
    expect(toHex(resolvePalette(p).fellowEye)).toBe('#800000');
  });

  it('fellowContrast is read on exactly one line of palette.ts', () => {
    const lines = Object.values(palettePy)[0]
      .split('\n')
      .filter((l) => /\.fellowContrast\b/.test(l));
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('fellowEye');
  });

  it('nothing in the engine or the games reads fellowContrast', () => {
    const offenders = Object.entries(allSource)
      .filter(([file]) => file.startsWith('/src/engine/') || file.startsWith('/src/games/'))
      .filter(([, source]) => source.includes('fellowContrast'))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });
});
