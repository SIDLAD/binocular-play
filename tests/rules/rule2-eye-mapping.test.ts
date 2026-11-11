import { describe, expect, it } from 'vitest';
import { resolvePalette } from '../../src/core/colour/palette';
import { checkSeparation, visibleThrough, type LensKind } from '../../src/core/colour/separation';
import { toHex } from '../../src/core/colour/srgb';
import { ROWS, profileForRow, rowName, type Row } from './rows';

// Written independently of the app's lensKind(): the lens in front of each eye.
function lensInFrontOf(row: Row, eye: 'left' | 'right'): LensKind {
  if (row.redLensEye === eye) return 'red';
  return row.glasses === 'red-cyan' ? 'cyan' : row.glasses === 'red-blue' ? 'blue' : 'green';
}

describe('rule 2: eye mapping', () => {
  it('covers all 24 combinations exactly once', () => {
    const keys = new Set(ROWS.map((r) => `${r.glasses}|${r.background}|${r.redLensEye}|${r.weakEye}`));
    expect(ROWS.length).toBe(24);
    expect(keys.size).toBe(24);
  });

  for (const row of ROWS) {
    describe(rowName(row), () => {
      const profile = profileForRow(row);
      const palette = resolvePalette(profile);
      const fellowEyeSide = row.weakEye === 'left' ? 'right' : 'left';
      const weakLens = lensInFrontOf(row, row.weakEye);
      const fellowLens = lensInFrontOf(row, fellowEyeSide);

      it('draws the expected colours', () => {
        expect(toHex(palette.weakEye)).toBe(row.weak);
        expect(toHex(palette.fellowEye)).toBe(row.fellow);
        expect(toHex(palette.background)).toBe(row.background === 'dark' ? '#000000' : '#ffffff');
      });

      it('the weak-eye colour is seen by the weak eye only', () => {
        expect(visibleThrough(palette.weakEye, palette.background, weakLens)).toBe(true);
        expect(visibleThrough(palette.weakEye, palette.background, fellowLens)).toBe(false);
      });

      it('the fellow-eye colour is seen by the fellow eye only', () => {
        expect(visibleThrough(palette.fellowEye, palette.background, fellowLens)).toBe(true);
        expect(visibleThrough(palette.fellowEye, palette.background, weakLens)).toBe(false);
      });

      it('the both colour is seen by both eyes', () => {
        expect(visibleThrough(palette.both, palette.background, weakLens)).toBe(true);
        expect(visibleThrough(palette.both, palette.background, fellowLens)).toBe(true);
      });

      it('stays separable after calibration brightness and contrast are lowered', () => {
        const tuned = profileForRow(row);
        tuned.calibration.redLens.brightness = 0.73;
        tuned.calibration.otherLens.brightness = 0.41;
        tuned.fellowContrast = 0.2;
        const p = resolvePalette(tuned);
        expect(visibleThrough(p.weakEye, p.background, weakLens)).toBe(true);
        expect(visibleThrough(p.weakEye, p.background, fellowLens)).toBe(false);
        expect(visibleThrough(p.fellowEye, p.background, fellowLens)).toBe(true);
        expect(visibleThrough(p.fellowEye, p.background, weakLens)).toBe(false);
        expect(checkSeparation(tuned)).toEqual([]);
      });

      it('the preset passes the separation check', () => {
        expect(checkSeparation(profile)).toEqual([]);
      });
    });
  }

  it('the separation check reports a colour the other eye could see', () => {
    const p = profileForRow(ROWS[0]);
    p.calibration.redLens.base = '#ff8800'; // orange has green in it: a cyan lens passes green
    expect(checkSeparation(p)).toContainEqual({ colour: 'red', kind: 'leak' });
  });

  it('the separation check reports a colour dragged down to nothing', () => {
    const p = profileForRow(ROWS[0]);
    p.calibration.otherLens.brightness = 0;
    expect(checkSeparation(p)).toContainEqual({ colour: 'other', kind: 'invisible' });
  });
});
