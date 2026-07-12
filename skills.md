# Skills & Techniques — Gender Reveal Game Generator

A reusable reference of the patterns, decisions, and how-to steps behind this project.
Keep this handy for building, deploying, and extending the app later.

## 1. The free full-stack pattern (no server, no cost)

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | Static HTML/CSS/JS on Netlify / Vercel / Cloudflare Pages / GitHub Pages | Free global CDN, one shareable URL, works everywhere |
| Backend/API | **Google Apps Script Web App** | Free serverless endpoint; no infra to run |
| Database | **Google Sheet** (private) | Free storage; human-readable; one tab per game |

**Rule of thumb:** you only need Node.js/a real server when you need live real-time sync,
heavy compute, or secrets that must never touch a client. For form capture + light shared
state, Apps Script + Sheet is enough and free.

## 2. Apps Script as a REST-ish backend

- A single `doPost(e)` entry point; branch on an `action` field in the JSON body.
- Return JSON via `ContentService.createTextOutput(JSON.stringify(x))
  .setMimeType(ContentService.MimeType.JSON)`.
- Deploy: **Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone**.
  Copy the `/exec` URL into the frontend config.
- **Secrets** (admin password, game salt): store in **Project Settings → Script Properties**,
  never in the client. Read with `PropertiesService.getScriptProperties()`.
- **Concurrency:** wrap writes in `LockService.getScriptLock()` to avoid race conditions.
- **Unguessable IDs:** `Utilities.getUuid()`.

### CORS gotcha (important)
Browser `fetch` to Apps Script can hit CORS/redirect issues. Common workarounds:
- POST with `Content-Type: text/plain` (avoids preflight), parse JSON server-side.
- Or use a simple GET with query params for reads.
- Apps Script web apps 302-redirect to a `googleusercontent.com` URL — `fetch` follows it
  automatically; just read the final response body.

## 3. Server-side reveal gating (anti-peek)

The secret (gender) **must never be in client code**. Pattern:
- Store the reveal payload only in the Sheet (server side); `getReveal` returns only `{gender, message}`
  once unlocked — never the final question/answers.
- A `getReveal` endpoint returns it **only if** the gate passes: **all players fully done**
  (`countFinished >= total`) **and** `revealOpen === true`. "Fully done" means keyed when the game has a
  final key (see §4), else riddles-complete.
- Disabling a button in the browser is cosmetic — real security is the server refusing to
  send the payload. Test the negative case: confirm it stays `{locked:true}` early.

## 4. Optional final-question codes + collaborative key

Codes are **optional** and only exist when the admin sets a **final question + answer(s)**:
- The question is split **by words** into one part per player; part `k` is `Base64`-encoded and given to
  the **k-th player to finish** the riddles (finish `position` stored per row).
- Encoding is intentionally trivial (Base64, decodable by any online tool) — the "security" is social:
  players must share and assemble their parts to read the question.
- A player stays status `riddles` after the riddles and becomes `done` only when they submit a correct
  **final key** (validated server-side against the answers, case-insensitive). Only `done` counts toward
  the reveal gate, so everyone must key in.
- With no final question, there is **no code** — the player goes straight to the waiting room and is
  `done` at riddle completion. (The old deterministic hash-code scheme in `logic.gs`/`code.js` is now
  unused.)

## 5. Shared progress without websockets

- Players' "waiting room" **polls** `getGame` every few seconds for `N of M finished`, showing
  *"waiting for the remaining N players to finish"* until everyone's done, then *"waiting for the host"*.
- Identity is by **picking a name from a pre-set list** (autocomplete). Reopening the link and
  re-selecting your name routes to the right stage by stored `status`: `done` → waiting/reveal,
  `riddles` → resume at the code/key screen, otherwise → the guess flow.
- Use distinct display names in the list to avoid collisions (add a last initial if needed).

## 6. Sharing across regions

- One link works globally — no per-region setup.
- Generate a **QR code** client-side (e.g. a small QR JS lib) for in-person sharing.
- WhatsApp is the common channel across India / US / Abu Dhabi / London.

## 7. Deployment checklist

1. Create the Google Sheet; add a "Games" index tab.
2. Extensions → Apps Script; paste backend; set Script Properties (`ADMIN_PW`, `GAME_SALT`).
3. Deploy as Web app (Execute as Me, Anyone); copy the `/exec` URL.
4. Paste URL into the frontend config file.
5. Deploy the static site to a free host; the subdomain is the base URL.
6. Smoke test: create a game in `/admin`, play through with a couple of names, open the reveal.

## 8. Extension ideas (future)

- Per-game custom puzzles (currently a fixed shared set).
- Live guess board (show everyone's guesses once submitted).
- Multiple reveal animation themes.
- Email/WhatsApp deep-link auto-share of the generated player link.

## 9. Key project decisions (traceable to the spec)

See `docs/superpowers/specs/2026-07-08-gender-reveal-design.md` for the authoritative design.
Highlights (as currently implemented):
- Same riddles for everyone; an **optional** final question yields per-player Base64 code parts and a
  collaborative final-key gate (§4). No final question → no code.
- Guess captured on its own page right after welcome, then the row is updated as the player progresses
  (`playing` → `riddles` → `done`).
- Reveal gated by `revealOpen` **and** all players fully done (keyed when a final key is set), enforced
  server-side.
- Admin console generates games; one Sheet tab per game (named after the game); no manual Sheet edits
  normally. Note: a newer feature spec lives at
  `docs/superpowers/specs/2026-07-12-final-code-reveal-key-design.md`.
