import { DISCLAIMER_POINTS, FREE_PROMISE } from '../../core/content/copy';
import { lensOverEye } from '../../core/colour/mapping';
import { GLASSES, PRESETS } from '../../core/colour/presets';
import {
  applyOnboarding,
  firstIncompleteStep,
  hasRiskFlag,
  needsDoctorScreen,
  type OnboardingStep,
} from '../../core/safety/screening';
import { AVATAR_COUNT, MIN_CONTRAST, defaultCalibration } from '../../core/settings/schema';
import { drawAvatar, drawGlasses, drawPreview } from '../components/art';
import { openCalibration } from '../components/calibration';
import { channelCanvas } from '../components/channelCanvas';
import { requireParent } from '../components/dialogs';
import { footer } from '../components/footer';
import { button, clear, h, link, type Child, type Scope } from '../dom';
import type { Screen } from '../router';

const NUMBERED: OnboardingStep[] = ['disclaimer', 'who', 'screening', 'glasses', 'lens', 'weak', 'calibration', 'contrast'];

/** Two big buttons that behave like a radio group. */
function choice<T extends string>(
  options: { value: T; label: string; note?: string }[],
  current: T | null,
  onPick: (v: T) => void,
  groupLabel: string,
): HTMLElement {
  const group = h('div', { class: 'choices', role: 'group', 'aria-label': groupLabel });
  const buttons = options.map((o) =>
    button(
      [h('span', null, o.label), o.note ? h('span', { class: 'small muted' }, o.note) : null],
      () => {
        for (const b of buttons) b.setAttribute('aria-pressed', 'false');
        buttons[options.indexOf(o)].setAttribute('aria-pressed', 'true');
        onPick(o.value);
      },
      'plain',
      { class: 'choice', 'aria-pressed': String(o.value === current), 'data-value': o.value },
    ),
  );
  group.append(...buttons);
  return group;
}

