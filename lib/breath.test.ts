import { describe, expect, it } from 'vitest';
import { breathAt, DEFAULT_TIMING, readTiming } from './breath';
describe('breathing rhythm', () => {
  it('enters each phase continuously and wraps at nineteen seconds', () => {
    expect(breathAt(0, DEFAULT_TIMING)).toEqual({ phase: 'breathe in', amount: 0 });
    expect(breathAt(4000, DEFAULT_TIMING)).toEqual({ phase: 'hold', amount: 1 });
    expect(breathAt(11000, DEFAULT_TIMING)).toEqual({ phase: 'breathe out', amount: 1 });
    expect(breathAt(15000, DEFAULT_TIMING).amount).toBeCloseTo(.5);
    expect(breathAt(19000, DEFAULT_TIMING)).toEqual({ phase: 'breathe in', amount: 0 });
  });
  it('skips a zero hold and validates persisted inputs', () => {
    expect(breathAt(4000, { inhale: 4, hold: 0, exhale: 8 }).phase).toBe('breathe out');
    expect(readTiming({ inhale: 0, hold: 0, exhale: NaN })).toEqual({ inhale: 4, hold: 0, exhale: 8 });
  });
});
