// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { gamesFor } from '../../src/app/gameList';
import { visibleModes } from '../../src/app/screens/play';
import { activeSecondsOnDay, makeRecord, weekSummary, weekStreak } from '../../src/core/progress/sessionLog';
import { localDay } from '../../src/core/safety/guards';
import { sanitizeAppData } from '../../src/core/settings/migrate';
import { createProfile, type Profile } from '../../src/core/settings/schema';
import type { Game, GameDefinition } from '../../src/engine/api';
import { GameShell, IDLE_AFTER_MS } from '../../src/engine/shell';
import { testContext } from '../../src/engine/testing/context';
import { NEUTRAL_PALETTE } from '../../src/core/colour/palette';
import { NOW, addReadyProfile, byTestId, click, startApp, type TestApp } from './helpers';

let t: TestApp | null = null;
afterEach(() => {
  t?.app.dispose();
  t = null;
});

function def(over: Partial<GameDefinition> = {}): GameDefinition {
  return {
    id: 'x',
    title: 'X',
    blurb: '',
    eyeRule: '',
    controls: [],
    eyeMode: 'dichoptic',
    group: 'games',
    evidence: { badge: 'untested', note: '' },
    touchButtons: [],
    icon: () => {},
    create: (): Game => ({
      resize() {},
      input() {},
      update() {},
      render() {},
      status: () => ({ score: 0, level: 1, over: false }),
      dispose() {},
    }),
    ...over,
  };
}

function screened(eyeTurn: boolean | null, everDouble: boolean | null): Profile {
  const p = createProfile({ name: 'A', kind: 'adult', now: NOW });
  p.onboarding.screening = { eyeTurn, everDouble, clinicianOk: true, parentConfirmedAt: null };
  return p;
}

describe('requiresNoEyeTurn', () => {
  const depth = def({ id: 'depth', requiresNoEyeTurn: true });
  const plain = def({ id: 'plain' });

  it('hides the game after "eye turn", "double vision", "not sure" or no answer', () => {
    for (const [a, b] of [
      [true, false],
      [false, true],
      [null, false],
    ] as const) {
      expect(gamesFor(screened(a, b), [depth, plain]).map((g) => g.id)).toEqual(['plain']);
    }
    expect(gamesFor(null, [depth, plain]).map((g) => g.id)).toEqual(['plain']);
  });

  it('shows it after two clear "no" answers', () => {
    expect(gamesFor(screened(false, false), [depth, plain]).map((g) => g.id)).toEqual(['depth', 'plain']);
  });

  it('hides risky modes the same way', () => {
    const g = def({ modes: [{ id: 'a', label: 'A', blurb: '' }, { id: 'push', label: 'Push', blurb: '', riskyWithEyeTurn: true }] });
    expect(visibleModes(g, screened(true, false)).map((m) => m.id)).toEqual(['a']);
    expect(visibleModes(g, screened(false, false)).map((m) => m.id)).toEqual(['a', 'push']);
  });
});

