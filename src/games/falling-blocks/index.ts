import type { GameDefinition } from '../../engine/api';
import { TumbleStack } from './game';

export const fallingBlocks: GameDefinition = {
  id: 'falling-blocks',
  title: 'Tumble Stack',
  blurb: 'Turn and drop the falling pieces to fill whole rows.',
  eyeRule:
    'The weaker eye sees the falling piece, its landing shadow and the next piece. The stronger eye sees the stack. Both eyes see the frame and the grid. You need both eyes to fit a piece into the stack.',
  controls: [
    'Keyboard: arrow keys or A / D to move, up or W to turn, down or S to fall faster, space to drop.',
    'Touch: drag sideways to move, tap to turn, flick down to drop, or use the buttons.',
  ],
  modes: [
    { id: 'classic', label: 'Classic', blurb: 'Pieces made of four blocks.' },
    { id: 'easy', label: 'Easy', blurb: 'Small pieces of one to three blocks.' },
  ],
  touchButtons: [
    { action: 'left', label: '←', name: 'Move left' },
    { action: 'right', label: '→', name: 'Move right' },
    { action: 'down', label: '↓', name: 'Fall faster' },
    { action: 'up', label: '⟳', name: 'Turn' },
    { action: 'primary', label: 'Drop', name: 'Drop' },
  ],
  create: (ctx) => new TumbleStack(ctx),
  icon(r) {
    const cell = Math.floor(Math.min(r.width / 12, r.height / 7));
    const x0 = Math.floor((r.width - cell * 8) / 2);
    const y0 = Math.floor((r.height - cell * 6) / 2);
    const at = (ch: 'weakEye' | 'fellowEye', gx: number, gy: number) =>
      r.rect(ch, x0 + gx * cell + 1, y0 + gy * cell + 1, cell - 2, cell - 2, { radius: cell * 0.18 });
    r.rect('both', x0 - 3, y0 - 3, cell * 8 + 6, cell * 6 + 6, { outline: 3, radius: 4 });
    const stack = [
      [0, 5], [1, 5], [2, 5], [4, 5], [5, 5], [6, 5], [7, 5],
      [0, 4], [1, 4], [5, 4], [6, 4], [7, 4], [6, 3],
    ];
    for (const [gx, gy] of stack) at('fellowEye', gx, gy);
    for (const [gx, gy] of [[2, 0], [3, 0], [4, 0], [3, 1]]) at('weakEye', gx, gy);
  },
};
