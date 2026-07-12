# Gender Reveal Game Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free, reusable gender-reveal game: a password-protected admin console generates per-game player links; players solve shared riddles, submit a personal code, and collectively unlock a server-gated animated reveal.

**Architecture:** Static frontend (vanilla JS, built with Vite) talks over HTTP to a Google Apps Script Web App, which reads/writes a private Google Sheet (one tab per game). The gender is stored server-side and released only when all codes are in AND the reveal flag is open. Pure logic (code generation, reveal gate) is unit-tested with Vitest; the Apps Script holds a synced copy of that logic.

**Tech Stack:** HTML/CSS/vanilla JS, Vite (build/dev), Vitest + jsdom (test), `canvas-confetti`, `qrcode`, Google Apps Script + `clasp`, Google Sheet.

## Global Constraints

- **Zero hosting cost:** deployed output is static files only; no runtime server. Node is dev-time only.
- **Server-side reveal gate:** the gender is NEVER sent to a client unless `revealOpen === true AND codesIn >= total`. Client button state is cosmetic only.
- **No manual Sheet edits in the normal flow:** all configuration happens through the admin UI.
- **Secrets** (`ADMIN_PW`, `GAME_SALT`) live only in Apps Script **Script Properties**, never in frontend code.
- **Identity by name selection** from a per-game pre-set list (autocomplete); display names must be distinct.
- **Puzzles are a fixed shared set** baked into the frontend (per-game custom puzzles are out of scope).
- **Code alphabet** (unambiguous): `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `I O 0 1`). Codes are 6 chars.
- **Pure logic sync:** `src/lib/code.js` and `src/lib/reveal.js` are canonical (tested); `apps-script/logic.gs` is a verbatim copy of their function bodies with `export` removed. Any change to one must be mirrored.

---

## Milestone A — Scaffold + shared pure logic

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `.gitignore`
- Create: `src/config.js`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `test`; `src/config.js` exports `BACKEND_URL`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "gr-project",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "jsdom": "^24.0.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  },
  "dependencies": {
    "canvas-confetti": "^1.9.3",
    "qrcode": "^1.5.3"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`** (multi-page + jsdom test env)

```js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        play: resolve(__dirname, 'play.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  test: { environment: 'jsdom' },
});
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules
dist
apps-script/.clasp.json
.DS_Store
```

- [ ] **Step 4: Create `src/config.js`**

```js
// Paste the Apps Script Web App /exec URL here after deployment (Task 10).
export const BACKEND_URL = 'REPLACE_WITH_APPS_SCRIPT_EXEC_URL';
```

- [ ] **Step 5: Install and verify**

Run: `npm install && npx vitest run`
Expected: install succeeds; Vitest runs with "No test files found" (exit 0 or 1 with that message — acceptable at this stage).

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.js .gitignore src/config.js
git commit -m "chore: scaffold Vite + Vitest project"
```

---

### Task 2: Personal code logic (`src/lib/code.js`)

**Files:**
- Create: `src/lib/code.js`
- Test: `tests/code.test.js`

**Interfaces:**
- Produces: `normalizeName(name) -> string`, `hashString(str) -> number` (uint32), `generateCode(name, salt) -> string` (6-char code from the constrained alphabet).

- [ ] **Step 1: Write the failing test**

```js
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/code.test.js`
Expected: FAIL — cannot import `normalizeName`/`generateCode`.

- [ ] **Step 3: Write minimal implementation**

```js
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/code.test.js`
Expected: PASS (4 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/code.js tests/code.test.js
git commit -m "feat: deterministic personal code generation"
```

---

### Task 3: Reveal-gate logic (`src/lib/reveal.js`)

**Files:**
- Create: `src/lib/reveal.js`
- Test: `tests/reveal.test.js`

**Interfaces:**
- Produces: `isRevealUnlocked({ codesIn, total, revealOpen }) -> boolean`.

- [ ] **Step 1: Write the failing test**

