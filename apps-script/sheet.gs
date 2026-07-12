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

// Names of players whose status is 'done' — lets the player app send a
// returning finished player straight to the waiting/reveal screen.
function finishedNames(gameId) {
  var sh = gameSheet(gameId);
  var last = sh.getLastRow();
  if (last <= RESP_HEADER_ROW) return [];
  var rows = sh.getRange(RESP_HEADER_ROW + 1, 1, last - RESP_HEADER_ROW, 6).getValues();
  var out = [];
  rows.forEach(function (r) { if (r[5] === 'done') out.push(r[0]); });
  return out;
}
