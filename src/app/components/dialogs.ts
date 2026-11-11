import type { App } from '../app';
import { button, h, type Child } from '../dom';

/** Shows a modal dialog. Returns a function that closes it. */
export function openDialog(app: App, content: (Child | Child[])[], options: { label: string; onEscape?: () => void }): () => void {
  const dialog = h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': options.label }, ...content);
  const overlay = h('div', { class: 'overlay' }, dialog);
  const previous = document.activeElement;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && options.onEscape) {
      e.preventDefault();
      options.onEscape();
    }
  };
  document.addEventListener('keydown', onKey);
  app.overlayRoot.appendChild(overlay);
  const first = dialog.querySelector('button, input, a');
  if (first instanceof HTMLElement) first.focus();
  let open = true;
  return () => {
    if (!open) return;
    open = false;
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
  };
}

export function confirmDialog(
  app: App,
  title: string,
  text: string,
  okLabel: string,
  cancelLabel = 'Cancel',
): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (answer: boolean) => {
      close();
      resolve(answer);
    };
    const close = openDialog(
      app,
      [
        h('h2', null, title),
        h('p', null, text),
        h('div', { class: 'actions' }, button(okLabel, () => done(true), 'primary'), button(cancelLabel, () => done(false))),
      ],
      { label: title, onEscape: () => done(false) },
    );
  });
}

export function messageDialog(app: App, title: string, text: string): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      close();
      resolve();
    };
    const close = openDialog(
      app,
      [h('h2', null, title), h('p', null, text), h('div', { class: 'actions' }, button('OK', done, 'primary'))],
      { label: title, onEscape: done },
    );
  });
}

/**
 * The parent gate: hold a button for three seconds. It keeps small children out of the
 * settings; it is not a security feature. Adult profiles skip it.
 */
export function requireParent(app: App, reason = 'This part is for grown-ups.'): Promise<boolean> {
  const profile = app.store.activeProfile;
  if (profile && profile.kind === 'adult') return Promise.resolve(true);

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fill = h('span', { class: 'fill' });
    const hold = h('button', { type: 'button', class: 'btn btn-primary btn-big hold', 'data-testid': 'parent-hold' }, fill, h('span', null, 'Hold for 3 seconds'));

    const done = (ok: boolean) => {
      cancel();
      close();
      resolve(ok);
    };
    const start = () => {
      if (timer !== null) return;
      fill.style.transition = `width ${app.gateHoldMs}ms linear`;
      fill.style.width = '100%';
      timer = setTimeout(() => done(true), app.gateHoldMs);
    };
    const cancel = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      fill.style.transition = 'none';
      fill.style.width = '0';
    };
    hold.addEventListener('pointerdown', start);
    hold.addEventListener('pointerup', cancel);
    hold.addEventListener('pointerleave', cancel);
    hold.addEventListener('pointercancel', cancel);
    hold.addEventListener('contextmenu', (e) => e.preventDefault());
    hold.addEventListener('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start();
    });
    hold.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') cancel();
    });
    hold.addEventListener('blur', cancel);

    const close = openDialog(
      app,
      [
        h('h2', null, 'Ask a grown-up'),
        h('p', null, reason),
        h('p', { class: 'muted' }, 'Grown-up: press and hold the button until the bar is full.'),
        hold,
        h('div', { class: 'actions' }, button('Go back', () => done(false))),
      ],
      { label: 'Ask a grown-up', onEscape: () => done(false) },
    );
  });
}
