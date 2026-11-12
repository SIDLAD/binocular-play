import type { SoundKind } from '../engine/api';

/**
 * Soft feedback tones made with WebAudio: short sine notes with gentle fades, quiet,
 * and never more than a few per second. No sound files, nothing downloaded.
 */
const NOTES: Record<SoundKind, number[]> = {
  good: [660, 880],
  bad: [330],
  tick: [520],
  level: [523, 659, 784],
};

const MIN_GAP_MS = 120;
let ctx: AudioContext | null = null;
let last = 0;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function playTone(kind: SoundKind): void {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - last < MIN_GAP_MS) return;
  last = now;
  const ac = audio();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume().catch(() => {});
  const t0 = ac.currentTime;
  NOTES[kind].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = t0 + i * 0.09;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.06, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  });
}
