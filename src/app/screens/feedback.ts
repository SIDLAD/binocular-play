import { PRESETS } from '../../core/colour/presets';
import { FEEDBACK_KINDS, ISSUES_URL, feedbackIssueUrl, feedbackText, setupLines, type Feedback, type FeedbackKind } from '../../core/content/feedback';
import { GAMES } from '../../games/registry';
import { page } from '../components/footer';
import { button, externalLink, h } from '../dom';
import type { Screen } from '../router';

/** A short browser name from the user agent, e.g. "Chrome 140 on Android". */
export function browserName(ua: string): string {
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'unknown OS';
  const m =
    /(Edg|OPR|SamsungBrowser|Firefox|FxiOS|CriOS)\/(\d+)/.exec(ua) ?? /(Chrome)\/(\d+)/.exec(ua) ?? /Version\/(\d+).*(Safari)/.exec(ua);
  if (!m) return `unknown browser on ${os}`;
  const names: Record<string, string> = { Edg: 'Edge', OPR: 'Opera', SamsungBrowser: 'Samsung Internet', FxiOS: 'Firefox', CriOS: 'Chrome' };
  if (m[2] === 'Safari') return `Safari ${m[1]} on ${os}`;
  return `${names[m[1]] ?? m[1]} ${m[2]} on ${os}`;
}

/**
 * Feedback: a plain form that opens a pre-filled GitHub issue. Nothing is sent from the app;
 * the person reviews it and presses Submit on GitHub. Open before onboarding too.
 */
export const feedbackScreen: Screen = (app, _params, scope) => {
  const profile = app.store.activeProfile;

  const field = (label: string, help: string | null, control: HTMLElement) =>
    h('label', { class: 'setting' }, h('div', { class: 'label' }, label), help ? h('div', { class: 'help' }, help) : null, control);

  const kind = h(
    'select',
    { 'aria-label': 'What kind of feedback' },
    ...FEEDBACK_KINDS.map((k) => h('option', { value: k.id }, k.label)),
  );
  const summary = h('input', { type: 'text', maxLength: 120, placeholder: 'e.g. The ring part of Star Patrol is slow' });
  const what = h('textarea', { rows: 6, placeholder: 'What did you do, what did you see, what did you expect?' });
  const game = h(
    'select',
    { 'aria-label': 'Which game or page' },
    h('option', { value: '' }, 'Not about one game'),
    ...GAMES.map((g) => h('option', { value: g.title }, g.title)),
    ...['Colours page', 'Number check / colour set-up', 'Home or menus', 'Settings or players'].map((p) => h('option', { value: p }, p)),
  );
  const glasses = h('input', { type: 'text', maxLength: 200, placeholder: 'e.g. red/blue plastic, brand if you know it' });
  const glassesRow = field('Which glasses?', null, glasses);

  const currentSetup = () => setupLines({
    glasses: profile ? PRESETS[profile.vision.glasses].label : undefined,
    background: profile?.vision.background,
    screen: `${window.innerWidth} × ${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio || 1,
    browser: browserName(navigator.userAgent),
    installed: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
  });
  let setupText = currentSetup();
  const includeSetup = h('input', { type: 'checkbox', checked: true });
  const setupRow = h(
    'div',
    null,
    h('label', { class: 'check' }, includeSetup, h('span', null, 'Include my set-up (helps us fix it). This is exactly what is added:')),
    h('pre', { class: 'setup-preview small' }, setupText),
  );
  const preview = setupRow.querySelector('pre')!;
  const onResize = () => {
    setupText = currentSetup();
    preview.textContent = setupText;
  };
  window.addEventListener('resize', onResize);
  scope.onDispose(() => window.removeEventListener('resize', onResize));

  const error = h('p', { class: 'small', role: 'alert' });
  const copied = h('span', { class: 'small muted', 'aria-live': 'polite' });

  const sync = () => {
    const k = kind.value as FeedbackKind;
    glassesRow.hidden = k !== 'colours';
    setupRow.hidden = k === 'idea';
  };
  kind.addEventListener('change', sync);
  sync();

  const read = (): Feedback | null => {
    if (!what.value.trim()) {
      error.textContent = 'Please write a few words about it first.';
      what.focus();
      return null;
    }
    error.textContent = '';
    const k = kind.value as FeedbackKind;
    return {
      kind: k,
      summary: summary.value,
      what: what.value,
      game: game.value,
      glasses: k === 'colours' ? glasses.value : '',
      setup: k !== 'idea' && includeSetup.checked ? setupText : '',
    };
  };

  const send = button(
    'Open on GitHub to send',
    () => {
      const f = read();
      if (!f) return;
      window.open(feedbackIssueUrl(f), '_blank', 'noopener,noreferrer');
    },
    'primary',
  );
  const copy = button('Copy as text', async () => {
    const f = read();
    if (!f) return;
    try {
      await navigator.clipboard.writeText(feedbackText(f));
      copied.textContent = 'Copied.';
    } catch {
      copied.textContent = 'Could not copy. Select the text above and copy it by hand.';
    }
  });

  return page(
    'Feedback',
    [
      h(
        'p',
        null,
        'Found a problem, or have an idea? Tell us here. This is a free project, and your reports are how it gets better.',
      ),
      h(
        'div',
        { class: 'notice' },
        h('p', null, h('strong', null, 'Feedback is public. '), 'Please don’t write names, ages, or medical details. Questions about your own eyes belong with your eye doctor.'),
      ),
      h(
        'div',
        { class: 'card feedback-form' },
        field('What kind?', null, kind),
        field('In a few words', null, summary),
        field('Tell us more', null, what),
        field('Which game or page?', null, game),
        glassesRow,
        setupRow,
        error,
        h('div', { class: 'actions' }, send, copy, copied),
      ),
      h(
        'div',
        { class: 'card' },
        h('h2', null, 'How sending works'),
        h(
          'ul',
          null,
          h('li', null, '“Open on GitHub” opens GitHub with your words already filled in. Check them and press ', h('strong', null, 'Submit new issue'), '. Nothing is sent until you do.'),
          h('li', null, 'GitHub needs a free account. ', externalLink('Make one here', 'https://github.com/signup'), '.'),
          h('li', null, 'No account? “Copy as text” copies everything, ready to paste into a message, or to ask an AI assistant to help you post it.'),
          h('li', null, 'You can also ', externalLink('see what others have reported', ISSUES_URL), '.'),
        ),
      ),
    ],
    { back: '/' },
  );
};
