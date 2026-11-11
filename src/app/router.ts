import type { App } from './app';
import type { Scope } from './dom';

/** A screen builds its DOM once and registers clean-up on the scope. */
export type Screen = (app: App, params: Record<string, string>, scope: Scope) => HTMLElement;

export interface RouteMatch {
  pattern: string;
  screen: Screen;
  params: Record<string, string>;
}

/** Matches "/play/:id"-style patterns against a hash path. */
export function matchRoute(routes: Record<string, Screen>, path: string): RouteMatch | null {
  const parts = path.split('?')[0].split('/').filter(Boolean);
  for (const [pattern, screen] of Object.entries(routes)) {
    const want = pattern.split('/').filter(Boolean);
    if (want.length !== parts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < want.length; i++) {
      if (want[i].startsWith(':')) {
        try {
          params[want[i].slice(1)] = decodeURIComponent(parts[i]);
        } catch {
          ok = false;
        }
      } else if (want[i] !== parts[i]) ok = false;
      if (!ok) break;
    }
    if (ok) return { pattern, screen, params };
  }
  return null;
}
