import { describe, expect, it } from 'vitest';
import { hsvToRgb, mixGamma, mixLinear, normaliseHex, parseHex, rgbToHsv, toHex } from '../colour/srgb';
import { addSessionRecord, currentStreak, makeRecord, secondsOnDay } from '../progress/sessionLog';
import { exportData, importData } from './exportImport';
import { sanitizeAppData } from './migrate';
import { STORAGE_KEY, createProfile, emptyAppData } from './schema';
import { MemoryStorage, SettingsStore } from './store';

describe('colour maths', () => {
  it('parses and prints hex', () => {
    expect(normaliseHex('F00')).toBe('#ff0000');
    expect(normaliseHex(' #00E0ff ')).toBe('#00e0ff');
    expect(normaliseHex('nope')).toBeNull();
    expect(toHex(parseHex('#12ab9f'))).toBe('#12ab9f');
  });

  it('mixes exactly at the ends', () => {
    const a = [0, 0, 0] as const;
    const b = [255, 10, 128] as const;
    expect(mixGamma(a, b, 1)).toEqual(b);
    expect(mixGamma(a, b, 0)).toEqual(a);
    expect(mixLinear(a, b, 1)).toEqual(b);
    expect(mixLinear(a, b, 0)).toEqual(a);
    expect(mixLinear(a, b, 2)).toEqual(b);
    expect(mixLinear(a, b, Number.NaN)).toEqual(a);
  });

  it('one brightness step is one code value', () => {
    expect(mixGamma([0, 0, 0], [255, 0, 0], 254 / 255)).toEqual([254, 0, 0]);
    expect(mixGamma([255, 255, 255], [0, 255, 255], 1 / 255)).toEqual([254, 255, 255]);
  });

  it('round-trips HSV', () => {
    for (const hex of ['#ff0000', '#00ffff', '#0000ff', '#00ff00', '#ff8800', '#808080']) {
      const { h, s, v } = rgbToHsv(parseHex(hex));
      expect(toHex(hsvToRgb(h, s, v))).toBe(hex);
    }
  });
});

describe('settings store', () => {
  it('starts empty with a device id, and saves at once', () => {
    const storage = new MemoryStorage();
    const store = new SettingsStore(storage);
    expect(store.data.profiles).toEqual([]);
    expect(store.activeProfile).toBeNull();
    expect(store.data.deviceId.length).toBeGreaterThan(5);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').version).toBe(1);
  });

  it('survives damaged storage', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    expect(new SettingsStore(storage).data.profiles).toEqual([]);
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, profiles: 'oops', activeProfileId: 7 }));
    expect(new SettingsStore(storage).data.profiles).toEqual([]);
  });

  it('keeps working when the browser refuses to save', () => {
    const store = new SettingsStore({
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    });
    store.addProfile({ name: 'A', kind: 'child' });
    expect(store.persistOk).toBe(false);
    expect(store.activeProfile?.name).toBe('A');
  });

  it('notifies subscribers and never mutates the previous state', () => {
    const store = new SettingsStore(new MemoryStorage());
    store.addProfile({ name: 'A', kind: 'child' });
    const before = store.data;
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.updateActive((p) => {
      p.fellowContrast = 0.4;
    });
    expect(calls).toBe(1);
    expect(before.profiles[0].fellowContrast).toBe(1);
    expect(store.activeProfile?.fellowContrast).toBe(0.4);
    off();
    store.updateActive((p) => {
      p.fellowContrast = 0.5;
    });
    expect(calls).toBe(1);
  });

  it('deleting the active profile moves to another one', () => {
    const store = new SettingsStore(new MemoryStorage());
    const a = store.addProfile({ name: 'A', kind: 'child' });
    const b = store.addProfile({ name: 'B', kind: 'adult' });
    expect(store.activeProfile?.id).toBe(b.id);
    store.deleteProfile(b.id);
    expect(store.activeProfile?.id).toBe(a.id);
    store.deleteProfile(a.id);
    expect(store.activeProfile).toBeNull();
  });
});

