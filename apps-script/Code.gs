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
      var players = body.players || [];
      var revealContent = body.revealContent || {};
      var finalQuestion = String(body.finalQuestion || '').trim();
      if (finalQuestion) {
        var wc = finalQuestion.split(/\s+/).filter(function (w) { return w; }).length;
        if (wc < players.length) {
          throw new Error('Final question needs at least ' + players.length + ' words (one per player).');
        }
      }
      revealContent.finalQuestion = finalQuestion;
      revealContent.finalAnswers = body.finalAnswers || [];
      var gameId = Utilities.getUuid();
      createGameTab(gameId, {
        gameName: body.gameName,
        players: players,
        revealOpen: body.revealOpen,
        revealContent: revealContent,
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
      var rcg = c.gender || {};
      return {
        gameName: c.gameName,
        players: c.players,
        revealOpen: c.revealOpen,
        codesIn: countFinished(body.gameId),
        total: c.players.length,
        finished: finishedNames(body.gameId),
        hasFinalKey: !!(rcg.finalQuestion && rcg.finalAnswers && rcg.finalAnswers.length),
      };
    }
    case 'submitGuess': {
      upsertGuess(body.gameId, body.name, body.guess);
      return { ok: true };
    }
    case 'submitCode': {
      var cfg = readConfig(body.gameId);
      var rc = cfg.gender || {};
      var total = cfg.players.length;
      var position = countFinished(body.gameId) + 1;   // this player's finish order
      var code = '';
      if (rc.finalQuestion) {
        var parts = splitParts(rc.finalQuestion, total);
        code = Utilities.base64Encode(parts[position - 1] || '', Utilities.Charset.UTF_8);
      }
      markFinished(body.gameId, body.name, code);
      var out = { ok: true, codesIn: countFinished(body.gameId), total: total };
      if (rc.finalQuestion) { out.code = code; out.position = position; }
      return out;
    }
    case 'getReveal': {
      var cfg = readConfig(body.gameId);
      var unlocked = isRevealUnlocked({
        codesIn: countFinished(body.gameId),
        total: cfg.players.length,
        revealOpen: cfg.revealOpen,
      });
      if (!unlocked) return { locked: true };
      var rcr = cfg.gender || {};
      // Send only what the reveal UI needs — never the final question/answers.
      return { locked: false, reveal: { gender: rcr.gender, message: rcr.message || '' } };
    }
    case 'checkFinalKey': {
      var cfk = readConfig(body.gameId);
      var answers = (cfk.gender || {}).finalAnswers || [];
      var key = String(body.key == null ? '' : body.key).trim().toLowerCase();
      var ok = answers.some(function (a) { return String(a).trim().toLowerCase() === key; });
      return { ok: ok };
    }
    default:
      throw new Error('unknown action: ' + body.action);
  }
}
