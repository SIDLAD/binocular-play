import { DISCLAIMER_SHORT } from '../../core/content/copy';
import { addSessionRecord, makeRecord } from '../../core/progress/sessionLog';
import { canStartGame } from '../../core/safety/guards';
import { formatClock, remainingMs } from '../../core/safety/session';
import type { EndedBy } from '../../core/settings/schema';
import { seededRng, type GameContext, type GameDefinition, type GameStatus } from '../../engine/api';
import { GameShell } from '../../engine/shell';
import { findGame } from '../../games/registry';
import type { App } from '../app';
import { colourEditor } from '../components/colourEditor';
import { requireParent } from '../components/dialogs';
import { page } from '../components/footer';
import { breakOverlay, doubleVisionCheck, pauseMenu, stopForDoubleVision } from '../components/safety';
import { button, clear, h, isTouchDevice, link, prefersReducedMotion, type Scope } from '../dom';
import type { Screen } from '../router';

/**
 * The play route. Whether a game may start is decided by canStartGame() and nothing else
 * (hard rule 5).
 */
export const playScreen: Screen = (app, params, scope) => {
  const profile = app.store.activeProfile;
  const guard = canStartGame(profile, profile ? app.session.peek(profile.id, app.now().getTime()) : null, app.now());

  if (!guard.ok) {
    switch (guard.reason) {
      case 'session-check':
        return page('Ready to play?', [doubleVisionCheck(app, () => app.rerender())], { back: '/' });
      case 'blocked-today':
        app.navigate('/stopped');
        return h('div', null);
      default:
        app.navigate('/onboarding');
        return h('div', null);
    }
  }

  const def = findGame(params.id ?? '');
  if (!def || !profile) {
    return page('Game not found', [h('p', null, 'That game does not exist.'), link('Back to the games', '#/', 'btn btn-primary')], { back: '/' });
  }
  return gameScreen(app, def, profile.id, scope);
};

type Phase = 'start' | 'playing' | 'paused' | 'break' | 'over';

