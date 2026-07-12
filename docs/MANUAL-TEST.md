# Manual end-to-end test

Prereqs: backend deployed as the current version (`apps-script/README.md`), `src/config.js` has the
`/exec` URL, and `npm run dev` running (or use the deployed site). The play welcome title shows the
admin's game name with "Gender Reveal" appended if not already present.

## A. Simple game — no final question

1. **Admin create:** open `/admin.html`, enter the admin password, create a game with 2 players
   (`Priya`, `Arjun`), reveal = **girl**, revealOpen = **OFF**, leave **Final question** blank.
   Copy the player link.
2. **Player A:** open the link, pick `Priya`, guess Girl, solve all riddles → goes **straight to the
   waiting room** (no code). Shows `1 of 2 finished` and *"Waiting for the remaining 1 player to
   finish…"*.
3. **Peek negative test:** while 1/2 and reveal closed, confirm the reveal does NOT show
   (`getReveal` returns `{locked:true}`).
4. **Player B:** open the link in another browser/incognito, pick `Arjun`, finish → `2 of 2 finished`.
   Now everyone's done but revealOpen is OFF → *"Waiting for the host to start the reveal 🔒"*.
5. **Host opens reveal:** in `/admin.html` use the game's **Open reveal** control (Manage a game →
   paste the link/id, or the buttons on the just-created screen).
6. **Reveal fires:** within ~4s both waiting rooms flip to: **5→1 countdown → rising balloons +
   confetti → "Congratulations!" + the rhyme + the baby cutout + "It's a GIRL! 💖"**.
7. **Sheet check:** the game tab (named after the game) shows both names, guesses, and `done` status.

## B. Collaborative game — final question + answers

1. **Admin create:** create a game with 2 players, set **Final question** to a phrase with **≥ player
   count** words (e.g. `what will the baby be`) and **Final answer(s)** `girl, a girl`
   (comma-separated; at least one is required when a question is set). revealOpen can be ON or OFF.
2. **Player A:** finish the riddles → the finish screen shows **"Congrats Priya 🎉 / You completed the
   riddles at #1"**, a **Base64 code**, a **"Decrypt your code →"** link (base64decode.org), and an
   **"Enter the final key for reveal"** box. Decoding the code gives part 1 of the question.
3. **Player B:** finish → code is part 2. Players decode + join their parts in finish order to read the
   full question, work out the answer, and each enters it as the key.
4. **Key gating:** a **wrong** key shows *"Not quite — try again."*; a **correct** key advances that
   player to the waiting room. The reveal fires only once **every** player has entered the key **and**
   the host has opened it — so the first keyer waits on the *remaining players*, not the host.
5. **Refresh safety:** a player who finished the riddles but not the key, on reopening the link and
   re-picking their name, resumes at their **code/key screen** (they don't redo the riddles and can't
   skip the key).
6. **Sheet check:** a keyed player's status is `done`; a riddles-done-but-not-keyed player is
   `riddles`; the `position` column records finish order.
