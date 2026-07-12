# Backend (Google Apps Script) — setup

1. Create a Google Sheet; note it as the container.
2. Install clasp: `npm i -g @google/clasp` then `clasp login`.
3. In this folder: `clasp create --type sheets --title "Gender Reveal Backend"`
   (or `clasp clone <scriptId>` if the Sheet already has a bound script).
4. Push code: `clasp push` (pushes `*.gs` + `appsscript.json`).
5. In the Apps Script editor: **Project Settings → Script Properties** → add:
   - `ADMIN_PW` = your admin password
   - `GAME_SALT` = a long random string
6. **Deploy → New deployment → Web app** → Execute as **Me**, Access **Anyone** → Deploy.
7. Copy the **/exec** URL into `src/config.js` (`BACKEND_URL`).
8. Re-deploy (new version) whenever backend code changes.
