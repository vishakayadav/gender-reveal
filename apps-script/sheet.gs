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

// Short unique token embedded in every game tab's name so we can find the tab
// by gameId regardless of how the (game-name-based) tab is titled.
function gameToken(gameId) { return 'g_' + gameId.slice(0, 8); }

// Tab title = the game name + the token, e.g. "Baby R (g_1a2b3c4d)".
// Sheet titles can't contain : \ / ? * [ ] and are capped at 100 chars.
function tabName(gameId, gameName) {
  var clean = String(gameName == null ? '' : gameName)
    .replace(/[:\\\/?*\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  var base = clean ? (clean + ' (' + gameToken(gameId) + ')') : gameToken(gameId);
  return base.slice(0, 95);
}

function createGameTab(gameId, config) {
  var ss = getSS();
  var sh = ss.insertSheet(tabName(gameId, config.gameName));
  // config block: key | value
  sh.getRange(1, 1, CONFIG_ROWS, 2).setValues([
    ['gameId', gameId],
    ['gameName', config.gameName || ''],
    ['players', JSON.stringify(config.players || [])],
    ['revealOpen', config.revealOpen ? 'TRUE' : 'FALSE'],
    ['gender', JSON.stringify(config.revealContent || {})],
    ['createdAt', new Date().toISOString()],
  ]);
  sh.getRange(RESP_HEADER_ROW, 1, 1, 7)
    .setValues([['name', 'guess', 'code', 'guessAt', 'finishedAt', 'status', 'position']]);
  getIndexSheet().appendRow([
    gameId, config.gameName || '', new Date().toISOString(),
    config.revealOpen ? 'TRUE' : 'FALSE', (config.players || []).length,
  ]);
  return sh;
}

function gameSheet(gameId) {
  var token = gameToken(gameId);
  var sheets = getSS().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var n = sheets[i].getName();
    // matches new "Name (g_xxxxxxxx)" tabs and legacy "g_xxxxxxxx" tabs
    if (n === token || n.indexOf(token) !== -1) return sheets[i];
  }
  throw new Error('game not found');
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

// Row status flow:
//   'playing'  → guessed, still solving riddles
//   'riddles'  → finished riddles, code assigned, awaiting the final key
//                (only for games that have a final key)
//   'done'     → fully complete: no-key games at riddle completion; key games
//                once the correct final key is entered. Only 'done' counts
//                toward the reveal gate.

function playerStatus(gameId, name) {
  var sh = gameSheet(gameId);
  var row = findResponseRow(sh, name);
  return row === -1 ? '' : sh.getRange(row, 6).getValue();
}

// { code, position } already recorded for a player who finished the riddles.
function riddleInfo(gameId, name) {
  var sh = gameSheet(gameId);
  var row = findResponseRow(sh, name);
  if (row === -1) return { code: '', position: 0 };
  return { code: sh.getRange(row, 3).getValue(), position: sh.getRange(row, 7).getValue() };
}

// Record riddle completion: store code + position and set status
// ('riddles' when a final key gates the reveal, else 'done').
function recordRiddles(gameId, name, code, position, status) {
  var sh = gameSheet(gameId);
  var row = findResponseRow(sh, name);
  if (row === -1) throw new Error('no guess row for ' + name);
  sh.getRange(row, 3).setValue(code);
  sh.getRange(row, 5).setValue(new Date().toISOString());
  sh.getRange(row, 6).setValue(status);
  sh.getRange(row, 7).setValue(position);
}

// Correct final key entered → the player is fully done.
function markKeyed(gameId, name) {
  var sh = gameSheet(gameId);
  var row = findResponseRow(sh, name);
  if (row !== -1) sh.getRange(row, 6).setValue('done');
}

function statusColumn_(gameId) {
  var sh = gameSheet(gameId);
  var last = sh.getLastRow();
  if (last <= RESP_HEADER_ROW) return [];
  return sh.getRange(RESP_HEADER_ROW + 1, 1, last - RESP_HEADER_ROW, 6).getValues();
}

// 'done' count — the only thing that gates the reveal.
function countFinished(gameId) {
  return statusColumn_(gameId).filter(function (r) { return r[5] === 'done'; }).length;
}

// Players who have finished the riddles (assigned a code): 'riddles' or 'done'.
// Used to assign the next finish position.
function countRiddleDone(gameId) {
  return statusColumn_(gameId).filter(function (r) { return r[5] === 'riddles' || r[5] === 'done'; }).length;
}

// Fully-done ('done') names — returning such a player goes straight to waiting.
function finishedNames(gameId) {
  var out = [];
  statusColumn_(gameId).forEach(function (r) { if (r[5] === 'done') out.push(r[0]); });
  return out;
}

// Finished-riddles-but-not-keyed names — returning such a player resumes at the
// code/key screen (not restarting the riddles).
function riddledNames(gameId) {
  var out = [];
  statusColumn_(gameId).forEach(function (r) { if (r[5] === 'riddles') out.push(r[0]); });
  return out;
}
