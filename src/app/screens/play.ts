import { dayOutcome, nextContrast } from '../../core/adaptive/contrastPolicy';
import { createLivePalette } from '../../core/colour/livePalette';
import { DISCLAIMER_SHORT } from '../../core/content/copy';
import { displayInfo } from '../../core/display/visualAngle';
import { activeSecondsOnDay, addSessionRecord, makeRecord } from '../../core/progress/sessionLog';
import { canStartGame, localDay } from '../../core/safety/guards';
import { eyeTurnCaution } from '../../core/safety/screening';
import { formatClock, remainingMs } from '../../core/safety/session';
import type { EndedBy, Profile } from '../../core/settings/schema';
import { blockTrialsFor, seededRng, type GameContext, type GameDefinition, type GameMode, type GameStatus } from '../../engine/api';
import { VideoMedia } from '../../engine/media';
import { GameShell } from '../../engine/shell';
import { findGame } from '../../games/registry';
import type { App } from '../app';
import { colourEditor } from '../components/colourEditor';
import { requireParent } from '../components/dialogs';
import { page } from '../components/footer';
import { breakOverlay, doubleVisionCheck, pauseMenu, stopForDoubleVision } from '../components/safety';
import { button, clear, h, isTouchDevice, link, prefersReducedMotion, type Scope } from '../dom';
import type { Screen } from '../router';
import { playTone } from '../sound';
import { devicePixelRatioNow } from '../components/channelCanvas';
import { evidenceBadgeLabel } from '../components/badges';

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
  if (def.requiresNoEyeTurn && eyeTurnCaution(profile.onboarding.screening)) {
    return page(
      def.title,
      [
        h(
          'div',
          { class: 'notice', 'data-testid': 'hidden-for-eye-turn' },
          h('p', null, h('strong', null, 'This task is switched off for this player.')),
          h(
            'p',
            null,
            'It trains depth (seeing in 3D). The safety questions said an eye turns, there has been double vision, or you were not sure. Depth training carries more risk then, so it stays off. Ask your eye doctor or orthoptist about depth training.',
          ),
        ),
        link('Back to the games', '#/', 'btn btn-primary'),
      ],
      { back: '/' },
    );
  }
  return gameScreen(app, def, profile.id, scope);
};

/** Size and viewing distance numbers for the current screen. */
export function currentDisplay(app: App) {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const hgt = typeof window !== 'undefined' ? window.innerHeight : 768;
  return displayInfo(app.store.data.device.display, devicePixelRatioNow(), Math.min(w, hgt));
}

/** Modes a player may see: stereo and push modes are hidden after a risky screening answer. */
export function visibleModes(def: GameDefinition, p: Profile | null): GameMode[] {
  const modes = def.modes ?? [{ id: 'default', label: 'Play', blurb: '' }];
  const caution = !p || eyeTurnCaution(p.onboarding.screening);
  return modes.filter((m) => !(m.riskyWithEyeTurn && caution));
}

type Phase = 'start' | 'playing' | 'paused' | 'break' | 'over';

