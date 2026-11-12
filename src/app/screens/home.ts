import { secondsOnDay, currentStreak } from '../../core/progress/sessionLog';
import { isBlockedToday, localDay } from '../../core/safety/guards';
import { formatClock, remainingMs } from '../../core/safety/session';
import { gamesFor } from '../gameList';
import { balanceDue } from './balance';
import { drawAvatar } from '../components/art';
import { channelCanvas } from '../components/channelCanvas';
import { footer } from '../components/footer';
import { h, link } from '../dom';
import type { Screen } from '../router';

export const homeScreen: Screen = (app, _params, scope) => {
  const profile = app.store.activeProfile;
  if (!profile) return h('div', null);
  const now = app.now();

  const avatar = channelCanvas(app.palette, scope, { width: 32, height: 32, className: 'avatar', draw: (r) => drawAvatar(r, profile.avatar) });
  const session = app.session.peek(profile.id, now.getTime());
  const minutesToday = Math.round(secondsOnDay(profile, localDay(now)) / 60);
  const streak = currentStreak(profile, now);

  const notices: HTMLElement[] = [];
  if (isBlockedToday(profile, now)) {
    notices.push(
      h(
        'div',
        { class: 'notice', 'data-testid': 'blocked-notice' },
        h('p', null, h('strong', null, 'The games are resting today.'), ' Someone said they saw double or their eyes hurt.'),
        h('p', null, link('What to do now', '#/stopped')),
      ),
    );
  }
  if (profile.calibration.needsCheck || profile.calibration.calibratedAt === null) {
    notices.push(
      h(
        'div',
        { class: 'notice' },
        h(
          'p',
          null,
          profile.calibration.needsCheck
            ? 'These colours came from another device. Please check them on this screen.'
            : 'The colours have not been set up for this screen yet.',
          ' ',
          link('Set up colours', '#/colours'),
        ),
      ),
    );
  }
  if (profile.session.patchReminder.enabled && profile.session.patchReminder.note.trim() !== '') {
    notices.push(
      h('div', { class: 'card' }, h('p', null, h('strong', null, 'Reminder from your grown-up: '), profile.session.patchReminder.note)),
    );
  }
  if (profile.autoContrast.enabled && balanceDue(profile.autoContrast.balanceCheckedAt, now)) {
    notices.push(
      h('div', { class: 'card', 'data-testid': 'balance-due' }, h('p', null, 'Time for the weekly balance check (1 minute). ', link('Balance check', '#/balance'))),
    );
  }
  if (!app.store.persistOk) {
    notices.push(
      h('div', { class: 'notice' }, h('p', null, 'This browser is not letting the app save. Progress will be lost when you close the page (private windows do this).')),
    );
  }

  const games = gamesFor(profile);
  const tiles =
    games.length === 0
      ? h('div', { class: 'card' }, h('p', null, 'The first game is on its way.'))
      : h(
          'div',
          { class: 'tiles' },
          ...games.map((g) => {
            const icon = channelCanvas(app.palette, scope, { width: 240, height: 150, draw: (r) => g.icon(r) });
            const best = profile.progress.best[g.id];
            return h(
              'a',
              { class: 'tile', href: `#/play/${g.id}`, 'data-testid': `tile-${g.id}` },
              icon.el,
              h('strong', null, g.title),
              h('span', { class: 'small muted' }, g.blurb),
              best ? h('span', { class: 'small' }, `Best: ${best}`) : null,
            );
          }),
        );

  return h(
    'div',
    { class: 'page' },
    h(
      'header',
      { class: 'topbar' },
      h('span', { class: 'brand' }, 'Binocular Play'),
      h('span', { class: 'spacer' }),
      h('a', { href: '#/profiles', class: 'btn btn-plain btn-small row', 'aria-label': `Player: ${profile.name}. Change player.` }, avatar.el, h('span', null, profile.name)),
    ),
    h(
      'main',
      null,
      h('h1', null, `Hi ${profile.name}! Glasses on?`),
      ...notices,
      h(
        'div',
        { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, `${minutesToday} min`), h('span', { class: 'small muted' }, 'played today')),
        h(
          'div',
          { class: 'stat' },
          h('b', null, formatClock(remainingMs(profile.session.lengthMin, session))),
          h('span', { class: 'small muted' }, 'left before a break'),
        ),
        h('div', { class: 'stat' }, h('b', null, streak === 1 ? '1 day' : `${streak} days`), h('span', { class: 'small muted' }, 'in a row')),
      ),
      h('h2', null, 'Games'),
      tiles,
      h(
        'nav',
        { class: 'nav-links', 'aria-label': 'More' },
        link('Colours', '#/colours', 'btn btn-plain'),
        link('Settings', '#/settings', 'btn btn-plain'),
        link('Players', '#/profiles', 'btn btn-plain'),
        link('For grown-ups', '#/parent', 'btn btn-plain'),
        link('Is this real?', '#/evidence', 'btn btn-plain'),
      ),
    ),
    footer(),
  );
};
