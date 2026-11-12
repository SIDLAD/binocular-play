import { PRESETS } from '../../core/colour/presets';
import { checkSeparation } from '../../core/colour/separation';
import { MIN_CONTRAST, defaultCalibration } from '../../core/settings/schema';
import type { App } from '../app';
import { button, clear, h, type Scope } from '../dom';
import { drawPreview } from './art';
import { openCalibration, openEyeTest } from './calibration';
import { channelCanvas } from './channelCanvas';
import { colourControl, type EyeGuide } from './colourControl';
import { colourSeenOnlyThrough, otherEye, otherKey, type ColourKey } from '../../core/colour/mapping';
import { confirmDialog } from './dialogs';

/**
 * The colour editor. The same component is the Colours page and the "Adjust colours"
 * sheet in the pause menu (where the paused game behind it is the live preview).
 * Every change is written to the store at once, so whatever is on screen repaints
 * immediately: there is no Save button and no reload.
 */
export function colourEditor(app: App, scope: Scope, options: { sheet: boolean; onClose?: () => void }): HTMLElement {
  const root = h('div', { class: 'colour-editor' });
  let inner = scope.child();

  const build = () => {
    inner.dispose();
    inner = scope.child();
    clear(root);
    const profile = app.store.activeProfile;
    if (!profile) return;
    const preset = PRESETS[profile.vision.glasses];
    const background = profile.vision.background;

    const warnings = h('div', { 'aria-live': 'polite' });
    const renderWarnings = () => {
      clear(warnings);
      const p = app.store.activeProfile;
      if (!p) return;
      if (p.calibration.needsCheck) {
        warnings.appendChild(
          h('div', { class: 'notice' }, h('p', null, 'These colours came from another device. Check them on this screen: run the colour check below.')),
        );
      }
    };
    renderWarnings();
    inner.onDispose(app.store.subscribe(renderWarnings));

    const lensName = (k: ColourKey) => (k === 'red' ? 'red' : preset.otherName);
    const guideFor = (key: ColourKey): EyeGuide => {
      // The lens this colour must pass (on a light background it is the opposite lens).
      const seesLens = colourSeenOnlyThrough(key, background);
      const seesEye = seesLens === 'red' ? profile.vision.redLensEye : otherEye(profile.vision.redLensEye);
      return {
        sees: seesEye.toUpperCase(),
        hidden: otherEye(seesEye).toUpperCase(),
        seesLens: lensName(seesLens),
        hiddenLens: lensName(otherKey(seesLens)),
        seesIsWeak: seesEye === profile.vision.weakEye,
      };
    };
    const issuesFor = (key: ColourKey) => {
      const p = app.store.activeProfile;
      return p ? checkSeparation(p).filter((i) => i.colour === key).map((i) => i.kind) : [];
    };

    const red = colourControl({
      title: 'Red lens colour',
      background,
      eyes: guideFor('red'),
      issues: () => issuesFor('red'),
      get: () => app.store.activeProfile?.calibration.redLens ?? { base: preset.redLens, brightness: 1 },
      set: (c) =>
        app.store.updateActive((p) => {
          p.calibration.redLens = c;
        }),
    });
    const other = colourControl({
      title: `${preset.otherName[0].toUpperCase()}${preset.otherName.slice(1)} lens colour`,
      background,
      eyes: guideFor('other'),
      issues: () => issuesFor('other'),
      get: () => app.store.activeProfile?.calibration.otherLens ?? { base: preset.otherLens, brightness: 1 },
      set: (c) =>
        app.store.updateActive((p) => {
          p.calibration.otherLens = c;
        }),
    });

    const percentSlider = (
      label: string,
      help: string,
      min: number,
      read: () => number,
      write: (v: number) => void,
    ): HTMLElement => {
      const input = h('input', { type: 'range', min: String(Math.round(min * 100)), max: '100', step: '1', 'aria-label': label });
      const out = h('output', null, '');
      const sync = () => {
        input.value = String(Math.round(read() * 100));
        out.textContent = `${Math.round(read() * 100)}%`;
      };
      input.addEventListener('input', () => {
        write(Number(input.value) / 100);
        sync();
      });
      sync();
      return h('div', { class: 'setting' }, h('div', { class: 'label' }, label), h('div', { class: 'help' }, help), h('div', { class: 'slider-row' }, input, out));
    };

    const sliders = h(
      'div',
      { class: 'card' },
      percentSlider(
        'Strong-eye brightness',
        'Dims only what the stronger eye sees, so the weaker eye is not ignored. Lower it until both shapes are easy to see together. Your eye doctor may give you a number. Roughly the share of light; no screen is exact.',
        MIN_CONTRAST,
        () => app.store.activeProfile?.fellowContrast ?? 1,
        (v) =>
          app.store.updateActive((p) => {
            p.fellowContrast = v;
          }),
      ),
      percentSlider(
        'Frame brightness',
        'The grey frame and grid that both eyes see.',
        0.1,
        () => app.store.activeProfile?.calibration.bothBrightness ?? 0.6,
        (v) =>
          app.store.updateActive((p) => {
            p.calibration.bothBrightness = v;
          }),
      ),
    );

    const tools = h(
      'div',
      { class: 'actions' },
      button('Check with hidden numbers', () => openEyeTest(app, inner, build), 'primary'),
      button('Guided set-up', () => openCalibration(app, inner, build)),
      button('Reset to preset', async () => {
        const ok = await confirmDialog(
          app,
          'Reset the colours?',
          `This puts both colours back to the starting values for ${preset.label.toLowerCase()} glasses.`,
          'Reset',
        );
        if (!ok) return;
        app.store.updateActive((p) => {
          p.calibration = defaultCalibration(p.vision.glasses);
        });
        build();
      }),
      options.onClose ? button('Done', options.onClose, 'primary') : null,
    );

    if (!options.sheet) {
      const preview = channelCanvas(app.palette, inner, {
        width: 720,
        height: 260,
        className: 'preview',
        label: 'Preview: a circle for the weaker eye, a square for the stronger eye, and a frame for both.',
        draw: drawPreview,
      });
      root.appendChild(preview.el);
      root.appendChild(
        h(
          'p',
          { class: 'muted small' },
          `Circle: your weaker (${profile.vision.weakEye}) eye. Square: your stronger eye. Frame: both eyes. Changes are saved as you make them.`,
        ),
      );
    }
    root.appendChild(warnings);
    if (options.sheet) root.appendChild(tools);
    root.appendChild(
      h(
        'p',
        { class: 'cover-intro' },
        h('strong', null, 'Tune one colour at a time, with one eye covered.'),
        ' Keep your glasses on and cover one eye with your hand (not the lens). Each colour card below tells you which eye to cover.',
      ),
    );
    root.appendChild(h('div', { class: 'colour-grid' }, red.el, other.el));
    root.appendChild(sliders);
    if (!options.sheet) root.appendChild(tools);
  };

  build();
  return root;
}
