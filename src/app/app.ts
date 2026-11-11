import { createLivePalette } from '../core/colour/livePalette';
import type { PaletteSource } from '../core/colour/palette';
import { SessionManager } from '../core/safety/session';
import { SettingsStore, type StorageLike } from '../core/settings/store';
import { Scope, clear } from './dom';
import { matchRoute, type Screen } from './router';

/** Everything a screen needs. One per running app. */
export interface App {
  store: SettingsStore;
  palette: PaletteSource;
  session: SessionManager;
  root: HTMLElement;
  /** Where overlays (dialogs, the parent gate) are attached. */
  overlayRoot: HTMLElement;
  /** How long the parent gate must be held. Tests shorten it. */
  gateHoldMs: number;
  now(): Date;
  navigate(path: string): void;
  /** Rebuilds the current screen (after a settings change that alters its layout). */
  rerender(): void;
  currentPath(): string;
  dispose(): void;
}

export interface AppOptions {
  storage: StorageLike;
  sessionStorage: StorageLike | null;
  routes: Record<string, Screen>;
  /** Routes that work before onboarding is finished. */
  openRoutes: string[];
  now?: () => Date;
}

function hashPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash === '' ? '/' : hash;
}

export function createApp(root: HTMLElement, options: AppOptions): App {
  const store = new SettingsStore(options.storage);
  const palette = createLivePalette(store);
  const session = new SessionManager(options.sessionStorage);
  let scope = new Scope();
  let shown: string | null = null;

  const overlayRoot = document.createElement('div');
  overlayRoot.className = 'overlay-root';

  const render = () => {
    let path = hashPath();
    let match = matchRoute(options.routes, path);
    if (!match) {
      path = '/';
      match = matchRoute(options.routes, path);
    }
    if (!match) return;

    // First run, or a profile that has not finished onboarding: only the open routes work.
    const profile = store.activeProfile;
    const ready = profile !== null && profile.onboarding.completedAt !== null;
    if (!ready && !options.openRoutes.includes(match.pattern)) {
      app.navigate('/onboarding');
      return;
    }

    scope.dispose();
    const mine = new Scope();
    scope = mine;
    clear(root);
    clear(overlayRoot);
    shown = path;
    const el = match.screen(app, match.params, mine);
    // A screen may navigate away while it is being built; the newer render wins.
    if (scope !== mine) return;
    root.appendChild(el);
    root.appendChild(overlayRoot);
    if (typeof window.scrollTo === 'function') {
      try {
        window.scrollTo(0, 0);
      } catch {
        /* jsdom does not implement scrolling */
      }
    }
    const heading = el.querySelector('h1');
    if (heading instanceof HTMLElement) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  };

  const onHashChange = () => {
    if (hashPath() !== shown) render();
  };

  const app: App = {
    store,
    palette,
    session,
    root,
    overlayRoot,
    gateHoldMs: 3000,
    now: options.now ?? (() => new Date()),
    navigate(path: string) {
      if (hashPath() !== path) window.location.hash = path;
      render();
    },
    rerender: render,
    currentPath: hashPath,
    dispose() {
      window.removeEventListener('hashchange', onHashChange);
      scope.dispose();
      clear(root);
    },
  };

  window.addEventListener('hashchange', onHashChange);
  render();
  return app;
}
