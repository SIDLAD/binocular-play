import type { GameDefinition } from '../../engine/api';
import { Watch, starPoints } from './game';

export const watch: GameDefinition = {
  id: 'watch',
  title: 'Watch',
  blurb: 'Sit back and watch a quiet reef, or a video of your own. Tap the star when you see it.',
  eyeRule:
    'The picture is split by soft, slowly moving patches. The weaker eye sees inside the patches at full brightness; the stronger eye sees the rest, dimmed by the strong-eye brightness setting. Together the eyes see the whole picture. Only the weaker eye sees the star.',
  controls: [
    'Nothing to press. Every so often a star appears: tap it (or press space) to show the weaker eye is joining in.',
    'Your own video: pick a file from this device. It is not uploaded and not saved.',
  ],
  eyeMode: 'dichoptic',
  group: 'watch',
  passive: true,
  evidence: {
    badge: 'trial',
    note: 'Copies dichoptic movies (Birch lab, Jost 2022) and the idea behind Luminopia, whose randomized trial in children aged 4–7 was positive (Xiao 2022). In trials, watching was easier to stick with than games. This app itself is untested.',
  },
  modes: [
    { id: 'reef', label: 'Quiet Reef', blurb: 'A slow underwater scene, built in.' },
    { id: 'video', label: 'Your own video', blurb: 'A video file from this device. Nothing is uploaded.', needsVideo: true },
  ],
  touchButtons: [],
  create: (ctx) => new Watch(ctx),
  icon(r) {
    const w = r.width;
    const h = r.height;
    r.rect('both', w * 0.08, h * 0.12, w * 0.84, h * 0.76, { outline: 2, radius: 8, intensity: 0.7 });
    r.circle('weakEye', w * 0.35, h * 0.45, h * 0.22, { intensity: 0.8 });
    r.circle('fellowEye', w * 0.62, h * 0.55, h * 0.22, { intensity: 0.8 });
    r.poly('weakEye', starPoints(w * 0.8, h * 0.28, h * 0.09));
  },
};
