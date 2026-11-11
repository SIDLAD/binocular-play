import { canStartGame } from '../../core/safety/guards';
import { findGame } from '../../games/registry';
import { page } from '../components/footer';
import { doubleVisionCheck } from '../components/safety';
import { h, link } from '../dom';
import type { Screen } from '../router';

/**
 * The play route. Whether a game may start is decided by canStartGame() and nothing else
 * (hard rule 5).
 */
export const playScreen: Screen = (app, params) => {
  const profile = app.store.activeProfile;
  const guard = canStartGame(profile, profile ? app.session.peek(profile.id, app.now().getTime()) : null, app.now());

  if (!guard.ok) {
    switch (guard.reason) {
      case 'session-check':
        return page('Ready to play?', [doubleVisionCheck(app, () => app.rerender())], { back: '/' });
      case 'blocked-today':
        app.navigate('/stopped');
        return h('div', null);
      default:
        app.navigate('/onboarding');
        return h('div', null);
    }
  }

  const def = findGame(params.id ?? '');
  if (!def) {
    return page('Game not found', [h('p', null, 'That game does not exist.'), link('Back to the games', '#/', 'btn btn-primary')], { back: '/' });
  }
  return page(def.title, [h('p', null, def.blurb)], { back: '/' });
};
