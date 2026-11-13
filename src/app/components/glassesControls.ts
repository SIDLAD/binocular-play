import { otherEye, type Eye } from '../../core/colour/mapping';
import { GLASSES, PRESETS, type Glasses } from '../../core/colour/presets';
import { defaultCalibration } from '../../core/settings/schema';
import type { App } from '../app';
import { button, h, type Child } from '../dom';
import { confirmDialog } from './dialogs';

/**
 * Which glasses, and which eye the red lens is on. Shared by the Settings page and the
 * colour editor (Colours page and the pause-menu sheet), so both behave the same:
 * changing the glasses type asks first and resets the colours to that preset.
 */

export function setting(label: string, help: string | null, control: Child): HTMLElement {
  return h('div', { class: 'setting' }, h('div', { class: 'label' }, label), help ? h('div', { class: 'help' }, help) : null, control);
}

export interface ToggleGroup<T extends string> {
  el: HTMLElement;
  /** Shows `value` as the pressed option without calling `onPick`. */
  set(value: T): void;
}

export function toggleGroup<T extends string>(
  label: string,
  options: { value: T; label: string }[],
  current: T,
  onPick: (v: T) => void,
): ToggleGroup<T> {
  const el = h('div', { class: 'row', role: 'group', 'aria-label': label });
  const set = (value: T) => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].value === value)));
  const buttons = options.map((o) =>
    button(
      o.label,
      () => {
        set(o.value);
        onPick(o.value);
      },
      'plain',
      { 'aria-pressed': String(o.value === current), 'data-value': o.value },
    ),
  );
  el.append(...buttons);
  return { el, set };
}

export function select<T extends string>(label: string, options: { value: T; label: string }[], current: T, onPick: (v: T) => void): HTMLSelectElement {
  const el = h('select', { 'aria-label': label }, ...options.map((o) => h('option', { value: o.value }, o.label)));
  el.value = current;
  el.addEventListener('change', () => onPick(el.value as T));
  return el;
}

const EYES: { value: Eye; label: string }[] = [
  { value: 'left', label: 'Left eye' },
  { value: 'right', label: 'Right eye' },
];

export interface GlassesControls {
  glasses: HTMLElement;
  redLens: HTMLElement;
  /** Re-reads the store (after a change made somewhere else). */
  sync(): void;
}

/** `onChange` runs after every change that was actually made. */
export function glassesControls(app: App, onChange: () => void, options: { swapButton?: boolean } = {}): GlassesControls | null {
  const profile = app.store.activeProfile;
  if (!profile) return null;

  const glasses = select<Glasses>(
    'Glasses type',
    GLASSES.map((g) => ({ value: g, label: PRESETS[g].label })),
    profile.vision.glasses,
    async (v) => {
      const current = app.store.activeProfile?.vision.glasses;
      if (v === current) return;
      const ok = await confirmDialog(
        app,
        'Change glasses type?',
        'The colours will go back to the starting values for the new glasses, so you will need to set them up again.',
        'Change',
      );
      if (!ok) {
        if (current) glasses.value = current;
        return;
      }
      app.store.updateActive((p) => {
        p.vision.glasses = v;
        p.calibration = defaultCalibration(v);
      });
      onChange();
    },
  );

  const setRedLens = (eye: Eye) => {
    app.store.updateActive((p) => {
      p.vision.redLensEye = eye;
    });
    side.set(eye);
    onChange();
  };
  const side = toggleGroup('Red lens side', EYES, profile.vision.redLensEye, (v) => {
    if (v !== app.store.activeProfile?.vision.redLensEye) setRedLens(v);
  });
  const swap = options.swapButton
    ? button(
        'Swap sides',
        () => {
          const p = app.store.activeProfile;
          if (p) setRedLens(otherEye(p.vision.redLensEye));
        },
        'plain',
        { 'data-testid': 'swap-lens-sides' },
      )
    : null;
  if (swap) side.el.appendChild(swap);

  return {
    glasses: setting('Glasses type', null, glasses),
    redLens: setting('Red lens is on the', null, side.el),
    sync() {
      const p = app.store.activeProfile;
      if (!p) return;
      glasses.value = p.vision.glasses;
      side.set(p.vision.redLensEye);
    },
  };
}