export const onboardingScreen: Screen = (app, _params, scope) => {
  const main = h('main', null);
  const root = h(
    'div',
    { class: 'page' },
    h(
      'header',
      { class: 'topbar' },
      h('span', { class: 'brand' }, 'Binocular Play'),
      h('span', { class: 'spacer' }),
      app.store.data.profiles.length > 1 ? link('Players', '#/profiles', 'btn btn-plain btn-small') : null,
    ),
    main,
    footer(),
  );
  let stepScope: Scope = scope.child();

  const show = (step: OnboardingStep) => {
    stepScope.dispose();
    stepScope = scope.child();
    clear(main);
    const index = NUMBERED.indexOf(step);
    const content = build(step);
    if (index >= 0) main.appendChild(h('div', { class: 'steps' }, `Step ${index + 1} of ${NUMBERED.length}`));
    for (const c of content.flat()) {
      if (c === null || c === undefined || c === false) continue;
      main.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    }
    const heading = main.querySelector('h1');
    if (heading instanceof HTMLElement) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    try {
      window.scrollTo(0, 0);
    } catch {
      /* not available in tests */
    }
  };

  const actions = (next: Child, back?: OnboardingStep): HTMLElement =>
    h('div', { class: 'actions' }, next, back ? button('Back', () => show(back)) : null);

  const build = (step: OnboardingStep): (Child | Child[])[] => {
    const profile = app.store.activeProfile;
    switch (step) {
      case 'disclaimer':
        return [
          h('h1', null, 'Welcome to Binocular Play'),
          h('p', null, h('strong', null, FREE_PROMISE)),
          h(
            'p',
            null,
            'These are games you play wearing red-and-blue (or red-and-cyan, or red-and-green) glasses. Each eye sees a different part of the game, so both eyes have to work together to play.',
          ),
          h(
            'div',
            { class: 'notice', 'data-testid': 'disclaimer' },
            h('h2', null, 'Please read this first'),
            h('p', { class: 'muted' }, 'If you are a child, ask a grown-up to read this with you.'),
            h('ul', null, ...DISCLAIMER_POINTS.map((p) => h('li', null, p))),
          ),
          h('p', null, link('Is this real? See the evidence, good and bad', '#/evidence')),
          actions(
            button(
              'I understand and agree',
              () => {
                if (!app.store.activeProfile) app.store.addProfile({ name: 'Player', kind: 'child' });
                app.store.updateActive((p) => applyOnboarding(p, { type: 'acceptDisclaimer' }, app.now()));
                show('who');
              },
              'primary',
              { class: 'btn-big', 'data-testid': 'accept-disclaimer' },
            ),
          ),
        ];

      case 'who': {
        if (!profile) return [];
        const name = h('input', { type: 'text', value: profile.name, maxLength: 24, autocomplete: 'off' });
        name.addEventListener('change', () =>
          app.store.updateActive((p) => {
            p.name = name.value.trim() || 'Player';
          }),
        );
        const avatars = h('div', { class: 'avatar-pick', role: 'group', 'aria-label': 'Picture' });
        const avatarButtons: HTMLButtonElement[] = [];
        for (let i = 0; i < AVATAR_COUNT; i++) {
          const b = button(
            channelCanvas(app.palette, stepScope, { width: 56, height: 56, className: 'avatar', draw: (r) => drawAvatar(r, i) }).el,
            () => {
              avatarButtons.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
              app.store.updateActive((p) => {
                p.avatar = i;
              });
            },
            'plain',
            { 'aria-pressed': String(profile.avatar === i), 'aria-label': `Picture ${i + 1}` },
          );
          avatarButtons.push(b);
          avatars.appendChild(b);
        }
        return [
          h('h1', null, 'Who is playing?'),
          h('label', { class: 'field' }, 'Name', name),
          h('div', { class: 'label' }, h('strong', null, 'This player is')),
          choice(
            [
              { value: 'child', label: 'A child', note: 'Settings are kept behind a grown-up check.' },
              { value: 'adult', label: 'An adult', note: 'No grown-up check.' },
            ],
            profile.kind,
            (v) =>
              app.store.updateActive((p) => {
                p.kind = v;
              }),
            'Child or adult',
          ),
          h('div', { class: 'label' }, h('strong', null, 'Pick a picture')),
          avatars,
          actions(
            button(
              'Next',
              () => {
                app.store.updateActive((p) => {
                  p.name = name.value.trim() || 'Player';
                });
                show('screening');
              },
              'primary',
            ),
          ),
        ];
      }

      case 'screening': {
        if (!profile) return [];
        const s = profile.onboarding.screening;
        const answers: { eyeTurn: boolean | null; everDouble: boolean | null; clinicianOk: boolean | null } = {
          eyeTurn: s.eyeTurn,
          everDouble: s.everDouble,
          clinicianOk: s.clinicianOk,
        };
        const next = button(
          'Next',
          () => {
            if (answers.eyeTurn === null || answers.everDouble === null || answers.clinicianOk === null) return;
            const a = { eyeTurn: answers.eyeTurn, everDouble: answers.everDouble, clinicianOk: answers.clinicianOk };
            app.store.updateActive((p) => applyOnboarding(p, { type: 'answerScreening', ...a }, app.now()));
            const now = app.store.activeProfile;
            show(now && needsDoctorScreen(now.onboarding.screening) ? 'doctor' : 'glasses');
          },
          'primary',
          { 'data-testid': 'screening-next' },
        );
        const update = () => {
          next.disabled = answers.eyeTurn === null || answers.everDouble === null || answers.clinicianOk === null;
        };
        update();
        const yn = (v: boolean | null) => (v === null ? null : v ? 'yes' : 'no');
        const question = (key: keyof typeof answers, text: string, yes: string, no: string) =>
          h(
            'div',
            { class: 'card', 'data-question': key },
            h('p', null, h('strong', null, text)),
            choice(
              [
                { value: 'yes', label: yes },
                { value: 'no', label: no },
              ],
              yn(answers[key]),
              (v) => {
                answers[key] = v === 'yes';
                update();
              },
              text,
            ),
          );
        return [
          h('h1', null, 'Three quick safety questions'),
          h(
            'p',
            null,
            'Answer what you know. This is not a test and the app cannot examine eyes. Grown-ups: please answer for a child.',
          ),
          question('eyeTurn', 'Does either eye turn in, out, up or down, even only sometimes?', 'Yes, or not sure', 'No'),
          question('everDouble', 'Have you ever had double vision (seeing two of something)?', 'Yes, or not sure', 'No'),
          question(
            'clinicianOk',
            'Has an eye doctor found amblyopia (lazy eye) and said that two-eye games are OK?',
            'Yes',
            'No, or not sure',
          ),
          actions(next, 'who'),
        ];
      }

      case 'doctor': {
        if (!profile) return [];
        if (!hasRiskFlag(profile.onboarding.screening)) {
          return [
            h('h1', null, 'Check with your eye doctor'),
            h(
              'div',
              { class: 'notice' },
              h(
                'p',
                null,
                'These games are meant to be used with an eye doctor’s OK. They do not replace an eye examination, glasses, patching or drops.',
              ),
              h('p', null, 'Please ask your eye doctor or orthoptist about two-eye games at your next visit, and stop if anything feels wrong.'),
            ),
            h('p', null, link('Other treatments your eye doctor may use', '#/treatments')),
            actions(button('I understand', () => show('glasses'), 'primary'), 'screening'),
          ];
        }
        const tick = h('input', { type: 'checkbox', 'data-testid': 'clinician-tick' });
        const go = button(
          'Continue (grown-up)',
          async () => {
            if (!tick.checked) return;
            if (!(await requireParent(app, 'A grown-up must confirm that an eye doctor approved these games.'))) return;
            app.store.updateActive((p) => applyOnboarding(p, { type: 'parentConfirm' }, app.now()));
            show('glasses');
          },
          'plain',
          { 'data-testid': 'doctor-continue' },
        );
        go.disabled = true;
        tick.addEventListener('change', () => {
          go.disabled = !tick.checked;
        });
        return [
          h('h1', null, 'Talk to your eye doctor first'),
          h(
            'div',
            { class: 'notice', 'data-testid': 'doctor-first' },
            h('p', null, 'You answered "yes" or "not sure" to an eye turn or to double vision.'),
            h(
              'p',
              null,
              'For some people with an eye turn, games like these can bring on double vision. Please do not start until an eye doctor or orthoptist who knows this player’s eyes has said these games are OK.',
            ),
          ),
          h('p', null, 'If that has already happened, a grown-up can confirm it here.'),
          h('label', { class: 'check' }, tick, h('span', null, 'An eye doctor or orthoptist has said these games are OK for this player.')),
          actions(go, 'screening'),
          h('p', null, link('Read the evidence and the risks', '#/evidence'), ' · ', link('Other treatments', '#/treatments')),
        ];
      }

      case 'glasses': {
        if (!profile) return [];
        return [
          h('h1', null, 'Which glasses do you have?'),
          h('p', null, 'Look at the two lenses. One is red. What colour is the other one?'),
          choice(
            GLASSES.map((g) => ({ value: g, label: PRESETS[g].label, note: PRESETS[g].note })),
            profile.vision.glasses,
            (v) =>
              app.store.updateActive((p) => {
                if (p.vision.glasses !== v) {
                  p.vision.glasses = v;
                  p.calibration = defaultCalibration(v);
                }
              }),
            'Glasses type',
          ),
          h('p', { class: 'muted small' }, 'No glasses yet? Any red/cyan or red/blue "3D" glasses will do to start. Better-quality ones separate the colours better.'),
          actions(button('Next', () => show('lens'), 'primary'), 'screening'),
        ];
      }

      case 'lens': {
        if (!profile) return [];
        const other = PRESETS[profile.vision.glasses].otherName;
        const diagram = channelCanvas(app.palette, stepScope, {
          width: 360,
          height: 170,
          className: 'glasses-diagram',
          label: 'A drawing of the glasses with the lens colours as they are set now.',
          draw: (r) => {
            const p = app.store.activeProfile;
            if (p) drawGlasses(r, p.vision);
          },
        });
        return [
          h('h1', null, 'Which eye is the red lens on?'),
          h('p', null, `Put the glasses on. Is the red lens in front of your left eye or your right eye? (The other lens is ${other}.)`),
          choice(
            [
              { value: 'left', label: 'Red on my LEFT eye' },
              { value: 'right', label: 'Red on my RIGHT eye' },
            ],
            profile.vision.redLensEye,
            (v) =>
              app.store.updateActive((p) => {
                p.vision.redLensEye = v;
              }),
            'Red lens side',
          ),
          diagram.el,
          h('p', { class: 'muted small' }, 'Many glasses can be flipped over. Many eye doctors put the red lens over the weaker eye, but do what yours says.'),
          actions(button('Next', () => show('weak'), 'primary'), 'glasses'),
        ];
      }

      case 'weak': {
        if (!profile) return [];
        const summary = h('p', { 'aria-live': 'polite' });
        const describe = () => {
          const p = app.store.activeProfile;
          if (!p) return;
          const lens = lensOverEye(p.vision, p.vision.weakEye) === 'red' ? 'red' : PRESETS[p.vision.glasses].otherName;
          summary.textContent = `So the weaker (${p.vision.weakEye}) eye looks through the ${lens} lens. It will see the pieces you move; the stronger eye will see the rest.`;
        };
        describe();
        return [
          h('h1', null, 'Which eye is the weaker one?'),
          h('p', null, 'The weaker ("lazy") eye is the one your eye doctor is helping. If you patch, it is the eye that is NOT covered.'),
          choice(
            [
              { value: 'left', label: 'My LEFT eye' },
              { value: 'right', label: 'My RIGHT eye' },
            ],
            profile.vision.weakEye,
            (v) => {
              app.store.updateActive((p) => {
                p.vision.weakEye = v;
              });
              describe();
            },
            'Weaker eye',
          ),
          summary,
          h('p', { class: 'muted small' }, 'Not sure? Ask your eye doctor. You can change this any time in Settings.'),
          actions(button('Next', () => show('calibration'), 'primary'), 'lens'),
        ];
      }

      case 'calibration':
        return [
          h('h1', null, 'Set up your colours'),
          h(
            'p',
            null,
            'Now we tune the colours for this screen and your glasses, so that each eye sees only its own shapes. It takes about a minute. You will cover one eye at a time.',
          ),
          actions(
            button('Start colour set-up', () => openCalibration(app, stepScope, (completed) => completed && show('contrast')), 'primary', {
              class: 'btn-big',
              'data-testid': 'start-calibration',
            }),
            'weak',
          ),
          h('p', null, button('Skip for now', () => show('contrast'), 'quiet', { 'data-testid': 'skip-calibration' })),
          h('p', { class: 'muted small' }, 'You can come back to this any time: Home → Colours, or "Adjust colours" in a game’s pause menu.'),
        ];

      case 'contrast': {
        if (!profile) return [];
        const preview = channelCanvas(app.palette, stepScope, {
          width: 720,
          height: 240,
          className: 'preview',
          label: 'Preview: a circle for the weaker eye and a square for the stronger eye.',
          draw: drawPreview,
        });
        const slider = h('input', {
          type: 'range',
          min: String(MIN_CONTRAST * 100),
          max: '100',
          step: '1',
          value: String(Math.round(profile.fellowContrast * 100)),
          'aria-label': 'Strong-eye brightness',
        });
        const out = h('output', null, `${Math.round(profile.fellowContrast * 100)}%`);
        slider.addEventListener('input', () => {
          app.store.updateActive((p) => {
            p.fellowContrast = Number(slider.value) / 100;
          });
          out.textContent = `${slider.value}%`;
        });
        return [
          h('h1', null, 'Balance the two eyes'),
          h('p', null, 'Look at the picture with both eyes open and the glasses on. The circle is for the weaker eye; the square is for the stronger eye.'),
          preview.el,
          h(
            'p',
            null,
            h('strong', null, 'Can you see the circle and the square at the same time? '),
            'If the circle fades or disappears, slide down to dim the square until both are easy to see together. If both are already clear, leave it at 100%.',
          ),
          h('div', { class: 'slider-row' }, slider, out),
          h('p', { class: 'muted small' }, 'If your eye doctor gave you a number, use that. You can change this any time.'),
          actions(
            button(
              'Finish',
              () => {
                app.store.updateActive((p) => applyOnboarding(p, { type: 'complete' }, app.now()));
                const done = app.store.activeProfile?.onboarding.completedAt;
                if (done) app.navigate('/');
                else show(firstIncompleteStep(app.store.activeProfile));
              },
              'primary',
              { class: 'btn-big', 'data-testid': 'finish-onboarding' },
            ),
            'calibration',
          ),
        ];
      }

      case 'done':
        return [
          h('h1', null, 'You are all set'),
          h('p', null, link('Go to the games', '#/', 'btn btn-primary')),
        ];
    }
  };

  show(firstIncompleteStep(app.store.activeProfile));
  return root;
};
