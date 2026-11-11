import { createApp, type App } from '../../src/app/app';
import { OPEN_ROUTES, ROUTES } from '../../src/app/routes';
import { applyOnboarding } from '../../src/core/safety/screening';
import { MemoryStorage } from '../../src/core/settings/store';

export const NOW = new Date(2026, 10, 11, 16, 0, 0);

export interface TestApp {
  app: App;
  root: HTMLElement;
  storage: MemoryStorage;
  clock: { now: Date };
}

/** Starts the real app in jsdom with in-memory storage and a controllable clock. */
export function startApp(options: { storage?: MemoryStorage; path?: string } = {}): TestApp {
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = options.path ?? '';
  const root = document.getElementById('app') as HTMLElement;
  const storage = options.storage ?? new MemoryStorage();
  const clock = { now: NOW };
  const app = createApp(root, {
    storage,
    sessionStorage: new MemoryStorage(),
    routes: ROUTES,
    openRoutes: OPEN_ROUTES,
    now: () => clock.now,
  });
  app.gateHoldMs = 0;
  return { app, root, storage, clock };
}

/** Adds a player who has finished onboarding with no risk flags. */
export function addReadyProfile(app: App, kind: 'child' | 'adult' = 'child'): string {
  const p = app.store.addProfile({ name: 'Sam', kind });
  app.store.updateProfile(p.id, (d) => {
    applyOnboarding(d, { type: 'acceptDisclaimer' }, NOW);
    applyOnboarding(d, { type: 'answerScreening', eyeTurn: false, everDouble: false, clinicianOk: true }, NOW);
    applyOnboarding(d, { type: 'complete' }, NOW);
  });
  return p.id;
}

export function byTestId(root: ParentNode, id: string): HTMLElement {
  const el = root.querySelector(`[data-testid="${id}"]`);
  if (!(el instanceof HTMLElement)) throw new Error(`No element with data-testid="${id}"`);
  return el;
}

export function click(el: Element | null | undefined): void {
  if (!(el instanceof HTMLElement)) throw new Error('Nothing to click');
  el.click();
}

export function buttonByText(root: ParentNode, text: string): HTMLButtonElement {
  const found = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim().includes(text));
  if (!found) throw new Error(`No button containing "${text}"`);
  return found;
}

/** Lets promise chains (dialogs, the parent gate) settle. */
export async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

/** Presses and holds the parent gate (the hold time is 0 ms in tests). */
export async function passParentGate(): Promise<void> {
  const hold = byTestId(document, 'parent-hold');
  hold.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  await flush();
}
