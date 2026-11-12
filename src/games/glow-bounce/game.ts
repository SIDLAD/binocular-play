import type { Game, GameContext, GameInput, GameStatus, Renderer, SavedProgress } from '../../engine/api';
import { AUTO_LAUNCH_MS, BRICK_FADE_MS, COLS, LIVES, afterClearedWall, afterLostBall, layout, paddleBounce, type Tuning } from './logic';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0 = standing; counts down while it fades out after a hit. */
  fading: number;
  gone: boolean;
}

/**
 * Who sees what:
 *   weak eye   – the ball, the paddle and the lives left
 *   strong eye – the bricks
 *   both       – the walls
 */
export class GlowBounce implements Game {
  private w = 400;
  private h = 600;
  private tuning: Tuning;
  private bricks: Brick[] = [];
  private wall = 0;
  private paddleX = 0.5;
  private ball = { x: 0, y: 0, vx: 0, vy: 0, stuck: true };
  private stuckMs = 0;
  private held = { left: false, right: false };
  private pointerX: number | null = null;
  private lives = LIVES;
  private score = 0;
  private broken = 0;
  private over = false;

  constructor(private ctx: GameContext) {
    const s = ctx.saved ?? {};
    this.tuning = {
      speed: typeof s.speed === 'number' ? s.speed : 1,
      width: typeof s.width === 'number' ? s.width : 1,
    };
  }

  private field() {
    const m = 10;
    const top = 30;
    return { left: m, right: this.w - m, top, bottom: this.h - 8 };
  }

  private paddle() {
    const f = this.field();
    const pw = (f.right - f.left) * 0.2 * this.tuning.width;
    const ph = Math.max(10, this.h * 0.018);
    const x = f.left + this.paddleX * (f.right - f.left - pw);
    return { x, y: f.bottom - ph - 18, w: pw, h: ph };
  }

  private ballR(): number {
    return Math.max(6, Math.min(this.w, this.h) * 0.016);
  }

  private speedPx(): number {
    return this.h * 0.55 * this.tuning.speed;
  }

  private buildWall(): void {
    const f = this.field();
    const grid = layout(this.wall);
    const gap = 4;
    const bw = (f.right - f.left - gap * (COLS + 1)) / COLS;
    const bh = Math.max(12, Math.min(26, this.h * 0.035));
    this.bricks = [];
    grid.forEach((row, r) =>
      row.forEach((on, c) => {
        if (on) this.bricks.push({ x: f.left + gap + c * (bw + gap), y: f.top + 30 + r * (bh + gap), w: bw, h: bh, fading: 0, gone: false });
      }),
    );
  }

  resize(width: number, height: number): void {
    const first = this.bricks.length === 0;
    const sx = width / this.w;
    const sy = height / this.h;
    this.w = width;
    this.h = height;
    if (first) this.buildWall();
    else {
      for (const b of this.bricks) {
        b.x *= sx;
        b.w *= sx;
        b.y *= sy;
        b.h *= sy;
      }
      this.ball.x *= sx;
      this.ball.y *= sy;
    }
    if (this.ball.stuck) this.placeOnPaddle();
  }

  private placeOnPaddle(): void {
    const p = this.paddle();
    this.ball = { x: p.x + p.w / 2, y: p.y - this.ballR() - 1, vx: 0, vy: 0, stuck: true };
    this.stuckMs = 0;
  }

  private launch(): void {
    if (!this.ball.stuck) return;
    const v = paddleBounce((this.ctx.rng() - 0.5) * 0.6, this.speedPx());
    this.ball = { ...this.ball, vx: v.vx, vy: v.vy, stuck: false };
  }

  input(e: GameInput): void {
    if (this.over) return;
    if (e.kind === 'action') {
      if (e.action === 'left') this.held.left = e.pressed;
      if (e.action === 'right') this.held.right = e.pressed;
      if (e.pressed && (e.action === 'primary' || e.action === 'up')) this.launch();
      if (e.pressed && (e.action === 'left' || e.action === 'right')) this.pointerX = null;
      return;
    }
    if (e.kind === 'pointer') {
      if (e.phase === 'up') {
        this.launch();
        return;
      }
      this.pointerX = e.x;
    }
  }

