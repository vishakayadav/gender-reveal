# Task 14 Fix Report — Admin Reveal Open/Close Controls

## Summary

Added UI controls in `src/admin/admin.js` to call the existing `api.setRevealOpen` backend
action, which previously had no UI entry point:

- `setReveal(gameId, open)` — wraps `api.setRevealOpen(pw, gameId, open)`, throws on
  `res.error`.
- `extractGameId(input)` — accepts either a raw game ID or a player link
  (`.../play.html?game=<id>`) and returns the game ID.
- `renderResult` (post-create screen) now includes "Open reveal" / "Close reveal" buttons
  wired to `state.lastGameId`, plus a status line.
- New `renderManage()` screen, reachable from the create-game form via
  "Manage an existing game →", lets an admin paste a link or game ID and open/close the
  reveal for a game created in a prior session.
- `state` now tracks `lastGameId`, set after a successful `create()`.

Files touched (only these two, per constraints):
- `/Users/yadavv4/Downloads/gr-project/src/admin/admin.js` (full replacement, exact content as specified)
- `/Users/yadavv4/Downloads/gr-project/tests/admin.test.js` (added 2 tests inside existing `describe('admin flow', ...)`)

No git commands were run, per instructions.

## Test run

Command: `npx vitest run tests/admin.test.js`

```
 RUN  v1.6.1 /Users/yadavv4/Downloads/gr-project

 ✓ tests/admin.test.js  (4 tests) 4ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  10:05:01
   Duration  627ms (transform 22ms, setup 0ms, collect 19ms, tests 4ms, environment 382ms, prepare 51ms)
```

All 4 tests pass (2 original + 2 new).
