import { describe, it, expect } from 'vitest';
import { isRevealUnlocked } from '../src/lib/reveal.js';

describe('isRevealUnlocked', () => {
  it('locked when reveal flag is off, even if all codes are in', () => {
    expect(isRevealUnlocked({ codesIn: 6, total: 6, revealOpen: false })).toBe(false);
  });
  it('locked when not all codes are in, even if flag is on', () => {
    expect(isRevealUnlocked({ codesIn: 5, total: 6, revealOpen: true })).toBe(false);
  });
  it('unlocked only when flag on AND all codes in', () => {
    expect(isRevealUnlocked({ codesIn: 6, total: 6, revealOpen: true })).toBe(true);
  });
  it('locked when total is 0', () => {
    expect(isRevealUnlocked({ codesIn: 0, total: 0, revealOpen: true })).toBe(false);
  });
});
