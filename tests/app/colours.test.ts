// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { addReadyProfile, buttonByText, byTestId, click, flush, startApp, type TestApp } from './helpers';

let t: TestApp;
afterEach(() => t?.app.dispose());

const overlay = () => document.querySelector('.overlay-root') as HTMLElement;
const heading = () => overlay().querySelector('.fullscreen h2')?.textContent;
const hasAnswers = () => overlay().querySelector('[data-testid="answers"]') !== null;

describe('hidden-number check', () => {
  it('says which eye to cover before any number is shown', () => {
    t = startApp();
    addReadyProfile(t.app, 'adult');
    t.app.navigate('/colours');
    click(buttonByText(t.root, 'Check with hidden numbers'));
    click(buttonByText(overlay(), 'Start'));

    expect(heading()).toBe('Cover your LEFT eye');
    expect(hasAnswers()).toBe(false);
    click(byTestId(overlay(), 'covered'));
    expect(heading()).toBe('LEFT eye covered');
    expect(hasAnswers()).toBe(true);

    click(buttonByText(overlay(), 'Both numbers'));
    expect(heading()).toBe('Cover your RIGHT eye');
    expect(hasAnswers()).toBe(false);
    click(byTestId(overlay(), 'covered'));
    click(buttonByText(overlay(), 'Both numbers'));
    expect(heading()).toBe('Colours need a little more work');
  });

  it('the guided set-up also asks for the cover first', () => {
    t = startApp();
    addReadyProfile(t.app, 'adult');
    t.app.navigate('/colours');
    click(buttonByText(t.root, 'Guided set-up'));
    click(buttonByText(overlay(), 'Start'));
    expect(heading()).toBe('Cover your LEFT eye');
    expect(overlay().querySelector('input[type="range"]')).toBeNull();
    click(byTestId(overlay(), 'covered'));
    expect(heading()).toBe('LEFT eye covered');
    expect(overlay().querySelector('input[type="range"]')).not.toBeNull();
  });
});

describe('full screen on the intro screens', () => {
  it('without the Fullscreen API: a tip only, and the test still starts', () => {
    t = startApp();
    addReadyProfile(t.app, 'adult');
    t.app.navigate('/colours');
    click(buttonByText(t.root, 'Check with hidden numbers'));
    expect(overlay().querySelector('[data-testid="go-fullscreen"]')).toBeNull();
    expect(overlay().textContent).toContain('Make the browser window as big as you can');
    click(buttonByText(overlay(), 'Start'));
    expect(heading()).toBe('Cover your LEFT eye');
  });

  it('with it: a button that asks for full screen, and skipping it is fine', async () => {
    const calls: number[] = [];
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    document.documentElement.requestFullscreen = () => {
      calls.push(1);
      return Promise.reject(new Error('refused'));
    };
    try {
      t = startApp();
      addReadyProfile(t.app, 'adult');
      t.app.navigate('/colours');
      click(buttonByText(t.root, 'Guided set-up'));
      click(byTestId(overlay(), 'go-fullscreen'));
      await flush();
      expect(calls).toHaveLength(1);
      click(buttonByText(overlay(), 'Start')); // a refusal never blocks the test
      expect(heading()).toBe('Cover your LEFT eye');
    } finally {
      delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled;
    }
  });
});

describe('"Your glasses" on the Colours page', () => {
  it('swaps the lens sides and the colour cards follow', () => {
    t = startApp();
    addReadyProfile(t.app); // a child: the Colours page is open to every player
    t.app.navigate('/colours');
    const before = t.app.store.activeProfile?.vision.redLensEye;
    const firstCard = () => t.root.querySelector('.colour-control .eye-for')?.textContent;
    const cardBefore = firstCard();
    click(byTestId(t.root, 'swap-lens-sides'));
    const after = t.app.store.activeProfile?.vision.redLensEye;
    expect(after).not.toBe(before);
    expect(firstCard()).not.toBe(cardBefore);
    expect(t.root.querySelector(`[aria-label="Red lens side"] [data-value="${after}"]`)?.getAttribute('aria-pressed')).toBe('true');
  });

  it('changing the glasses type asks first, then resets the colours', async () => {
    t = startApp();
    addReadyProfile(t.app);
    t.app.navigate('/colours');
    const select = t.root.querySelector('[data-testid="your-glasses"] select') as HTMLSelectElement;
    const current = select.value;
    const next = [...select.options].map((o) => o.value).find((v) => v !== current) as string;
    t.app.store.updateActive((p) => {
      p.calibration.redLens.brightness = 0.5;
    });

    select.value = next;
    select.dispatchEvent(new Event('change'));
    await flush();
    click(buttonByText(document, 'Cancel'));
    await flush();
    expect(select.value).toBe(current);
    expect(t.app.store.activeProfile?.vision.glasses).toBe(current);

    select.value = next;
    select.dispatchEvent(new Event('change'));
    await flush();
    click(buttonByText(document, 'Change'));
    await flush();
    expect(t.app.store.activeProfile?.vision.glasses).toBe(next);
    expect(t.app.store.activeProfile?.calibration.redLens.brightness).toBe(1);
    expect(t.root.textContent).toContain('Which eye is weaker is set in');
  });
});
