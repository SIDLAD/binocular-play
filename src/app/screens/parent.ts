import { activeSecondsOnDay, weekSummary } from '../../core/progress/sessionLog';
import { catchFlagged } from '../../engine/catchTargets';
import { clearDoubleVisionBlock, isBlockedToday, localDay } from '../../core/safety/guards';
import { exportData, importData } from '../../core/settings/exportImport';
import { findGame } from '../../games/registry';
import { confirmDialog, messageDialog } from '../components/dialogs';
import { button, h } from '../dom';
import type { Screen } from '../router';
import { gated, setting } from './settings';

function download(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url });
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const ENDED: Record<string, string> = {
  gameOver: 'game ended',
  quit: 'stopped',
  timer: 'break time',
  doubleVision: 'stopped: double vision or sore eyes',
};

export const parentScreen: Screen = (app) =>
  gated(app, 'For grown-ups', '/', () => {
    const profile = app.store.activeProfile;
    if (!profile) return [];
    const now = app.now();

    // Play log
    const days: { day: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({ day: localDay(d), minutes: Math.round(activeSecondsOnDay(profile, localDay(d)) / 60) });
    }
    const recent = profile.progress.sessions.slice(-10).reverse();
    const week = weekSummary(profile, now);
    const goal = profile.goal;
    const flagged = profile.progress.sessions.filter((r) => catchFlagged({ shown: r.catchShown, caught: r.catchCaught })).slice(-5).reverse();
    const catchCell = (r: (typeof recent)[number]) =>
      r.catchShown > 0 ? `${r.catchCaught} of ${r.catchShown}` : r.trialsDone > 0 ? `${Math.round((100 * r.trialsCorrect) / r.trialsDone)}% right` : '–';
    const log = h(
      'div',
      { class: 'card' },
      h('h2', null, `${profile.name}’s play`),
      h(
        'p',
        { 'data-testid': 'week-summary' },
        h('strong', null, `This week: ${week.activeMinutes} active minutes. `),
        `Goal days reached: ${week.goalDays} of ${goal.daysPerWeek} (goal: ${goal.minutesPerDay} minutes a day). Today: ${days[6].minutes} active minutes.`,
      ),
      h('p', { class: 'muted small' }, '“Active” leaves out pauses and any stretch of 10 seconds or more with no input (except in Watch mode, where there is nothing to press).'),
      flagged.length > 0
        ? h(
            'div',
            { class: 'notice', 'data-testid': 'catch-flag' },
            h('p', null, h('strong', null, 'Missed weak-eye prompts. '), `In ${flagged.length === 1 ? 'one recent round' : `${flagged.length} recent rounds`}, fewer than half of the prompts only the weaker eye can see were caught.`),
            h('p', null, 'Check that the glasses are on, the right way round, and that the colours are set up (Colours → hidden-number check). If it keeps happening, mention it to your eye doctor. This is not a test result.'),
          )
        : null,
      h(
        'div',
        { class: 'table-wrap' },
        h('table', null, h('thead', null, h('tr', null, ...days.map((d) => h('th', null, d.day.slice(5))))), h('tbody', null, h('tr', null, ...days.map((d) => h('td', null, `${d.minutes} min`))))),
      ),
      recent.length === 0
        ? h('p', { class: 'muted' }, 'No games played yet.')
        : h(
            'div',
            { class: 'table-wrap' },
            h(
              'table',
              null,
              h('thead', null, h('tr', null, h('th', null, 'When'), h('th', null, 'Game'), h('th', null, 'Time'), h('th', null, 'Score'), h('th', null, 'Weak-eye prompts / right'), h('th', null, 'Strong-eye brightness'), h('th', null, 'Ended'))),
              h(
                'tbody',
                null,
                ...recent.map((r) =>
                  h(
                    'tr',
                    null,
                    h('td', null, new Date(r.date).toLocaleString()),
                    h('td', null, findGame(r.gameId)?.title ?? r.gameId),
                    h('td', null, `${Math.max(1, Math.round(r.activeSeconds / 60))} min`),
                    h('td', null, String(r.score)),
                    h('td', null, catchCell(r)),
                    h('td', null, `${Math.round(r.fellowContrast * 100)}%`),
                    h('td', null, ENDED[r.endedBy] ?? r.endedBy),
                  ),
                ),
              ),
            ),
          ),
      h('p', { class: 'muted small' }, 'A fuller summary to show your eye doctor is planned.'),
    );

    // Patching / drops reminder
    const tick = h('input', { type: 'checkbox', checked: profile.session.patchReminder.enabled });
    const note = h('input', { type: 'text', value: profile.session.patchReminder.note, maxLength: 120, placeholder: 'For example: patch on after school' });
    tick.addEventListener('change', () =>
      app.store.updateActive((p) => {
        p.session.patchReminder.enabled = tick.checked;
      }),
    );
    note.addEventListener('change', () =>
      app.store.updateActive((p) => {
        p.session.patchReminder.note = note.value;
      }),
    );
    const reminder = h(
      'div',
      { class: 'card' },
      h('h2', null, 'Patching or drops reminder'),
      h('p', { class: 'muted' }, 'The app only repeats your own note on the home screen and at break time. It never decides how long to patch: that comes from your eye doctor.'),
      h('label', { class: 'check' }, tick, h('span', null, 'Show my reminder')),
      h('label', { class: 'field' }, 'My note', note),
    );

    // Safety
    const blocked = isBlockedToday(profile, now);
    const safety = h(
      'div',
      { class: 'card' },
      h('h2', null, 'Safety'),
      blocked
        ? h(
            'div',
            null,
            h('p', null, h('strong', null, 'Games are blocked for today'), ' because double vision or sore eyes was reported. Please tell your eye doctor before playing again.'),
            button(
              'It was a mis-tap: unblock',
              async () => {
                const ok = await confirmDialog(
                  app,
                  'Unblock the games?',
                  'Only do this if nobody saw double and nobody’s eyes hurt. If it really happened, leave the games blocked and talk to your eye doctor.',
                  'It was a mis-tap',
                );
                if (!ok) return;
                app.store.updateActive((p) => clearDoubleVisionBlock(p, app.now()));
                app.rerender();
              },
              'plain',
              { 'data-testid': 'unblock' },
            ),
          )
        : h('p', null, 'Games are not blocked.'),
      profile.safety.events.length > 0
        ? h(
            'div',
            null,
            h('h3', null, 'Reports'),
            h(
              'ul',
              { class: 'small' },
              ...profile.safety.events
                .slice(-10)
                .reverse()
                .map((e) =>
                  h(
                    'li',
                    null,
                    `${new Date(e.at).toLocaleString()}: ${
                      e.kind === 'double-at-check'
                        ? 'said "I see double" before a session'
                        : e.kind === 'double-or-pain-in-game'
                          ? 'pressed "I see double / my eyes hurt" during a game'
                          : 'block removed by a grown-up'
                    }`,
                  ),
                ),
            ),
          )
        : null,
      setting(
        'Safety questions',
        'Answer the three questions about eye turns and double vision again, for example after an eye appointment.',
        button('Answer the safety questions again', async () => {
          const ok = await confirmDialog(app, 'Answer again?', 'The games stay locked until the questions are answered.', 'Answer again');
          if (!ok) return;
          app.store.updateActive((p) => {
            p.onboarding.completedAt = null;
            p.onboarding.screening = { eyeTurn: null, everDouble: null, clinicianOk: null, parentConfirmedAt: null };
          });
          app.navigate('/onboarding');
        }),
      ),
    );

    // Export / import
    const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    file.addEventListener('change', async () => {
      const chosen = file.files?.[0];
      file.value = '';
      if (!chosen) return;
      const result = importData(app.store.data, await chosen.text());
      if (!result.ok) {
        await messageDialog(app, 'Could not import', result.error);
        return;
      }
      const ok = await confirmDialog(
        app,
        'Import this file?',
        `${result.added} new player(s) will be added and ${result.replaced} existing player(s) replaced.` +
          (result.fromOtherDevice ? ' The file comes from another device, so the colours will need checking on this screen.' : ''),
        'Import',
      );
      if (!ok) return;
      app.store.replace(result.data);
      app.rerender();
    });
    const data = h(
      'div',
      { class: 'card' },
      h('h2', null, 'Back up or move progress'),
      h('p', { class: 'muted' }, 'Everything is stored only in this browser. Some browsers clear it if the site is not visited for a while, so save a copy now and then.'),
      h(
        'div',
        { class: 'row' },
        button('Save a copy (JSON file)', () => download(`binocular-play-${localDay(app.now())}.json`, exportData(app.store.data, app.now()))),
        button('Load a copy', () => file.click()),
        file,
      ),
    );

    // Weekly goal
    const goalSelect = (label: string, options: number[], current: number, unit: string, set: (v: number) => void) => {
      const el = h('select', { 'aria-label': label }, ...options.map((v) => h('option', { value: String(v) }, `${v} ${unit}`)));
      el.value = String(current);
      el.addEventListener('change', () => set(Number(el.value)));
      return el;
    };
    const goalCard = h(
      'div',
      { class: 'card' },
      h('h2', null, 'Weekly goal'),
      h('p', { class: 'muted' }, 'A goal for motivation, shown on the home screen. Set it to what your eye doctor suggested. The app does not decide how much to play.'),
      h(
        'div',
        { class: 'row' },
        goalSelect('Days a week', [1, 2, 3, 4, 5, 6, 7], goal.daysPerWeek, 'days', (v) =>
          app.store.updateActive((p) => {
            p.goal.daysPerWeek = v;
          }),
        ),
        h('span', null, '×'),
        goalSelect('Minutes a day', [5, 10, 15, 20, 30, 45, 60], goal.minutesPerDay, 'minutes', (v) =>
          app.store.updateActive((p) => {
            p.goal.minutesPerDay = v;
          }),
        ),
      ),
    );

    // Strong-eye brightness changes
    const changes = profile.autoContrast.log.slice(-10).reverse();
    const REASON: Record<string, string> = { rise: 'Slow rise (target met)', fall: 'Lowered (target missed)', 'balance-check': 'Balance check' };
    const contrastCard = h(
      'div',
      { class: 'card', 'data-testid': 'contrast-log' },
      h('h2', null, 'Strong-eye brightness changes'),
      h(
        'p',
        null,
        `Now ${Math.round(profile.fellowContrast * 100)}%. Slow automatic change is ${profile.autoContrast.enabled ? (profile.autoContrast.hold ? 'on, but held' : 'on') : 'off'} (Settings → Colours).`,
      ),
      changes.length === 0
        ? h('p', { class: 'muted' }, 'No changes recorded yet.')
        : h(
            'div',
            { class: 'table-wrap' },
            h(
              'table',
              null,
              h('thead', null, h('tr', null, h('th', null, 'When'), h('th', null, 'From'), h('th', null, 'To'), h('th', null, 'Why'))),
              h(
                'tbody',
                null,
                ...changes.map((c) =>
                  h('tr', null, h('td', null, new Date(c.at).toLocaleString()), h('td', null, `${Math.round(c.from * 100)}%`), h('td', null, `${Math.round(c.to * 100)}%`), h('td', null, REASON[c.reason] ?? c.reason)),
                ),
              ),
            ),
          ),
    );

    return [log, goalCard, contrastCard, reminder, safety, data];
  });
