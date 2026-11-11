import { describe, expect, it } from 'vitest';
import { scanGameSource } from './scanner';

// Hard rule 1: games draw only through weakEye / fellowEye / both.
const files = import.meta.glob('/src/games/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('rule 1: channels only', () => {
  it('finds the game sources', () => {
    expect(Object.keys(files)).toContain('/src/games/registry.ts');
  });

  it('has no raw colour, canvas access, DOM access or outside import under src/games/', () => {
    const violations = Object.entries(files).flatMap(([file, source]) => scanGameSource(file, source));
    expect(violations).toEqual([]);
  });

  describe('the scanner itself catches violations', () => {
    const bad: [string, string][] = [
      ['hex colour', "r.rect('weakEye', 0, 0, 1, 1); const c = '#ff0000';"],
      ['short hex colour', 'const c = "#f00";'],
      ['rgb()', 'const c = `rgb(255, 0, 0)`;'],
      ['hsl()', "const c = 'hsl(0 100% 50%)';"],
      ['colour name', "const c = 'red';"],
      ['fillStyle', 'ctx.fillStyle = x;'],
      ['getContext', "canvas.getContext('2d');"],
      ['document', "document.querySelector('canvas');"],
      ['inline style', 'el.style.background = x;'],
      ['Math.random', 'const n = Math.random();'],
      ['import from core', "import { toHex } from '../../core/colour/srgb';"],
      ['import from the renderer', "import { CanvasChannelRenderer } from '../../engine/renderer';"],
      ['import escaping its folder', "import { x } from './../../app/dom';"],
      ['package import', "import x from 'some-package';"],
    ];
    for (const [name, source] of bad) {
      it(`flags ${name}`, () => {
        expect(scanGameSource('/src/games/x/game.ts', source).length).toBeGreaterThan(0);
      });
    }

    it('flags a stylesheet in a game folder', () => {
      expect(scanGameSource('/src/games/x/game.css', '').length).toBeGreaterThan(0);
    });

    it('accepts channel-only code', () => {
      const good = [
        "import type { Game, Renderer } from '../../engine/api';",
        "import { step } from './logic';",
        "export function draw(r: Renderer) { r.rect('weakEye', 0, 0, 10, 10, { intensity: 0.5 }); }",
      ].join('\n');
      expect(scanGameSource('/src/games/x/game.ts', good)).toEqual([]);
    });

    it('lets a game test import vitest, but not a game', () => {
      const src = "import { it } from 'vitest';";
      expect(scanGameSource('/src/games/x/logic.test.ts', src)).toEqual([]);
      expect(scanGameSource('/src/games/x/logic.ts', src).length).toBe(1);
    });
  });
});
