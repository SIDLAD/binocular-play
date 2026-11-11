// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { pauseMenu, stopForDoubleVision } from '../../src/app/components/safety';
import { canStartGame } from '../../src/core/safety/guards';
import { addReadyProfile, buttonByText, byTestId, click, flush, passParentGate, startApp, type TestApp } from '../app/helpers';

let t: TestApp;
afterEach(() => t?.app.dispose());

const guard = () => {
  const p = t.app.store.activeProfile;
  return canStartGame(p, p ? t.app.session.peek(p.id, t.clock.now.getTime()) : null, t.clock.now);
};

describe('rule 5 in the real app', () => {
  it('first launch shows the disclaimer before anything else, on every route that could lead to a game', () => {
    for (const path of ['', '#/', '#/play/falling-blocks', '#/settings', '#/colours']) {
      t = startApp({ path });
      expect(t.app.currentPath()).toBe('/onboarding');
      expect(byTestId(t.root, 'disclaimer').textContent).toContain('not a medical device');
      expect(t.root.textContent).toContain('Free. No ads, no account, no paywall, ever.');
      t.app.dispose();
    }
  });

  it('the evidence is reachable from the first screen, before agreeing to anything', () => {
    t = startApp();
    const link = t.root.querySelector('main a[href="#/evidence"]');
    expect(link).not.toBeNull();
    t.app.navigate('/evidence');
    expect(t.app.currentPath()).toBe('/evidence');
    expect(byTestId(t.root, 'negative-trials').textContent).toContain('not as good as patching');
  });

  it('home links to the evidence, the route resolves, and the page shows the negative trials', () => {
    t = startApp();
    addReadyProfile(t.app);
    t.app.navigate('/');
    expect(t.root.querySelector('h1')?.textContent).toContain('Hi Sam');
    const links = [...t.root.querySelectorAll('a[href="#/evidence"]')];
    expect(links.length).toBeGreaterThanOrEqual(2); // the home button and the footer
    t.app.navigate('/evidence');
    const negative = byTestId(t.root, 'negative-trials');
    expect(negative.textContent).toContain('Only 22% of the children played');
    expect(negative.querySelectorAll('a[href^="https://"]').length).toBeGreaterThan(3);
    // Negative results come before the positive ones on the page.
    const positive = t.root.querySelector('#positive') as HTMLElement;
    expect(negative.compareDocumentPosition(positive) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('every page carries the disclaimer and the evidence link in its footer', () => {
    t = startApp();
    addReadyProfile(t.app, 'adult');
    for (const path of ['/', '/colours', '/settings', '/profiles', '/parent', '/evidence', '/treatments', '/stopped', '/onboarding']) {
      t.app.navigate(path);
      const footer = t.root.querySelector('footer');
      expect(footer?.textContent, path).toContain('not a medical device');
      expect(footer?.querySelector('a[href="#/evidence"]'), path).not.toBeNull();
    }
  });

  it('onboarding: a "yes" answer leads to the doctor-first screen and needs the tick and the parent gate', async () => {
    t = startApp();
    click(byTestId(t.root, 'accept-disclaimer'));
    click(buttonByText(t.root, 'Next')); // who is playing
    expect(t.root.querySelector('h1')?.textContent).toContain('safety questions');

    const next = byTestId(t.root, 'screening-next') as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    click(t.root.querySelector('[data-question="eyeTurn"] [data-value="yes"]'));
    click(t.root.querySelector('[data-question="everDouble"] [data-value="no"]'));
    click(t.root.querySelector('[data-question="clinicianOk"] [data-value="yes"]'));
    expect(next.disabled).toBe(false);
    click(next);

    expect(byTestId(t.root, 'doctor-first').textContent).toContain('double vision');
    const go = byTestId(t.root, 'doctor-continue') as HTMLButtonElement;
    expect(go.disabled).toBe(true);
    click(go); // does nothing without the tick
    await flush();
    expect(t.app.store.activeProfile?.onboarding.screening.parentConfirmedAt).toBeNull();

    // Reloading does not get round it: onboarding resumes on the same screen.
    t.app.rerender();
    expect(byTestId(t.root, 'doctor-first')).toBeTruthy();
    expect(guard()).toEqual({ ok: false, reason: 'screening' });

    const tick = byTestId(t.root, 'clinician-tick') as HTMLInputElement;
    tick.checked = true;
    tick.dispatchEvent(new Event('change'));
    click(byTestId(t.root, 'doctor-continue'));
    await flush();
    expect(t.app.store.activeProfile?.onboarding.screening.parentConfirmedAt).toBeNull(); // gate is open, not passed
    await passParentGate();
    expect(t.app.store.activeProfile?.onboarding.screening.parentConfirmedAt).not.toBeNull();
    expect(t.root.querySelector('h1')?.textContent).toContain('Which glasses');
  });

  it('onboarding: the whole happy path ends on the home screen, and only then can a game start', () => {
    t = startApp();
    click(byTestId(t.root, 'accept-disclaimer'));
    expect(guard()).toEqual({ ok: false, reason: 'screening' });
    click(buttonByText(t.root, 'Next'));
    for (const q of ['eyeTurn', 'everDouble']) click(t.root.querySelector(`[data-question="${q}"] [data-value="no"]`));
    click(t.root.querySelector('[data-question="clinicianOk"] [data-value="yes"]'));
    click(byTestId(t.root, 'screening-next'));
    click(t.root.querySelector('[data-value="red-blue"]'));
    click(buttonByText(t.root, 'Next'));
    click(t.root.querySelector('[data-value="right"]')); // red lens on the right
    click(buttonByText(t.root, 'Next'));
    click(t.root.querySelector('[data-value="right"]')); // weak eye right
    click(buttonByText(t.root, 'Next'));
    expect(guard()).toEqual({ ok: false, reason: 'onboarding' });
    click(byTestId(t.root, 'skip-calibration'));
    click(byTestId(t.root, 'finish-onboarding'));

    expect(t.app.currentPath()).toBe('/');
    const p = t.app.store.activeProfile;
    expect(p?.vision).toEqual({ glasses: 'red-blue', redLensEye: 'right', weakEye: 'right', background: 'dark' });
    expect(p?.calibration.otherLens.base).toBe('#0000ff');
    expect(guard()).toEqual({ ok: false, reason: 'session-check' });
  });

  it('the play route asks "Do you see double?" first; "yes" blocks play for the day', () => {
    t = startApp();
    addReadyProfile(t.app);
    t.app.navigate('/play/falling-blocks');
    expect(byTestId(t.root, 'double-vision-check').textContent).toContain('Do you see double right now?');
    click(byTestId(t.root, 'check-yes'));

    expect(t.app.currentPath()).toBe('/stopped');
    expect(byTestId(t.root, 'stop-guidance').textContent).toContain('tell your eye doctor');
    expect(guard()).toEqual({ ok: false, reason: 'blocked-today' });
    expect(t.app.store.activeProfile?.safety.events.map((e) => e.kind)).toEqual(['double-at-check']);

    // Going back to the game does not get round the block.
    t.app.navigate('/play/falling-blocks');
    expect(t.app.currentPath()).toBe('/stopped');
    t.app.navigate('/');
    expect(byTestId(t.root, 'blocked-notice')).toBeTruthy();

    // The next day the check is asked again.
    t.clock.now = new Date(2026, 10, 12, 9, 0, 0);
    t.app.navigate('/play/falling-blocks');
    expect(byTestId(t.root, 'double-vision-check')).toBeTruthy();
  });

  it('"No" passes the check for this session only', () => {
    t = startApp();
    addReadyProfile(t.app);
    t.app.navigate('/play/falling-blocks');
    click(byTestId(t.root, 'check-no'));
    expect(guard()).toEqual({ ok: true });
    expect(t.root.querySelector('[data-testid="double-vision-check"]')).toBeNull();
    t.clock.now = new Date(t.clock.now.getTime() + 31 * 60 * 1000);
    expect(guard()).toEqual({ ok: false, reason: 'session-check' });
  });

  it('the pause menu has an "I see double / my eyes hurt" button that ends play and blocks it', () => {
    t = startApp();
    addReadyProfile(t.app);
    const id = t.app.store.activeProfile?.id ?? '';
    t.app.session.passCheck(id, t.clock.now.getTime());
    expect(guard()).toEqual({ ok: true });

    let ended = 0;
    const menu = pauseMenu({
      onResume() {},
      onAdjustColours() {},
      onRestart() {},
      onQuit() {},
      onStop: () => {
        ended++;
        stopForDoubleVision(t.app, 'double-or-pain-in-game');
      },
    });
    const stop = byTestId(menu, 'stop-double');
    expect(stop.textContent).toBe('I see double / my eyes hurt');
    expect(byTestId(menu, 'adjust-colours')).toBeTruthy();
    click(stop);

    expect(ended).toBe(1);
    expect(guard()).toEqual({ ok: false, reason: 'blocked-today' });
    expect(t.app.currentPath()).toBe('/stopped');
    expect(t.app.store.activeProfile?.safety.events.at(-1)?.kind).toBe('double-or-pain-in-game');
  });

  it('a grown-up can undo a mis-tap through the parent gate', async () => {
    t = startApp();
    addReadyProfile(t.app);
    stopForDoubleVision(t.app, 'double-at-check');
    t.app.navigate('/parent');
    expect(t.root.querySelector('[data-testid="unblock"]')).toBeNull(); // locked for a child profile
    click(byTestId(t.root, 'unlock'));
    await flush();
    await passParentGate();
    click(byTestId(t.root, 'unblock'));
    await flush();
    click(buttonByText(document.querySelector('.dialog') as HTMLElement, 'It was a mis-tap'));
    await flush();
    expect(t.app.store.activeProfile?.safety.doubleVisionBlockedOn).toBeNull();
    expect(t.app.store.activeProfile?.safety.events.at(-1)?.kind).toBe('block-cleared-by-parent');
  });
});
