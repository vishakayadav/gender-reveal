# Task 11: Player flow controller (`src/player/player.js`) — Implementation Report

## Summary
🚫 **BLOCKED** — Both files created exactly as specified in the brief (transcribed verbatim). The initial "should fail" check passed as expected. However, the final "should pass" test run FAILS — not due to a transcription error in `tests/player.test.js` or `src/player/player.js`, but because `src/player/player.js` contains a **forward reference** to `src/ui/confetti.js` (`import('../ui/confetti.js')` inside `renderReveal`), which is only created later in **Task 12**. Vite's import-analysis step statically resolves all `import()` call targets during module transform — even ones inside a `.then().catch()` that no test in `tests/player.test.js` ever triggers — and fails the whole module load when the target file doesn't exist yet.

This is a real sequencing/dependency issue baked into the brief itself (Task 11's code block references a file Task 12 hasn't created yet), not a mistake on my part. Per my instructions, I'm stopping here instead of silently creating `src/ui/confetti.js` (out of scope: I was told to create only `tests/player.test.js` and `src/player/player.js`, modify nothing else).

I verified the diagnosis empirically: temporarily stubbing `src/ui/confetti.js` with `export function celebrate(gender) {}` made all 4 tests pass immediately, then I deleted the stub/probe files to leave the repo in the state permitted by my instructions (only the two assigned files created).

---

## Files Created

### 1. `tests/player.test.js` (verbatim transcription of brief Step 1)

```js
// tests/player.test.js
import { describe, it, expect, vi } from 'vitest';
import { initPlayer } from '../src/player/player.js';

const puzzles = [{ id: 1, riddle: 'q', answers: ['a'], hint: 'h' }];

function stubApi(overrides = {}) {
  return {
    getGame: vi.fn(async () => ({ gameName: 'B', players: ['Priya', 'Arjun'], revealOpen: false, codesIn: 0, total: 2 })),
    submitGuess: vi.fn(async () => ({ ok: true })),
    submitCode: vi.fn(async () => ({ ok: true, code: 'ABCDEF', codesIn: 1 })),
    getReveal: vi.fn(async () => ({ locked: true })),
    ...overrides,
  };
}

describe('player flow', () => {
  it('welcome lists players and advances to guess', async () => {
    const root = document.createElement('div');
    const api = stubApi();
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    expect(root.querySelectorAll('option').length).toBe(2); // datalist options
    c.state.name = 'Priya';
    await c.goGuess();
    expect(root.textContent).toContain('Boy');
    expect(root.textContent).toContain('Girl');
  });

  it('submitting a guess calls api.submitGuess', async () => {
    const root = document.createElement('div');
    const api = stubApi();
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    c.state.name = 'Priya';
    await c.submitGuess('girl');
    expect(api.submitGuess).toHaveBeenCalledWith('g1', 'Priya', 'girl');
  });

  it('correct puzzle answer finishes and shows the code', async () => {
    const root = document.createElement('div');
    const api = stubApi();
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    c.state.name = 'Priya';
    await c.answerCurrent('a'); // only one puzzle -> finishes
    expect(api.submitCode).toHaveBeenCalledWith('g1', 'Priya');
    expect(root.textContent).toContain('ABCDEF');
  });

  it('waiting room shows progress and reveal stays locked', async () => {
    const root = document.createElement('div');
    const api = stubApi();
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    await c.goWaiting();
    expect(root.textContent).toContain('of 2');
  });
});
```

### 2. `src/player/player.js` (verbatim transcription of brief Step 3)

