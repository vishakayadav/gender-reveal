# Manual end-to-end test

Prereqs: backend deployed (apps-script/README.md), `src/config.js` has the /exec URL, `npm run dev` running.

1. **Admin login/create:** open `/admin.html`, enter admin password, create a game with 2 players
   (`Priya`, `Arjun`), gender = girl, revealOpen = OFF. Copy the player link.
2. **Player A:** open the link, pick `Priya`, guess Girl, solve all puzzles, see a 6-char code,
   continue to waiting room → shows "1 of 2 codes in" and "waiting for the host".
3. **Peek negative test:** while still 1/2 and reveal closed, confirm the reveal does NOT show
   (network tab: `getReveal` returns `{locked:true}`).
4. **Player B:** open the link in another browser/incognito, pick `Arjun`, finish → "2 of 2".
   Reveal still locked because revealOpen is OFF.
5. **Host opens reveal:** in `/admin.html`, toggle the game's reveal open (setRevealOpen).
6. **Reveal fires:** within ~4s both waiting rooms flip to the animated reveal with confetti.
7. **Sheet check:** the game tab shows both names, guesses, codes, and `done` status.
