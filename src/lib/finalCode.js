// src/lib/finalCode.js — reference implementation for the final-question codes.
// MIRROR of the split logic in apps-script/logic.gs (splitParts); base64() here
// matches the server's Utilities.base64Encode(text, UTF_8). Keep in sync.

// Split a question into n contiguous word-groups, as evenly as possible, with any
// remainder going to the earlier groups. e.g. 7 words / 3 => [3, 2, 2].
export function splitQuestion(question, n) {
  const words = String(question || '').trim().split(/\s+/).filter(Boolean);
  const count = Math.max(1, n | 0);
  const base = Math.floor(words.length / count);
  const rem = words.length % count;
  const parts = [];
  let idx = 0;
  for (let i = 0; i < count; i++) {
    const take = base + (i < rem ? 1 : 0);
    parts.push(words.slice(idx, idx + take).join(' '));
    idx += take;
  }
  return parts;
}

// UTF-8-safe Base64 (matches server Utilities.base64Encode with UTF_8).
export function base64(text) {
  const s = String(text);
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(s)));
  return Buffer.from(s, 'utf-8').toString('base64'); // node/test fallback
}
