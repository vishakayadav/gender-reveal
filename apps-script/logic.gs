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
