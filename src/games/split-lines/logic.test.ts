import { describe, expect, it } from 'vitest';
import { testGameContext } from '../../engine/api';
import { SplitLines } from './game';
import { PASSAGES, paginate, tokenise } from './logic';

const measure = (s: string) => s.length * 10;

describe('Split Lines rules', () => {
  it('keeps paragraph breaks', () => {
    expect(tokenise('one two\n\nthree')).toEqual(['one', 'two', '\n', 'three']);
  });

  it('every word appears once, in order, and the eyes alternate word by word', () => {
    const words = tokenise(PASSAGES[0].text);
    const pages = paginate(words, measure, 300, 8);
    const placed = pages.flat(2);
    expect(placed.map((p) => p.word)).toEqual(words.filter((w) => w !== '\n'));
    placed.forEach((p, i) => expect(p.eye).toBe(i % 2 === 0 ? 'weakEye' : 'fellowEye'));
  });

  it('lines fit the width and pages fit the height', () => {
    const pages = paginate(tokenise(PASSAGES[1].text), measure, 250, 6);
    for (const page of pages) {
      expect(page.length).toBeLessThanOrEqual(6);
      for (const line of page) {
        if (line.length === 0) continue;
        const last = line[line.length - 1];
        // A single long word may overflow; otherwise every line fits.
        if (line.length > 1) expect(last.x + measure(last.word)).toBeLessThanOrEqual(250);
      }
    }
  });

  it('pasted text is used in "own" mode, and finishing a built-in passage moves to the next', () => {
    const own = new SplitLines(testGameContext({ mode: 'own', text: 'Hello there reader' }));
    expect((own as unknown as { words: string[] }).words).toEqual(['Hello', 'there', 'reader']);
    const g = new SplitLines(testGameContext({ mode: 'passage', saved: { passage: 1 } }));
    expect((g as unknown as { title: string }).title).toBe(PASSAGES[1].title);
  });
});
