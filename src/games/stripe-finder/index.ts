import type { GameDefinition } from '../../engine/api';
import { StripeFinder } from './game';

export const stripeFinder: GameDefinition = {
  id: 'stripe-finder',
  title: 'Stripe Finder',
  blurb: 'Faint stripes appear for a moment. Do they lean left or right?',
  eyeRule:
    'Only the weaker eye sees the stripes. Both eyes see the ring and the arrows. In Push mode the stronger eye also sees a patch of grey noise over the stripes, so the weaker eye has to work through it.',
  controls: [
    'Tap the left or right half of the screen, or use the left and right arrow keys.',
    'Look at the middle of the ring.',
    'The first round finds how fine the stripes should be. After that the stripes get fainter as you get them right.',
  ],
  eyeMode: 'weakEyeOnly',
  group: 'training',
  blockLengths: { choices: [10, 30, 60], default: 60 },
  usesVisualAngle: true,
  evidence: {
    badge: 'small',
    note: 'Copies training with faint stripes at the finest size you can just see (Huang 2008; Zhou 2006). Small, mostly uncontrolled studies in adults and older children reported better contrast sensitivity and acuity. Push mode follows a dichoptic version (Liu 2020).',
  },
  modes: [
    { id: 'weak', label: 'Weaker eye only', blurb: '60 stripes, about 3 minutes.' },
    {
      id: 'push',
      label: 'Push',
      blurb: 'The stronger eye sees noise over the stripes. Hidden if an eye turns or there has been double vision.',
      riskyWithEyeTurn: true,
    },
  ],
  touchButtons: [
    { action: 'left', label: '↖', name: 'Leans left' },
    { action: 'right', label: '↗', name: 'Leans right' },
  ],
  create: (ctx) => new StripeFinder(ctx),
  icon(r) {
    const cx = r.width / 2;
    const cy = r.height / 2;
    const s = Math.min(r.width, r.height) * 0.42;
    r.circle('both', cx, cy, s, { outline: 2, intensity: 0.6 });
    r.group({ x: cx, y: cy, rotate: Math.PI / 4 }, () => {
      for (let i = -3; i <= 3; i++) r.rect('weakEye', i * s * 0.24 - s * 0.06, -s * 0.75, s * 0.12, s * 1.5, { intensity: 0.8 });
    });
  },
};
