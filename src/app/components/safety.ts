import { STOP_GUIDANCE } from '../../core/content/copy';
import { reportDoubleVision, type SafetyEventKind } from '../../core/safety/guards';
import type { App } from '../app';
import { button, h } from '../dom';

/**
 * Records a double-vision or eye-pain report: logs it, blocks play for the rest of the
 * day, ends the session and shows the stop guidance.
 */
export function stopForDoubleVision(app: App, kind: SafetyEventKind): void {
  const now = app.now();
  app.store.updateActive((p) => reportDoubleVision(p, kind, now));
  app.session.reset();
  app.navigate('/stopped');
}

/** The one-tap check before each session. */
export function doubleVisionCheck(app: App, onPass: () => void): HTMLElement {
  return h(
    'div',
    { class: 'card', 'data-testid': 'double-vision-check' },
    h('h2', null, 'Before we start'),
    h('p', null, 'Put your glasses on and look at the screen.'),
    h('p', null, h('strong', null, 'Do you see double right now?'), ' (Two of things that should be one.)'),
    h(
      'div',
      { class: 'actions' },
      button(
        'No, I see one',
        () => {
          const profile = app.store.activeProfile;
          if (!profile) return;
          app.session.passCheck(profile.id, app.now().getTime());
          onPass();
        },
        'primary',
        { class: 'btn-big', 'data-testid': 'check-no' },
      ),
      button('Yes, I see double', () => stopForDoubleVision(app, 'double-at-check'), 'warn', {
        class: 'btn-big',
        'data-testid': 'check-yes',
      }),
    ),
  );
}

export function stopGuidance(): HTMLElement {
  return h('ol', null, ...STOP_GUIDANCE.map((line) => h('li', null, line)));
}

export interface PauseMenuActions {
  onResume(): void;
  onAdjustColours(): void;
  onRestart(): void;
  onQuit(): void;
  /** "I see double / my eyes hurt". */
  onStop(): void;
}

/** The pause menu of every game. The stop button is always here. */
export function pauseMenu(actions: PauseMenuActions): HTMLElement {
  return h(
    'div',
    { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Paused', 'data-testid': 'pause-menu' },
    h('h2', null, 'Paused'),
    h(
      'div',
      { class: 'stack' },
      button('Keep playing', actions.onResume, 'primary', { class: 'btn-big', 'data-testid': 'resume' }),
      button('Adjust colours', actions.onAdjustColours, 'plain', { 'data-testid': 'adjust-colours' }),
      button('Start again', actions.onRestart),
      button('Stop and go home', actions.onQuit),
      button('I see double / my eyes hurt', actions.onStop, 'warn', { 'data-testid': 'stop-double' }),
    ),
  );
}

/** The gentle break screen at the end of the session time. It fades in; nothing flashes. */
export function breakOverlay(options: {
  minutes: number;
  patchNote: string | null;
  onKeepPlaying(): void;
  onFinish(): void;
}): HTMLElement {
  const el = h(
    'div',
    { class: 'overlay break', 'data-testid': 'break-overlay' },
    h(
      'div',
      { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Time for a break' },
      h('h2', null, 'Time for a break'),
      h('p', null, `You have played for ${options.minutes} minutes. Well done! Take the glasses off and rest your eyes.`),
      options.patchNote ? h('p', null, h('strong', null, 'Reminder from your grown-up: '), options.patchNote) : null,
      h(
        'div',
        { class: 'actions' },
        button('Finish for now', options.onFinish, 'primary', { class: 'btn-big' }),
        button('5 more minutes', options.onKeepPlaying),
      ),
    ),
  );
  // Start the fade on the next frame so the transition runs.
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => el.classList.add('shown'));
  else el.classList.add('shown');
  return el;
}