/** Everything around the canvas: start card, score, pause menu, touch buttons, break, logging. */
function gameScreen(app: App, def: GameDefinition, profileId: string, scope: Scope): HTMLElement {
  let phase: Phase = 'start';
  let mode = def.modes?.[0]?.id ?? 'default';
  /** Active play time of the current round. */
  let roundMs = 0;
  let roundLogged = true;
  /** Play time not yet written to the session. */
  let unsavedMs = 0;
  let layerScope = scope.child();

  const scoreOut = h('b', { 'data-testid': 'score' }, '0');
  const levelOut = h('b', { 'data-testid': 'level' }, '1');
  const timeOut = h('b', { 'data-testid': 'time-left' }, '');
  const pauseButton = button('Pause', () => pause(), 'plain', { class: 'btn-small', 'data-testid': 'pause' });
  const canvas = h('canvas', { 'aria-label': `${def.title}: game area`, role: 'img' });
  const stage = h('div', { class: 'stage' }, canvas);
  const layer = h('div', { class: 'play-layer' });

  const context = (): GameContext => ({
    rng: seededRng(Math.floor(Math.random() * 0xffffffff)),
    startLevel: 1,
    reducedMotion: prefersReducedMotion(app.store.activeProfile?.ui.reducedMotion ?? 'system'),
    mode,
  });

  const lengthMin = () => app.store.activeProfile?.session.lengthMin ?? 20;
  const session = () => app.session.peek(profileId, app.now().getTime());
  const showTime = () => {
    timeOut.textContent = formatClock(Math.max(0, remainingMs(lengthMin(), session()) - unsavedMs));
  };
  const showStatus = (s: GameStatus) => {
    scoreOut.textContent = String(s.score);
    levelOut.textContent = String(s.level);
  };

  const saveTime = () => {
    if (unsavedMs <= 0) return;
    app.session.addPlay(profileId, unsavedMs, app.now().getTime());
    unsavedMs = 0;
  };

  /** Writes the round to the play log, once. Returns true for a new personal best. */
  const endRound = (endedBy: EndedBy): boolean => {
    saveTime();
    if (roundLogged) return false;
    roundLogged = true;
    // Very short rounds are noise, except a safety stop, which is always recorded.
    if (roundMs < 1000 && endedBy !== 'doubleVision') return false;
    const status = shell.status();
    let best = false;
    app.store.updateProfile(profileId, (p) => {
      best = addSessionRecord(
        p,
        makeRecord({
          gameId: def.id,
          seconds: roundMs / 1000,
          score: status.score,
          level: status.level,
          fellowContrast: p.fellowContrast,
          endedBy,
          now: app.now(),
        }),
      );
    });
    return best;
  };

  const setLayer = (el: HTMLElement | null, sheet = false) => {
    layerScope.dispose();
    layerScope = scope.child();
    clear(layer);
    root.classList.toggle('sheet-open', sheet);
    if (el) {
      layer.appendChild(el);
      const first = el.querySelector('button, a');
      if (first instanceof HTMLElement) first.focus({ preventScroll: true });
    }
  };

  const shell = new GameShell(canvas, def, app.palette, context(), {
    onActiveTime(dtMs) {
      roundMs += dtMs;
      unsavedMs += dtMs;
      if (unsavedMs >= 1000) {
        saveTime();
        showTime();
        checkBreak();
      }
    },
    onStatus(status) {
      showStatus(status);
      if (status.over && phase === 'playing') gameOver(status);
    },
  });

  const begin = (chosen: string) => {
    endRound('quit');
    mode = chosen;
    shell.restart(context());
    roundMs = 0;
    roundLogged = false;
    phase = 'playing';
    setLayer(null);
    showStatus(shell.status());
    showTime();
    shell.start();
  };

  const resume = () => {
    if (phase !== 'paused' && phase !== 'break') return;
    phase = 'playing';
    setLayer(null);
    shell.start();
  };

  const showPauseMenu = () => {
    setLayer(
      h(
        'div',
        { class: 'overlay' },
        pauseMenu({
          onResume: resume,
          onAdjustColours: showColours,
          onRestart: () => begin(mode),
          onQuit: () => {
            endRound('quit');
            app.navigate('/');
          },
          onStop: () => {
            endRound('doubleVision');
            stopForDoubleVision(app, 'double-or-pain-in-game');
          },
        }),
      ),
    );
  };

  function pause(): void {
    if (phase !== 'playing') return;
    phase = 'paused';
    shell.pause();
    saveTime();
    showPauseMenu();
  }

  /** The colour editor as a sheet: the paused game above it is the live preview. */
  const showColours = () => {
    const sheetScope = scope.child();
    const sheet = h(
      'div',
      { class: 'editor-sheet', role: 'dialog', 'aria-label': 'Adjust colours', 'data-testid': 'colour-sheet' },
      h('div', { class: 'inner' }, h('h2', null, 'Adjust colours'), colourEditor(app, sheetScope, { sheet: true, onClose: showPauseMenu })),
    );
    setLayer(sheet, true);
    layerScope.onDispose(() => sheetScope.dispose());
  };

  const gameOver = (status: GameStatus) => {
    phase = 'over';
    const best = endRound('gameOver');
    setLayer(
      h(
        'div',
        { class: 'overlay' },
        h(
          'div',
          { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Round over', 'data-testid': 'game-over' },
          h('h2', null, best ? 'New best score!' : 'Good round!'),
          h('p', null, `Score ${status.score} · Level ${status.level}`),
          h('div', { class: 'stack' }, button('Play again', () => begin(mode), 'primary', { class: 'btn-big' }), button('Back to the games', () => app.navigate('/'))),
        ),
      ),
    );
  };

  const checkBreak = () => {
    const p = app.store.activeProfile;
    const s = session();
    if (phase !== 'playing' || !p || !p.session.breakReminder || !s || s.breakShown) return;
    if (remainingMs(p.session.lengthMin, s) > 0) return;
    phase = 'break';
    shell.pause();
    app.session.markBreakShown(profileId, app.now().getTime());
    const note = p.session.patchReminder.enabled ? p.session.patchReminder.note.trim() : '';
    setLayer(
      breakOverlay({
        minutes: Math.round((s.playedMs + unsavedMs) / 60000),
        patchNote: note === '' ? null : note,
        onFinish: () => {
          endRound('timer');
          app.navigate('/');
        },
        onKeepPlaying: async () => {
          if (!(await requireParent(app, 'A grown-up decides whether to play for longer.'))) return;
          app.session.extend(profileId, app.now().getTime());
          showTime();
          resume();
        },
      }),
    );
  };

  const showStart = () => {
    phase = 'start';
    const modes = def.modes ?? [{ id: 'default', label: 'Play', blurb: '' }];
    setLayer(
      h(
        'div',
        { class: 'overlay' },
        h(
          'div',
          { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': def.title, 'data-testid': 'start-card' },
          h('h2', null, def.title),
          h('p', null, def.blurb),
          h(
            'div',
            { class: 'stack' },
            ...modes.map((m, i) =>
              button(
                [h('span', null, modes.length > 1 ? `Play: ${m.label}` : 'Play'), m.blurb ? h('span', { class: 'small' }, m.blurb) : null],
                () => begin(m.id),
                i === 0 ? 'primary' : 'plain',
                { class: 'btn-big choice', 'data-testid': `mode-${m.id}` },
              ),
            ),
          ),
          h('h3', null, 'Who sees what'),
          h('p', { class: 'small' }, def.eyeRule),
          h('h3', null, 'How to play'),
          h('ul', { class: 'small' }, ...def.controls.map((c) => h('li', null, c))),
          h('p', { class: 'small muted' }, DISCLAIMER_SHORT),
          link('Back to the games', '#/', 'btn btn-plain'),
        ),
      ),
    );
  };

  // On-screen buttons for touch.
  let touch: HTMLElement | null = null;
  if (isTouchDevice() && def.touchButtons.length > 0) {
    const make = (b: (typeof def.touchButtons)[number]) => {
      const el = h('button', { type: 'button', class: 'btn btn-plain', 'aria-label': b.name }, b.label);
      const set = (pressed: boolean) => shell.send({ kind: 'action', action: b.action, pressed });
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        set(true);
      });
      for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) el.addEventListener(type, () => set(false));
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      return el;
    };
    const moving = def.touchButtons.filter((b) => b.action === 'left' || b.action === 'right' || b.action === 'down');
    const acting = def.touchButtons.filter((b) => !moving.includes(b));
    touch = h('div', { class: 'touch' }, h('div', { class: 'group move' }, ...moving.map(make)), h('div', { class: 'group act' }, ...acting.map(make)));
  }

  const root = h(
    'div',
    { class: 'play', 'data-testid': 'play' },
    h(
      'div',
      { class: 'hud' },
      pauseButton,
      h('span', { class: 'spacer' }),
      h('span', null, h('span', { class: 'small muted' }, 'Score '), scoreOut),
      h('span', null, h('span', { class: 'small muted' }, 'Level '), levelOut),
      h('span', null, h('span', { class: 'small muted' }, 'Break in '), timeOut),
    ),
    stage,
    touch,
    layer,
  );

  const onKey = (e: KeyboardEvent) => {
    if (e.code !== 'Escape' && e.code !== 'KeyP') return;
    if (phase === 'playing') pause();
    else if (phase === 'paused' && layer.querySelector('[data-testid="pause-menu"]')) resume();
  };
  const onHidden = () => {
    if (document.visibilityState === 'hidden') pause();
  };
  const onBlur = () => pause();
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHidden);
  window.addEventListener('blur', onBlur);

  scope.onDispose(() => {
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHidden);
    window.removeEventListener('blur', onBlur);
    shell.pause();
    // Leaving mid-round (back button, another link) still counts as play.
    endRound('quit');
    shell.dispose();
  });

  showTime();
  showStart();
  // The stage has no size until it is in the page.
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => shell.resize());
  return root;
}
