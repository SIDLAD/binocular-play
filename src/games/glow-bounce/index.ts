import type { GameDefinition } from '../../engine/api';
import { GlowBounce } from './game';

export const glowBounce: GameDefinition = {
  id: 'glow-bounce',
  title: 'Glow Bounce',
  blurb: 'Bounce the glowing ball to knock out every brick.',
  eyeRule:
    'The weaker eye sees the ball, the paddle and your lives. The stronger eye sees the bricks. Both eyes see the walls. You need the weaker eye to keep the ball in play and the stronger eye to aim at bricks.',
  controls: [
    'Keyboard: left and right arrows (or A and D) to move, space to launch.',
    'Touch: slide your finger to move the paddle, lift it to launch.',
  ],
  eyeMode: 'dichoptic',
  group: 'games',
  evidence: {
    badge: 'trial',
    note: 'Uses the eye split from the Dig Rush trials (Kelly 2016, which was positive). A larger trial of that game found no benefit over glasses alone in children aged 7–12 (Holmes 2019). Not tested as this app.',
  },
  touchButtons: [
    { action: 'left', label: '←', name: 'Move left' },
    { action: 'right', label: '→', name: 'Move right' },
    { action: 'primary', label: 'Launch', name: 'Launch the ball' },
  ],
  create: (ctx) => new GlowBounce(ctx),
  icon(r) {
    const w = r.width;
    const h = r.height;
    r.line('both', 6, h - 4, 6, 6, 2, { intensity: 0.6 });
    r.line('both', 6, 6, w - 6, 6, 2, { intensity: 0.6 });
    r.line('both', w - 6, 6, w - 6, h - 4, 2, { intensity: 0.6 });
    const bw = (w - 24) / 6;
    for (let row = 0; row < 3; row++) {
      for (let c = 0; c < 6; c++) if ((row + c) % 3 !== 1) r.rect('fellowEye', 12 + c * bw + 2, 14 + row * 16, bw - 4, 12, { radius: 3 });
    }
    r.circle('weakEye', w * 0.55, h * 0.62, 7);
    r.rect('weakEye', w * 0.38, h - 22, w * 0.26, 9, { radius: 4.5 });
  },
};
