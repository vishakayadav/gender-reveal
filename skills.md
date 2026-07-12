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

- One `doGet(e)` / `doPost(e)` entry point; branch on an `action` parameter.
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
- Store the reveal payload only in the Sheet (server side).
- A `getReveal` endpoint returns it **only if** gate conditions pass:
  `allCodesIn === true && revealOpen === true`.
- Disabling a button in the browser is cosmetic — real security is the server refusing to
  send the payload. Test the negative case: confirm it stays `{locked:true}` early.

## 4. Deterministic personal codes

- `code = shortToken(hash(normalize(name) + gameSalt))`.
- **Deterministic** → the backend can re-derive/validate a code from the player list without
  storing a lookup. **Normalize** (lowercase + trim) so codes are stable.
- Keep tokens short & readable (avoid ambiguous chars like O/0, I/1).

## 5. Shared progress without websockets

- Players' "waiting room" **polls** `getGame` every few seconds for `N of M codes in`.
- Identity is by **picking a name from a pre-set list** (autocomplete). Reopening the link and
  re-selecting your name routes you to the right stage based on stored `status`.
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
Highlights:
- Same puzzles for everyone; unique code per player generated on finish.
- Guess captured on its own page, right after welcome, then row updated with code.
- Reveal gated by `revealOpen` flag + all-codes-in, both enforced server-side.
- Admin console generates games; one Sheet tab per game; no manual Sheet edits normally.
