import type { GameDefinition } from '../../engine/api';
import { LetterCrowd, drawLetter } from './game';

export const letterCrowd: GameDefinition = {
  id: 'letter-crowd',
  title: 'Letter Crowd',
  blurb: 'A letter flashes up, crowded by four others. Which one was in the middle?',
  eyeRule:
    'Only the weaker eye sees the letters. Both eyes see the frame and the answer buttons. The stronger eye sees nothing to play with, so this trains the weaker eye on its own.',
  controls: [
    'Tap the letter you saw, or type it on the keyboard.',
    'Keyboard: arrow keys to pick a button, space or Enter to answer.',
    'Look at the middle of the frame, between the four dots.',
  ],
  eyeMode: 'weakEyeOnly',
  group: 'training',
  blockLengths: { choices: [10, 25, 50], default: 50 },
  usesVisualAngle: true,
  evidence: {
    badge: 'small',
    note: 'Copies crowded-letter training (Hussain 2012; Chung 2012). In small studies of adults and older children, acuity improved and most of the gain was still there months later. A home browser version (Hussain 2014) also helped, but children lost interest after about a week.',
  },
  modes: [
    { id: 'classic', label: 'Classic', blurb: 'The middle letter shows for a moment. 50 letters, about 4 minutes.' },
    { id: 'relaxed', label: 'Relaxed', blurb: 'Bigger letters that stay until you answer.' },
  ],
  touchButtons: [],
  create: (ctx) => new LetterCrowd(ctx),
  icon(r) {
    const s = Math.min(r.width, r.height) * 0.22;
    const cx = r.width / 2;
    const cy = r.height / 2;
    r.rect('both', cx - s * 2.2, cy - s * 2, s * 4.4, s * 4, { outline: 2, radius: 6, intensity: 0.6 });
    drawLetter(r, 'weakEye', 'K', cx, cy, s);
    drawLetter(r, 'weakEye', 'O', cx - s * 1.5, cy, s);
    drawLetter(r, 'weakEye', 'Z', cx + s * 1.5, cy, s);
    drawLetter(r, 'weakEye', 'H', cx, cy - s * 1.3, s * 0.9);
    drawLetter(r, 'weakEye', 'S', cx, cy + s * 1.3, s * 0.9);
  },
};
