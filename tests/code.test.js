// tests/code.test.js
import { describe, it, expect } from 'vitest';
import { normalizeName, generateCode } from '../src/lib/code.js';

describe('normalizeName', () => {
  it('lowercases, trims, and collapses whitespace', () => {
    expect(normalizeName('  Priya   Kumar ')).toBe('priya kumar');
  });
});

describe('generateCode', () => {
  it('is 6 chars from the unambiguous alphabet', () => {
    const code = generateCode('Priya', 'salt123');
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
  it('is deterministic', () => {
    expect(generateCode('Priya', 'salt123')).toBe(generateCode(' priya ', 'salt123'));
  });
  it('differs by name and by salt', () => {
    expect(generateCode('Priya', 'salt123')).not.toBe(generateCode('Arjun', 'salt123'));
    expect(generateCode('Priya', 'salt123')).not.toBe(generateCode('Priya', 'other'));
  });
});