describe('active minutes', () => {
  it('stop counting after 10 s with no input, and start again on input', () => {
    document.body.innerHTML = '<div><canvas></canvas></div>';
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    let active = 0;
    let total = 0;
    const shell = new GameShell(canvas, def(), { current: NEUTRAL_PALETTE, subscribe: () => () => {} }, testContext(), {
      onActiveTime(dt, isActive) {
        total += dt;
        if (isActive) active += dt;
      },
      onStatus() {},
    });
    const step = (ms: number) => {
      for (let i = 0; i < ms / 100; i++) (shell as unknown as { step(dt: number): void }).step(100);
    };
    shell.start();
    step(30_000);
    expect(total).toBe(30_000);
    expect(active).toBe(IDLE_AFTER_MS);
    shell.send({ kind: 'action', action: 'left', pressed: true });
    step(5_000);
    expect(active).toBe(IDLE_AFTER_MS + 5_000);
    shell.dispose();
  });

  it('passive games count idle time as active', () => {
    document.body.innerHTML = '<div><canvas></canvas></div>';
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    let active = 0;
    const shell = new GameShell(canvas, def({ passive: true }), { current: NEUTRAL_PALETTE, subscribe: () => () => {} }, testContext(), {
      onActiveTime(dt, isActive) {
        if (isActive) active += dt;
      },
      onStatus() {},
    });
    shell.start();
    for (let i = 0; i < 300; i++) (shell as unknown as { step(dt: number): void }).step(100);
    expect(active).toBe(30_000);
    shell.dispose();
  });

  it('the log keeps active seconds, catches and trials, never more than the totals', () => {
    const r = makeRecord({
      gameId: 'x',
      seconds: 100,
      activeSeconds: 160,
      score: 1,
      level: 1,
      fellowContrast: 0.5,
      endedBy: 'quit',
      now: NOW,
      catches: { shown: 4, caught: 9 },
      trials: { done: 50, correct: 40 },
    });
    expect(r.activeSeconds).toBe(100);
    expect(r.catchCaught).toBe(4);
    expect(r.trialsCorrect).toBe(40);
  });

  it('weekly summary and streak use active minutes against the goal', () => {
    const p = createProfile({ name: 'A', kind: 'child', now: NOW });
    p.goal = { daysPerWeek: 2, minutesPerDay: 10 };
    const rec = (d: Date, active: number) =>
      p.progress.sessions.push(makeRecord({ gameId: 'x', seconds: active, activeSeconds: active, score: 0, level: 1, fellowContrast: 1, endedBy: 'quit', now: d }));
    // NOW is Wednesday 11 Nov 2026.
    rec(new Date(2026, 10, 9, 10), 600);
    rec(new Date(2026, 10, 10, 10), 700);
    rec(new Date(2026, 10, 11, 10), 100);
    rec(new Date(2026, 10, 3, 10), 900);
    rec(new Date(2026, 10, 4, 10), 900);
    const w = weekSummary(p, NOW);
    expect(w.start).toBe('2026-11-09');
    expect(w.goalDays).toBe(2);
    expect(w.playDays).toBe(3);
    expect(w.activeMinutes).toBe(Math.round(1400 / 60));
    expect(weekStreak(p, NOW)).toBe(2);
    expect(activeSecondsOnDay(p, localDay(NOW))).toBe(100);
  });
});

describe('stored data', () => {
  it('old files without the new fields load with safe defaults', () => {
    const data = sanitizeAppData({
      deviceId: 'd',
      profiles: [{ id: 'p', progress: { sessions: [{ date: NOW.toISOString(), gameId: 'x', seconds: 90 }] } }],
    });
    const p = data.profiles[0];
    expect(data.device.display).toBeNull();
    expect(p.autoContrast).toMatchObject({ enabled: false, hold: false, balanceMax: null, log: [] });
    expect(p.gameProgress).toEqual({});
    expect(p.goal).toEqual({ daysPerWeek: 5, minutesPerDay: 20 });
    expect(p.progress.sessions[0].activeSeconds).toBe(90);
  });

  it('game progress keeps numbers only', () => {
    const data = sanitizeAppData({ profiles: [{ id: 'p', gameProgress: { g: { level: 3, bad: 'x', inf: Infinity } } }] });
    expect(data.profiles[0].gameProgress).toEqual({ g: { level: 3 } });
  });
});

describe('screen-size check and balance check', () => {
  it('saves the display check per device', () => {
    t = startApp({ path: '#/display' });
    addReadyProfile(t.app, 'adult');
    t.app.navigate('/display');
    click(byTestId(t.root, 'save-display'));
    const d = t.app.store.data.device.display;
    expect(d?.checkedAt).toBe(NOW.toISOString());
    expect(d?.pxPerMm).toBeGreaterThan(1);
    expect(d?.viewingDistanceCm).toBeGreaterThanOrEqual(20);
  });

  it('the balance check sets the ceiling for the slow rise and logs it', () => {
    t = startApp();
    addReadyProfile(t.app, 'adult');
    t.app.store.updateActive((p) => {
      p.fellowContrast = 0.4;
    });
    t.app.navigate('/balance');
    click(byTestId(t.root, 'save-balance'));
    const p = t.app.store.activeProfile;
    expect(p?.autoContrast.balanceMax).toBe(0.4);
    expect(p?.autoContrast.log.at(-1)?.reason).toBe('balance-check');
  });
});

