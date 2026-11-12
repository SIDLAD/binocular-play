import { describe, expect, it } from 'vitest';
import { NEUTRAL_PALETTE } from '../../src/core/colour/palette';
import { analyseFlashing, findTransitions } from '../../src/core/safety/flash';
import { canStartGame, clearDoubleVisionBlock, reportDoubleVision } from '../../src/core/safety/guards';
import { applyOnboarding, firstIncompleteStep, screeningCleared } from '../../src/core/safety/screening';
import { IDLE_GAP_MS, SessionManager, freshSession, type SessionState } from '../../src/core/safety/session';
import { createProfile, type Profile } from '../../src/core/settings/schema';
import { seededRng, type GameAction } from '../../src/engine/api';
import { CanvasChannelRenderer } from '../../src/engine/renderer';
import { testContext } from '../../src/engine/testing/context';
import { RecordingContext, meanLuminance } from '../../src/engine/testing/recordingContext';
import { GAMES } from '../../src/games/registry';

const NOW = new Date(2026, 10, 11, 16, 0, 0);
const later = (ms: number) => new Date(NOW.getTime() + ms);

function newProfile(): Profile {
  return createProfile({ name: 'Test', kind: 'child', id: 'p1', now: NOW });
}

/** A profile that has finished onboarding with no risk flags. */
function readyProfile(): Profile {
  const p = newProfile();
  applyOnboarding(p, { type: 'acceptDisclaimer' }, NOW);
  applyOnboarding(p, { type: 'answerScreening', eyeTurn: false, everDouble: false, clinicianOk: true }, NOW);
  applyOnboarding(p, { type: 'complete' }, NOW);
  return p;
}

function passedSession(profileId = 'p1'): SessionState {
  return { ...freshSession(profileId, NOW.getTime()), checkPassedAt: NOW.getTime() };
}

