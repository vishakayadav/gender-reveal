# Task 9: Puzzle data + answer checker — Implementation Report

## Summary
✅ **PASS** — All 3 files created; both test assertions pass.

---

## Files Created

### 1. `tests/puzzles.test.js`

```js
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
```

### 2. `src/data/puzzles.js`

```js
// src/data/puzzles.js — starter set; edit freely. Keep `answers` lowercase-friendly.
export const PUZZLES = [
  { id: 1, riddle: "I shake and rattle to make you smile, I keep a baby amused for a while. What am I?", answers: ['rattle', 'a rattle'], hint: 'It makes noise when you shake it.' },
  { id: 2, riddle: "Count the months a baby grows inside, before the day of the great reveal ride.", answers: ['9', 'nine'], hint: 'Three trimesters.' },
  { id: 3, riddle: "Soft and warm, I wrap you tight, holding a newborn through the night. What am I?", answers: ['blanket', 'a blanket', 'swaddle'], hint: 'You wrap the baby in it.' },
  { id: 4, riddle: "First word many babies say, calling the one who's home all day.", answers: ['mama', 'mom', 'mumma', 'amma'], hint: "It's a parent." },
];
```

### 3. `src/lib/puzzles.js`

```js
// src/lib/puzzles.js
export function checkAnswer(puzzle, input) {
  const norm = String(input).trim().toLowerCase();
  return puzzle.answers.some((a) => String(a).trim().toLowerCase() === norm);
}
```

---

## Test Execution

### First Run (Expected to Fail)
```
Error: Failed to resolve import "../src/data/puzzles.js" from "tests/puzzles.test.js". Does the file exist?
```
✅ Failed as expected — import errors before files created.

### Final Run (After Implementation)
```
 RUN  v1.6.1 /Users/yadavv4/Downloads/gr-project

 ✓ tests/puzzles.test.js  (2 tests) 1ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
      Start at  09:39:44
      Duration  662ms (transform 15ms, setup 0ms, collect 15ms, tests 1ms, environment 304ms, prepare 48ms)
```

---

## Assertions Verified

1. **Puzzle Data Integrity**
   - ✅ PUZZLES array has exactly 4 puzzles (≥ 4 required)
   - ✅ Each puzzle has `id`, `answers` array with ≥1 element

2. **Answer Checker Logic**
   - ✅ Case-insensitive match: `"rATTle"` matches `"Rattle"`
   - ✅ Whitespace trimmed: `"  rATTle "` matches `"Rattle"`
   - ✅ Negative case: `"bottle"` does not match `["Rattle"]`

---

## Global Constraints Compliance

- ✅ Puzzles are a fixed shared set (baked into frontend)
- ✅ All puzzle answers are lowercase-friendly (support case-insensitive matching)
- ✅ No external dependencies added (uses only Vitest import)
- ✅ Pure logic, testable, deterministic

---

## Deliverables

| File | Location | Status |
|------|----------|--------|
| Test file | `/Users/yadavv4/Downloads/gr-project/tests/puzzles.test.js` | ✅ Created |
| Puzzle data | `/Users/yadavv4/Downloads/gr-project/src/data/puzzles.js` | ✅ Created |
| Answer logic | `/Users/yadavv4/Downloads/gr-project/src/lib/puzzles.js` | ✅ Created |

---

## Notes

- No git commits made (as instructed).
- No other files modified.
- Starter riddles provided; customization available per-game in Task 14 (admin form).
