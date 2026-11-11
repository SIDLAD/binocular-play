import { describe, expect, it } from 'vitest';
import { createLivePalette } from '../../src/core/colour/livePalette';
import { toHex } from '../../src/core/colour/srgb';
import { defaultCalibration } from '../../src/core/settings/schema';
import { MemoryStorage, SettingsStore } from '../../src/core/settings/store';
import { seededRng, type Game, type GameDefinition, type Renderer } from '../../src/engine/api';
import { CanvasChannelRenderer } from '../../src/engine/renderer';
import { RecordingContext } from '../../src/engine/testing/recordingContext';
import { GAMES } from '../../src/games/registry';

/** A minimal game that draws one shape per channel. */
const fixture: GameDefinition = {
  id: 'fixture',
  title: 'Fixture',
  blurb: '',
  eyeRule: '',
  controls: [],
  touchButtons: [],
  icon: () => {},
  create(): Game {
    return {
      resize() {},
      input() {},
      update() {},
      render(r: Renderer) {
        r.clear();
        r.rect('weakEye', 10, 10, 50, 50);
        r.circle('fellowEye', 100, 100, 30);
        r.rect('both', 0, 0, 200, 200, { outline: 4 });
      },
      status: () => ({ score: 0, level: 1, over: false }),
      dispose() {},
    };
  },
};

function setup() {
  const storage = new MemoryStorage();
  const store = new SettingsStore(storage);
  const a = store.addProfile({ name: 'A', kind: 'child' });
  const palette = createLivePalette(store);
  const ctx = new RecordingContext();
  const renderer = new CanvasChannelRenderer(ctx, palette, 400, 600);
  return { storage, store, a, palette, ctx, renderer };
}

/** Plays a little so that every channel has something on screen, then renders one frame. */
function startGame(def: GameDefinition): Game {
  const game = def.create({
    rng: seededRng(7),
    startLevel: 1,
    reducedMotion: true,
    mode: def.modes?.[0]?.id ?? 'default',
  });
  game.resize(400, 600);
  for (let frame = 0; frame < 900; frame++) {
    if (frame % 25 === 0) game.input({ kind: 'action', action: 'primary', pressed: true });
    if (frame % 25 === 2) game.input({ kind: 'action', action: 'primary', pressed: false });
    if (game.status().over) break;
    game.update(1000 / 60);
  }
  return game;
}

describe('rule 3: colours stay adjustable, live', () => {
  for (const def of [fixture, ...GAMES]) {
    describe(`a running "${def.id}" game`, () => {
      it('repaints the same game instance in the new colours, with no reload', () => {
        const { store, palette, ctx, renderer } = setup();
        const game = startGame(def);
        const frame = () => {
          ctx.reset();
          game.render(renderer);
          return ctx.colours();
        };

        // Start: red lens on the left, weak eye left, red/cyan glasses.
        let colours = frame();
        expect(toHex(palette.current.weakEye)).toBe('#ff0000');
        expect(colours.has('#ff0000')).toBe(true);
        expect(colours.has('#00ffff')).toBe(true);

        // (a) Change the red-lens colour, as the Colours page or the pause menu would.
        store.updateActive((p) => {
          p.calibration.redLens = { base: '#ff0000', brightness: 0.8 };
        });
        colours = frame();
        expect(colours.has('#cc0000')).toBe(true);
        expect(colours.has('#ff0000')).toBe(false);

        // (b) Swap the weak eye: the two channels trade colours.
        const weakBefore = toHex(palette.current.weakEye);
        store.updateActive((p) => {
          p.vision.weakEye = 'right';
        });
        expect(toHex(palette.current.fellowEye)).toBe(weakBefore);
        expect(toHex(palette.current.weakEye)).toBe('#00ffff');
        colours = frame();
        expect(colours.has('#00ffff')).toBe(true);
        expect(colours.has('#cc0000')).toBe(true);

        // (c) Switch glasses type (settings resets calibration to the new preset).
        store.updateActive((p) => {
          p.vision.glasses = 'red-green';
          p.calibration = defaultCalibration('red-green');
        });
        colours = frame();
        expect(colours.has('#00ff00')).toBe(true);
        expect(colours.has('#ff0000')).toBe(true);
        expect(colours.has('#00ffff')).toBe(false);

        // Fellow-eye contrast is live too.
        store.updateActive((p) => {
          p.fellowContrast = 0.5;
        });
        colours = frame();
        expect(colours.has(toHex(palette.current.fellowEye))).toBe(true);
        expect(colours.has('#ff0000')).toBe(false);

        game.dispose();
      });
    });
  }

  it('calibration survives a reload', () => {
    const { storage, store } = setup();
    store.updateActive((p) => {
      p.calibration.otherLens = { base: '#00e0ff', brightness: 0.9 };
    });
    const reopened = new SettingsStore(storage);
    expect(reopened.activeProfile?.calibration.otherLens).toEqual({ base: '#00e0ff', brightness: 0.9 });
    expect(reopened.data.deviceId).toBe(store.data.deviceId);
  });

  it("one profile's colours do not touch another's", () => {
    const { store, a } = setup();
    const b = store.addProfile({ name: 'B', kind: 'adult' }, false);
    store.updateProfile(a.id, (p) => {
      p.calibration.redLens.brightness = 0.5;
      p.fellowContrast = 0.3;
    });
    expect(store.profile(b.id)?.calibration.redLens.brightness).toBe(1);
    expect(store.profile(b.id)?.fellowContrast).toBe(1);
    expect(store.profile(a.id)?.calibration.redLens.brightness).toBe(0.5);
  });

  it('the palette follows the active profile', () => {
    const { store, a, palette } = setup();
    const b = store.addProfile({ name: 'B', kind: 'adult' }, false);
    store.updateProfile(b.id, (p) => {
      p.vision.weakEye = 'right';
    });
    expect(toHex(palette.current.weakEye)).toBe('#ff0000');
    store.setActive(b.id);
    expect(toHex(palette.current.weakEye)).toBe('#00ffff');
    store.setActive(a.id);
    expect(toHex(palette.current.weakEye)).toBe('#ff0000');
  });

  it('the renderer keeps no colour of its own', () => {
    const source = Object.values(
      import.meta.glob('/src/engine/renderer.ts', { query: '?raw', import: 'default', eager: true }) as Record<
        string,
        string
      >,
    )[0];
    expect(source).toContain('this.palette.current');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
