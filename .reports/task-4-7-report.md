# Task 4-7 Report: Google Apps Script Backend Source Files

## Summary
Successfully created 5 files under `apps-script/` with exact transcription from the brief. All files created:
- ✓ `apps-script/logic.gs` (Task 4)
- ✓ `apps-script/sheet.gs` (Task 5)
- ✓ `apps-script/Code.gs` (Task 6)
- ✓ `apps-script/appsscript.json` (Task 6)
- ✓ `apps-script/README.md` (Task 7)

## Parity Check: logic.gs vs. src/lib/

### Function: `normalizeName`
**Source (code.js):**
```js
export function normalizeName(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
}
```

**logic.gs:**
```js
function normalizeName(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
}
```

**Result:** ✓ MATCH (only `export` removed)

---

### Function: `hashString`
**Source (code.js):**
```js
export function hashString(str) {
  // djb2 xor variant -> unsigned 32-bit
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}
```

**logic.gs:**
```js
function hashString(str) {
  var h = 5381;
  for (var i = 0; i < str.length; i++) {
    h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}
```

**Result:** ✓ MATCH (only `let` → `var`, `export` removed)

---

### Function: `generateCode`
**Source (code.js):**
```js
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

**logic.gs:**
```js
function generateCode(name, salt) {
  var h = hashString(salt + '|' + normalizeName(name));
  var code = '';
  for (var i = 0; i < 6; i++) {
    code += CODE_ALPHABET[h % 32];
    h = (Math.floor(h / 32) + (i + 1) * 2654435761) >>> 0;
  }
  return code;
}
```

**Result:** ✓ MATCH with acceptable stylistic difference
- Behavior: Identical (>>> 0 applied in both cases, just combined into one line with explicit parentheses in logic.gs)
- Variable declarations: `let` → `var` (expected)
- Logic flow: Functionally equivalent

---

### Function: `isRevealUnlocked`
**Source (reveal.js):**
```js
export function isRevealUnlocked({ codesIn, total, revealOpen }) {
  return revealOpen === true && total > 0 && codesIn >= total;
}
```

**logic.gs:**
```js
function isRevealUnlocked(o) {
  return o.revealOpen === true && o.total > 0 && o.codesIn >= o.total;
}
```

**Result:** ✓ MATCH with acceptable parameter style difference
- Behavior: Identical (destructuring syntax vs. object property access)
- Logic: Same order and conditions
- Consistency: Matches brief specification "object-arg style may differ"

---

## File Contents

### Task 4: apps-script/logic.gs
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

### Task 5: apps-script/sheet.gs
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

### Task 6a: apps-script/Code.gs
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

### Task 6b: apps-script/appsscript.json
```json
{
  "timeZone": "Asia/Kolkata",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": { "access": "ANYONE_ANONYMOUS", "executeAs": "USER_DEPLOYING" }
}
```

### Task 7: apps-script/README.md
```markdown
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
```

---

## Parity Check Summary
**Overall Result: ✓ MATCH**

All four critical functions in `apps-script/logic.gs` are behaviorally identical to their counterparts in `src/lib/code.js` and `src/lib/reveal.js`:
- `normalizeName`: Exact match (only export removed)
- `hashString`: Exact match (let→var, export removed)
- `generateCode`: Functionally identical (let→var, stylistic parentheses consolidation)
- `isRevealUnlocked`: Functionally identical (destructuring→object property access pattern)

All variations align with the brief specification: "only `export`/`const`→`var` and object-arg style may differ."

---

## Files Created
- `/Users/yadavv4/Downloads/gr-project/apps-script/logic.gs`
- `/Users/yadavv4/Downloads/gr-project/apps-script/sheet.gs`
- `/Users/yadavv4/Downloads/gr-project/apps-script/Code.gs`
- `/Users/yadavv4/Downloads/gr-project/apps-script/appsscript.json`
- `/Users/yadavv4/Downloads/gr-project/apps-script/README.md`

No git commits created (as per DEVIATIONS instruction).
