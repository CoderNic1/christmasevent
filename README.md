# Community Christmas
Run locally: `python3 -m http.server` in this folder, open http://localhost:8000 (ES modules need a server).
Test advent doors with `?day=12`. Demo mode stores everything in localStorage.

## Deploy (the ZIP's contents must be at the repo ROOT, next to index.html)
**GitHub Pages:** new repo → upload everything from the zip (not the zip itself, not an extra parent folder) → Settings → Pages →
Deploy from branch `main` / root → open `https://<user>.github.io/<repo>/`. **Vercel:** import the repo, framework "Other", no build command.
All paths are relative, so sub-paths work. If something fails, a red error banner shows at the top of the page.

## Discord login status
Right now login is a **placeholder** (`js/discord.js`): a fake "Authorize" dialog where any username becomes a separate test account
(stored in localStorage, with a Log out button). Real Discord = set `CONFIG.firebase` + `CONFIG.discordAuthUrl` (Cloud Functions below);
`discord.js` is then unused and nothing else changes.

## Files
- `js/config.js` goals (room elements), prize tiers, timers, Firebase config — edit here
- `js/store.js` Demo + Firebase backends (same interface); `js/games.js` mini-games; `js/main.js` UI

## Going live (Firebase + Discord)
1. Create a Firebase project, enable Firestore + Auth, paste the web config in `config.js`.
2. Discord: Firebase has no native Discord provider. Make 2 Cloud Functions: `/start` redirects to Discord OAuth;
   `/callback` exchanges the code, reads the Discord user, calls `admin.auth().createCustomToken('discord:'+id,{})`
   (set displayName), then redirects to `https://yoursite/#token=...`.
3. Data: `users/{uid}` {name, pts, donated, wallet, doors[]} · `community/state` {goals:{tree:n,...}}.
4. Cost control: clients write at most once/min (batched increments), read community doc once/min, leaderboard cached 5 min.
   Scale-up: have a Cloud Function keep `community/leaderboard` (top 50) so clients read 1 doc.
5. Security rules: users may only write their own doc; `donated` may only increase and never exceed `pts` spent;
   `community/state` goal increments only allowed in the same batch as the matching user `donated` increment.
   Best: move game scoring to a callable Function (server validates round time/score) — client scoring is cheatable.

## Payout
At end: export `users` (wallet, donated). Payout = pool × donated / totalDonated, where
pool = basePool + bonuses of reached tiers. Pay from a script (ethers.js) after reviewing for abuse.
