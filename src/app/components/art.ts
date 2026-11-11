import type { Vision } from '../../core/settings/schema';
import type { Channel, Renderer } from '../../engine/api';

/**
 * Small pictures drawn through the channels, so even the app's art follows calibration:
 * each face has one eye per channel and an outline both eyes can see.
 */
export function drawAvatar(r: Renderer, index: number): void {
  const s = Math.min(r.width, r.height);
  const cx = r.width / 2;
  const cy = r.height / 2;
  const u = s / 100;
  const variant = ((index % 8) + 8) % 8;
  const line = 5 * u;

  // Head
  if (variant % 4 === 1) r.rect('both', cx - 30 * u, cy - 28 * u, 60 * u, 60 * u, { outline: line, radius: 14 * u });
  else if (variant % 4 === 2) {
    r.poly('both', [cx, cy - 34 * u, cx + 34 * u, cy + 2 * u, cx + 20 * u, cy + 34 * u, cx - 20 * u, cy + 34 * u, cx - 34 * u, cy + 2 * u], { outline: line });
  } else if (variant % 4 === 3) {
    r.poly('both', [cx - 30 * u, cy - 20 * u, cx - 20 * u, cy - 40 * u, cx - 8 * u, cy - 26 * u, cx + 8 * u, cy - 26 * u, cx + 20 * u, cy - 40 * u, cx + 30 * u, cy - 20 * u, cx + 26 * u, cy + 30 * u, cx - 26 * u, cy + 30 * u], { outline: line });
  } else r.circle('both', cx, cy + 2 * u, 32 * u, { outline: line });

  // One eye per channel
  const eyeY = cy - 4 * u;
  const big = variant >= 4;
  if (big) {
    r.rect('weakEye', cx - 20 * u, eyeY - 7 * u, 14 * u, 14 * u, { radius: 3 * u });
    r.rect('fellowEye', cx + 6 * u, eyeY - 7 * u, 14 * u, 14 * u, { radius: 3 * u });
  } else {
    r.circle('weakEye', cx - 13 * u, eyeY, 7.5 * u);
    r.circle('fellowEye', cx + 13 * u, eyeY, 7.5 * u);
  }
  // Mouth
  r.line('both', cx - 10 * u, cy + 16 * u, cx + 10 * u, cy + 16 * u, 4 * u);
  if (variant % 2 === 0) {
    r.line('both', cx - 10 * u, cy + 16 * u, cx - 14 * u, cy + 12 * u, 4 * u);
    r.line('both', cx + 10 * u, cy + 16 * u, cx + 14 * u, cy + 12 * u, 4 * u);
  }
}

/** A pair of glasses seen from the front, as the player looks at someone wearing them. */
export function drawGlasses(r: Renderer, vision: Pick<Vision, 'redLensEye' | 'weakEye'>, highlight?: 'left' | 'right'): void {
  const w = r.width;
  const hgt = r.height;
  const lensW = w * 0.3;
  const lensH = hgt * 0.42;
  const y = hgt * 0.22;
  // The diagram is drawn from the wearer's point of view: their left eye is on the left.
  const channelFor = (eye: 'left' | 'right'): Channel => (eye === vision.weakEye ? 'weakEye' : 'fellowEye');
  const leftX = w * 0.12;
  const rightX = w * 0.58;
  r.rect(channelFor('left'), leftX, y, lensW, lensH, { radius: lensH * 0.3 });
  r.rect(channelFor('right'), rightX, y, lensW, lensH, { radius: lensH * 0.3 });
  r.rect('both', leftX, y, lensW, lensH, { radius: lensH * 0.3, outline: highlight === 'left' ? 7 : 3 });
  r.rect('both', rightX, y, lensW, lensH, { radius: lensH * 0.3, outline: highlight === 'right' ? 7 : 3 });
  r.line('both', leftX + lensW, y + lensH * 0.4, rightX, y + lensH * 0.4, 3);
  r.text('both', 'your LEFT eye', leftX + lensW / 2, hgt * 0.82, { size: Math.max(11, w * 0.042), align: 'center' });
  r.text('both', 'your RIGHT eye', rightX + lensW / 2, hgt * 0.82, { size: Math.max(11, w * 0.042), align: 'center' });
}

/** The standard preview: a weak-eye circle and a fellow-eye square that overlap, inside a frame for both eyes. */
export function drawPreview(r: Renderer): void {
  const w = r.width;
  const hgt = r.height;
  const m = Math.min(w, hgt) * 0.08;
  r.rect('both', m, m, w - 2 * m, hgt - 2 * m, { outline: 3, radius: 10 });
  const step = (w - 2 * m) / 8;
  for (let i = 1; i < 8; i++) {
    r.line('both', m + i * step, m, m + i * step, hgt - m, 1, { intensity: 0.25 });
  }
  const size = Math.min(w * 0.2, hgt * 0.3);
  const cy = hgt / 2;
  r.circle('weakEye', w * 0.36, cy, size);
  r.rect('fellowEye', w * 0.52, cy - size, size * 2, size * 2, { radius: 6 });
  r.rect('fellowEye', w * 0.3, cy - size * 0.35, size * 0.9, size * 0.7);
}
