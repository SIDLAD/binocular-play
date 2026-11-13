import { lensOverEye } from '../../core/colour/mapping';
import { PRESETS } from '../../core/colour/presets';
import { MIN_CONTRAST, type Profile } from '../../core/settings/schema';
import type { App } from '../app';
import { requireParent } from '../components/dialogs';
import { glassesControls, select, setting, toggleGroup } from '../components/glassesControls';
import { page } from '../components/footer';
import { button, clear, h, link, type Child } from '../dom';
import type { Screen } from '../router';

/** Content that a child profile can open only through the parent gate. */
export function gated(app: App, title: string, back: string, build: () => Child[]): HTMLElement {
  const holder = h('div', null);
  const unlock = () => {
    clear(holder);
    for (const c of build()) {
      if (c === null || c === undefined || c === false) continue;
      holder.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    }
  };
  if (app.store.activeProfile?.kind === 'adult') unlock();
  else {
    holder.appendChild(
      h(
        'div',
        { class: 'card' },
        h('p', null, 'This page is for grown-ups.'),
        button(
          'I am a grown-up',
          async () => {
            if (await requireParent(app)) unlock();
          },
          'primary',
          { 'data-testid': 'unlock' },
        ),
      ),
    );
  }
  return page(title, [holder], { back });
}

export { setting };

export const settingsScreen: Screen = (app) =>
  gated(app, 'Settings', '/', () => {
    const profile = app.store.activeProfile;
    if (!profile) return [];
    const summary = h('p', { class: 'muted', 'aria-live': 'polite' });
    const describe = () => {
      const p = app.store.activeProfile;
      if (!p) return;
      const lens = (eye: Profile['vision']['weakEye']) => (lensOverEye(p.vision, eye) === 'red' ? 'red' : PRESETS[p.vision.glasses].otherName);
      const strong = p.vision.weakEye === 'left' ? 'right' : 'left';
      summary.textContent = `Weaker eye: ${p.vision.weakEye}, behind the ${lens(p.vision.weakEye)} lens, sees the pieces you move. Stronger eye: ${strong}, behind the ${lens(strong)} lens, sees the rest.`;
    };
    describe();

    const eyes = glassesControls(app, describe, { swapButton: true });

    const contrast = h('input', {
      type: 'range',
      min: String(MIN_CONTRAST * 100),
      max: '100',
      step: '1',
      value: String(Math.round(profile.fellowContrast * 100)),
      'aria-label': 'Strong-eye brightness',
    });
    const contrastOut = h('output', null, `${Math.round(profile.fellowContrast * 100)}%`);
    contrast.addEventListener('input', () => {
      app.store.updateActive((p) => {
        p.fellowContrast = Number(contrast.value) / 100;
      });
      contrastOut.textContent = `${contrast.value}%`;
    });

    const soundTick = h('input', { type: 'checkbox', checked: profile.ui.sound, 'data-testid': 'sound' });
    soundTick.addEventListener('change', () =>
      app.store.updateActive((p) => {
        p.ui.sound = soundTick.checked;
      }),
    );
    const breakTick = h('input', { type: 'checkbox', checked: profile.session.breakReminder });
    breakTick.addEventListener('change', () =>
      app.store.updateActive((p) => {
        p.session.breakReminder = breakTick.checked;
      }),
    );

    return [
      h(
        'div',
        { class: 'card' },
        h('h2', null, 'Glasses and eyes'),
        eyes?.glasses,
        eyes?.redLens,
        setting(
          'The weaker eye is the',
          'The eye your eye doctor is helping. If you are not sure, ask them.',
          toggleGroup(
            'Weaker eye',
            [
              { value: 'left', label: 'Left eye' },
              { value: 'right', label: 'Right eye' },
            ],
            profile.vision.weakEye,
            (v) => {
              app.store.updateActive((p) => {
                p.vision.weakEye = v;
              });
              describe();
            },
          ).el,
        ),
        summary,
      ),
      h(
        'div',
        { class: 'card' },
        h('h2', null, 'Colours'),
        setting(
          'Strong-eye brightness',
          'Dims only what the stronger eye sees. Follow your eye doctor if they gave you a number.',
          h('div', { class: 'slider-row' }, contrast, contrastOut),
        ),
        h('p', null, link('Open the Colours page', '#/colours', 'btn btn-plain'), ' for the colour wheel, the guided set-up and the hidden-number check.'),
        autoContrastSettings(app),
      ),
      h(
        'div',
        { class: 'card' },
        h('h2', null, 'Screen size'),
        h(
          'p',
          null,
          app.store.data.device.display?.checkedAt
            ? `Checked on ${new Date(app.store.data.device.display.checkedAt).toLocaleDateString()}: sitting ${app.store.data.device.display.viewingDistanceCm} cm away. Saved for this device.`
            : 'Not checked on this device yet. The training tasks use estimated sizes until it is.',
        ),
        link('Screen size check (1 minute)', '#/display', 'btn btn-plain', ),
      ),
      h(
        'div',
        { class: 'card' },
        h('h2', null, 'Play time'),
        setting(
          'Session length',
          'When this much play time is used up, the game pauses and suggests a break. The app never decides how much you should play: ask your eye doctor.',
          select(
            'Session length',
            [5, 10, 15, 20, 30, 45, 60].map((m) => ({ value: String(m), label: `${m} minutes` })),
            String(profile.session.lengthMin),
            (v) =>
              app.store.updateActive((p) => {
                p.session.lengthMin = Number(v);
              }),
          ),
        ),
        h('label', { class: 'check' }, breakTick, h('span', null, 'Show the break reminder')),
        h('label', { class: 'check' }, soundTick, h('span', null, 'Soft sounds in games')),
      ),
      h(
        'div',
        { class: 'card' },
        h('h2', null, 'Comfort'),
        setting(
          'Motion',
          'Reduced motion removes fades and sliding effects in games.',
          select(
            'Motion',
            [
              { value: 'system', label: 'Follow this device' },
              { value: 'on', label: 'Reduced motion' },
              { value: 'off', label: 'Full motion' },
            ],
            profile.ui.reducedMotion,
            (v) =>
              app.store.updateActive((p) => {
                p.ui.reducedMotion = v;
              }),
          ),
        ),
        setting(
          'Background (advanced)',
          'Dark is the normal choice. On a light background the colours swap over: each eye sees the shapes drawn in the OTHER lens’s colour, as dark shapes on white. Only use it if your eye doctor asks for it, and check the colours again afterwards.',
          toggleGroup(
            'Background',
            [
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ],
            profile.vision.background,
            (v) =>
              app.store.updateActive((p) => {
                p.vision.background = v;
              }),
          ).el,
        ),
      ),
      h('div', { class: 'row' }, link('Players', '#/profiles', 'btn btn-plain'), link('For grown-ups', '#/parent', 'btn btn-plain')),
    ];
  });

