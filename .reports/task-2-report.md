# Task 2: Personal Code Logic Report

## Status: DONE

## Files Created

1. `/Users/yadavv4/Downloads/gr-project/tests/code.test.js`
2. `/Users/yadavv4/Downloads/gr-project/src/lib/code.js`

## Final Test Summary

**All 4 tests passing** in `tests/code.test.js`

```
✓ tests/code.test.js  (4 tests) 1ms

Test Files  1 passed (1)
     Tests  4 passed (4)
  Start at  09:27:44
  Duration  562ms (transform 14ms, setup 0m, collect 13ms, tests 1ms, environment 289ms, prepare 45ms)
```

## Final File Contents

### tests/code.test.js

```javascript
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
```

### src/lib/code.js

```javascript
// src/lib/code.js
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, no I O 0 1

export function normalizeName(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
}

export function hashString(str) {
  // djb2 xor variant -> unsigned 32-bit
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

export function generateCode(name, salt) {
  let h = hashString(salt + '|' + normalizeName(name));
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[h % 32];
    h = Math.floor(h / 32) + (i + 1) * 2654435761; // mix so later chars vary
    h = h >>> 0;
  }
  return code;
}
```

## Test Coverage

- **normalizeName:** lowercases, trims, and collapses whitespace ✓
- **generateCode:** produces 6-char codes from unambiguous alphabet ✓
- **generateCode:** is deterministic (same inputs = same output) ✓
- **generateCode:** differs by name and by salt ✓

## Implementation Details

- `CODE_ALPHABET` exported constant with correct 32-character unambiguous alphabet (no I, O, 0, 1)
- `normalizeName()` properly normalizes input for consistent hashing
- `hashString()` implements djb2 xor hash variant for reproducible uint32 values
- `generateCode()` generates 6-character codes using modulo arithmetic with mixing function
- All three functions exported for use in Task 4 (Apps Script mirror)

## Concerns

None. All requirements met, all tests passing, code matches brief specification exactly.
