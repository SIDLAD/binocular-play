import { activeSecondsOnDay, weekStreak, weekSummary } from '../../core/progress/sessionLog';
import type { GameDefinition } from '../../engine/api';
import { evidenceBadgeLabel } from '../components/badges';
import { isBlockedToday, localDay } from '../../core/safety/guards';
import { formatClock, remainingMs } from '../../core/safety/session';
import { GROUPS, eyeTag, gamesFor, todaysPick } from '../gameList';
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
  const minutesToday = Math.round(activeSecondsOnDay(profile, localDay(now)) / 60);
  const week = weekSummary(profile, now);
  const weeks = weekStreak(profile, now);
  const adult = profile.kind === 'adult';

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
  const tile = (g: GameDefinition, testId = `tile-${g.id}`) => {
    const icon = channelCanvas(app.palette, scope, { width: 240, height: 150, draw: (r) => g.icon(r) });
    const best = profile.progress.best[g.id];
    return h(
      'a',
      { class: 'tile', href: `#/play/${g.id}`, 'data-testid': testId },
      icon.el,
      h('strong', null, g.title),
      h('span', { class: 'small muted' }, g.blurb),
      h('span', { class: 'tags' }, h('span', { class: 'badge' }, eyeTag(g.eyeMode)), h('span', { class: 'badge' }, evidenceBadgeLabel(g.evidence.badge))),
      best ? h('span', { class: 'small' }, `Best: ${best}`) : null,
    );
  };
  const pick = todaysPick(games, now);
  const sections = GROUPS.map((group) => {
    const list = games.filter((g) => g.group === group.id);
    if (list.length === 0) return null;
    return h(
      'section',
      { 'data-testid': `group-${group.id}` },
      h('h2', null, group.title),
      h('p', { class: 'small muted' }, group.blurb),
      h('div', { class: 'tiles' }, ...list.map((g) => tile(g))),
    );
  });

  return h(
    'div',
    { class: 'page' },
    h(
      'header',
      { class: 'topbar' },
      h('span', { class: 'brand' }, 'Binocular Play'),
      h('span', { class: 'spacer' }),
      h('a', { href: '#/profiles', class: 'btn btn-plain btn-small row', 'aria-label': `Player: ${profile.name}. Change player.` }, adult ? null : avatar.el, h('span', null, profile.name)),
    ),
    h(
      'main',
      null,
      h('h1', null, adult ? `Glasses on, ${profile.name}?` : `Hi ${profile.name}! Glasses on?`),
      ...notices,
      h(
        'div',
        { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, `${minutesToday} min`), h('span', { class: 'small muted' }, 'active today')),
        h(
          'div',
          { class: 'stat', 'data-testid': 'weekly-goal' },
          h('b', null, `${Math.min(week.goalDays, profile.goal.daysPerWeek)} of ${profile.goal.daysPerWeek} days`),
          h('span', { class: 'small muted' }, `this week’s goal (${profile.goal.minutesPerDay} min a day)`),
        ),
        h(
          'div',
          { class: 'stat' },
          h('b', null, formatClock(remainingMs(profile.session.lengthMin, session))),
          h('span', { class: 'small muted' }, 'left before a break'),
        ),
        h('div', { class: 'stat' }, h('b', null, weeks === 1 ? '1 week' : `${weeks} weeks`), h('span', { class: 'small muted' }, 'goal met in a row')),
      ),
      pick
        ? h(
            'section',
            { class: 'today', 'data-testid': 'todays-pick' },
            h('h2', null, 'Today’s pick'),
            h('div', { class: 'tiles' }, tile(pick, 'pick-tile')),
          )
        : h('div', { class: 'card' }, h('p', null, 'No activities are available for this player.')),
      ...sections,
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