```js
// tests/reveal.test.js
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reveal.test.js`
Expected: FAIL — cannot import `isRevealUnlocked`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/reveal.js
export function isRevealUnlocked({ codesIn, total, revealOpen }) {
  return revealOpen === true && total > 0 && codesIn >= total;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/reveal.test.js`
Expected: PASS (4 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reveal.js tests/reveal.test.js
git commit -m "feat: server-gated reveal decision logic"
```

---

## Milestone B — Apps Script backend

### Task 4: Backend pure logic mirror (`apps-script/logic.gs`)

**Files:**
- Create: `apps-script/logic.gs`

**Interfaces:**
- Produces (global Apps Script functions): `normalizeName`, `hashString`, `generateCode`, `isRevealUnlocked` — identical behavior to `src/lib/*`.

- [ ] **Step 1: Create `apps-script/logic.gs`** (verbatim copy of `code.js` + `reveal.js`, `export` removed)

```js
// apps-script/logic.gs — MIRROR of src/lib/code.js and src/lib/reveal.js. Keep in sync.
var CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function normalizeName(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
}
function hashString(str) {
  var h = 5381;
  for (var i = 0; i < str.length; i++) {
    h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}
function generateCode(name, salt) {
  var h = hashString(salt + '|' + normalizeName(name));
  var code = '';
  for (var i = 0; i < 6; i++) {
    code += CODE_ALPHABET[h % 32];
    h = (Math.floor(h / 32) + (i + 1) * 2654435761) >>> 0;
  }
  return code;
}
function isRevealUnlocked(o) {
  return o.revealOpen === true && o.total > 0 && o.codesIn >= o.total;
}
```

- [ ] **Step 2: Manual verification of parity**

Confirm by eye that `generateCode`/`normalizeName`/`hashString`/`isRevealUnlocked` match `src/lib/code.js` and `src/lib/reveal.js` line-for-line (only `export`/`const`→`var` differ).

- [ ] **Step 3: Commit**

```bash
git add apps-script/logic.gs
git commit -m "feat: apps script mirror of pure logic"
```

---

### Task 5: Sheet data-access layer (`apps-script/sheet.gs`)

**Files:**
- Create: `apps-script/sheet.gs`

**Interfaces:**
- Produces: `getSS()`, `getIndexSheet()`, `createGameTab(gameId, config)`, `readConfig(gameId) -> {gameName, players[], revealOpen, gender}`, `setConfigValue(gameId, key, value)`, `upsertGuess(gameId, name, guess)`, `markFinished(gameId, name, code)`, `countFinished(gameId) -> number`.

- [ ] **Step 1: Create `apps-script/sheet.gs`**

```js
// apps-script/sheet.gs — all Google Sheet I/O.
var INDEX_SHEET = 'Games';
var CONFIG_ROWS = 6;           // rows reserved for the config block
var RESP_HEADER_ROW = CONFIG_ROWS + 1;

function getSS() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getIndexSheet() {
  var ss = getSS();
  var sh = ss.getSheetByName(INDEX_SHEET);
  if (!sh) {
    sh = ss.insertSheet(INDEX_SHEET);
    sh.appendRow(['gameId', 'gameName', 'createdAt', 'revealOpen', 'playerCount']);
  }
  return sh;
}

function tabName(gameId) { return 'g_' + gameId.slice(0, 8); }

function createGameTab(gameId, config) {
  var ss = getSS();
  var sh = ss.insertSheet(tabName(gameId));
  // config block: key | value
  sh.getRange(1, 1, CONFIG_ROWS, 2).setValues([
    ['gameId', gameId],
    ['gameName', config.gameName || ''],
    ['players', JSON.stringify(config.players || [])],
    ['revealOpen', config.revealOpen ? 'TRUE' : 'FALSE'],
    ['gender', JSON.stringify(config.revealContent || {})],
    ['createdAt', new Date().toISOString()],
  ]);
  sh.getRange(RESP_HEADER_ROW, 1, 1, 6)
    .setValues([['name', 'guess', 'code', 'guessAt', 'finishedAt', 'status']]);
  getIndexSheet().appendRow([
    gameId, config.gameName || '', new Date().toISOString(),
    config.revealOpen ? 'TRUE' : 'FALSE', (config.players || []).length,
  ]);
  return sh;
}

function gameSheet(gameId) {
  var sh = getSS().getSheetByName(tabName(gameId));
  if (!sh) throw new Error('game not found');
  return sh;
}

function readConfig(gameId) {
  var sh = gameSheet(gameId);
  var v = sh.getRange(1, 1, CONFIG_ROWS, 2).getValues();
  var map = {};
  v.forEach(function (row) { map[row[0]] = row[1]; });
  return {
    gameName: map.gameName,
    players: JSON.parse(map.players || '[]'),
    revealOpen: String(map.revealOpen).toUpperCase() === 'TRUE',
    gender: JSON.parse(map.gender || '{}'),
  };
}

function setConfigValue(gameId, key, value) {
  var sh = gameSheet(gameId);
  var v = sh.getRange(1, 1, CONFIG_ROWS, 2).getValues();
  for (var i = 0; i < v.length; i++) {
    if (v[i][0] === key) { sh.getRange(i + 1, 2).setValue(value); return; }
  }
  throw new Error('unknown config key: ' + key);
}

function findResponseRow(sh, name) {
  var last = sh.getLastRow();
  if (last <= RESP_HEADER_ROW) return -1;
  var names = sh.getRange(RESP_HEADER_ROW + 1, 1, last - RESP_HEADER_ROW, 1).getValues();
  for (var i = 0; i < names.length; i++) {
    if (normalizeName(names[i][0]) === normalizeName(name)) return RESP_HEADER_ROW + 1 + i;
  }
  return -1;
}

function upsertGuess(gameId, name, guess) {
  var sh = gameSheet(gameId);
  var row = findResponseRow(sh, name);
  var now = new Date().toISOString();
  if (row === -1) {
    sh.appendRow([name, guess, '', now, '', 'playing']);
  } else {
    sh.getRange(row, 2).setValue(guess);
  }
}

function markFinished(gameId, name, code) {
  var sh = gameSheet(gameId);
  var row = findResponseRow(sh, name);
  if (row === -1) throw new Error('no guess row for ' + name);
  sh.getRange(row, 3, 1, 4).setValues([[code, sh.getRange(row, 4).getValue(),
    new Date().toISOString(), 'done']]);
}

function countFinished(gameId) {
  var sh = gameSheet(gameId);
  var last = sh.getLastRow();
  if (last <= RESP_HEADER_ROW) return 0;
  var statuses = sh.getRange(RESP_HEADER_ROW + 1, 6, last - RESP_HEADER_ROW, 1).getValues();
  return statuses.filter(function (s) { return s[0] === 'done'; }).length;
}
```

- [ ] **Step 2: Commit** (Apps Script code is verified live in Task 11; committing the source now)

```bash
git add apps-script/sheet.gs
git commit -m "feat: apps script sheet data-access layer"
```

---

### Task 6: Request router + actions (`apps-script/Code.gs`)

**Files:**
- Create: `apps-script/Code.gs`
- Create: `apps-script/appsscript.json`

**Interfaces:**
- Consumes: everything from `logic.gs` and `sheet.gs`.
- Produces: `doPost(e)` handling actions `createGame`, `setRevealOpen`, `getGame`, `submitGuess`, `submitCode`, `getReveal`. JSON in/out.

- [ ] **Step 1: Create `apps-script/appsscript.json`**

```json
{
  "timeZone": "Asia/Kolkata",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": { "access": "ANYONE_ANONYMOUS", "executeAs": "USER_DEPLOYING" }
}
```

- [ ] **Step 2: Create `apps-script/Code.gs`**

```js
// apps-script/Code.gs — HTTP entry point + action routing.
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function props_() { return PropertiesService.getScriptProperties(); }
function requireAdmin_(body) {
  if (body.adminPw !== props_().getProperty('ADMIN_PW')) throw new Error('unauthorized');
}
function salt_() { return props_().getProperty('GAME_SALT'); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents);
    var out = route_(body);
    return json_(out);
  } catch (err) {
    return json_({ error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function route_(body) {
  switch (body.action) {
    case 'createGame': {
      requireAdmin_(body);
      var gameId = Utilities.getUuid();
      createGameTab(gameId, {
        gameName: body.gameName,
        players: body.players,
        revealOpen: body.revealOpen,
        revealContent: body.revealContent,
      });
      return { gameId: gameId };
    }
    case 'setRevealOpen': {
      requireAdmin_(body);
      setConfigValue(body.gameId, 'revealOpen', body.open ? 'TRUE' : 'FALSE');
      var ix = getIndexSheet();
      return { ok: true };
    }
    case 'getGame': {
      var c = readConfig(body.gameId);
      return {
        gameName: c.gameName,
        players: c.players,
        revealOpen: c.revealOpen,
        codesIn: countFinished(body.gameId),
        total: c.players.length,
      };
    }
    case 'submitGuess': {
      upsertGuess(body.gameId, body.name, body.guess);
      return { ok: true };
    }
    case 'submitCode': {
      var code = generateCode(body.name, salt_());
      markFinished(body.gameId, body.name, code);
      return { ok: true, code: code, codesIn: countFinished(body.gameId) };
    }
    case 'getReveal': {
      var cfg = readConfig(body.gameId);
      var unlocked = isRevealUnlocked({
        codesIn: countFinished(body.gameId),
        total: cfg.players.length,
        revealOpen: cfg.revealOpen,
      });
      if (!unlocked) return { locked: true };
      return { locked: false, reveal: cfg.gender };
    }
    default:
      throw new Error('unknown action: ' + body.action);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps-script/Code.gs apps-script/appsscript.json
git commit -m "feat: apps script router and game actions"
```

---

### Task 7: clasp setup + deploy docs (`apps-script/README.md`)

**Files:**
- Create: `apps-script/README.md`

**Interfaces:**
- Produces: exact steps to push and deploy the backend and obtain the `/exec` URL.

- [ ] **Step 1: Create `apps-script/README.md`**

````markdown
# Backend (Google Apps Script) — setup

1. Create a Google Sheet; note it as the container.
2. Install clasp: `npm i -g @google/clasp` then `clasp login`.
3. In this folder: `clasp create --type sheets --title "Gender Reveal Backend"`
   (or `clasp clone <scriptId>` if the Sheet already has a bound script).
4. Push code: `clasp push` (pushes `*.gs` + `appsscript.json`).
5. In the Apps Script editor: **Project Settings → Script Properties** → add:
   - `ADMIN_PW` = your admin password
   - `GAME_SALT` = a long random string
6. **Deploy → New deployment → Web app** → Execute as **Me**, Access **Anyone** → Deploy.
7. Copy the **/exec** URL into `src/config.js` (`BACKEND_URL`).
8. Re-deploy (new version) whenever backend code changes.
````

- [ ] **Step 2: Commit**

```bash
git add apps-script/README.md
git commit -m "docs: apps script clasp setup and deploy steps"
```

---

## Milestone C — API client

### Task 8: Frontend API client (`src/lib/api.js`)

**Files:**
- Create: `src/lib/api.js`
- Test: `tests/api.test.js`

**Interfaces:**
- Produces: `createApi(baseUrl, fetchImpl?) -> { getGame, submitGuess, submitCode, getReveal, createGame, setRevealOpen }`. All return parsed JSON; all POST `Content-Type: text/plain` with a JSON body `{ action, ... }` (text/plain avoids CORS preflight against Apps Script).

- [ ] **Step 1: Write the failing test**

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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api.test.js`
Expected: FAIL — cannot import `createApi`.

- [ ] **Step 3: Write minimal implementation**

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api.test.js`
Expected: PASS (2 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.js tests/api.test.js
git commit -m "feat: frontend api client"
```

---

## Milestone D — Player UI

### Task 9: Puzzle data + answer checker (`src/data/puzzles.js`, `src/lib/puzzles.js`)

**Files:**
- Create: `src/data/puzzles.js`
- Create: `src/lib/puzzles.js`
- Test: `tests/puzzles.test.js`

**Interfaces:**
- Produces: `PUZZLES: Array<{id, riddle, answers: string[], hint}>`; `checkAnswer(puzzle, input) -> boolean` (case-insensitive, trimmed match against `answers`).

- [ ] **Step 1: Write the failing test**

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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/puzzles.test.js`
Expected: FAIL — cannot import modules.

- [ ] **Step 3: Write `src/data/puzzles.js`** (starter riddles; host will personalize)

```js
// src/data/puzzles.js — starter set; edit freely. Keep `answers` lowercase-friendly.
export const PUZZLES = [
  { id: 1, riddle: "I shake and rattle to make you smile, I keep a baby amused for a while. What am I?", answers: ['rattle', 'a rattle'], hint: 'It makes noise when you shake it.' },
  { id: 2, riddle: "Count the months a baby grows inside, before the day of the great reveal ride.", answers: ['9', 'nine'], hint: 'Three trimesters.' },
  { id: 3, riddle: "Soft and warm, I wrap you tight, holding a newborn through the night. What am I?", answers: ['blanket', 'a blanket', 'swaddle'], hint: 'You wrap the baby in it.' },
  { id: 4, riddle: "First word many babies say, calling the one who's home all day.", answers: ['mama', 'mom', 'mumma', 'amma'], hint: "It's a parent." },
];
```

- [ ] **Step 4: Write `src/lib/puzzles.js`**

```js
// src/lib/puzzles.js
export function checkAnswer(puzzle, input) {
  const norm = String(input).trim().toLowerCase();
  return puzzle.answers.some((a) => String(a).trim().toLowerCase() === norm);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/puzzles.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/puzzles.js src/lib/puzzles.js tests/puzzles.test.js
git commit -m "feat: puzzle data and answer checker"
```

---

### Task 10: Player app shell + styles (`play.html`, `src/styles/styles.css`)

**Files:**
- Create: `play.html`
- Create: `src/styles/styles.css`
- Create: `index.html` (simple landing pointing to how to get a link)

**Interfaces:**
- Produces: DOM containers `#app` and a `data-stage` attribute on `<body>`; CSS classes `.card`, `.btn`, `.hidden`, `.reveal-boy`, `.reveal-girl`.

- [ ] **Step 1: Create `src/styles/styles.css`**

```css
:root { --pink: #ff6fae; --blue: #4aa8ff; --bg: #fff7fb; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: var(--bg); color: #333; }
#app { max-width: 560px; margin: 0 auto; padding: 24px; }
.card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 6px 24px rgba(0,0,0,.08); margin-top: 24px; }
.btn { background: #7b5cff; color: #fff; border: 0; border-radius: 10px; padding: 12px 18px; font-size: 16px; cursor: pointer; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
input, select { width: 100%; padding: 12px; font-size: 16px; border: 1px solid #ddd; border-radius: 10px; margin: 8px 0; }
.hidden { display: none; }
.progress { font-size: 18px; font-weight: 600; }
.reveal-boy { background: var(--blue); color: #fff; }
.reveal-girl { background: var(--pink); color: #fff; }
.big { font-size: 40px; font-weight: 800; text-align: center; margin: 12px 0; }
```

- [ ] **Step 2: Create `play.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gender Reveal — Play</title>
  <link rel="stylesheet" href="/src/styles/styles.css" />
</head>
<body>
  <div id="app"><div class="card">Loading…</div></div>
  <script type="module" src="/src/player/player.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gender Reveal</title>
  <link rel="stylesheet" href="/src/styles/styles.css" />
</head>
<body>
  <div id="app">
    <div class="card">
      <h1>🎉 Gender Reveal</h1>
      <p>If someone shared a game link with you, open that link to play.</p>
      <p>Hosts: open <a href="/admin.html">the admin console</a> to create a game.</p>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 4: Verify dev server renders**

Run: `npm run dev` then open the printed URL + `/play.html`.
Expected: "Loading…" card shows (player.js not built yet → console error is fine at this step).

- [ ] **Step 5: Commit**

```bash
git add index.html play.html src/styles/styles.css
git commit -m "feat: player app shell and base styles"
```

---

### Task 11: Player flow controller (`src/player/player.js`)

**Files:**
- Create: `src/player/player.js`
- Test: `tests/player.test.js`

**Interfaces:**
- Consumes: `createApi` (Task 8), `PUZZLES`/`checkAnswer` (Task 9), `isRevealUnlocked` (Task 3), `BACKEND_URL` (Task 1).
- Produces: `initPlayer({ root, api, gameId, puzzles })` — renders stages into `root`; exposes `renderWelcome/renderGuess/renderPuzzle/renderCode/renderWaiting/renderReveal` on the returned controller for testing.

- [ ] **Step 1: Write the failing test** (jsdom; stub api)

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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/player.test.js`
Expected: FAIL — cannot import `initPlayer`.

- [ ] **Step 3: Write `src/player/player.js`**

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

- [ ] **Step 4: Guard auto-boot in tests**

At the top of `tests/player.test.js`, ensure `window.__PLAYER_TEST__ = true;` is set before import (add as first line inside the file, before other imports are used) OR rely on `#app` being absent in jsdom test root. Confirm tests import `initPlayer` directly and the auto-boot block does not run (no `#app` element in the test document by default).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/player.test.js`
Expected: PASS (4 assertions).

- [ ] **Step 6: Commit**

```bash
git add src/player/player.js tests/player.test.js
git commit -m "feat: player flow controller with stages"
```

---

### Task 12: Confetti effect (`src/ui/confetti.js`)

**Files:**
- Create: `src/ui/confetti.js`

**Interfaces:**
- Produces: `celebrate(gender)` — fires `canvas-confetti` with pink or blue colors.

- [ ] **Step 1: Create `src/ui/confetti.js`**

```js
// src/ui/confetti.js
import confetti from 'canvas-confetti';

export function celebrate(gender) {
  const colors = gender === 'boy' ? ['#4aa8ff', '#1e6fd8', '#ffffff'] : ['#ff6fae', '#e83e8c', '#ffffff'];
  const end = Date.now ? undefined : undefined; // duration handled by frame count
  let frames = 120;
  (function frame() {
    confetti({ particleCount: 6, spread: 70, origin: { y: 0.6 }, colors });
    if (frames-- > 0) requestAnimationFrame(frame);
  })();
}
```

- [ ] **Step 2: Manual verification**

Trigger a reveal in dev (Task 15 manual run) and confirm confetti fires in the reveal color.

- [ ] **Step 3: Commit**

```bash
git add src/ui/confetti.js
git commit -m "feat: confetti reveal effect"
```

---

## Milestone E — Admin UI

### Task 13: Admin app shell + QR helper (`admin.html`, `src/ui/qr.js`)

**Files:**
- Create: `admin.html`
- Create: `src/ui/qr.js`

**Interfaces:**
- Produces: `renderQR(canvas, text)` wrapping the `qrcode` library.

- [ ] **Step 1: Create `admin.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gender Reveal — Admin</title>
  <link rel="stylesheet" href="/src/styles/styles.css" />
</head>
<body>
  <div id="app"><div class="card">Loading…</div></div>
  <script type="module" src="/src/admin/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/ui/qr.js`**

```js
// src/ui/qr.js
import QRCode from 'qrcode';
export async function renderQR(canvas, text) {
  await QRCode.toCanvas(canvas, text, { width: 200 });
}
```

- [ ] **Step 3: Commit**

```bash
git add admin.html src/ui/qr.js
git commit -m "feat: admin shell and qr helper"
```

---

### Task 14: Admin flow controller (`src/admin/admin.js`)

**Files:**
- Create: `src/admin/admin.js`
- Test: `tests/admin.test.js`

**Interfaces:**
- Consumes: `createApi` (Task 8), `renderQR` (Task 13), `BACKEND_URL` (Task 1).
- Produces: `initAdmin({ root, api, origin })` returning a controller with `login(pw)`, `buildPayload(form)`, `create(form)`; renders login → create form → result (link + QR).

- [ ] **Step 1: Write the failing test**

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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/admin.test.js`
Expected: FAIL — cannot import `initAdmin`.

- [ ] **Step 3: Write `src/admin/admin.js`**

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/admin.test.js`
Expected: PASS (2 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/admin/admin.js tests/admin.test.js
git commit -m "feat: admin flow controller"
```

---

## Milestone F — Integration, deploy, manual verification

### Task 15: Full test run + build + manual E2E checklist

**Files:**
- Create: `docs/MANUAL-TEST.md`

- [ ] **Step 1: Run the whole unit suite**

Run: `npx vitest run`
Expected: all test files pass (code, reveal, api, puzzles, player, admin).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: `dist/` contains `index.html`, `play.html`, `admin.html` and hashed assets; no errors.

- [ ] **Step 3: Create `docs/MANUAL-TEST.md`**

````markdown
# Manual end-to-end test

Prereqs: backend deployed (apps-script/README.md), `src/config.js` has the /exec URL, `npm run dev` running.

1. **Admin login/create:** open `/admin.html`, enter admin password, create a game with 2 players
   (`Priya`, `Arjun`), gender = girl, revealOpen = OFF. Copy the player link.
2. **Player A:** open the link, pick `Priya`, guess Girl, solve all puzzles, see a 6-char code,
   continue to waiting room → shows "1 of 2 codes in" and "waiting for the host".
3. **Peek negative test:** while still 1/2 and reveal closed, confirm the reveal does NOT show
   (network tab: `getReveal` returns `{locked:true}`).
4. **Player B:** open the link in another browser/incognito, pick `Arjun`, finish → "2 of 2".
   Reveal still locked because revealOpen is OFF.
5. **Host opens reveal:** in `/admin.html`, toggle the game's reveal open (setRevealOpen).
6. **Reveal fires:** within ~4s both waiting rooms flip to the animated reveal with confetti.
7. **Sheet check:** the game tab shows both names, guesses, codes, and `done` status.
````

- [ ] **Step 4: Execute the manual test** and check every box above passes.

- [ ] **Step 5: Commit**

```bash
git add docs/MANUAL-TEST.md
git commit -m "docs: manual end-to-end test checklist"
```

---

## Self-Review notes (author)

- **Spec coverage:** admin/config (Tasks 6,13,14) · per-game Sheet tab (Task 5) · autocomplete names (Task 11) · guess-on-second-page stored early (Task 11 `submitGuess` before puzzles) · deterministic code (Tasks 2,4) · server-gated reveal (Tasks 3,4,6) · waiting-room progress (Task 11) · confetti reveal (Task 12) · QR + link sharing (Tasks 13,14) · free stack + deploy (Tasks 1,7,15). All spec sections mapped.
- **Deviation from spec §7:** `submitCode` takes no client code — the backend generates it (keeps salt server-side). Noted in Global Constraints and Task 6/11 interfaces.
- **Type consistency:** `getGame` returns `{codesIn,total,revealOpen,players,gameName}` used identically in Tasks 8, 11; `isRevealUnlocked({codesIn,total,revealOpen})` consistent across Tasks 3, 4, 11; `createGame` payload `{gameName,players,revealOpen,revealContent}` consistent across Tasks 6, 8, 14.
