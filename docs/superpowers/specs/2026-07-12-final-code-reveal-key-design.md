# Final Code + Reveal Key — design

## Overview
Turn the per-player code into a collaborative unlock. An admin can optionally attach a
**final question** (and its **answer(s)**) to a game. The question is split into one part per
player, each Base64-encoded into a **code**. Players receive their code in the order they finish
the riddles, decrypt it with any online tool, assemble the full question, and enter the answer to
advance to the waiting room. If no final question is set, no code is shown at all.

## User decisions (locked)
- Admin enters **two optional fields**: final question + final answer(s) (multiple allowed).
- Entering the correct key **advances to the waiting room only**; the reveal still fires when the
  host opens it and everyone is done (unchanged).
- Encryption = **Base64** (UTF-8 safe).
- Question split **by words**.

## Admin form (`src/admin/admin.js`)
Add under the reveal section, both optional:
- `finalQuestion` — text input.
- `finalAnswers` — text input, **comma-separated** (any one match unlocks).

`buildPayload` adds `finalQuestion` (trimmed string) and `finalAnswers` (array of trimmed,
non-empty answers). Empty → omitted/empty.

## Data model (no schema migration)
Store both inside the existing reveal-content blob (the `gender` config cell), which already holds
`{ gender }`. New shape: `{ gender, finalQuestion, finalAnswers }`. Old games lack these keys →
feature simply off. `CONFIG_ROWS` unchanged (6), so existing game tabs keep working.

## Splitting algorithm (backend, deterministic)
`parts(question, n)`:
1. `words = question.trim().split(/\s+/)`.
2. Split into `n` contiguous groups as evenly as possible; earlier groups take the remainder
   (e.g. 7 words, 3 players → 3/2/2).
3. Each part = its words joined by a single space.
Part `k` (1-based) belongs to the k-th player to finish.

**Create-time validation:** if `finalQuestion` is present, require `words.length >= players.length`;
otherwise return `{ error: 'Final question needs at least <N> words (one per player).' }`.

## Encryption
`base64(text)` = UTF-8-safe Base64 (encode UTF-8 bytes, then base64). Frontend footnote links to
`https://www.base64decode.org/` ("Decrypt your code →"). Codes are public by design.

## Backend actions (`apps-script/Code.gs`, `sheet.gs`)
- `createGame`: persist `finalQuestion`, `finalAnswers`; run the word-count validation.
- `submitCode`:
  - Finish position `k` = the player's finish order (computed under the existing script lock).
  - If a final question exists: `code = base64(part[k-1])`; return
    `{ ok, code, position: k, total, codesIn }` and store `code` in the row's code column.
  - Else: return `{ ok, codesIn, total }` with **no code**; store `''`.
- New `checkFinalKey(gameId, key)`: return `{ ok }` where `ok` = trimmed, case-insensitive `key`
  matches any stored `finalAnswers`. Answers are never sent to the client.
- `getGame`: also return `hasFinalKey` (boolean: a final question AND at least one answer exist) so
  the player UI knows whether to show the key box. (`finalQuestion`/answers themselves are not sent,
  except the question is needed only as codes — never in plaintext to players.)

## Frontend player flow (`src/player/player.js`)
After the last riddle (`answerCurrent` → `submitCode`):
- **No code in response** (no final question): go straight to `goWaiting()`.
- **Code present:** render the finish screen:
  - "You finished #k of N".
  - The code (monospace, copyable).
  - Footnote: "Decrypt your code →" → base64decode.org (new tab).
  - If `hasFinalKey`: a **"Enter the final key for reveal"** input + button.
    - On submit → `api.checkFinalKey`; `ok` → `goWaiting()`; else show "Not quite — try again."
  - If not `hasFinalKey`: a **Continue** button → `goWaiting()`.

Returning-player redirect (`begin`): a `done` (keyed) player → waiting room; a `riddled`
(riddles-done, not keyed) player → resumes at the code/key screen; otherwise → guess flow.

## Status timing (revised — reveal waits on keys, not riddles)
Row status flows `playing → riddles → done`:
- `submitCode` (riddle completion) stores the code + finish position and sets status **`riddles`**
  when the game has a final key, or **`done`** when it doesn't.
- `checkFinalKey(gameId, name, key)` marks the player **`done`** on a correct key.

Only **`done`** counts toward the reveal gate (`countFinished`), so with a final key the reveal cannot
fire until *every* player has entered the key (and the host has opened it). `getGame` also returns a
`riddled` list; a returning riddles-done-but-not-keyed player resumes at the code/key screen
(`submitCode` is idempotent — it reuses the stored code/position), so refreshing never bypasses the key
or dead-locks the gate.

## Tests
- `logic`/backend: `parts()` splits by words evenly with remainder to earlier groups; validation
  rejects too-few-words; `checkFinalKey` matches case-insensitively across multiple answers.
- `admin.test`: `buildPayload` includes `finalQuestion` + `finalAnswers` (array), omits when empty.
- `player.test`:
  - no final question → last riddle goes to waiting room, no code shown.
  - final question, no answers → finish screen shows position + code + Continue.
  - final question + answers → key box shown; correct key advances, wrong key shows error
    (with a stubbed `checkFinalKey`).

## Out of scope
Real cryptographic security (codes are intentionally trivially decodable); re-showing the code to a
returning finished player; admin editing the question after creation.

## Deploy note
Backend change → requires a new Apps Script version deploy. Frontend → GitHub push.
