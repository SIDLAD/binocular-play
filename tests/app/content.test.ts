import { describe, expect, it } from 'vitest';
import * as evidence from '../../src/core/content/evidence';

const sources = import.meta.glob(['/src/app/**/*.ts', '/src/core/content/**/*.ts', '/src/games/**/*.ts', '/index.html'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('copy rules', () => {
  it('never uses the word "cure"', () => {
    const offenders = Object.entries(sources)
      .filter(([, text]) => /\bcure[sd]?\b/i.test(text))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });

  it('never says the app treats, heals or fixes anything', () => {
    const claim = /\b(this app|binocular play|these games|the games?)\b[^.\n]{0,40}\b(treats?|heals?|fix(es)?|improves? (your )?vision|will improve)\b/i;
    const offenders = Object.entries(sources)
      .filter(([, text]) => claim.test(text))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });

  it('says plainly that the app itself is untested and not a medical device', () => {
    const summary = evidence.SUMMARY.join(' ');
    expect(summary).toContain('never been tested in a trial');
    expect(summary).toContain('not a medical device');
    expect(summary).toContain('not been shown to be better than patching');
  });

  it('every evidence item has at least one https source', () => {
    const items = [...evidence.POSITIVE, ...evidence.NEGATIVE, evidence.LESSON, evidence.ADULTS, evidence.SAFETY_POINTS];
    expect(evidence.NEGATIVE.length).toBeGreaterThanOrEqual(3);
    for (const item of items) {
      expect(item.sources.length, item.title).toBeGreaterThan(0);
      for (const s of item.sources) expect(s.url).toMatch(/^https:\/\//);
    }
    for (const t of evidence.TREATMENTS) expect(t.sources.length, t.name).toBeGreaterThan(0);
  });

  it('the app makes no network requests of its own', () => {
    const offenders = Object.entries(sources)
      .filter(([file]) => file !== '/index.html')
      .filter(([, text]) => /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|document\.cookie/.test(text))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });
});
