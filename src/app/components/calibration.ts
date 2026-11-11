import { colourSeenOnlyThrough, lensOverEye, otherEye, type Eye } from '../../core/colour/mapping';
import { NEUTRAL_PALETTE, resolvePalette, type Palette } from '../../core/colour/palette';
import { PRESETS } from '../../core/colour/presets';
import type { Channel, Renderer } from '../../engine/api';
import type { App } from '../app';
import { button, clear, h, type Child, type Scope } from '../dom';
import { drawPreview } from './art';
import { channelCanvas, type LivePalette } from './channelCanvas';

/**
 * Guided colour set-up and the hidden-number check.
 *
 * Both run full-screen on the real game background, with nothing drawn around the test
 * shapes. They check the SCREEN and the GLASSES. They are not a test of anyone's eyes.
 */

/** The player's palette with the fellow eye at full strength: the strictest case for leaks. */
export function testPalette(app: App): LivePalette {
  return {
    get current(): Palette {
      const p = app.store.activeProfile;
      return p ? resolvePalette({ vision: p.vision, calibration: p.calibration, fellowContrast: 1 }) : NEUTRAL_PALETTE;
    },
    subscribe: (fn) => app.palette.subscribe(fn),
  };
}

const MIN_STEPS = 51; // 20 %: the guided step never lets a colour vanish for its own eye

type Outcome = 'ok' | 'leak' | 'dim' | 'swapped';

interface Flow {
  app: App;
  scope: Scope;
  panel: HTMLElement;
  setDraw(draw: (r: Renderer) => void): void;
  close(completed: boolean): void;
}

function openFullscreen(app: App, parent: Scope, label: string, onClose: (completed: boolean) => void): Flow {
  const scope = parent.child();
  let draw: (r: Renderer) => void = () => {};
  const stage = h('div', { class: 'stage' });
  const panel = h('div', { class: 'panel-inner' });
  const root = h(
    'div',
    { class: 'fullscreen', role: 'dialog', 'aria-modal': 'true', 'aria-label': label },
    stage,
    h('div', { class: 'panel' }, panel),
  );
  app.overlayRoot.appendChild(root);
  const canvas = channelCanvas(testPalette(app), scope, { fill: true, draw: (r) => draw(r) });
  stage.appendChild(canvas.el);
  canvas.redraw();
  let open = true;
  return {
    app,
    scope,
    panel,
    setDraw(fn) {
      draw = fn;
      canvas.redraw();
    },
    close(completed) {
      if (!open) return;
      open = false;
      scope.dispose();
      root.remove();
      onClose(completed);
    },
  };
}