describe('rule 5: safety', () => {
  describe('disclaimer before the first game', () => {
    it('no profile cannot play', () => {
      expect(canStartGame(null, null, NOW)).toEqual({ ok: false, reason: 'no-profile' });
    });

    it('no profile state without an accepted disclaimer can start a game', () => {
      const answers = [true, false];
      for (const eyeTurn of answers) {
        for (const everDouble of answers) {
          for (const clinicianOk of answers) {
            for (const confirmed of answers) {
              for (const completed of answers) {
                const p = newProfile();
                p.onboarding.screening = {
                  eyeTurn,
                  everDouble,
                  clinicianOk,
                  parentConfirmedAt: confirmed ? NOW.toISOString() : null,
                };
                // Even a hand-edited profile that claims to be complete is refused.
                p.onboarding.completedAt = completed ? NOW.toISOString() : null;
                expect(canStartGame(p, passedSession(), NOW)).toEqual({ ok: false, reason: 'disclaimer' });
              }
            }
          }
        }
      }
    });

    it('the complete action does nothing before the disclaimer', () => {
      const p = newProfile();
      applyOnboarding(p, { type: 'answerScreening', eyeTurn: false, everDouble: false, clinicianOk: true }, NOW);
      applyOnboarding(p, { type: 'complete' }, NOW);
      expect(p.onboarding.completedAt).toBeNull();
      expect(firstIncompleteStep(p)).toBe('disclaimer');
    });
  });

  describe('onboarding screening', () => {
    it('a fresh profile resumes at screening after the disclaimer', () => {
      const p = newProfile();
      applyOnboarding(p, { type: 'acceptDisclaimer' }, NOW);
      expect(firstIncompleteStep(p)).toBe('screening');
      expect(canStartGame(p, passedSession(), NOW)).toEqual({ ok: false, reason: 'screening' });
    });

    for (const flags of [
      { eyeTurn: true, everDouble: false },
      { eyeTurn: false, everDouble: true },
      { eyeTurn: true, everDouble: true },
    ]) {
      it(`"yes" (${JSON.stringify(flags)}) cannot complete without a parent's confirmation`, () => {
        for (const clinicianOk of [true, false]) {
          const p = newProfile();
          applyOnboarding(p, { type: 'acceptDisclaimer' }, NOW);
          applyOnboarding(p, { type: 'answerScreening', ...flags, clinicianOk }, NOW);
          expect(screeningCleared(p.onboarding.screening)).toBe(false);
          expect(firstIncompleteStep(p)).toBe('doctor');

          applyOnboarding(p, { type: 'complete' }, NOW);
          expect(p.onboarding.completedAt).toBeNull();
          expect(canStartGame(p, passedSession(), NOW)).toEqual({ ok: false, reason: 'screening' });

          applyOnboarding(p, { type: 'parentConfirm' }, NOW);
          applyOnboarding(p, { type: 'complete' }, NOW);
          expect(p.onboarding.completedAt).not.toBeNull();
          expect(canStartGame(p, passedSession(), NOW)).toEqual({ ok: true });
        }
      });
    }

    it('changing the answers throws away an earlier confirmation', () => {
      const p = newProfile();
      applyOnboarding(p, { type: 'acceptDisclaimer' }, NOW);
      applyOnboarding(p, { type: 'answerScreening', eyeTurn: true, everDouble: false, clinicianOk: true }, NOW);
      applyOnboarding(p, { type: 'parentConfirm' }, NOW);
      applyOnboarding(p, { type: 'complete' }, NOW);
      applyOnboarding(p, { type: 'answerScreening', eyeTurn: true, everDouble: true, clinicianOk: true }, NOW);
      expect(p.onboarding.completedAt).toBeNull();
      expect(canStartGame(p, passedSession(), NOW).ok).toBe(false);
    });

    it('a parent confirmation cannot be recorded before the questions are answered', () => {
      const p = newProfile();
      applyOnboarding(p, { type: 'acceptDisclaimer' }, NOW);
      applyOnboarding(p, { type: 'parentConfirm' }, NOW);
      expect(p.onboarding.screening.parentConfirmedAt).toBeNull();
    });

    it('a profile with no flags can complete', () => {
      expect(canStartGame(readyProfile(), passedSession(), NOW)).toEqual({ ok: true });
    });
  });

  describe('check before each session', () => {
    it('is required: no session, or a session without the check, cannot play', () => {
      const p = readyProfile();
      expect(canStartGame(p, null, NOW)).toEqual({ ok: false, reason: 'session-check' });
      expect(canStartGame(p, freshSession('p1', NOW.getTime()), NOW)).toEqual({
        ok: false,
        reason: 'session-check',
      });
    });

    it('is asked again after 30 idle minutes and for another profile', () => {
      const p = readyProfile();
      expect(canStartGame(p, passedSession(), later(IDLE_GAP_MS - 1000)).ok).toBe(true);
      expect(canStartGame(p, passedSession(), later(IDLE_GAP_MS + 1000))).toEqual({
        ok: false,
        reason: 'session-check',
      });
      expect(canStartGame(p, passedSession('someone-else'), NOW)).toEqual({
        ok: false,
        reason: 'session-check',
      });
    });

    it('"yes, I see double" blocks play for the rest of the day, even with a passed check', () => {
      const p = readyProfile();
      reportDoubleVision(p, 'double-at-check', NOW);
      expect(canStartGame(p, passedSession(), NOW)).toEqual({ ok: false, reason: 'blocked-today' });
      expect(canStartGame(p, passedSession(), later(60 * 60 * 1000))).toEqual({
        ok: false,
        reason: 'blocked-today',
      });
      expect(p.safety.events).toEqual([{ at: NOW.toISOString(), kind: 'double-at-check' }]);

      // The next day the block is over, and the check is asked again.
      const tomorrow = new Date(2026, 10, 12, 9, 0, 0);
      expect(canStartGame(p, null, tomorrow)).toEqual({ ok: false, reason: 'session-check' });
    });

    it('a parent can undo a mis-tap, and that is logged', () => {
      const p = readyProfile();
      reportDoubleVision(p, 'double-or-pain-in-game', NOW);
      clearDoubleVisionBlock(p, NOW);
      expect(canStartGame(p, passedSession(), NOW)).toEqual({ ok: true });
      expect(p.safety.events.map((e) => e.kind)).toEqual(['double-or-pain-in-game', 'block-cleared-by-parent']);
    });

    it('the session manager keeps the check across a reload and drops it for another profile', () => {
      const storage = new Map<string, string>();
      const like = {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => void storage.set(k, v),
      };
      const first = new SessionManager(like);
      first.passCheck('p1', NOW.getTime());
      first.addPlay('p1', 60_000, NOW.getTime());

      const reloaded = new SessionManager(like);
      const p = readyProfile();
      expect(canStartGame(p, reloaded.peek('p1', NOW.getTime()), NOW)).toEqual({ ok: true });
      expect(reloaded.peek('p1', NOW.getTime())?.playedMs).toBe(60_000);
      expect(reloaded.peek('p2', NOW.getTime())).toBeNull();
    });
  });

  describe('the play route', () => {
    const play = Object.values(
      import.meta.glob('/src/app/screens/play.ts', { query: '?raw', import: 'default', eager: true }) as Record<
        string,
        string
      >,
    )[0];

    it('decides whether a game may start by calling canStartGame, and nothing else', () => {
      expect(play).toContain('canStartGame(');
      // It must not re-implement or bypass the guard by reading the safety fields itself.
      expect(play).not.toMatch(/disclaimerAcceptedAt|doubleVisionBlockedOn|checkPassedAt|completedAt/);
    });
  });

  describe('no flashing more than 3 times per second', () => {
    it('the detector fails a 5 Hz strobe', () => {
      const strobe = Array.from({ length: 180 }, (_, i) => (Math.floor(i / 6) % 2 === 0 ? 0 : 1));
      const report = analyseFlashing(strobe, 60);
      expect(report.ok).toBe(false);
      expect(report.worstWindow).toBeGreaterThan(6);
    });

    it('the detector passes exactly 3 flashes per second and fails 4', () => {
      const flashes = (perSecond: number) =>
        Array.from({ length: 300 }, (_, i) => (Math.floor((i * perSecond * 2) / 60) % 2 === 0 ? 0 : 1));
      expect(analyseFlashing(flashes(3), 60).ok).toBe(true);
      expect(analyseFlashing(flashes(4), 60).ok).toBe(false);
    });

    it('the detector passes a slow fade and small flicker', () => {
      const fade = Array.from({ length: 240 }, (_, i) => 0.5 + 0.5 * Math.sin((i / 240) * Math.PI * 2));
      expect(analyseFlashing(fade, 60).ok).toBe(true);
      const flicker = Array.from({ length: 240 }, (_, i) => 0.5 + (i % 2 === 0 ? 0.04 : -0.04));
      expect(findTransitions(flicker)).toEqual([]);
    });

    for (const def of GAMES) {
      for (const mode of def.modes?.map((m) => m.id) ?? ['default']) {
        for (const reducedMotion of [false, true]) {
          it(`"${def.id}" (${mode}${reducedMotion ? ', reduced motion' : ''}) never flashes in 60 s of play`, () => {
            const width = 400;
            const height = 600;
            const ctx = new RecordingContext();
            const renderer = new CanvasChannelRenderer(ctx, { current: NEUTRAL_PALETTE }, width, height);
            const rng = seededRng(42);
            const game = def.create(testContext({ rng: seededRng(1234), reducedMotion, mode }));
            game.resize(width, height);
            const actions: GameAction[] = ['left', 'right', 'up', 'down', 'primary', 'secondary'];
            const held = new Set<GameAction>();
            const series: number[] = [];
            let restarts = 0;
            let current = game;

            for (let frame = 0; frame < 60 * 60; frame++) {
              // Busy scripted input: something is pressed or released every few frames.
              if (frame % 4 === 0) {
                const action = actions[Math.floor(rng() * actions.length)];
                const pressed = !held.has(action);
                if (pressed) held.add(action);
                else held.delete(action);
                current.input({ kind: 'action', action, pressed });
              }
              if (frame % 90 === 45) {
                current.input({ kind: 'pointer', phase: 'down', x: rng() * width, y: rng() * height });
                current.input({ kind: 'pointer', phase: 'up', x: rng() * width, y: rng() * height });
              }
              current.update(1000 / 60);
              ctx.reset();
              current.render(renderer);
              series.push(meanLuminance(ctx.ops, width, height));
              if (current.status().over && frame % 120 === 0) {
                // Keep playing through game over, as a child would.
                current.dispose();
                current = def.create(testContext({ rng: seededRng(99 + restarts++), reducedMotion, mode }));
                current.resize(width, height);
                held.clear();
              }
            }
            current.dispose();
            const report = analyseFlashing(series, 60);
            expect(report, `worst window starts at frame ${report.worstAt}`).toMatchObject({ ok: true });
            // 3,600 recorded frames per game: allow time on a slow or busy machine.
          }, 30_000);
        }
      }
    }

    it('no stylesheet has a looping animation faster than one second', () => {
      const sheets = import.meta.glob('/src/**/*.css', { query: '?raw', import: 'default', eager: true }) as Record<
        string,
        string
      >;
      expect(Object.keys(sheets).length).toBeGreaterThan(0);
      const problems: string[] = [];
      for (const [file, css] of Object.entries(sheets)) {
        for (const m of css.matchAll(/animation(?:-duration|-iteration-count)?\s*:\s*([^;}]+)/g)) {
          const value = m[1];
          const times = [...value.matchAll(/(\d*\.?\d+)(ms|s)\b/g)].map((t) =>
            t[2] === 'ms' ? parseFloat(t[1]) : parseFloat(t[1]) * 1000,
          );
          const duration = times.length > 0 ? times[0] : 0;
          if (/infinite/.test(value) && duration < 1000) problems.push(`${file}: ${m[0]}`);
        }
        if (/\bblink\b|text-decoration[^;]*blink/.test(css)) problems.push(`${file}: blink`);
      }
      expect(problems).toEqual([]);
    });
  });
});