/** The optional slow rise of the strong-eye brightness. Off by default. */
function autoContrastSettings(app: App): HTMLElement {
  const p = app.store.activeProfile;
  const on = h('input', { type: 'checkbox', checked: p?.autoContrast.enabled ?? false, 'data-testid': 'auto-contrast' });
  const hold = h('input', { type: 'checkbox', checked: p?.autoContrast.hold ?? false, 'data-testid': 'auto-contrast-hold' });
  on.addEventListener('change', () =>
    app.store.updateActive((d) => {
      d.autoContrast.enabled = on.checked;
    }),
  );
  hold.addEventListener('change', () =>
    app.store.updateActive((d) => {
      d.autoContrast.hold = hold.checked;
    }),
  );
  return setting(
    'Slow automatic change (optional)',
    'Off unless you turn it on. Once a day, after 15 minutes of active play in a two-eye game: up 2 points if the game’s target was met, down 5 if not. Never above 80 % or above the level from the latest balance check. Every change is listed on the grown-ups page. A study found slow and fast increases worked the same, so changes here are small.',
    h(
      'div',
      { class: 'stack' },
      h('label', { class: 'check' }, on, h('span', null, 'Change the strong-eye brightness slowly')),
      h('label', { class: 'check' }, hold, h('span', null, 'Hold at the current level')),
      link('Balance check', '#/balance', 'btn btn-plain btn-small'),
    ),
  );
}
