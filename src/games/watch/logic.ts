/**
 * Watch mode: a calm picture split between the eyes by soft blobs.
 *
 * Copies dichoptic movies (Birch lab, Jost 2022): the weak eye sees the picture inside a set
 * of soft blobs at full contrast, the strong eye sees the rest at reduced contrast, and the
 * blobs move to new places every 10 seconds. Here the change is a 1-second cross-fade, so
 * nothing ever flashes.
 */
import { randomBlobs, type BlobMask, type MaskBlob } from '../../engine/api';

export const CHANGE_EVERY_MS = 10_000;
export const FADE_MS = 1_000;

export class MaskTimer {
  private from: MaskBlob[];
  private to: MaskBlob[];
  private sinceChange = 0;
  changes = 0;

  constructor(private rng: () => number) {
    this.from = randomBlobs(rng);
    this.to = this.from;
  }

  update(dtMs: number): void {
    this.sinceChange += dtMs;
    if (this.sinceChange >= CHANGE_EVERY_MS) {
      this.from = this.to;
      this.to = randomBlobs(this.rng);
      this.sinceChange = 0;
      this.changes++;
    }
  }

  mask(): BlobMask {
    return { from: this.from, to: this.to, mix: this.from === this.to ? 1 : Math.min(1, this.sinceChange / FADE_MS) };
  }
}

/** The largest rectangle with this aspect ratio that fits inside w × h, centred. */
export function fitRect(w: number, h: number, aspect: number, margin: number): { x: number; y: number; w: number; h: number } {
  const aw = Math.max(1, w - margin * 2);
  const ah = Math.max(1, h - margin * 2);
  let rw = aw;
  let rh = rw / aspect;
  if (rh > ah) {
    rh = ah;
    rw = rh * aspect;
  }
  return { x: (w - rw) / 2, y: (h - rh) / 2, w: rw, h: rh };
}

export interface Fish {
  x: number;
  y: number;
  size: number;
  speed: number;
  dir: 1 | -1;
  bob: number;
}

export function makeFish(rng: () => number, n = 7): Fish[] {
  const out: Fish[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: rng(),
      y: 0.15 + rng() * 0.6,
      size: 0.04 + rng() * 0.05,
      speed: 0.012 + rng() * 0.02,
      dir: rng() < 0.5 ? 1 : -1,
      bob: rng() * Math.PI * 2,
    });
  }
  return out;
}

/** Moves the fish slowly (fractions of the picture per second), wrapping at the edges. */
export function swim(fish: Fish[], dtMs: number): void {
  const s = dtMs / 1000;
  for (const f of fish) {
    f.x += f.speed * f.dir * s;
    if (f.x > 1.15) f.x = -0.15;
    if (f.x < -0.15) f.x = 1.15;
    f.bob += s * 0.8;
  }
}
