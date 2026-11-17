# Community Christmas

👉 **Going live with Firebase + wallet login? Read `SETUP.md`.** Add `?demo=1` to the URL to run the local demo. The hard daily earning cap, nametags and admin console are described below and in SETUP.md.
Run locally: `python3 -m http.server` in this folder, open http://localhost:8000 (ES modules need a server).
Test advent doors with `?day=12`. Demo mode stores everything in localStorage.

## Deploy (the ZIP's contents must be at the repo ROOT, next to index.html)
**GitHub Pages:** new repo → upload everything from the zip (not the zip itself, not an extra parent folder) → Settings → Pages →
Deploy from branch `main` / root → open `https://<user>.github.io/<repo>/`. **Vercel:** import the repo, framework "Other", no build command.
All paths are relative, so sub-paths work. If something fails, a red error banner shows at the top of the page.

## Login: wallet (MetaMask / Crypto.com) + whitelist
Players connect a wallet (`js/wallet.js`, `js/login.js`), sign a free message, and the `walletLogin` Cloud Function lets in only whitelisted wallets (admins manage the list in **Admin ▸ Whitelist**).
After the first login they choose a unique username once (the whitelist entry's Discord name is suggested). In demo mode (`?demo=1`) there is no server: the whitelist lives in localStorage
(seeded with `0x1111…1111`, `0x2222…2222`, `0x3333…3333`; use `?demo=1&admin=1` + a whitelisted address to try the admin tab). See `SETUP.md` step 6.

## Admin: tune the game without touching code
Everything in `config.js` is only the *default*. One Firestore document, `config/live`, is merged over it at runtime (1 read every 5 min per player).
- **In-app Admin console** (🛠 in the dock): demo mode → add `?admin=1`; Firebase mode → put your Firebase UID in `CONFIG.admins` (and in `firestore.rules`).
  Tabs: **Events** (push/delete timed events) · **Calendar** (min/max ❄ per advent day) · **Goals** (level targets, rename, hide) · **Economy** (base pool, tiers, split, gem rate) · **JSON** (raw doc).
- **Or edit `config/live` by hand** in the Firebase console – see `admin/live-config.example.json` for every field.
- **Event types** (`events[]` with ISO `start`/`end`): `banner` · `xpoints` (game ❄ ×) · `gemrate` (cheaper exchange) · `calbonus` (extra ❄ per door) · `shop` (exclusive item, kept by buyers) · `badge` (temporary badge: metric+min).
  To add a new type, add one helper in `js/remote.js` and use it where it applies. Test events in the demo with `?t=2026-12-05T12:00`.
- `firestore.rules` = starting-point security rules (admin-only writes to `config/live`).

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
- `js/store.js` Demo + Firebase · `js/badges.js` · `js/radio.js` · `js/ui.js` · `js/ctx.js` · `js/wallet.js` wallet access (read-only) · `js/login.js` login dialog · `js/names.js` username rules
- Demo mode has 🧪 test tools in your profile (+❄, complete goals, +💎, reset) so you can try every phase.

## Going live (Firebase + wallet login)
Follow `SETUP.md` (Firestore → Auth → rules → admin → `walletLogin` function). Functions code: `functions/index.js` (Firebase glue) and `functions/login-core.js` (signature checks, unit-tested).

## Payout
At end: export `users` (wallet, donated). Payout = pool × donated / totalDonated, where
pool = basePool + bonuses of reached tiers. Pay from a script (ethers.js) after reviewing for abuse.