describe('sanitizeAppData', () => {
  it('coerces every bad field to a valid value', () => {
    const data = sanitizeAppData({
      version: 99,
      activeProfileId: 'missing',
      profiles: [
        {
          id: 'x',
          name: '   ',
          avatar: 400,
          kind: 'robot',
          vision: { glasses: 'purple', redLensEye: 'middle', weakEye: 'left', background: 'pink' },
          calibration: { redLens: { base: 'red', brightness: 7 }, otherLens: { base: '#0F0', brightness: -1 }, bothBrightness: 'x' },
          fellowContrast: 0,
          session: { lengthMin: 9999, patchReminder: { note: 'n'.repeat(500) } },
          safety: { doubleVisionBlockedOn: 'yesterday', events: [{ at: 'never' }, { at: '2026-11-11T10:00:00.000Z', kind: 'k' }] },
          progress: { sessions: [{ gameId: 'g' }, { date: '2026-11-11T10:00:00.000Z', gameId: 'g', seconds: -5, endedBy: 'x' }], best: { g: 'high' } },
        },
        { name: 'no id' },
        null,
      ],
    });
    expect(data.profiles.length).toBe(1);
    const p = data.profiles[0];
    expect(data.activeProfileId).toBe('x');
    expect(p.name).toBe('Player');
    expect(p.avatar).toBe(7);
    expect(p.kind).toBe('child');
    expect(p.vision).toEqual({ glasses: 'red-cyan', redLensEye: 'left', weakEye: 'left', background: 'dark' });
    expect(p.calibration.redLens).toEqual({ base: '#ff0000', brightness: 1 });
    expect(p.calibration.otherLens).toEqual({ base: '#00ff00', brightness: 0 });
    expect(p.calibration.bothBrightness).toBe(0.6);
    expect(p.fellowContrast).toBe(0.1);
    expect(p.session.lengthMin).toBe(60);
    expect(p.session.patchReminder.note.length).toBe(120);
    expect(p.safety.doubleVisionBlockedOn).toBeNull();
    expect(p.safety.events).toEqual([{ at: '2026-11-11T10:00:00.000Z', kind: 'k' }]);
    expect(p.progress.sessions.length).toBe(1);
    expect(p.progress.sessions[0]).toMatchObject({ seconds: 0, endedBy: 'quit' });
    expect(p.progress.best).toEqual({});
    expect(p.onboarding.disclaimerAcceptedAt).toBeNull();
  });

  it('is stable: sanitizing valid data changes nothing', () => {
    const data = emptyAppData();
    data.profiles.push(createProfile({ name: 'A', kind: 'adult' }));
    data.activeProfileId = data.profiles[0].id;
    expect(sanitizeAppData(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });
});

describe('export and import', () => {
  const now = new Date('2026-11-11T12:00:00.000Z');

  it('round-trips on the same device without touching calibration', () => {
    const store = new SettingsStore(new MemoryStorage());
    store.addProfile({ name: 'A', kind: 'child' });
    store.updateActive((p) => {
      p.calibration.redLens.brightness = 0.7;
    });
    const result = importData(store.data, exportData(store.data, now));
    expect(result).toMatchObject({ ok: true, added: 0, replaced: 1, fromOtherDevice: false });
    if (result.ok) {
      expect(result.data.profiles[0].calibration.needsCheck).toBe(false);
      expect(result.data.profiles[0].calibration.redLens.brightness).toBe(0.7);
    }
  });

  it('keeps progress but marks colours "check on this screen" when the file is from another device', () => {
    const other = new SettingsStore(new MemoryStorage());
    other.addProfile({ name: 'Visitor', kind: 'child' });
    other.updateActive((p) => {
      addSessionRecord(p, makeRecord({ gameId: 'g', seconds: 120, score: 50, level: 2, fellowContrast: 1, endedBy: 'gameOver', now }));
    });
    const here = new SettingsStore(new MemoryStorage());
    const mine = here.addProfile({ name: 'Mine', kind: 'adult' });

    const result = importData(here.data, exportData(other.data, now));
    expect(result).toMatchObject({ ok: true, added: 1, replaced: 0, fromOtherDevice: true });
    if (!result.ok) return;
    expect(result.data.deviceId).toBe(here.data.deviceId);
    expect(result.data.activeProfileId).toBe(mine.id);
    const visitor = result.data.profiles.find((p) => p.name === 'Visitor');
    expect(visitor?.calibration.needsCheck).toBe(true);
    expect(visitor?.progress.sessions.length).toBe(1);
    expect(result.data.profiles.find((p) => p.id === mine.id)?.calibration.needsCheck).toBe(false);
  });

  it('rejects files that are not ours', () => {
    const current = emptyAppData();
    expect(importData(current, 'not json').ok).toBe(false);
    expect(importData(current, '{"app":"something-else","data":{}}').ok).toBe(false);
    expect(importData(current, '{"app":"binocular-play","formatVersion":2,"data":{"profiles":[]}}').ok).toBe(false);
    expect(importData(current, '{"app":"binocular-play","formatVersion":1,"data":{"profiles":[]}}').ok).toBe(false);
  });
});

describe('session log', () => {
  it('adds up seconds per local day, tracks bests and streaks', () => {
    const p = createProfile({ name: 'A', kind: 'child' });
    const day = (d: number, hour = 12) => new Date(2026, 10, d, hour, 0, 0);
    const rec = (d: number, seconds: number, score: number) =>
      makeRecord({ gameId: 'g', seconds, score, level: 1, fellowContrast: 0.5, endedBy: 'gameOver', now: day(d) });

    expect(addSessionRecord(p, rec(9, 300, 100))).toBe(true);
    expect(addSessionRecord(p, rec(10, 200, 50))).toBe(false);
    expect(addSessionRecord(p, rec(10, 100, 150))).toBe(true);
    expect(p.progress.best.g).toBe(150);
    expect(secondsOnDay(p, '2026-11-10')).toBe(300);
    expect(secondsOnDay(p, '2026-11-08')).toBe(0);

    expect(currentStreak(p, day(10))).toBe(2);
    expect(currentStreak(p, day(11))).toBe(2); // yesterday still counts until today is over
    expect(currentStreak(p, day(12))).toBe(0);
  });
});
