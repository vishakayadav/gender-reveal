# Gender Reveal Game Generator — Design Spec

**Date:** 2026-07-08
**Status:** Draft for review

## 1. Overview

A free, web-based **gender-reveal game**. Players (family & friends across India, US,
Abu Dhabi, London) open a shared link, solve a set of riddles, submit a personal code,
and collectively unlock a final animated gender reveal. A private **admin console** lets
the host configure and generate a new game (players, reveal content, reveal timing) that
produces a shareable player link.

The core "collaboration" is structural: **the reveal cannot complete until every player's
code is in AND the host has opened the reveal** — so everyone must participate and nobody
can peek early.

## 2. Goals

- Simple to share across four countries: **one link + QR code**, no installs, no logins.
- **Zero cost** to build and run.
- Reusable: host can generate **multiple independent games**, each isolated.
- Interactive & collaborative: all players must finish for the reveal to be possible.
- **Peek-proof:** the gender is never present on any player's device until the reveal opens.

## 3. Non-goals (YAGNI, for now)

- Per-game custom puzzles (puzzles are a fixed shared set; custom puzzles = future add-on).
- Real-time presence / "who's online" indicators.
- User accounts / individual player logins (identity is by picking a name from the list).
- Native mobile apps.

## 4. Constraints & key decisions

- **Fully free stack:** static hosting + Google Apps Script + Google Sheet.
- **No manual Sheet edits in the normal flow** — the admin UI performs all configuration.
- **Server-side reveal gate:** the Apps Script refuses to return the gender until reveal
  conditions are met. Client-side button state is cosmetic; security is server-side.
- **Identity by name selection:** the welcome page offers an autocomplete of the game's
  pre-set player names, avoiding typos and collisions.
- **Guess captured early:** name + guess is stored right after the guess page; the row is
  later updated with the player's code on puzzle completion.

## 5. Architecture

```
[ Static site (HTML/CSS/JS) ]            [ Apps Script Web App ]        [ Google Sheet ]
  /admin  (password-gated)         ⇄       createGame                 ⇄    "Games" index tab
     - set #players, names                 setRevealOpen                   one tab per game:
     - set reveal content + flag           getGame                           - config block
     - Create Game -> link + QR            submitGuess                        - responses table
  /play?game=<id>  (players)       ⇄       submitCode
     - welcome -> guess -> puzzles          getReveal (gated)
     - code -> waiting room -> reveal
```

- **Static frontend** hosted free (Netlify / Vercel / Cloudflare Pages / GitHub Pages).
  A free host subdomain is the shareable URL.
- **Apps Script Web App** is the free "backend/API," deployed as "Execute as me / accessible
  to anyone." It reads/writes the Sheet.
- **Google Sheet** is the datastore: one **Games index tab** plus **one tab per game**.

## 6. Data model (Google Sheet)

### 6.1 "Games" index tab
| gameId | gameName | createdAt | revealOpen | playerCount |
|--------|----------|-----------|------------|-------------|

- `gameId`: unguessable id (e.g. UUID via `Utilities.getUuid()`), used in the player link.

### 6.2 Per-game tab (named by gameId or friendly name)
A small **config block** (top rows), then a **responses table**.

Config block (key/value):
- `players`: the list of player display names (the autocomplete source).
- `revealOpen`: `TRUE` / `FALSE`.
- `gender`: reveal content (gender + wording/color) — **never sent to clients until gated
  conditions pass.**
- `createdAt`.

Responses table:
| name | guess | code | guessAt | finishedAt | status |
|------|-------|------|---------|------------|--------|

- Row created on guess submit (`status = playing`), updated on code submit (`status = done`).

## 7. Backend API (Apps Script actions)

All calls are HTTP to the Web App URL; action selected by a parameter. Mutating admin
actions require the **admin password** (stored as a Script Property, checked server-side).

