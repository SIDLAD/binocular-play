import { MIN_CONTRAST } from '../../core/settings/schema';
import { drawPreview } from '../components/art';
import { channelCanvas } from '../components/channelCanvas';
import { page } from '../components/footer';
import { button, h } from '../dom';
import type { Screen } from '../router';

/** Balance checks are offered again after a week. */
export const BALANCE_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

export function balanceDue(checkedAt: string | null, now: Date): boolean {
  return checkedAt === null || now.getTime() - Date.parse(checkedAt) >= BALANCE_EVERY_MS;
}

/**
 * The weekly balance check: the onboarding balance screen again. The level chosen here is
 * also the ceiling for the optional slow contrast rise.
 */
export const balanceScreen: Screen = (app, _params, scope) => {
  const profile = app.store.activeProfile;
  if (!profile) return h('div', null);
  let value = Math.round(profile.fellowContrast * 100);
  const preview = channelCanvas(app.palette, scope, {
    width: 720,
    height: 240,
    className: 'preview',
    label: 'Preview: a circle for the weaker eye and a square for the stronger eye.',
    draw: drawPreview,
  });
  const slider = h('input', { type: 'range', min: String(MIN_CONTRAST * 100), max: '100', step: '1', value: String(value), 'aria-label': 'Strong-eye brightness' });
  const out = h('output', null, `${value}%`);
  const status = h('p', { role: 'status' });
  const set = (v: number) => {
    value = Math.max(MIN_CONTRAST * 100, Math.min(100, Math.round(v)));
    slider.value = String(value);
    out.textContent = `${value}%`;
    status.textContent = '';
    app.store.updateActive((p) => {
      p.fellowContrast = value / 100;
    });
  };
  slider.addEventListener('input', () => set(Number(slider.value)));

  return page(
    'Balance check',
    [
      h('p', null, 'Glasses on, both eyes open. The circle is for the weaker eye; the square is for the stronger eye.'),
      preview.el,
      h(
        'p',
        null,
        h('strong', null, 'Slide up slowly until the circle starts to fade, then back down to where you see both clearly. '),
        'That is the highest comfortable level. If your eye doctor gave you a number, use that instead.',
      ),
      h(
        'div',
        { class: 'slider-row' },
        button('−', () => set(value - 1), 'plain', { class: 'btn-small', 'aria-label': 'Down 1' }),
        slider,
        button('+', () => set(value + 1), 'plain', { class: 'btn-small', 'aria-label': 'Up 1' }),
        out,
      ),
      button(
        'Save this level',
        () => {
          app.store.updateActive((p) => {
            const from = p.autoContrast.log.at(-1)?.to ?? p.fellowContrast;
            p.fellowContrast = value / 100;
            p.autoContrast.balanceMax = value / 100;
            p.autoContrast.balanceCheckedAt = app.now().toISOString();
            p.autoContrast.log.push({ at: app.now().toISOString(), from, to: value / 100, reason: 'balance-check' });
          });
          status.textContent = 'Saved.';
        },
        'primary',
        { 'data-testid': 'save-balance' },
      ),
      status,
    ],
    { back: '/' },
  );
};
