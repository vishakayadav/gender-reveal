# Task 14 Report: Admin flow controller (src/admin/admin.js)

## Status: PASSED (TDD cycle completed as specified)

## Steps performed
1. Created `tests/admin.test.js` exactly as transcribed from the brief.
2. Ran `npx vitest run tests/admin.test.js` → FAILED as expected: `Error: Failed to resolve import "../src/admin/admin.js" from "tests/admin.test.js". Does the file exist?` (cannot import `initAdmin`).
3. Created `src/admin/admin.js` exactly as transcribed from the brief, including the module-level auto-boot block guarded by `window.__ADMIN_TEST__` / `document.getElementById('app')`.
4. Ran `npx vitest run tests/admin.test.js` → PASSED, 2/2 tests.

## Final file: tests/admin.test.js

```js
// tests/admin.test.js
import { describe, it, expect, vi } from 'vitest';
import { initAdmin } from '../src/admin/admin.js';

function stubApi(overrides = {}) {
  return {
    createGame: vi.fn(async () => ({ gameId: 'abcd1234' })),
    setRevealOpen: vi.fn(async () => ({ ok: true })),
    ...overrides,
  };
}

describe('admin flow', () => {
  it('buildPayload parses players and reveal content', () => {
    const root = document.createElement('div');
    const c = initAdmin({ root, api: stubApi(), origin: 'https://site' });
    const payload = c.buildPayload({
      gameName: 'Baby R', playersText: 'Priya\nArjun\n', revealOpen: false,
      gender: 'girl', message: "It's a Girl!",
    });
    expect(payload.players).toEqual(['Priya', 'Arjun']);
    expect(payload.revealContent).toEqual({ gender: 'girl', message: "It's a Girl!" });
    expect(payload.revealOpen).toBe(false);
  });

  it('create calls api and produces a player link', async () => {
    const root = document.createElement('div');
    const api = stubApi();
    const c = initAdmin({ root, api, origin: 'https://site' });
    c.setPassword('pw');
    const link = await c.create({ gameName: 'B', playersText: 'A\nB', revealOpen: true, gender: 'boy', message: '' });
    expect(api.createGame).toHaveBeenCalled();
    expect(link).toBe('https://site/play.html?game=abcd1234');
  });
});
```

## Final file: src/admin/admin.js

```js
// src/admin/admin.js
import { createApi } from '../lib/api.js';
import { BACKEND_URL } from '../config.js';

export function initAdmin({ root, api, origin }) {
  const state = { pw: '' };
  function el(html) { const d = document.createElement('div'); d.innerHTML = html; return d; }
  function set(node) { root.innerHTML = ''; root.appendChild(node); }

  function setPassword(pw) { state.pw = pw; }

  function buildPayload(form) {
    const players = String(form.playersText).split('\n').map((s) => s.trim()).filter(Boolean);
    return {
      gameName: form.gameName,
      players,
      revealOpen: !!form.revealOpen,
      revealContent: { gender: form.gender, message: form.message || '' },
    };
  }

  async function create(form) {
    const payload = buildPayload(form);
    const res = await api.createGame(state.pw, payload);
    if (res.error) throw new Error(res.error);
    return `${origin}/play.html?game=${res.gameId}`;
  }

  function renderLogin() {
    const node = el(`<div class="card">
      <h1>Admin</h1>
      <input id="pw" type="password" placeholder="Admin password" />
      <button class="btn" id="go">Continue</button>
    </div>`);
    node.querySelector('#go').onclick = () => { setPassword(node.querySelector('#pw').value); renderForm(); };
    set(node);
  }

  function renderForm() {
    const node = el(`<div class="card">
      <h1>Create a game</h1>
      <input id="gameName" placeholder="Game name (e.g. Baby R)" />
      <textarea id="players" rows="6" placeholder="One player name per line"></textarea>
      <label>Reveal content</label>
      <select id="gender"><option value="girl">Girl</option><option value="boy">Boy</option></select>
      <input id="message" placeholder="Reveal message (optional)" />
      <label><input type="checkbox" id="revealOpen" /> Reveal open immediately (no waiting)</label>
      <button class="btn" id="create">Create game</button>
      <p id="err" style="color:#c00"></p>
    </div>`);
    node.querySelector('#create').onclick = async () => {
      try {
        const link = await create({
          gameName: node.querySelector('#gameName').value,
          playersText: node.querySelector('#players').value,
          revealOpen: node.querySelector('#revealOpen').checked,
          gender: node.querySelector('#gender').value,
          message: node.querySelector('#message').value,
        });
        renderResult(link);
      } catch (e) { node.querySelector('#err').textContent = e.message; }
    };
    set(node);
  }

  async function renderResult(link) {
    const node = el(`<div class="card">
      <h1>Game created 🎉</h1>
      <p>Share this link with players:</p>
      <input id="link" readonly value="${link}" />
      <button class="btn" id="copy">Copy link</button>
      <canvas id="qr"></canvas>
      <p><a href="#" id="another">Create another</a></p>
    </div>`);
    node.querySelector('#copy').onclick = () => navigator.clipboard?.writeText(link);
    node.querySelector('#another').onclick = (e) => { e.preventDefault(); renderForm(); };
    set(node);
    try { const { renderQR } = await import('../ui/qr.js'); await renderQR(node.querySelector('#qr'), link); } catch (_) {}
  }

  const controller = { state, setPassword, buildPayload, create, renderLogin, renderForm, renderResult };
  return controller;
}

if (typeof window !== 'undefined' && document.getElementById('app') && !window.__ADMIN_TEST__) {
  const root = document.getElementById('app');
  const c = initAdmin({ root, api: createApi(BACKEND_URL), origin: location.origin });
  c.renderLogin();
}
```

## Vitest output — Step 2 (before source file exists)

```
 RUN  v1.6.1 /Users/yadavv4/Downloads/gr-project

 ❯ tests/admin.test.js  (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/admin.test.js [ tests/admin.test.js ]
Error: Failed to resolve import "../src/admin/admin.js" from "tests/admin.test.js". Does the file exist?
 ❯ TransformPluginContext._formatError node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49258:41
 ❯ TransformPluginContext.error node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49253:16
 ❯ normalizeUrl node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64307:23
 ❯ async file:/Users/yadavv4/Downloads/gr-project/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64439:39
 ❯ TransformPluginContext.transform node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64366:7
 ❯ PluginContainer.transform node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49099:18
 ❯ loadAndTransform node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:51978:27

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  no tests
   Start at  09:55:39
   Duration  740ms (transform 7ms, setup 0ms, collect 0ms, tests 0ms, environment 320ms, prepare 46ms)
```

## Vitest output — Step 4 (after source file created)

```
 RUN  v1.6.1 /Users/yadavv4/Downloads/gr-project

 ✓ tests/admin.test.js  (2 tests) 2ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  09:56:12
   Duration  731ms (transform 18ms, setup 1ms, collect 19ms, tests 2ms, environment 318ms, prepare 45ms)
```

## Deviations from brief
- Skipped git commit (Step 5), per explicit instruction. No git commands were run.
- No other deviations; code transcribed exactly as written in the brief.

## Concerns
None. Both required assertions pass cleanly, no transcription discrepancies found, no bugs encountered in the brief's code.
