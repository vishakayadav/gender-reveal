import { describe, it, expect } from 'vitest';
import { splitQuestion, base64 } from '../src/lib/finalCode.js';

describe('final code', () => {
  it('splits by words into n groups, remainder to the earlier groups', () => {
    expect(splitQuestion('what is the capital of france', 3)).toEqual(['what is', 'the capital', 'of france']);
    expect(splitQuestion('one two three four five', 2)).toEqual(['one two three', 'four five']);
    expect(splitQuestion('solo', 1)).toEqual(['solo']);
    expect(splitQuestion('  spaced   out  words here ', 2)).toEqual(['spaced out', 'words here']);
  });

  it('base64 encodes UTF-8 and round-trips', () => {
    const enc = base64('the capital');
    expect(enc).toBe('dGhlIGNhcGl0YWw=');
    expect(Buffer.from(enc, 'base64').toString('utf-8')).toBe('the capital');
  });
});
