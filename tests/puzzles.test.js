// tests/puzzles.test.js
import { describe, it, expect } from 'vitest';
import { PUZZLES } from '../src/data/puzzles.js';
import { checkAnswer } from '../src/lib/puzzles.js';

describe('puzzles', () => {
  it('has at least 4 puzzles with required fields', () => {
    expect(PUZZLES.length).toBeGreaterThanOrEqual(4);
    for (const p of PUZZLES) {
      expect(p).toHaveProperty('id');
      expect(Array.isArray(p.answers)).toBe(true);
      expect(p.answers.length).toBeGreaterThan(0);
    }
  });
  it('checkAnswer matches case-insensitively and trimmed', () => {
    const p = { id: 1, riddle: 'x', answers: ['Rattle'], hint: '' };
    expect(checkAnswer(p, '  rATTle ')).toBe(true);
    expect(checkAnswer(p, 'bottle')).toBe(false);
  });
});
