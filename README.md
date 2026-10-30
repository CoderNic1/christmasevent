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

## How the game works (all tunable in `js/config.js`)
- **Goals have levels** (`levels:[{t,img,w}]`, cumulative ❄ targets). Tree 3 levels, presents 3, fireplace/lights/train 2, radio/snowman/nutcracker 1. Art per level lives in `assets/`.
- **Nutcracker** (`final:true`) only opens when every other goal is maxed. When it is done the **Build bracket freezes** and ❄→💎 exchange opens.
- **Prize pool** = base + tier bonuses, tiers based on *total points donated* (`tiers:[{at,bonus}]`, ❄ + 💎×`gemRate`).
  Pool is split between two leaderboards (`split`): **Build** (❄ donated) and **Gems** (💎 donated to the Star Fund). Build's amount is frozen at completion; later pool growth goes to Gems.
  Each player's reward in a bracket = bracket amount × their share of that bracket's total.
- **💎 gems** are personal: exchange (`gemRate`), shop (`shop`), or donate to the Star Fund (also lights up the Northern Lights in the room).
- **Badges** (`js/badges.js`): permanent, limited-time (day window, kept once earned) and live rank badges (only while you hold the rank).
- **Radio** (`js/radio.js`): public-domain carols played by a WebAudio synth; add songs as `"NOTE:beats"` strings.
- **Room items are clickable**: tree, fire, presents, train, lights, radio, snowman, nutcracker, cat, candle. Tree/presents give 1–3 ❄ every 10 min (client-side cooldown – validate server-side for real money).

## Files
- `index.html` · `css/style.css` (theme, room, mobile) · `css/panels.css` (overlay panels, games, shop, badges)
- `js/config.js` · `js/main.js` wiring · `js/panels.js` all panels · `js/games.js` engine + 5 games · `js/room.js` room + interactions · `js/logic.js` pool/bracket maths
- `js/store.js` Demo + Firebase · `js/badges.js` · `js/radio.js` · `js/ui.js` · `js/ctx.js` · `js/discord.js` placeholder login
- Demo mode has 🧪 test tools in your profile (+❄, complete goals, +💎, reset) so you can try every phase.

## Going live (Firebase + Discord)
1. Create a Firebase project, enable Firestore + Auth, paste the web config in `config.js`.
2. Discord: Firebase has no native Discord provider. Make 2 Cloud Functions: `/start` redirects to Discord OAuth;
   `/callback` exchanges the code, reads the Discord user, calls `admin.auth().createCustomToken('discord:'+id,{})`
   (set displayName), then redirects to `https://yoursite/#token=...`.
3. Data: `users/{uid}` {name, pts, donated, gems, gemDonated, wallet, doors[], inv{}, badges{}, stats{}} · `community/state` {goals:{tree:n,...}, cgems:n, buildLocked:n|null}.
   `buildLocked` is written once when the Nutcracker completes – rule: allow only while it is unset (or better: set it from a Cloud Function).
4. Cost control: clients write at most once/min (batched increments), read community doc once/min, leaderboard cached 5 min.
   Scale-up: have a Cloud Function keep `community/leaderboard` (top 50) so clients read 1 doc.
5. Security rules: users may only write their own doc; `donated` may only increase and never exceed `pts` spent;
   `community/state` goal increments only allowed in the same batch as the matching user `donated` increment.
   Best: move game scoring to a callable Function (server validates round time/score) — client scoring is cheatable.

## Payout
At end: export `users` (wallet, donated). Payout = pool × donated / totalDonated, where
pool = basePool + bonuses of reached tiers. Pay from a script (ethers.js) after reviewing for abuse.
