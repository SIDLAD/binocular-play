import type { GameDefinition } from '../../engine/api';
import { SplitLines } from './game';

export const splitLines: GameDefinition = {
  id: 'split-lines',
  title: 'Split Lines',
  blurb: 'Read a short passage with the words shared between your eyes.',
  eyeRule:
    'Every other word goes to the weaker eye and the words in between to the stronger eye, so you need both eyes to read a line. Both eyes see the page frame, the title and the page number.',
  controls: [
    'Tap the right of the page or press → for the next page; tap the left or press ← to go back.',
    'Up and down arrows (or the A+ and A− buttons) change the text size.',
    'For a lighter page, use Settings → Background (and check the colours afterwards).',
  ],
  eyeMode: 'dichoptic',
  group: 'reading',
  passive: true,
  evidence: {
    badge: 'untested',
    note: 'For comfort and practice. Reading with the words split between the eyes has only been tried in a small feasibility study (Dranitsaris 2026); it has not been tested as a treatment.',
  },
  modes: [
    { id: 'passage', label: 'Built-in passage', blurb: 'A short, calm piece of writing. A new one each time you finish.' },
    { id: 'own', label: 'Your own text', blurb: 'Paste something you want to read. It is not saved.', needsText: true },
  ],
  touchButtons: [
    { action: 'left', label: '←', name: 'Previous page' },
    { action: 'right', label: '→', name: 'Next page' },
    { action: 'down', label: 'A−', name: 'Smaller text', group: 'act' },
    { action: 'up', label: 'A+', name: 'Bigger text' },
  ],
  create: (ctx) => new SplitLines(ctx),
  icon(r) {
    const w = r.width;
    const h = r.height;
    r.rect('both', 8, 8, w - 16, h - 16, { outline: 2, radius: 6, intensity: 0.45 });
    for (let line = 0; line < 4; line++) {
      let x = 20;
      const y = 28 + line * 26;
      for (let i = 0; i < 5 && x < w - 30; i++) {
        const len = 18 + ((line * 7 + i * 13) % 22);
        r.rect((line * 5 + i) % 2 === 0 ? 'weakEye' : 'fellowEye', x, y, len, 8, { radius: 3 });
        x += len + 8;
      }
    }
  },
};
