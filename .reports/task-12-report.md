# Task 12: Confetti Effect — Report

## File Created: `src/ui/confetti.js`

```js
// src/ui/confetti.js
import confetti from 'canvas-confetti';

export function celebrate(gender) {
  const colors = gender === 'boy' ? ['#4aa8ff', '#1e6fd8', '#ffffff'] : ['#ff6fae', '#e83e8c', '#ffffff'];
  let frames = 120;
  (function frame() {
    confetti({ particleCount: 6, spread: 70, origin: { y: 0.6 }, colors });
    if (frames-- > 0) requestAnimationFrame(frame);
  })();
}
```

**Notes:**
- Dead line `const end = Date.now ? undefined : undefined;` omitted as instructed
- Exports `celebrate(gender)` function
- Selects blue colors (`#4aa8ff`, `#1e6fd8`, `#ffffff`) for 'boy', pink colors (`#ff6fae`, `#e83e8c`, `#ffffff`) for all other values
- Runs a 120-frame requestAnimationFrame loop
- Calls `confetti()` with particleCount: 6, spread: 70, origin: { y: 0.6 }, and appropriate colors

## Test Results: `tests/player.test.js`

```
 RUN  v1.6.1 /Users/yadavv4/Downloads/gr-project

 ✓ tests/player.test.js  (4 tests) 37ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  09:53:35
   Duration  691ms (transform 30ms, setup 0ms, collect 37ms, tests 37ms, environment 388ms, prepare 58ms)
```

**All 4 assertions passing:**
- ✅ welcome lists players and advances to guess
- ✅ submitting a guess calls api.submitGuess
- ✅ correct puzzle answer finishes and shows the code
- ✅ waiting room shows progress and reveal stays locked