```js
// src/player/player.js
import { createApi } from '../lib/api.js';
import { BACKEND_URL } from '../config.js';
import { PUZZLES } from '../data/puzzles.js';
import { checkAnswer } from '../lib/puzzles.js';
import { isRevealUnlocked } from '../lib/reveal.js';

export async function initPlayer({ root, api, gameId, puzzles }) {
  const state = { name: '', guess: '', idx: 0, code: '', game: null };
  const P = puzzles || PUZZLES;

  function el(html) { const d = document.createElement('div'); d.innerHTML = html; return d; }
  function set(node) { root.innerHTML = ''; root.appendChild(node); }

  state.game = await api.getGame(gameId);

  const controller = { state, goGuess, submitGuess, answerCurrent, goWaiting, renderReveal };

  function renderWelcome() {
    const opts = state.game.players.map((n) => `<option value="${n}"></option>`).join('');
    const node = el(`<div class="card">
      <h1>🎉 ${state.game.gameName || 'Gender Reveal'}</h1>
      <p>Pick your name to begin.</p>
      <input id="name" list="names" placeholder="Start typing your name" autocomplete="off" />
      <datalist id="names">${opts}</datalist>
      <button class="btn" id="start">Start</button>
    </div>`);
    node.querySelector('#start').onclick = async () => {
      const val = node.querySelector('#name').value;
      if (!state.game.players.some((n) => n === val)) { alert('Please pick your name from the list.'); return; }
      state.name = val;
      await goGuess();
    };
    set(node);
  }

  async function goGuess() {
    const node = el(`<div class="card">
      <h2>Hi ${state.name}! What's your guess?</h2>
      <button class="btn" id="boy">Boy 💙</button>
      <button class="btn" id="girl">Girl 💖</button>
    </div>`);
    node.querySelector('#boy').onclick = () => submitGuess('boy');
    node.querySelector('#girl').onclick = () => submitGuess('girl');
    set(node);
  }

  async function submitGuess(guess) {
    state.guess = guess;
    await api.submitGuess(gameId, state.name, guess);
    state.idx = 0;
    renderPuzzle();
  }

  function renderPuzzle() {
    const p = P[state.idx];
    const node = el(`<div class="card">
      <div class="progress">Puzzle ${state.idx + 1} of ${P.length}</div>
      <p>${p.riddle}</p>
      <input id="ans" placeholder="Your answer" autocomplete="off" />
      <button class="btn" id="submit">Submit</button>
      <button class="btn" id="hint" style="background:#bbb">Hint</button>
      <p id="fb"></p>
    </div>`);
    node.querySelector('#hint').onclick = () => { node.querySelector('#fb').textContent = 'Hint: ' + p.hint; };
    node.querySelector('#submit').onclick = () => answerCurrent(node.querySelector('#ans').value, node);
    set(node);
  }

  async function answerCurrent(value, node) {
    const p = P[state.idx];
    if (!checkAnswer(p, value)) {
      if (node) node.querySelector('#fb').textContent = 'Not quite — try again!';
      return;
    }
    if (state.idx < P.length - 1) { state.idx++; renderPuzzle(); return; }
    const res = await api.submitCode(gameId, state.name);
    state.code = res.code;
    renderCode();
  }

  function renderCode() {
    const node = el(`<div class="card">
      <h2>You did it, ${state.name}! 🎉</h2>
      <p>Your personal code:</p>
      <div class="big">${state.code}</div>
      <button class="btn" id="next">Continue</button>
    </div>`);
    node.querySelector('#next').onclick = () => goWaiting();
    set(node);
  }

  async function goWaiting() {
    async function tick() {
      const g = await api.getGame(gameId);
      state.game = g;
      if (isRevealUnlocked({ codesIn: g.codesIn, total: g.total, revealOpen: g.revealOpen })) {
        const r = await api.getReveal(gameId, state.name);
        if (!r.locked) { renderReveal(r.reveal); return; }
      }
      const node = el(`<div class="card">
        <h2>Almost there!</h2>
        <div class="progress">${g.codesIn} of ${g.total} codes in</div>
        <p>${g.revealOpen ? 'Waiting for everyone to finish…' : 'Waiting for the host to start the reveal 🔒'}</p>
      </div>`);
      set(node);
      controller._timer = setTimeout(tick, 4000);
    }
    await tick();
  }

  function renderReveal(reveal) {
    const cls = reveal.gender === 'boy' ? 'reveal-boy' : 'reveal-girl';
    const node = el(`<div class="card ${cls}">
      <div class="big">${reveal.message || (reveal.gender === 'boy' ? "It's a Boy! 💙" : "It's a Girl! 💖")}</div>
    </div>`);
    set(node);
    import('../ui/confetti.js').then((m) => m.celebrate(reveal.gender)).catch(() => {});
  }

  renderWelcome();
  return controller;
}

// Auto-boot when loaded in the browser (skipped in tests that import initPlayer directly).
if (typeof window !== 'undefined' && document.getElementById('app') && !window.__PLAYER_TEST__) {
  const gameId = new URLSearchParams(location.search).get('game');
  const root = document.getElementById('app');
  if (!gameId) { root.innerHTML = '<div class="card">Missing game link.</div>'; }
  else { initPlayer({ root, api: createApi(BACKEND_URL), gameId }); }
}
```

---

## Test Execution

### First Run (Step 2 — expected to fail, before `src/player/player.js` existed)
```
FAIL  tests/player.test.js [ tests/player.test.js ]
Error: Failed to resolve import "../src/player/player.js" from "tests/player.test.js". Does the file exist?
```
✅ Failed as expected — `initPlayer` not yet defined.

