import './app/styles/base.css';
import { createApp } from './app/app';
import { OPEN_ROUTES, ROUTES } from './app/routes';
import { MemoryStorage, type StorageLike } from './core/settings/store';

function safeStorage(get: () => Storage): StorageLike {
  try {
    const s = get();
    const probe = '__binocular-play-probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    // Blocked storage (some private modes): the app still runs, but nothing is kept.
    return new MemoryStorage();
  }
}

const root = document.getElementById('app');
if (root) {
  createApp(root, {
    storage: safeStorage(() => window.localStorage),
    sessionStorage: safeStorage(() => window.sessionStorage),
    routes: ROUTES,
    openRoutes: OPEN_ROUTES,
  });
}
