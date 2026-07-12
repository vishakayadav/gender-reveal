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
