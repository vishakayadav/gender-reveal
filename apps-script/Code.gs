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
        finished: finishedNames(body.gameId),
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
