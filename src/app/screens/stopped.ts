import { isBlockedToday } from '../../core/safety/guards';
import { page } from '../components/footer';
import { stopGuidance } from '../components/safety';
import { h, link } from '../dom';
import type { Screen } from '../router';

/** Shown after "I see double" or "my eyes hurt". */
export const stoppedScreen: Screen = (app) => {
  const profile = app.store.activeProfile;
  const blocked = profile ? isBlockedToday(profile, app.now()) : false;
  return page(
    'Time to stop',
    [
      h(
        'div',
        { class: 'notice', 'data-testid': 'stop-guidance' },
        h('p', null, h('strong', null, 'You did the right thing by telling us.')),
        stopGuidance(),
      ),
      blocked
        ? h('p', null, 'The games are locked for the rest of today for this player.')
        : h('p', null, 'The games are not locked right now.'),
      h('p', { class: 'muted' }, 'Grown-ups: if that was a mis-tap, you can unlock the games under "For grown-ups".'),
      h('div', { class: 'row' }, link('Home', '#/', 'btn btn-primary'), link('For grown-ups', '#/parent', 'btn btn-plain'), link('Read about the risks', '#/evidence', 'btn btn-plain')),
    ],
    { back: '/' },
  );
};
