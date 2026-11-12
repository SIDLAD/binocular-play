import type { GameDefinition } from '../../engine/api';
import { DepthDuel } from './game';

export const depthDuel: GameDefinition = {
  id: 'depth-duel',
  title: 'Depth Duel',
  blurb: 'Two dotted squares. One floats a little nearer. Which one?',
  eyeRule:
    'Both eyes see both squares, each through its own lens, at full brightness. One eye’s copy of the nearer square is moved sideways by a pixel or two, which the brain turns into depth. Both eyes see the frames and the cross in the middle.',
  controls: [
    'Tap the square that looks nearer, or press the up or down arrow key.',
    'Look at the cross in the middle. If you see double, stop.',
  ],
  eyeMode: 'stereo',
  group: 'training',
  requiresNoEyeTurn: true,
  usesVisualAngle: true,
  evidence: {
    badge: 'small',
    note: 'Copies red-green anaglyph depth training (Xi 2014): in a small study of adults, depth perception improved a lot and acuity a little. A VR version (Vedamurthy 2016) found similar depth gains. Not offered to anyone who reported an eye turn or double vision.',
  },
  touchButtons: [
    { action: 'up', label: '↑', name: 'Top is nearer' },
    { action: 'down', label: '↓', name: 'Bottom is nearer' },
  ],
  create: (ctx) => new DepthDuel(ctx),
  icon(r) {
    const s = Math.min(r.width, r.height) * 0.3;
    const cx = r.width / 2;
    const draw = (cy: number, shift: number) => {
      r.rect('both', cx - s / 2 - 4, cy - s / 2 - 4, s + 8, s + 8, { outline: 2, radius: 4, intensity: 0.5 });
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const x = cx - s / 2 + (i + 0.3) * (s / 4);
          const y = cy - s / 2 + (j + 0.3) * (s / 4);
          r.rect('fellowEye', x, y, 4, 4);
          r.rect('weakEye', x + shift, y, 4, 4);
        }
      }
    };
    draw(r.height * 0.28, 3);
    draw(r.height * 0.72, 0);
  },
};