function setPanel(flow: Flow, ...content: (Child | Child[])[]): void {
  clear(flow.panel);
  for (const c of content.flat()) {
    if (c === null || c === undefined || c === false) continue;
    flow.panel.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  const heading = flow.panel.querySelector('h2');
  if (heading instanceof HTMLElement) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

function channelOfEye(app: App, eye: Eye): Channel {
  return app.store.activeProfile?.vision.weakEye === eye ? 'weakEye' : 'fellowEye';
}

const upper = (eye: Eye) => eye.toUpperCase();

function leakTips(): HTMLElement {
  return h(
    'details',
    null,
    h('summary', null, 'It will not disappear'),
    h(
      'ul',
      { class: 'small' },
      h('li', null, 'Turn off night light, True Tone, blue-light filters and automatic brightness. They change the colours.'),
      h('li', null, 'Check the glasses are on the right way round and close to your eyes.'),
      h('li', null, 'Cheap card glasses often let some of the wrong colour through. Glasses with darker, better-quality filters separate the colours better.'),
      h('li', null, 'On the Colours page you can also move the colour itself on a wheel, which sometimes removes a ghost that brightness cannot.'),
      h('li', null, 'A faint ghost is common. The games still work; they work best when each eye sees only its own shapes.'),
    ),
  );
}

/** One "make it disappear" step for the eye that is closed. */
function adjustStep(flow: Flow, closed: Eye, onNext: () => void, onBack: () => void): void {
  const { app } = flow;
  const profile = app.store.activeProfile;
  if (!profile) return flow.close(false);
  const open = otherEye(closed);
  const vanish = channelOfEye(app, closed);
  const stay = channelOfEye(app, open);
  const key = colourSeenOnlyThrough(lensOverEye(profile.vision, closed), profile.vision.background);
  const field = key === 'red' ? 'redLens' : 'otherLens';

  flow.setDraw((r) => {
    const size = Math.min(r.width * 0.16, r.height * 0.3);
    const cy = r.height / 2;
    r.circle(stay, r.width * 0.3, cy, size);
    r.rect(vanish, r.width * 0.7 - size, cy - size, size * 2, size * 2);
  });

  const slider = h('input', { type: 'range', min: String(MIN_STEPS), max: '255', step: '1', 'aria-label': 'Brightness of the square' });
  const readout = h('output', null, '');
  const sync = () => {
    const b = app.store.activeProfile?.calibration[field].brightness ?? 1;
    slider.value = String(Math.round(b * 255));
    readout.textContent = `${Math.round(b * 100)}%`;
  };
  const set = (steps: number) => {
    const clamped = Math.max(MIN_STEPS, Math.min(255, Math.round(steps)));
    app.store.updateActive((p) => {
      p.calibration[field].brightness = clamped / 255;
    });
    sync();
  };
  slider.addEventListener('input', () => set(Number(slider.value)));
  sync();

  setPanel(
    flow,
    h('h2', null, `Cover your ${upper(closed)} eye`),
    h(
      'p',
      null,
      `Cover your ${closed} eye with your hand (do not press on it) and look with your ${open} eye. You should see the circle clearly.`,
    ),
    h(
      'p',
      null,
      h('strong', null, 'Can you also see a square? '),
      'Slide down until the square just disappears, then stop. If there is no square, leave the slider where it is.',
    ),
    h(
      'div',
      { class: 'slider-row' },
      button('−', () => set(Number(slider.value) - 1), 'plain', { class: 'btn-small', 'aria-label': 'One step dimmer' }),
      slider,
      button('+', () => set(Number(slider.value) + 1), 'plain', { class: 'btn-small', 'aria-label': 'One step brighter' }),
      readout,
    ),
    leakTips(),
    h('div', { class: 'actions' }, button('Next', onNext, 'primary'), button('Back', onBack)),
  );
}

function randomDigits(): [number, number] {
  const a = 2 + Math.floor(Math.random() * 8);
  let b = 2 + Math.floor(Math.random() * 8);
  while (b === a) b = 2 + Math.floor(Math.random() * 8);
  return [a, b];
}

/** One hidden-number round. Each number is drawn for one eye only. */
function numberRound(flow: Flow, closed: Eye, onAnswer: (o: Outcome) => void): void {
  const { app } = flow;
  const open = otherEye(closed);
  const [forOpen, forClosed] = randomDigits();
  const openOnLeft = Math.random() < 0.5;
  const openChannel = channelOfEye(app, open);
  const closedChannel = channelOfEye(app, closed);

  flow.setDraw((r) => {
    const size = Math.min(r.width * 0.3, r.height * 0.7);
    const y = r.height / 2;
    const xa = r.width * 0.3;
    const xb = r.width * 0.7;
    r.text(openChannel, String(forOpen), openOnLeft ? xa : xb, y, { size, align: 'center', bold: true });
    r.text(closedChannel, String(forClosed), openOnLeft ? xb : xa, y, { size, align: 'center', bold: true });
  });

  const options: [string, Outcome][] = [
    [String(forOpen), 'ok'],
    [String(forClosed), 'swapped'],
  ];
  options.sort((a, b) => Number(a[0]) - Number(b[0]));
  setPanel(
    flow,
    h('h2', null, `Cover your ${upper(closed)} eye`),
    h('p', null, `Look with your ${open} eye only. Which number can you see?`),
    h(
      'div',
      { class: 'answers' },
      ...options.map(([label, outcome]) => button(label, () => onAnswer(outcome), 'plain', { class: 'btn-big' })),
      button('Both numbers', () => onAnswer('leak'), 'plain', { class: 'btn-big' }),
      button('No number', () => onAnswer('dim'), 'plain', { class: 'btn-big' }),
    ),
    h('p', { class: 'muted small' }, 'This checks your screen and glasses. It is not an eye test.'),
  );
}

function resultPanel(
  flow: Flow,
  outcomes: Outcome[],
  actions: { again: () => void; done: () => void; doneLabel: string; adjust?: () => void },
): void {
  const { app } = flow;
  flow.setDraw(drawPreview);
  const allOk = outcomes.every((o) => o === 'ok');
  const messages: Child[] = [];
  if (allOk) {
    messages.push(h('p', null, 'Each eye saw only its own number. The colours are set for this screen and these glasses.'));
  }
  if (outcomes.every((o) => o === 'swapped')) {
    messages.push(
      h(
        'p',
        null,
        'Each eye saw the number meant for the other eye. The lenses are probably the other way round from what is set.',
      ),
      button(
        'Swap the lens sides for me',
        () => {
          app.store.updateActive((p) => {
            p.vision.redLensEye = otherEye(p.vision.redLensEye);
          });
          actions.again();
        },
        'primary',
      ),
    );
  } else if (outcomes.includes('swapped')) {
    messages.push(h('p', null, 'One eye saw the wrong number. Check which eye the red lens is on, then try again.'));
  }
  if (outcomes.includes('leak')) {
    messages.push(
      h(
        'p',
        null,
        'One eye could see both numbers, so some colour is leaking through a lens. Adjust the colours again and lower the slider a little more.',
      ),
      leakTips(),
    );
  }
  if (outcomes.includes('dim')) {
    messages.push(
      h(
        'p',
        null,
        'One eye saw no number. The colour may be too dim: turn the screen brightness up, or adjust the colours again and raise the slider. If it keeps happening, ask your eye doctor before you play.',
      ),
    );
  }
  setPanel(
    flow,
    h('h2', null, allOk ? 'Colours look good' : 'Colours need a little more work'),
    ...messages,
    h(
      'div',
      { class: 'actions' },
      button(actions.doneLabel, actions.done, allOk ? 'primary' : 'plain'),
      actions.adjust ? button('Adjust again', actions.adjust, allOk ? 'plain' : 'primary') : null,
      button('Check the numbers again', actions.again),
    ),
  );
}

function runNumberCheck(flow: Flow, onResult: (outcomes: Outcome[]) => void): void {
  numberRound(flow, 'left', (first) => {
    numberRound(flow, 'right', (second) => onResult([first, second]));
  });
}

function markCalibrated(app: App): void {
  app.store.updateActive((p) => {
    p.calibration.calibratedAt = app.now().toISOString();
    p.calibration.needsCheck = false;
  });
}

/** The full guided set-up: tips → one "make it disappear" step per eye → hidden numbers. */
export function openCalibration(app: App, parent: Scope, onClose: (completed: boolean) => void): void {
  const flow = openFullscreen(app, parent, 'Colour set-up', onClose);
  const profile = app.store.activeProfile;
  if (!profile) return flow.close(false);
  const other = PRESETS[profile.vision.glasses].otherName;

  const intro = () => {
    flow.setDraw(drawPreview);
    setPanel(
      flow,
      h('h2', null, 'Set up your colours'),
      h('p', null, `Every screen and every pair of red/${other} glasses is a little different, so we tune the colours on this screen.`),
      h(
        'ol',
        null,
        h('li', null, 'Put the glasses on. If you wear normal glasses, put the coloured ones over them.'),
        h('li', null, 'Turn off night light, True Tone, blue-light filters and automatic brightness.'),
        h('li', null, 'Turn the screen brightness up and dim the room lights if you can.'),
      ),
      h('div', { class: 'actions' }, button('Start', () => left(), 'primary'), button('Not now', () => flow.close(false))),
    );
  };
  const left = () => adjustStep(flow, 'left', right, intro);
  const right = () => adjustStep(flow, 'right', check, left);
  const check = () =>
    runNumberCheck(flow, (outcomes) =>
      resultPanel(flow, outcomes, {
        again: check,
        adjust: left,
        doneLabel: outcomes.every((o) => o === 'ok') ? 'Done' : 'Carry on anyway',
        done: () => {
          markCalibrated(app);
          flow.close(true);
        },
      }),
    );
  intro();
}

/** Only the hidden-number check, from the Colours page. */
export function openEyeTest(app: App, parent: Scope, onClose: () => void): void {
  const flow = openFullscreen(app, parent, 'Colour check', () => onClose());
  if (!app.store.activeProfile) return flow.close(false);
  const check = () =>
    runNumberCheck(flow, (outcomes) =>
      resultPanel(flow, outcomes, {
        again: check,
        doneLabel: 'Close',
        done: () => {
          if (outcomes.every((o) => o === 'ok')) markCalibrated(app);
          flow.close(true);
        },
      }),
    );
  flow.setDraw(drawPreview);
  setPanel(
    flow,
    h('h2', null, 'Check your colours'),
    h('p', null, 'Put your glasses on. You will cover one eye at a time and say which number you can see.'),
    h('div', { class: 'actions' }, button('Start', check, 'primary'), button('Close', () => flow.close(false))),
  );
}
