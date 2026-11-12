import { DISCLAIMER_SHORT, FREE_PROMISE, PRIVACY_LINE } from '../../core/content/copy';
import { h, link } from '../dom';

/** On every page: the disclaimer and the way to the evidence. */
export function footer(): HTMLElement {
  return h(
    'footer',
    { class: 'footer' },
    h(
      'nav',
      { 'aria-label': 'About' },
      link('Is this real? The evidence', '#/evidence'),
      link('Other treatments', '#/treatments'),
    ),
    h('p', null, DISCLAIMER_SHORT),
    h('p', null, `${FREE_PROMISE} ${PRIVACY_LINE} Open source, MIT licence.`),
    // Plain pages (built by scripts/seo-pages.ts) so search engines can find the content.
    h('p', { class: 'small muted' }, link('About this app (printable pages)', './about/')),
  );
}

/** Standard page frame: top bar, main content, footer. */
export function page(title: string, content: (Node | string | null | false)[], options: { back?: string; backLabel?: string } = {}): HTMLElement {
  return h(
    'div',
    { class: 'page' },
    h(
      'header',
      { class: 'topbar' },
      link('Binocular Play', '#/', 'brand'),
      h('span', { class: 'spacer' }),
      options.back !== undefined ? link(options.backLabel ?? '← Back', `#${options.back}`, 'btn btn-plain btn-small') : null,
    ),
    h('main', null, h('h1', null, title), ...content),
    footer(),
  );
}
