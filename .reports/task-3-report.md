# Task 3 Implementation Report: Reveal-gate logic

## Files Created

### 1. tests/reveal.test.js

```js
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
```

### 2. src/lib/reveal.js

```js
export function isRevealUnlocked({ codesIn, total, revealOpen }) {
  return revealOpen === true && total > 0 && codesIn >= total;
}
```

## Test Results

### Initial test run (before implementation) — FAILED as expected

```
Error: Failed to resolve import "../src/lib/reveal.js" from "tests/reveal.test.js". Does the file exist?
```

### Final test run (after implementation) — ALL PASS

```
 RUN  v1.6.1 /Users/yadavv4/Downloads/gr-project

 ✓ tests/reveal.test.js  (4 tests) 2ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  09:31:19
   Duration  779ms (transform 18ms, setup 0ms, collect 15ms, tests 2ms, environment 420ms, prepare 63ms)
```

## Summary

- **Status:** COMPLETE ✓
- **Files created:** 2 (`tests/reveal.test.js`, `src/lib/reveal.js`)
- **Test summary:** 4/4 assertions passing — reveal gate correctly enforces server-side unlock condition: `revealOpen === true && total > 0 && codesIn >= total`
- **Concerns:** None. Implementation is minimal and matches the brief exactly.