describe('Depth Duel and eye turns, in the real app', () => {
  it('is on home and playable after two clear "no" answers', () => {
    t = startApp();
    addReadyProfile(t.app, 'adult');
    t.app.navigate('/');
    expect(t.root.querySelector('[data-testid="tile-depth-duel"]')).not.toBeNull();
  });

  it('is hidden on home and switched off on its route after an eye-turn answer', () => {
    t = startApp();
    const id = addReadyProfile(t.app, 'adult');
    t.app.store.updateProfile(id, (p) => {
      p.onboarding.screening.eyeTurn = true;
      p.onboarding.screening.parentConfirmedAt = NOW.toISOString();
    });
    t.app.navigate('/');
    expect(t.root.querySelector('[data-testid="tile-depth-duel"]')).toBeNull();
    expect(t.root.querySelector('[data-testid="tile-letter-crowd"]')).not.toBeNull();
    t.app.session.passCheck(id, NOW.getTime());
    t.app.navigate('/play/depth-duel');
    expect(byTestId(t.root, 'hidden-for-eye-turn').textContent).toContain('switched off');
  });
});

describe('home: motivation and grouping (3c)', () => {
  it('today’s pick changes from day to day and stays the same all day', async () => {
    const { todaysPick } = await import('../../src/app/gameList');
    const { GAMES } = await import('../../src/games/registry');
    const a = todaysPick(GAMES, new Date(2026, 10, 12, 8));
    const b = todaysPick(GAMES, new Date(2026, 10, 12, 22));
    const c = todaysPick(GAMES, new Date(2026, 10, 13, 8));
    expect(a?.id).toBe(b?.id);
    expect(a?.id).not.toBe(c?.id);
    const seen = new Set<string>();
    for (let d = 0; d < GAMES.length; d++) seen.add(todaysPick(GAMES, new Date(2026, 10, 1 + d, 12))?.id ?? '');
    expect(seen.size).toBe(GAMES.length);
  });

  it('home shows the groups, today’s pick, the weekly goal and tile badges', () => {
    t = startApp();
    addReadyProfile(t.app, 'adult');
    t.app.navigate('/');
    for (const g of ['training', 'watch', 'games', 'reading']) expect(t.root.querySelector(`[data-testid="group-${g}"]`)).not.toBeNull();
    expect(byTestId(t.root, 'todays-pick').querySelector('[data-testid="pick-tile"]')).not.toBeNull();
    expect(byTestId(t.root, 'weekly-goal').textContent).toContain('of 5 days');
    expect(byTestId(t.root, 'tile-letter-crowd').textContent).toContain('Weaker eye only');
    expect(byTestId(t.root, 'tile-split-lines').textContent).toContain('Not tested');
    expect(t.root.querySelector('h1')?.textContent).toBe('Glasses on, Sam?');
  });

  it('a child profile keeps the friendly greeting', () => {
    t = startApp();
    addReadyProfile(t.app, 'child');
    t.app.navigate('/');
    expect(t.root.querySelector('h1')?.textContent).toBe('Hi Sam! Glasses on?');
  });

  it('“Your own text” asks for text first and keeps it out of storage', async () => {
    t = startApp();
    const id = addReadyProfile(t.app, 'adult');
    t.app.session.passCheck(id, NOW.getTime());
    t.app.navigate('/play/split-lines');
    click(byTestId(t.root, 'mode-own'));
    const area = byTestId(t.root, 'pasted-text') as HTMLTextAreaElement;
    area.value = 'A very private sentence to read';
    click(byTestId(t.root, 'start-reading'));
    expect(t.root.querySelector('[data-testid="text-picker"]')).toBeNull();
    expect(t.storage.getItem('binocular-play')).not.toContain('private sentence');
  });
});
