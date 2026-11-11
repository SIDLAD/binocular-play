import { colourEditor } from '../components/colourEditor';
import { page } from '../components/footer';
import { h } from '../dom';
import type { Screen } from '../router';

/** The persistent Colours page. Open to every player, any time. */
export const coloursScreen: Screen = (app, _params, scope) =>
  page(
    'Colours',
    [
      h(
        'p',
        null,
        'Tune the two colours until each eye sees only its own shapes through your glasses. Colours are saved for this player on this device. Turn off night light, True Tone and automatic brightness first: they change the colours.',
      ),
      colourEditor(app, scope, { sheet: false }),
    ],
    { back: '/' },
  );