### Final Run (Step 5 — after `src/player/player.js` created, as committed to disk now)
```
RUN  v1.6.1 /Users/yadavv4/Downloads/gr-project

 ❯ tests/player.test.js  (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/player.test.js [ tests/player.test.js ]
Error: Failed to resolve import "../ui/confetti.js" from "src/player/player.js". Does the file exist?
 ❯ TransformPluginContext._formatError node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49258:41
 ❯ TransformPluginContext.error node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49253:16
 ❯ normalizeUrl node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64307:23
 ❯ async file:/Users/yadavv4/Downloads/gr-project/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64439:39
 ❯ TransformPluginContext.transform node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64366:7
 ❯ PluginContainer.transform node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49099:18
 ❯ loadAndTransform node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:51978:27

 Test Files  1 failed (1)
      Tests  no tests
   Start at  09:51:11
   Duration  677ms (transform 13ms, setup 0ms, collect 0ms, tests 0ms, environment 313ms, prepare 47ms)
```
🚫 **BLOCKED** — 0/4 assertions run; the whole test file fails to even collect because the module under test cannot be transformed.

### Diagnostic probe (temporary, not part of the deliverable)
To confirm the diagnosis, I temporarily created `src/ui/confetti.js` with a trivial stub (`export function celebrate(gender) {}`) and re-ran the suite:
```
RUN  v1.6.1 /Users/yadavv4/Downloads/gr-project

 ✓ tests/player.test.js  (4 tests) 34ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  09:50:43
   Duration  705ms (transform 20ms, setup 0ms, collect 23ms, tests 34ms, environment 247ms, prepare 42ms)
```
All 4 assertions pass once `src/ui/confetti.js` exists. I then **deleted the stub file and the empty `src/ui/` directory** to restore the repo to a state containing only the two files I was authorized to create (`tests/player.test.js`, `src/player/player.js`).

---

## Diagnosis

`src/player/player.js`'s `renderReveal()` function (as written verbatim in the brief) contains:
```js
import('../ui/confetti.js').then((m) => m.celebrate(reveal.gender)).catch(() => {});
```
This is a dynamic `import()` with a static string literal argument. Vite's built-in import-analysis plugin resolves the target of every such `import()` call **at transform time** (to build the module/chunk graph), regardless of whether that branch is ever executed at runtime. None of the 4 tests in `tests/player.test.js` call `renderReveal` (the closest, "waiting room shows progress and reveal stays locked", stubs `getReveal` to return `{ locked: true }`, so `renderReveal` is never invoked) — but that doesn't matter, because the failure happens during Vite's transform/collect phase, before any test body runs.

`src/ui/confetti.js` is the deliverable of **Task 12** (later in the plan), not Task 11. Since my instructions restrict me to creating only `tests/player.test.js` and `src/player/player.js`, and explicitly forbid "silently fixing the spec," I cannot create `src/ui/confetti.js` to unblock this myself, and I cannot alter the transcribed code (the brief's Step 3 code block is authoritative, transcribed exactly).

This is not a transcription error — my `src/player/player.js` is a byte-for-byte match of the brief's Step 3 code block. It's a genuine ordering dependency in the plan itself: Task 11's shipped code references a module Task 12 hasn't created yet, and the brief's Task 11 Step 5 ("Run test to verify it passes... Expected: PASS (4 assertions)") cannot be satisfied in isolation — it implicitly assumes Task 12 has already run, or that Vite's dynamic-import resolution is lazy (it isn't, in this Vite/Vitest version, for statically-analyzable string-literal `import()` targets).

**Suggested resolution (not applied):** either (a) run Task 12 before Task 11's final verification (reorder execution), or (b) change the brief's `renderReveal` to use a runtime-guarded/non-statically-analyzable dynamic import (e.g. build the path from a variable, or wrap in `/* @vite-ignore */`), or (c) create `src/ui/confetti.js` alongside Task 11 as an exception. I did not apply any of these since they fall outside my authorized file set / instructions.

---

## Files Left On Disk

- `/Users/yadavv4/Downloads/gr-project/tests/player.test.js` — created, verbatim per brief.
- `/Users/yadavv4/Downloads/gr-project/src/player/player.js` — created, verbatim per brief.
- No other files created or modified. Diagnostic probe files (`src/ui/confetti.js`, `src/ui/confetti.js.tmp_probe`, and the `src/ui/` directory) were deleted after use.
- No git commands run (per DEVIATIONS instruction).
