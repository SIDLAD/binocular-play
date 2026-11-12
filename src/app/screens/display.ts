import { CARD_HEIGHT_MM, CARD_WIDTH_MM, DEFAULT_PX_PER_MM, PHONE_PX_PER_MM, defaultViewingDistanceCm, pxPerDegree } from '../../core/display/visualAngle';
import { page } from '../components/footer';
import { button, h } from '../dom';
import type { Screen } from '../router';

const MIN_PX = 120;
const MAX_PX = 900;

/**
 * The one-minute screen-size check: match a bank card, then set the viewing distance.
 * Stored per device (not per player). Sizes in the training tasks use it.
 */
export const displayScreen: Screen = (app) => {
  const saved = app.store.data.device.display;
  const viewW = window.innerWidth || 1024;
  const minSide = Math.min(viewW, window.innerHeight || 768);
  // A card is wider than most phone screens, so narrow screens match its short edge.
  const narrow = viewW < 600;
  const edgeMm = narrow ? CARD_HEIGHT_MM : CARD_WIDTH_MM;
  const otherMm = narrow ? CARD_WIDTH_MM : CARD_HEIGHT_MM;
  let cardPx = Math.round((saved?.pxPerMm ?? (narrow ? PHONE_PX_PER_MM : DEFAULT_PX_PER_MM)) * edgeMm);
  let distance = saved?.viewingDistanceCm ?? defaultViewingDistanceCm(minSide);
  const maxPx = Math.max(MIN_PX + 10, Math.min(MAX_PX, viewW - 16));
  cardPx = Math.min(maxPx, Math.max(MIN_PX, cardPx));

  const card = h('div', { class: 'card-box', 'data-testid': 'card-box', 'aria-hidden': 'true' });
  const slider = h('input', { type: 'range', min: String(MIN_PX), max: String(maxPx), step: '1', value: String(cardPx), 'aria-label': 'Box width' });
  const widthOut = h('output', null, '');
  const distInput = h('input', { type: 'number', min: '20', max: '300', step: '1', value: String(distance), 'aria-label': 'Viewing distance in centimetres', inputMode: 'numeric', 'data-testid': 'distance' });
  const summary = h('p', { class: 'muted small', 'aria-live': 'polite' });
  const status = h('p', { role: 'status' });

  const show = () => {
    card.style.width = `${cardPx}px`;
    card.style.height = `${Math.round((cardPx * otherMm) / edgeMm)}px`;
    slider.value = String(cardPx);
    widthOut.textContent = `${cardPx} px`;
    const ppd = pxPerDegree(cardPx / edgeMm, distance);
    summary.textContent = `At ${distance} cm, one degree is about ${Math.round(ppd)} screen px.`;
  };
  const setPx = (v: number) => {
    cardPx = Math.min(maxPx, Math.max(MIN_PX, Math.round(v)));
    status.textContent = '';
    show();
  };
  slider.addEventListener('input', () => setPx(Number(slider.value)));
  distInput.addEventListener('input', () => {
    const v = Number(distInput.value);
    if (Number.isFinite(v) && v >= 20 && v <= 300) {
      distance = Math.round(v);
      status.textContent = '';
      show();
    }
  });
  const preset = (cm: number, label: string) =>
    button(label, () => {
      distance = cm;
      distInput.value = String(cm);
      show();
    }, 'plain', { class: 'btn-small' });

  show();
  return page(
    'Screen size check',
    [
      h('p', null, 'The training tasks set sizes by how big things look from where you sit. This takes about a minute and is saved on this device.'),
      h('h2', null, '1. Match a card'),
      h(
        'p',
        null,
        narrow
          ? 'Hold a bank card (or any card that size: an ID or library card) upright against the screen, with its corner in the top-left corner of the box. Make the box exactly as wide as the card’s SHORT side. No card? Use a ruler: the box should be 5.4 cm wide.'
          : 'Hold a bank card (or any card that size: an ID or library card) flat against the screen, with its corner in the top-left corner of the box. Make the box exactly as wide as the card. No card? Use a ruler: the box should be 8.56 cm wide.',
      ),
      h('div', { class: 'card-stage' }, card),
      h(
        'div',
        { class: 'slider-row' },
        button('−', () => setPx(cardPx - 1), 'plain', { class: 'btn-small', 'aria-label': 'Narrower by 1 px' }),
        slider,
        button('+', () => setPx(cardPx + 1), 'plain', { class: 'btn-small', 'aria-label': 'Wider by 1 px' }),
        widthOut,
      ),
      h('p', { class: 'muted small' }, 'If the page is zoomed in or out, set the zoom to 100% first, or check again after changing it.'),
      h('h2', null, '2. How far away do you sit?'),
      h('p', null, 'Sit comfortably, then measure from your eyes to the screen. An arm’s length is about 60 cm; a phone held in front of you is about 40–50 cm.'),
      h('div', { class: 'row' }, h('label', null, distInput, ' cm'), preset(40, '40 cm'), preset(50, '50 cm'), preset(60, '60 cm'), preset(100, '1 m')),
      summary,
      h(
        'div',
        { class: 'row' },
        button(
          'Save',
          () => {
            app.store.update((d) => {
              d.device.display = { pxPerMm: cardPx / edgeMm, viewingDistanceCm: distance, checkedAt: app.now().toISOString() };
            });
            status.textContent = 'Saved. The training tasks will use these sizes.';
          },
          'primary',
          { 'data-testid': 'save-display' },
        ),
      ),
      status,
    ],
    { back: '/settings', backLabel: 'Settings' },
  );
};
