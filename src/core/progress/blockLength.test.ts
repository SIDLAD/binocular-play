import { describe, expect, it } from 'vitest';
import { blockTrialsFor, startBackOff } from './blockLength';

describe('block length', () => {
  const spec = { choices: [5, 10, 20, 40], default: 40 };

  it('uses the stored pick only when it is one of the choices', () => {
    expect(blockTrialsFor(spec, undefined)).toBe(40);
    expect(blockTrialsFor(spec, 10)).toBe(10);
    expect(blockTrialsFor(spec, 7)).toBe(40);
    expect(blockTrialsFor(spec, NaN)).toBe(40);
  });

  it('backs off fully for long blocks and only a little for short ones', () => {
    expect(startBackOff(1.5, 40)).toBe(1.5);
    expect(startBackOff(1.5, 20)).toBe(1.5);
    expect(startBackOff(1.5, 10)).toBeCloseTo(1.125);
    expect(startBackOff(1.5, 5)).toBeCloseTo(1.0625);
    // Never makes the next block harder than the level reached.
    expect(startBackOff(1.3, 0)).toBe(1);
  });
});
