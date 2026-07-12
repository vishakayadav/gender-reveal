# Task 8: Frontend API client — Implementation Report

## Status
✅ **COMPLETE** — All tests passing (2/2).

## Files Created

### 1. `tests/api.test.js`

```js
// tests/api.test.js
import { describe, it, expect, vi } from 'vitest';
import { createApi } from '../src/lib/api.js';

function fakeFetch(captured) {
  return vi.fn(async (url, opts) => {
    captured.url = url;
    captured.opts = opts;
    return { json: async () => ({ ok: true, echo: JSON.parse(opts.body) }) };
  });
}

describe('createApi', () => {
  it('POSTs text/plain JSON with the right action', async () => {
    const captured = {};
    const api = createApi('https://x/exec', fakeFetch(captured));
    const res = await api.submitGuess('g1', 'Priya', 'girl');
    expect(captured.opts.method).toBe('POST');
    expect(captured.opts.headers['Content-Type']).toBe('text/plain;charset=utf-8');
    expect(res.echo).toEqual({ action: 'submitGuess', gameId: 'g1', name: 'Priya', guess: 'girl' });
  });

  it('createGame includes adminPw and payload', async () => {
    const captured = {};
    const api = createApi('https://x/exec', fakeFetch(captured));
    await api.createGame('pw', { gameName: 'Baby', players: ['A', 'B'], revealOpen: false, revealContent: { gender: 'girl' } });
    expect(captured.opts.body).toContain('"action":"createGame"');
    expect(captured.opts.body).toContain('"adminPw":"pw"');
  });
});
```

### 2. `src/lib/api.js`

```js
// src/lib/api.js
export function createApi(baseUrl, fetchImpl) {
  const f = fetchImpl || globalThis.fetch;
  async function call(payload) {
    const res = await f(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
  return {
    getGame: (gameId) => call({ action: 'getGame', gameId }),
    submitGuess: (gameId, name, guess) => call({ action: 'submitGuess', gameId, name, guess }),
    submitCode: (gameId, name) => call({ action: 'submitCode', gameId, name }),
    getReveal: (gameId, name) => call({ action: 'getReveal', gameId, name }),
    createGame: (adminPw, cfg) => call({ action: 'createGame', adminPw, ...cfg }),
    setRevealOpen: (adminPw, gameId, open) => call({ action: 'setRevealOpen', adminPw, gameId, open }),
  };
}
```

## Test Execution Results

### Test Failure (Expected — Step 2)
```
FAIL  tests/api.test.js [ tests/api.test.js ]
Error: Failed to resolve import "../src/lib/api.js" from "tests/api.test.js". Does the file exist?
```
✓ Confirmed: test fails before implementation.

### Test Pass (Verified — Step 4)
```
 ✓ tests/api.test.js  (2 tests) 2ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  09:36:14
   Duration  627ms (transform 15ms, setup 0ms, collect 14ms, tests 2ms, environment 300ms, prepare 49ms)
```
✓ Confirmed: all 2 assertions pass.

## Test Summary
- **Assertion 1 (POST method):** Verifies request uses POST with `text/plain;charset=utf-8` content type.
- **Assertion 2 (Action payload):** Verifies `createGame` includes `adminPw` and spreads config into payload.

## Global Constraints Compliance
- ✓ Code alphabet and deterministic behavior defer to backend (no duplication).
- ✓ No frontend secrets in API client (accepts `adminPw` as parameter only).
- ✓ All endpoints return parsed JSON.
- ✓ Text/plain POST avoids CORS preflight against Apps Script.

## Concerns
None. Implementation matches brief exactly; TDD cycle complete.
