import {
  ADULTS,
  EXERCISES_NOTE,
  LEAFLETS,
  LESSON,
  NEGATIVE,
  POSITIVE,
  SAFETY_POINTS,
  SUMMARY,
  TREATMENTS,
  type EvidenceItem,
  type Source,
} from '../../core/content/evidence';
import { page } from '../components/footer';
import { externalLink, h, link } from '../dom';
import type { Screen } from '../router';

function sources(list: Source[]): HTMLElement {
  return h(
    'p',
    { class: 'sources' },
    'Sources: ',
    ...list.flatMap((s, i) => [i > 0 ? ' · ' : null, externalLink(s.label, s.url)]),
  );
}

function item(e: EvidenceItem): HTMLElement {
  return h('div', { class: 'evidence-item' }, h('h3', null, e.title), h('ul', null, ...e.points.map((p) => h('li', null, p))), sources(e.sources));
}

export const evidenceScreen: Screen = () =>
  page(
    'Is this real?',
    [
      h('div', { class: 'notice' }, h('h2', null, 'The honest summary'), h('ul', null, ...SUMMARY.map((s) => h('li', null, s)))),
      h('section', { id: 'negative', 'data-testid': 'negative-trials' }, h('h2', null, 'Trials where games like these did not do well'), ...NEGATIVE.map(item)),
      h('section', { id: 'positive' }, h('h2', null, 'Trials with positive results'), ...POSITIVE.map(item), item(ADULTS)),
      h('section', null, h('h2', null, 'Why engagement matters'), item(LESSON)),
      h('section', { id: 'safety' }, h('h2', null, 'Safety'), item(SAFETY_POINTS)),
      h('p', null, link('Other treatments your eye doctor may use', '#/treatments', 'btn btn-plain')),
      h('p', { class: 'muted small' }, 'Links open other websites. We do not control them and they may change. Last checked when this version was built.'),
    ],
    { back: '/' },
  );

export const treatmentsScreen: Screen = () =>
  page(
    'Other treatments',
    [
      h('p', null, 'These are the treatments eye doctors use for amblyopia. This app is not one of them and does not replace any of them.'),
      h(
        'div',
        { class: 'table-wrap' },
        h(
          'table',
          null,
          h('thead', null, h('tr', null, h('th', null, 'Treatment'), h('th', null, 'What it is'), h('th', null, 'Where you get it'), h('th', null, 'Evidence'))),
          h(
            'tbody',
            null,
            ...TREATMENTS.map((t) =>
              h(
                'tr',
                null,
                h('td', null, h('strong', null, t.name)),
                h('td', null, t.what),
                h('td', null, t.where),
                h('td', null, t.evidence, ' ', ...t.sources.flatMap((s, i) => [i > 0 ? ' · ' : null, externalLink(s.label, s.url)])),
              ),
            ),
          ),
        ),
      ),
      h('div', { class: 'card' }, h('p', null, EXERCISES_NOTE)),
      h('h2', null, 'Good plain-language guides'),
      h('ul', null, ...LEAFLETS.map((s) => h('li', null, externalLink(s.label, s.url)))),
      h('p', null, 'Treatment works best when it starts early in childhood, so do not wait: see an eye doctor.'),
      h('p', null, link('Is this real? The evidence on two-eye games', '#/evidence', 'btn btn-plain')),
    ],
    { back: '/' },
  );
