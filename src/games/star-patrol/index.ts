import type { GameDefinition } from '../../engine/api';
import { StarPatrol } from './game';

export const starPatrol: GameDefinition = {
  id: 'star-patrol',
  title: 'Star Patrol',
  blurb: 'Fly through the cave and stop the drifting diamonds. Watch for striped gates.',
  eyeRule:
    'The weaker eye sees the diamonds, the shield pickups, your shield count and the striped gate windows. The stronger eye sees your ship, your shots and the cave walls. Both eyes see the frame and the arrow. You need both eyes to steer and aim.',
  controls: [
    'Keyboard: up and down arrows (or W and S) to steer. Your ship fires by itself.',
    'Touch: press and hold, then slide up or down to steer.',
    'Gates: fly through the window whose stripes lean the way the arrow shows.',
  ],
  eyeMode: 'dichoptic',
  group: 'games',
  evidence: {
    badge: 'small',
    note: 'Copies action-game training with a task for the weaker eye built in (Vedamurthy 2015, a small supervised study in adults). Small pilots of action games in children (Gambacorta 2018) and a VR system in adults (Žiak 2017) also reported gains. Not tested as this app.',
  },
  touchButtons: [
    { action: 'up', label: '↑', name: 'Steer up', group: 'move' },
    { action: 'down', label: '↓', name: 'Steer down' },
  ],
  create: (ctx) => new StarPatrol(ctx),
  icon(r) {
    const w = r.width;
    const h = r.height;
    r.rect('both', 2, 2, w - 4, h - 4, { outline: 2, radius: 6, intensity: 0.5 });
    r.poly('fellowEye', [0, 0, w, 0, w, h * 0.16, w * 0.6, h * 0.22, w * 0.3, h * 0.14, 0, h * 0.2], { intensity: 0.7 });
    r.poly('fellowEye', [0, h, w, h, w, h * 0.82, w * 0.5, h * 0.78, 0, h * 0.86], { intensity: 0.7 });
    r.poly('fellowEye', [w * 0.32, h * 0.5, w * 0.16, h * 0.4, w * 0.2, h * 0.5, w * 0.16, h * 0.6]);
    for (const [x, y] of [[0.6, 0.38], [0.75, 0.6], [0.88, 0.45]]) {
      const s = h * 0.07;
      r.poly('weakEye', [w * x - s, h * y, w * x, h * y - s, w * x + s, h * y, w * x, h * y + s]);
    }
  },
};
