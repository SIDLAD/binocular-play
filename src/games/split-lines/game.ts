import type { Game, GameContext, GameInput, GameStatus, Renderer, SavedProgress } from '../../engine/api';
import { MAX_FONT, MIN_FONT, PASSAGES, START_FONT, paginate, tokenise, type Page } from './logic';

/**
 * Who sees what:
 *   weak eye   – every other word
 *   strong eye – the words in between
 *   both       – the page frame, the title and the page number
 */
export class SplitLines implements Game {
  private w = 400;
  private h = 600;
  private font: number;
  private words: string[];
  private title: string;
  private pages: Page[] = [];
  private pageIndex = 0;
  private read = 0;
  private over = false;
  private dirty = true;

  constructor(private ctx: GameContext) {
    const s = ctx.saved ?? {};
    this.font = typeof s.font === 'number' ? Math.max(MIN_FONT, Math.min(MAX_FONT, s.font)) : START_FONT;
    if (ctx.mode === 'own' && ctx.text) {
      this.title = 'Your text';
      this.words = tokenise(ctx.text);
    } else {
      const next = typeof s.passage === 'number' ? s.passage : 0;
      const p = PASSAGES[((next % PASSAGES.length) + PASSAGES.length) % PASSAGES.length];
      this.title = p.title;
      this.words = tokenise(p.text);
    }
  }

  resize(width: number, height: number): void {
    this.w = width;
    this.h = height;
    this.dirty = true;
  }

  private margin(): number {
    return Math.max(16, this.w * 0.06);
  }

  private relayout(r: Renderer): void {
    if (!this.dirty) return;
    const first = this.pages[this.pageIndex]?.[0]?.[0]?.word;
    const m = this.margin();
    const lineH = this.font * 1.6;
    const lines = Math.max(1, Math.floor((this.h - 90) / lineH));
    this.pages = paginate(this.words, (s) => r.measure(s, { size: this.font }), this.w - 2 * m, lines);
    // Keep roughly the same place after a size change.
    if (first) {
      const at = this.pages.findIndex((p) => p.some((l) => l.some((w) => w.word === first)));
      this.pageIndex = at >= 0 ? at : Math.min(this.pageIndex, this.pages.length - 1);
    }
    this.pageIndex = Math.max(0, Math.min(this.pageIndex, this.pages.length - 1));
    this.dirty = false;
  }

  private turn(dir: 1 | -1): void {
    if (dir === 1) {
      if (this.pageIndex >= this.pages.length - 1) {
        this.read++;
        this.over = true;
        this.ctx.sound('level');
        return;
      }
      this.pageIndex++;
      this.read = Math.max(this.read, this.pageIndex);
      this.ctx.sound('tick');
    } else if (this.pageIndex > 0) this.pageIndex--;
  }

  private resizeFont(step: number): void {
    const next = Math.max(MIN_FONT, Math.min(MAX_FONT, this.font + step));
    if (next !== this.font) {
      this.font = next;
      this.dirty = true;
    }
  }

  input(e: GameInput): void {
    if (this.over) return;
    if (e.kind === 'action') {
      if (!e.pressed) return;
      if (e.action === 'right' || e.action === 'primary') this.turn(1);
      else if (e.action === 'left') this.turn(-1);
      else if (e.action === 'up') this.resizeFont(2);
      else if (e.action === 'down') this.resizeFont(-2);
      return;
    }
    if (e.kind === 'pointer' && e.phase === 'down') this.turn(e.x < this.w * 0.3 ? -1 : 1);
  }

  update(): void {}

  render(r: Renderer): void {
    r.clear();
    this.relayout(r);
    const m = this.margin();
    r.rect('both', m / 2, 8, this.w - m, this.h - 16, { outline: 2, radius: 10, intensity: 0.45 });
    r.text('both', this.title, m, 32, { size: 14, bold: true, intensity: 0.8 });
    r.text('both', `${this.pageIndex + 1} / ${Math.max(1, this.pages.length)}`, this.w - m, 32, { size: 13, align: 'right', intensity: 0.7 });
    const page = this.pages[this.pageIndex] ?? [];
    const lineH = this.font * 1.6;
    page.forEach((line, i) => {
      const y = 60 + lineH * (i + 0.5);
      for (const w of line) r.text(w.eye, w.word, m + w.x, y, { size: this.font });
    });
    r.text('both', this.pageIndex < this.pages.length - 1 ? 'Tap or → for the next page' : 'Tap or → to finish', this.w / 2, this.h - 24, { size: 12, align: 'center', intensity: 0.6 });
  }

  status(): GameStatus {
    return { score: this.read, level: 1, over: this.over };
  }

  save(): SavedProgress {
    const s = this.ctx.saved ?? {};
    const passage = typeof s.passage === 'number' ? s.passage : 0;
    // Finishing a built-in passage moves on to the next one next time.
    return { font: this.font, passage: this.ctx.mode !== 'own' && this.over ? passage + 1 : passage };
  }

  dispose(): void {}
}
