import { describe, expect, it } from 'vitest';
import { parseHex, type RGB } from '../../core/colour/srgb';
import { drawnColour, lensColourFromDrawn } from './colourControl';

describe('RGB sliders round trip', () => {
  const samples: RGB[] = [
    [255, 0, 0],
    [0, 255, 255],
    [12, 200, 255],
    [30, 0, 0],
    [1, 2, 3],
    [0, 0, 0],
    [255, 255, 255],
  ];
  for (const bg of ['dark', 'light'] as const) {
    it(`draws what the sliders say (${bg} background)`, () => {
      for (const rgb of samples) {
        const back = parseHex(drawnColour(lensColourFromDrawn(rgb, bg), bg));
        for (let i = 0; i < 3; i++) expect(Math.abs(back[i] - rgb[i])).toBeLessThanOrEqual(1);
      }
    });
  }
  it('keeps a zero primary at zero, so a separated colour stays separated', () => {
    for (const rgb of samples) {
      const back = parseHex(drawnColour(lensColourFromDrawn(rgb, 'dark'), 'dark'));
      for (let i = 0; i < 3; i++) if (rgb[i] === 0) expect(back[i]).toBe(0);
    }
  });
});