  update(dtMs: number): void {
    if (this.over) return;
    const s = dtMs / 1000;
    const f = this.field();
    // Paddle.
    const p0 = this.paddle();
    const span = f.right - f.left - p0.w;
    if (this.pointerX !== null && span > 0) {
      const want = (this.pointerX - f.left - p0.w / 2) / span;
      const d = want - this.paddleX;
      this.paddleX += Math.sign(d) * Math.min(Math.abs(d), 2.5 * s);
    } else {
      if (this.held.left) this.paddleX -= 1.1 * s;
      if (this.held.right) this.paddleX += 1.1 * s;
    }
    this.paddleX = Math.max(0, Math.min(1, this.paddleX));

    for (const b of this.bricks) {
      if (b.fading > 0) {
        b.fading -= dtMs;
        if (b.fading <= 0) b.gone = true;
      }
    }
    this.bricks = this.bricks.filter((b) => !b.gone);

    if (this.ball.stuck) {
      this.placeOnPaddle();
      this.stuckMs += dtMs;
      if (this.stuckMs >= AUTO_LAUNCH_MS) this.launch();
      return;
    }
    // Move in small steps so a fast ball never skips through a brick.
    const steps = Math.max(1, Math.ceil((Math.hypot(this.ball.vx, this.ball.vy) * s) / (this.ballR() * 0.5)));
    for (let i = 0; i < steps && !this.ball.stuck; i++) this.stepBall(s / steps);

    if (this.bricks.length > 0 && this.bricks.every((b) => b.fading > 0)) {
      this.wall++;
      this.tuning = afterClearedWall(this.tuning);
      this.ctx.sound('level');
      this.buildWall();
      this.placeOnPaddle();
    }
  }

  private stepBall(s: number): void {
    const f = this.field();
    const b = this.ball;
    const r = this.ballR();
    b.x += b.vx * s;
    b.y += b.vy * s;
    if (b.x - r < f.left) {
      b.x = f.left + r;
      b.vx = Math.abs(b.vx);
    }
    if (b.x + r > f.right) {
      b.x = f.right - r;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y - r < f.top) {
      b.y = f.top + r;
      b.vy = Math.abs(b.vy);
    }
    const p = this.paddle();
    if (b.vy > 0 && b.y + r >= p.y && b.y - r <= p.y + p.h && b.x >= p.x - r && b.x <= p.x + p.w + r) {
      const v = paddleBounce(((b.x - (p.x + p.w / 2)) / (p.w / 2)) * 0.9, this.speedPx());
      b.vx = v.vx;
      b.vy = v.vy;
      b.y = p.y - r;
      this.ctx.sound('tick');
    }
    for (const br of this.bricks) {
      if (br.fading > 0) continue;
      const cx = Math.max(br.x, Math.min(b.x, br.x + br.w));
      const cy = Math.max(br.y, Math.min(b.y, br.y + br.h));
      if (Math.hypot(b.x - cx, b.y - cy) <= r) {
        br.fading = BRICK_FADE_MS;
        this.broken++;
        this.score += 10;
        this.ctx.sound('good');
        const fromSide = cx === br.x || cx === br.x + br.w;
        if (fromSide && cy !== br.y && cy !== br.y + br.h) b.vx = -b.vx;
        else b.vy = -b.vy;
        break;
      }
    }
    if (b.y - r > f.bottom) {
      this.lives--;
      this.ctx.sound('bad');
      this.tuning = afterLostBall(this.tuning);
      if (this.lives <= 0) this.over = true;
      else this.placeOnPaddle();
    }
  }

  render(r: Renderer): void {
    r.clear();
    const f = this.field();
    r.line('both', f.left, f.bottom, f.left, f.top, 3, { intensity: 0.6 });
    r.line('both', f.left, f.top, f.right, f.top, 3, { intensity: 0.6 });
    r.line('both', f.right, f.top, f.right, f.bottom, 3, { intensity: 0.6 });
    for (const b of this.bricks) {
      r.rect('fellowEye', b.x, b.y, b.w, b.h, { radius: 4, intensity: b.fading > 0 ? b.fading / BRICK_FADE_MS : 1 });
    }
    const p = this.paddle();
    r.rect('weakEye', p.x, p.y, p.w, p.h, { radius: p.h / 2 });
    r.circle('weakEye', this.ball.x, this.ball.y, this.ballR());
    for (let i = 0; i < LIVES; i++) r.circle('weakEye', f.left + 12 + i * 18, 15, 6, i < this.lives ? undefined : { outline: 1.5, intensity: 0.5 });
    if (this.ball.stuck && !this.over) r.text('both', 'Tap or press space to launch', this.w / 2, p.y - 40, { align: 'center', size: 14, intensity: 0.8 });
  }

  status(): GameStatus {
    return {
      score: this.score,
      level: this.wall + 1,
      over: this.over,
      targetMet: this.over ? this.broken >= 15 : undefined,
    };
  }

  save(): SavedProgress {
    return { speed: this.tuning.speed, width: this.tuning.width };
  }

  dispose(): void {}
}