| Action | Auth | Input | Output |
|--------|------|-------|--------|
| `createGame` | admin pw | players[], revealOpen, revealContent | gameId, playerLink |
| `setRevealOpen` | admin pw | gameId, open:bool | ok |
| `getGame` | none | gameId | gameName, playerNames[], progress (in/total), revealOpen — **no gender** |
| `submitGuess` | none | gameId, name, guess | ok |
| `submitCode` | none | gameId, name, code | ok, progress |
| `getReveal` | none | gameId, name | **gender payload ONLY IF** all codes in AND revealOpen; else `{locked:true}` |

- **CORS:** Apps Script browser calls have known quirks; handled in implementation
  (e.g. `text/plain` content type / appropriate response handling).
- **Concurrency:** `LockService` guards writes. Small player counts make contention negligible.

## 8. Admin UI (`/admin`)

1. **Login:** prompt for admin password (kept only in memory for the session).
2. **Create game form:** number of players → name fields; reveal content (gender + wording +
   color/animation choice); `reveal_open` toggle (ON = no waiting; OFF = players wait).
3. **Create → result:** shows the **player link + QR code** to copy/share; lists existing games
   with a per-game **"Open reveal"** toggle (calls `setRevealOpen`).

## 9. Player UI (`/play?game=<id>`)

1. **Welcome:** festive theme; **autocomplete name box** populated from `getGame` player list.
2. **Guess page:** Boy / Girl choice → `submitGuess` (stores name + guess immediately).
3. **Puzzles:** fixed shared set of riddles (mix: drafted by Claude, personalized by host).
   Case-insensitive, trimmed answers; hints; progress bar. All required to advance.
4. **Your code:** "You did it, [Name]!" → deterministic personal code generated and sent via
   `submitCode`; code shown to the player.
5. **Waiting room:** polls `getGame` progress → "N of M codes in." Reopening the link and
   picking your name lands you here directly (status already `done`).
6. **Reveal:** when all codes in AND `revealOpen`, `getReveal` returns the payload →
   🎊 confetti + gender animation, live on every waiting-room screen at once.

## 10. Personal code logic

- `code = shortToken(hash(normalize(name) + gameSalt))` — deterministic, short, readable.
- Deterministic so the backend can validate a submitted code against the game's player list
  without extra storage. Normalization (lowercase, trim) keeps codes stable.

## 11. Reveal gating / security model

- Gender lives **only in the game's Sheet tab**, released solely by `getReveal` when
  **(all codes in) AND (revealOpen == TRUE)**.
- `reveal_open` set at creation (TRUE = immediate) or flipped later from the admin console.
- Disabled reveal button in the UI is cosmetic; the true lock is server-side, so reading page
  source or collecting all shared codes reveals nothing until the host opens it.

## 12. Sharing

- One **player link** per game + a generated **QR code**. Shared via WhatsApp (universal in
  all four regions) or in person via QR. Works on any phone/laptop browser.

## 13. Testing

- **Unit:** pure functions for code generation/validation and reveal-gate logic (tiny test
  runner).
- **Manual:** end-to-end run-through checklist (create game → play as multiple names →
  waiting room → open reveal → confetti), including the peek-attempt negative test
  (confirm `getReveal` stays locked before conditions are met).

## 14. Deployment (all free)

1. Create a Google Sheet; add the Apps Script; set admin password + game salt as Script
   Properties; deploy as a Web App; copy the URL.
2. Put the Web App URL into the static site config.
3. Deploy the static site to a free host; the subdomain is the base URL.

## 15. To be provided by the host (later, not blocking design)

- Riddle text to personalize (Claude drafts the remainder).
- Per-game reveal content (gender, wording, color) — entered in the admin form.
- Player names per game — entered in the admin form.

## 16. Caveats

- **First-name uniqueness:** the pre-set list must use distinct display names (add a last
  initial if two share a first name).
- **Apps Script CORS quirks:** handled in build.
- **Free-tier quotas:** far above the needs of small games.
