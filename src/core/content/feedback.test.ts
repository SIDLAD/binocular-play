import { describe, expect, it } from 'vitest';
import { feedbackIssueUrl, feedbackText, setupLines, MAX_FIELD, type Feedback } from './feedback';

const base: Feedback = { kind: 'problem', summary: 'Ring part is slow', what: 'It stutters.', game: 'Star Patrol', glasses: '', setup: 'Screen: 375 × 812' };

describe('feedback link', () => {
  it('opens the matching issue form with its fields filled in', () => {
    const url = new URL(feedbackIssueUrl(base));
    expect(url.origin + url.pathname).toBe('https://github.com/SIDLAD/binocular-play/issues/new');
    expect(url.searchParams.get('template')).toBe('problem.yml');
    expect(url.searchParams.get('title')).toBe('[Problem] Ring part is slow');
    expect(url.searchParams.get('what')).toBe('It stutters.');
    expect(url.searchParams.get('game')).toBe('Star Patrol');
    expect(url.searchParams.get('setup')).toBe('Screen: 375 × 812');
  });

  it('uses the glasses field on the colours form and no set-up on ideas', () => {
    const colours = new URL(feedbackIssueUrl({ ...base, kind: 'colours', glasses: 'red/blue plastic' }));
    expect(colours.searchParams.get('template')).toBe('colours.yml');
    expect(colours.searchParams.get('glasses')).toBe('red/blue plastic');
    expect(colours.searchParams.has('game')).toBe(false);
    const idea = new URL(feedbackIssueUrl({ ...base, kind: 'idea' }));
    expect(idea.searchParams.get('template')).toBe('idea.yml');
    expect(idea.searchParams.has('setup')).toBe(false);
  });

  it('falls back to the first line of the text for the title and caps long text', () => {
    const url = new URL(feedbackIssueUrl({ ...base, summary: '', what: `First line\n${'x'.repeat(5000)}` }));
    expect(url.searchParams.get('title')).toBe('[Problem] First line');
    expect(url.searchParams.get('what')!.length).toBe(MAX_FIELD);
    expect(feedbackIssueUrl({ ...base, what: 'y'.repeat(50000) }).length).toBeLessThan(8000);
  });

  it('plain text has everything and the place to report it', () => {
    const t = feedbackText(base);
    expect(t).toContain('Star Patrol');
    expect(t).toContain('It stutters.');
    expect(t).toContain('issues/new/choose');
  });

  it('set-up lines carry only device and glasses facts', () => {
    const s = setupLines({ glasses: 'Red / blue', background: 'dark', screen: '375 × 812', pixelRatio: 3, browser: 'Chrome 140 on Android', installed: false });
    expect(s).toContain('Red / blue');
    expect(s).toContain('375 × 812');
    expect(s).not.toMatch(/eye|name|age/i);
  });
});
