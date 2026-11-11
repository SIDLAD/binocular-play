import type { Palette } from '../core/colour/palette';
import type { Game, GameContext, GameDefinition, GameInput, GameStatus } from './api';
import { bindKeyboard, bindPointer } from './input';
import { createLoop, type Loop } from './loop';
import { CanvasChannelRenderer, type Ctx2D } from './renderer';

export interface ShellPalette {
  readonly current: Palette;
  subscribe(fn: () => void): () => void;
}

export interface ShellCallbacks {
  /** Called for every fixed step of active (unpaused, not over) play. */
  onActiveTime(dtMs: number): void;
  /** Called after every step with the game's status. */
  onStatus(status: GameStatus): void;
}

/**
 * Owns one canvas and runs one game on it: sizing, the loop, keyboard and pointer input.
 * Every game gets pausing, resizing and live colours from here; a game is only rules and drawing.
 */
export class GameShell {
  private game: Game;
  private loop: Loop;
  private renderer: CanvasChannelRenderer | null;
  private ctx2d: CanvasRenderingContext2D | null;
  private cleanups: (() => void)[] = [];
  private width = 300;
  private height = 300;
  private disposed = false;
  private wasOver = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private def: GameDefinition,
    palette: ShellPalette,
    context: GameContext,
    private callbacks: ShellCallbacks,
  ) {
    let ctx: CanvasRenderingContext2D | null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    this.ctx2d = ctx;
    this.renderer = ctx ? new CanvasChannelRenderer(ctx as unknown as Ctx2D, palette, this.width, this.height) : null;
    this.game = def.create(context);
    this.loop = createLoop(
      (dt) => this.step(dt),
      () => this.renderOnce(),
    );

    const playing = () => this.loop.running && !this.wasOver;
    this.cleanups.push(bindKeyboard((e) => this.game.input(e), playing));
    this.cleanups.push(bindPointer(canvas, (e) => this.game.input(e), playing));
    // Hard rule 3: while paused, a colour change must still repaint the game behind the menu.
    this.cleanups.push(
      palette.subscribe(() => {
        if (!this.loop.running) this.renderOnce();
      }),
    );
    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    this.cleanups.push(() => window.removeEventListener('resize', onResize));
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      const observer = new ResizeObserver(onResize);
      observer.observe(canvas.parentElement);
      this.cleanups.push(() => observer.disconnect());
    }
    this.resize();
  }

  private step(dtMs: number): void {
    const before = this.game.status();
    if (before.over) {
      this.reportOver(before);
      return;
    }
    this.game.update(dtMs);
    this.callbacks.onActiveTime(dtMs);
    const status = this.game.status();
    this.callbacks.onStatus(status);
    if (status.over) this.reportOver(status);
  }

  private reportOver(status: GameStatus): void {
    if (this.wasOver) return;
    this.wasOver = true;
    this.loop.stop();
    this.renderOnce();
    this.callbacks.onStatus(status);
  }

  /** Fits the canvas to its parent and the screen's pixel density. */
  resize(): void {
    const parent = this.canvas.parentElement;
    const w = parent && parent.clientWidth > 0 ? parent.clientWidth : this.width;
    const h = parent && parent.clientHeight > 0 ? parent.clientHeight : this.height;
    const dpr = typeof window !== 'undefined' && window.devicePixelRatio > 0 ? Math.min(window.devicePixelRatio, 3) : 1;
    this.width = w;
    this.height = h;
    const pw = Math.max(1, Math.round(w * dpr));
    const ph = Math.max(1, Math.round(h * dpr));
    if (this.canvas.width !== pw) this.canvas.width = pw;
    if (this.canvas.height !== ph) this.canvas.height = ph;
    this.ctx2d?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.renderer?.setSize(w, h);
    this.game.resize(w, h);
    this.renderOnce();
  }

  renderOnce(): void {
    if (this.disposed || !this.renderer) return;
    this.game.render(this.renderer);
  }

  /** For on-screen buttons. */
  send(e: GameInput): void {
    if (this.loop.running && !this.wasOver) this.game.input(e);
  }

  /** Releases anything held, so a piece does not keep sliding after a pause. */
  private releaseAll(): void {
    for (const action of ['left', 'right', 'up', 'down', 'primary', 'secondary'] as const) {
      this.game.input({ kind: 'action', action, pressed: false });
    }
  }

  get running(): boolean {
    return this.loop.running;
  }

  get over(): boolean {
    return this.wasOver;
  }

  status(): GameStatus {
    return this.game.status();
  }

  start(): void {
    if (this.disposed || this.wasOver) return;
    this.loop.start();
  }

  pause(): void {
    if (!this.loop.running) return;
    this.loop.stop();
    this.releaseAll();
    this.renderOnce();
  }

  /** Throws the current game away and starts a new one on the same canvas. */
  restart(context: GameContext): void {
    this.loop.stop();
    this.game.dispose();
    this.game = this.def.create(context);
    this.wasOver = false;
    this.game.resize(this.width, this.height);
    this.renderOnce();
  }

  dispose(): void {
    if (this.disposed) return;
    this.loop.stop();
    this.disposed = true;
    for (const fn of this.cleanups.splice(0)) fn();
    this.game.dispose();
  }
}
