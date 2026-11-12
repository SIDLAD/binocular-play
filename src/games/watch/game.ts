import { CatchSchedule, type Game, type GameContext, type GameInput, type GameStatus, type Renderer, type SceneSource } from '../../engine/api';
import { MaskTimer, fitRect, makeFish, swim, type Fish } from './logic';

/** A five-point star centred on (x, y). */
export function starPoints(x: number, y: number, r: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  return pts;
}

/**
 * Who sees what:
 *   weak eye   – the picture inside the soft blobs, at full contrast, and the catch star
 *   strong eye – the rest of the picture, at the strong-eye brightness setting
 *   both       – the frame round the picture
 * Nothing needs pressing; the star is an optional check that the weak eye is taking part.
 */
export class Watch implements Game {
  private timer: MaskTimer;
  private fish: Fish[];
  private clock = 0;
  private catches: CatchSchedule;
  private star = { x: 0.5, y: 0.5 };
  private w = 300;
  private h = 300;
  private scene: SceneSource;

  constructor(private ctx: GameContext) {
    this.timer = new MaskTimer(ctx.rng);
    this.fish = makeFish(ctx.rng);
    this.catches = new CatchSchedule(ctx.rng);
    this.scene = { kind: 'scene', id: 'quiet-reef', draw: (r) => this.drawReef(r) };
  }

  private get usingVideo(): boolean {
    return this.ctx.mode === 'video' && this.ctx.media !== null;
  }

  resize(width: number, height: number): void {
    this.w = width;
    this.h = height;
  }

  private picture() {
    const media = this.ctx.media;
    const aspect = this.usingVideo && media && media.aspect > 0 ? media.aspect : 16 / 9;
    return fitRect(this.w, this.h, aspect, 14);
  }

  input(e: GameInput): void {
    if (!this.catches.active) return;
    if (e.kind === 'action' && e.pressed && (e.action === 'primary' || e.action === 'secondary')) {
      this.catchStar();
      return;
    }
    if (e.kind === 'pointer' && e.phase === 'down') {
      const p = this.picture();
      const sx = p.x + this.star.x * p.w;
      const sy = p.y + this.star.y * p.h;
      const reach = Math.max(44, Math.min(p.w, p.h) * 0.12);
      if (Math.hypot(e.x - sx, e.y - sy) <= reach) this.catchStar();
    }
  }

  private catchStar(): void {
    if (this.catches.catch()) this.ctx.sound('good');
  }

  update(dtMs: number): void {
    this.clock += dtMs;
    this.timer.update(dtMs);
    swim(this.fish, dtMs);
    if (this.catches.update(dtMs) === 'show') {
      this.star = { x: 0.15 + this.ctx.rng() * 0.7, y: 0.15 + this.ctx.rng() * 0.7 };
    }
  }

  /** The Quiet Reef, drawn as brightness only (the play screen splits it between the eyes). */
  private drawReef(r: Renderer): void {
    const w = r.width;
    const h = r.height;
    const t = this.clock / 1000;
    // Water: gentle bands, darker with depth.
    for (let i = 0; i < 6; i++) r.rect('both', 0, (i * h) / 6, w, h / 6 + 1, { intensity: 0.32 - i * 0.04 });
    // Slow light rays from the surface.
    for (let i = 0; i < 4; i++) {
      const x = ((i + 0.5) / 4) * w + Math.sin(t * 0.15 + i) * w * 0.04;
      r.poly('both', [x - w * 0.02, 0, x + w * 0.02, 0, x + w * 0.09, h, x - w * 0.03, h], { intensity: 0.12 });
    }
    // Sand.
    r.poly('both', [0, h * 0.86, w * 0.3, h * 0.82, w * 0.7, h * 0.88, w, h * 0.84, w, h, 0, h], { intensity: 0.55 });
    // Swaying plants.
    for (let i = 0; i < 7; i++) {
      const bx = ((i + 0.4) / 7) * w;
      const sway = Math.sin(t * 0.5 + i * 1.3) * w * 0.02;
      const top = h * (0.45 + (i % 3) * 0.08);
      r.poly('both', [bx - w * 0.012, h * 0.88, bx + w * 0.012, h * 0.88, bx + sway + w * 0.006, top, bx + sway - w * 0.006, top], { intensity: 0.75 });
    }
    // Fish.
    for (const f of this.fish) {
      const x = f.x * w;
      const y = (f.y + Math.sin(f.bob) * 0.01) * h;
      const s = f.size * Math.min(w, h) * 1.6;
      r.group({ x, y, scale: 1 }, () => {
        r.poly('both', [-s * f.dir, 0, -s * 0.2 * f.dir, -s * 0.45, s * 0.6 * f.dir, 0, -s * 0.2 * f.dir, s * 0.45], { intensity: 0.95 });
        r.poly('both', [-s * f.dir, 0, -s * 1.45 * f.dir, -s * 0.35, -s * 1.45 * f.dir, s * 0.35], { intensity: 0.8 });
      });
    }
    // Bubbles.
    for (let i = 0; i < 6; i++) {
      const by = h - (((t * 0.04 + i / 6) % 1) * h);
      r.circle('both', ((i * 0.37 + 0.1) % 1) * w, by, Math.max(2, w * 0.006), { intensity: 0.7 });
    }
  }

  render(r: Renderer): void {
    r.clear();
    const p = this.picture();
    const mask = this.timer.mask();
    if (this.ctx.mode === 'video' && !this.usingVideo) {
      r.text('both', 'Choose a video to start.', this.w / 2, this.h / 2, { align: 'center', size: 16 });
      r.circle('weakEye', this.w / 2 - 20, this.h / 2 + 40, 5);
      r.circle('fellowEye', this.w / 2 + 20, this.h / 2 + 40, 5);
      return;
    }
    const src = this.usingVideo && this.ctx.media ? this.ctx.media : this.scene;
    if (src.kind === 'media' && !src.ready()) {
      r.text('both', 'Loading the video…', this.w / 2, this.h / 2, { align: 'center', size: 16 });
    }
    r.image('weakEye', src, p.x, p.y, p.w, p.h, mask, 'inside');
    r.image('fellowEye', src, p.x, p.y, p.w, p.h, mask, 'outside');
    r.rect('both', p.x - 6, p.y - 6, p.w + 12, p.h + 12, { outline: 3, radius: 10, intensity: 0.7 });
    if (this.catches.active) {
      // Fades in over half a second; well under three changes a second.
      const fade = Math.min(1, this.catches.progress * 10);
      const s = Math.max(18, Math.min(p.w, p.h) * 0.06);
      r.poly('weakEye', starPoints(p.x + this.star.x * p.w, p.y + this.star.y * p.h, s), { intensity: fade });
    }
  }

  status(): GameStatus {
    const c = this.catches.stats();
    return {
      score: c.caught,
      level: 1,
      over: false,
      catches: c,
      targetMet: c.shown >= 2 ? c.caught / c.shown >= 0.5 : undefined,
    };
  }

  dispose(): void {}
}
