import { drawAvatar } from '../components/art';
import { channelCanvas } from '../components/channelCanvas';
import { confirmDialog, requireParent } from '../components/dialogs';
import { page } from '../components/footer';
import { button, h } from '../dom';
import type { Screen } from '../router';

export const profilesScreen: Screen = (app, _params, scope) => {
  const data = app.store.data;
  const cards = data.profiles.map((p) => {
    const active = p.id === data.activeProfileId;
    const avatar = channelCanvas(
      // Each card shows the avatar in the colours of the player who is active now.
      app.palette,
      scope,
      { width: 56, height: 56, className: 'avatar', draw: (r) => drawAvatar(r, p.avatar) },
    );
    const ready = p.onboarding.completedAt !== null;
    return h(
      'div',
      { class: 'card row', 'data-profile': p.id },
      avatar.el,
      h(
        'div',
        { class: 'stack', style: 'flex:1;gap:2px;min-width:140px' },
        h('strong', null, p.name),
        h('span', { class: 'small muted' }, `${p.kind === 'adult' ? 'Adult' : 'Child'}${active ? ' · playing now' : ''}${ready ? '' : ' · set-up not finished'}`),
      ),
      active
        ? null
        : button(
            'Play as',
            () => {
              app.store.setActive(p.id);
              app.session.reset();
              app.navigate(ready ? '/' : '/onboarding');
            },
            'primary',
          ),
      button(
        'Delete',
        async () => {
          if (!(await requireParent(app, 'Deleting a player is for grown-ups.'))) return;
          const ok = await confirmDialog(
            app,
            `Delete ${p.name}?`,
            'This removes this player’s settings, colours and progress from this device. It cannot be undone.',
            'Delete',
          );
          if (!ok) return;
          app.store.deleteProfile(p.id);
          app.session.reset();
          app.navigate(app.store.activeProfile ? '/profiles' : '/onboarding');
        },
        'quiet',
        { 'aria-label': `Delete ${p.name}` },
      ),
    );
  });

  return page(
    'Players',
    [
      h('p', null, 'Each player has their own glasses settings, colours and progress on this device.'),
      ...cards,
      button(
        'Add a player',
        async () => {
          if (!(await requireParent(app, 'Adding a player is for grown-ups.'))) return;
          app.store.addProfile({ name: `Player ${app.store.data.profiles.length + 1}`, kind: 'child', avatar: app.store.data.profiles.length % 8 });
          app.session.reset();
          app.navigate('/onboarding');
        },
        'plain',
        { 'data-testid': 'add-player' },
      ),
    ],
    { back: '/' },
  );
};