/** Everything around the canvas: start card, score, pause menu, touch buttons, break, logging. */
function gameScreen(app: App, def: GameDefinition, profileId: string, scope: Scope): HTMLElement {
  let phase: Phase = 'start';
  let mode = def.modes?.[0]?.id ?? 'default';
  /** Unpaused play time of the current round. */
  let roundMs = 0;
  /** The same, minus idle stretches. */
  let roundActiveMs = 0;
  let media: VideoMedia | null = null;
  /** Text pasted for a reading mode. Never saved. */
  let pasted: string | null = null;
  // Depth tasks show both eyes at full brightness (see resolvePalette).
  const stereoPalette = def.eyeMode === 'stereo' ? createLivePalette(app.store, { fullFellow: true }) : null;
  const palette = stereoPalette ?? app.palette;
  scope.onDispose(() => stereoPalette?.dispose());
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

  const context = (): GameContext => {
    const p = app.store.activeProfile;
    const d = currentDisplay(app);
    return {
      rng: seededRng(Math.floor(Math.random() * 0xffffffff)),
      startLevel: 1,
      reducedMotion: prefersReducedMotion(p?.ui.reducedMotion ?? 'system'),
      mode,
      saved: p?.gameProgress[def.id] ?? null,
      display: { pxPerDegree: d.pxPerDegree, devicePxPerDegree: d.devicePxPerDegree, measured: d.measured },
      media,
      text: pasted,
      weakEyeSide: p?.vision.weakEye ?? 'left',
      sound: (kind) => {
        if (app.store.activeProfile?.ui.sound) playTone(kind);
      },
      blockTrials: chosenBlockTrials(),
    };
  };

  /** Trials per block for training tasks: the player's pick for this game, or the task's default. */
  function chosenBlockTrials(): number | null {
    if (!def.blockLengths) return null;
    return blockTrialsFor(def.blockLengths, app.store.activeProfile?.blockTrials[def.id]);
  }

  /** "How many answers?" buttons for the start and result cards. The pick is kept per player and per game. */
  const blockChooser = (when: 'this' | 'next' = 'this'): HTMLElement | null => {
    const spec = def.blockLengths;
    if (!spec) return null;
    const current = chosenBlockTrials();
    const group = h('div', { class: 'row', role: 'group', 'aria-label': 'Answers in this block' });
    const buttons = spec.choices.map((n) =>
      button(
        String(n),
        () => {
          buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(spec.choices[i] === n)));
          app.store.updateProfile(profileId, (p) => {
            p.blockTrials[def.id] = n;
          });
        },
        'plain',
        { 'aria-pressed': String(n === current), 'data-testid': `block-${n}` },
      ),
    );
    group.append(...buttons);
    return h(
      'div',
      { class: 'card', 'data-testid': 'block-chooser' },
      h('p', null, h('strong', null, `How many answers ${when} time?`)),
      group,
      h('p', { class: 'small muted' }, `Shorter is fine; you can also end early from Pause. The level settles best over 20 or more. Usual: ${spec.default}.`),
    );
  };

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
    const saved = shell.save();
    let best = false;
    app.store.updateProfile(profileId, (p) => {
      best = addSessionRecord(
        p,
        makeRecord({
          gameId: def.id,
          seconds: roundMs / 1000,
          activeSeconds: roundActiveMs / 1000,
          score: status.score,
          level: status.level,
          fellowContrast: p.fellowContrast,
          endedBy,
          now: app.now(),
          catches: status.catches,
          trials: status.trials,
        }),
      );
      if (saved) p.gameProgress[def.id] = saved;
      if (endedBy !== 'doubleVision') applyContrastPolicy(p, status);
    });
    return best;
  };

  /** The optional slow contrast rise: at most once a day, logged for the grown-ups page. */
  const applyContrastPolicy = (p: Profile, status: GameStatus) => {
    if (!p.autoContrast.enabled || def.eyeMode !== 'dichoptic') return;
    const today = localDay(app.now());
    if (p.autoContrast.lastDay === today) return;
    const outcome = dayOutcome(activeSecondsOnDay(p, today) / 60, status.targetMet);
    if (!outcome) return;
    p.autoContrast.lastDay = today;
    const to = nextContrast(p.fellowContrast, outcome, { hold: p.autoContrast.hold, balanceMax: p.autoContrast.balanceMax });
    if (to === p.fellowContrast) return;
    p.autoContrast.log.push({ at: app.now().toISOString(), from: p.fellowContrast, to, reason: outcome === 'qualified' ? 'rise' : 'fall' });
    p.fellowContrast = to;
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

  const shell = new GameShell(canvas, def, palette, context(), {
    onActiveTime(dtMs, active) {
      roundMs += dtMs;
      if (active) roundActiveMs += dtMs;
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
  }, { pxPerDegree: () => currentDisplay(app).pxPerDegree });

  const begin = (chosen: string) => {
    const chosenMode = def.modes?.find((m) => m.id === chosen);
    if (chosenMode?.needsVideo && !media) {
      showVideoPicker(chosen);
      return;
    }
    if (chosenMode?.needsText && !pasted) {
      showTextPicker(chosen);
      return;
    }
    endRound('quit');
    mode = chosen;
    shell.restart(context());
    roundMs = 0;
    roundActiveMs = 0;
    media?.play();
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
    media?.play();
    shell.start();
  };

  /** Asks for text to read. It stays in memory for this visit only. */
  const showTextPicker = (chosen: string) => {
    const area = h('textarea', { rows: 8, maxLength: 20000, placeholder: 'Paste or type the text you want to read', 'aria-label': 'Text to read', 'data-testid': 'pasted-text' });
    setLayer(
      h(
        'div',
        { class: 'overlay' },
        h(
          'div',
          { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Your own text', 'data-testid': 'text-picker' },
          h('h2', null, 'Your own text'),
          h('p', null, 'Paste something you want to read. It stays on this device and is not saved: it is gone when you leave this page.'),
          area,
          h(
            'div',
            { class: 'row' },
            button(
              'Start reading',
              () => {
                const text = area.value.trim();
                if (text === '') return;
                pasted = text.slice(0, 20000);
                begin(chosen);
              },
              'primary',
              { 'data-testid': 'start-reading' },
            ),
            button('Back', showStart, 'plain'),
          ),
        ),
      ),
    );
  };

  /** Asks for a video file. It is played from this device only and never stored. */
  const showVideoPicker = (chosen: string) => {
    const input = h('input', { type: 'file', accept: 'video/*', 'data-testid': 'video-file' });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      media?.dispose();
      media = new VideoMedia(file);
      begin(chosen);
    });
    setLayer(
      h(
        'div',
        { class: 'overlay' },
        h(
          'div',
          { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose a video', 'data-testid': 'video-picker' },
          h('h2', null, 'Choose a video'),
          h('p', null, 'Pick a video file from this device. It plays here only: it is not uploaded and not saved. Choose one with calm scenes.'),
          h('label', { class: 'btn btn-primary btn-big' }, 'Choose a video file', input),
          button('Back', showStart, 'plain'),
        ),
      ),
    );
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
          onEndNow: def.blockLengths ? endNow : undefined,
          notWorkingNote: def.notWorkingNote,
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

  /** Pause menu → "End this block now": the block ends and is logged like one that ran to its end. */
  function endNow(): void {
    if (phase !== 'paused' || !shell.endNow()) return;
    gameOver(shell.status());
  }

  function pause(): void {
    if (phase !== 'playing') return;
    phase = 'paused';
    shell.pause();
    media?.pause();
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

  /** Missed the target, or under 60 % right: the result card shows the task's gentle "not working out" line. */
  const hardGoing = (status: GameStatus): boolean => {
    if (status.targetMet === false) return true;
    const t = status.trials;
    return !!t && t.done > 0 && t.correct / t.done < 0.6;
  };

  const gameOver = (status: GameStatus) => {
    phase = 'over';
    media?.pause();
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
          status.trials && status.trials.done > 0 ? h('p', { 'data-testid': 'trials-result' }, `${status.trials.correct} right out of ${status.trials.done}`) : null,
          status.settled === false
            ? h('p', { class: 'small', 'data-testid': 'short-block-note' }, 'This block was short, so the level is only a rough guide and moved little or not at all. Longer blocks (20 or more answers) give a steadier level.')
            : null,
          def.notWorkingNote && hardGoing(status) ? h('p', { class: 'small', 'data-testid': 'not-working-note' }, def.notWorkingNote) : null,
          blockChooser('next'),
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
    media?.pause();
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

  function showStart(): void {
    phase = 'start';
    const modes = visibleModes(def, app.store.activeProfile);
    const disp = currentDisplay(app);
    const distance = h(
      'div',
      { class: 'card', 'data-testid': 'distance-note' },
      h('p', null, h('strong', null, `Sit about ${disp.viewingDistanceCm} cm from the screen`), ' (about an arm’s length).'),
      disp.measured
        ? null
        : h('p', { class: 'small' }, 'Sizes are estimates until the screen-size check is done. ', link('Check screen size (1 minute)', '#/display')),
    );
    setLayer(
      h(
        'div',
        { class: 'overlay' },
        h(
          'div',
          { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': def.title, 'data-testid': 'start-card' },
          h('h2', null, def.title),
          h('p', null, def.blurb),
          def.usesVisualAngle ? distance : null,
          blockChooser(),
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
          h('h3', null, 'Where this idea comes from'),
          h('p', { class: 'small' }, h('span', { class: 'badge' }, evidenceBadgeLabel(def.evidence.badge)), ' ', def.evidence.note),
          def.group === 'training' ? h('p', { class: 'small muted' }, 'The level here is a training level, not an eye test.') : null,
          h('p', { class: 'small muted' }, DISCLAIMER_SHORT),
          link('Back to the games', '#/', 'btn btn-plain'),
        ),
      ),
    );
  }

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
    const isMove = (b: (typeof def.touchButtons)[number]) => b.group === 'move' || (b.group === undefined && (b.action === 'left' || b.action === 'right' || b.action === 'down'));
    const moving = def.touchButtons.filter(isMove);
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
    media?.dispose();
  });

  showTime();
  showStart();
  // The stage has no size until it is in the page.
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => shell.resize());
  return root;
}
