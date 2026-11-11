# SETUP – going live with Firebase (project `christmasevent-28619`)

Your web config is already in `js/config.js`. Add **`?demo=1`** to the URL any time to run the local demo instead (no Firebase needed).
Everything below is a one-time manual setup in the Firebase console. ⏱ ~30 min (Discord login: +20 min).

## 1. Create the database
Console → **Build ▸ Firestore Database ▸ Create database** → *Production mode* → pick a region close to your players (e.g. `eur3` / `europe-west1`).

## 2. Authentication
Console → **Build ▸ Authentication ▸ Get started ▸ Sign-in method**
- Enable **Google** (temporary test login – used while Discord login is not deployed; remove it later by setting `allowGoogleLogin:false`).
- **Settings ▸ Authorized domains** → add the domain you host on, e.g. `yourname.github.io` (and your custom domain / Vercel domain). `localhost` is there by default.

## 3. Create the 2 starting documents (Firestore ▸ Data ▸ Start collection)
| Path | Fields (type) |
|---|---|
| `community` / `state` | `goals` **map** with these keys, each **number 0**: `lights, tree, fire, presents, wreath, train, radio, snowman, nutcracker` · `cgems` number `0` · `buildLocked` **null** |
| `config` / `live` | `capCeiling` number `1000` (max ❄ a player may earn per UTC day, enforced by the rules – see §9) |

## 4. Publish the security rules
Console → **Firestore ▸ Rules** → paste the content of `firestore.rules` → **Publish**.
(or CLI: `npm i -g firebase-tools && firebase login && firebase use christmasevent-28619 && firebase deploy --only firestore:rules`)

## 5. Become admin
1. Open the site (without `?demo`), log in, open **Profile ▸ 🆔 Copy my user ID**.
2. Firestore ▸ Data ▸ **Start collection** `admins` → Document ID = *your user ID* → add any field, e.g. `ok` = `true`.
3. Reload the site: the **🛠 Admin** button appears in the dock. Only people with an `admins/<uid>` document can write `config/live`, create events or freeze the bracket (enforced by the rules, not just the UI).
   Add more admins the same way. Admin docs can only be created in the console (rules forbid the app from writing them).

## 6. Discord login (replaces the Google test login)
Needs the **Blaze (pay-as-you-go) plan** for Cloud Functions – the free quota is far more than this game needs; set a budget alert (§8).
1. https://discord.com/developers/applications → **New Application** → copy the **Client ID**; **OAuth2** → copy/reset the **Client Secret**.
2. Install tools: Node 20, `npm i -g firebase-tools`, `firebase login`, `firebase use christmasevent-28619`.
3. `cd functions && npm i`, copy `.env.example` to `.env` and fill `DISCORD_CLIENT_ID` and `SITE_URL` (your site). Leave `DISCORD_REDIRECT_URI` for now.
4. `firebase functions:secrets:set DISCORD_CLIENT_SECRET` (paste the secret), then `firebase deploy --only functions`.
5. The CLI prints two URLs. Put the **discordCallback** URL into `.env` as `DISCORD_REDIRECT_URI`, **and** add the exact same URL under Discord ▸ OAuth2 ▸ **Redirects**. Redeploy: `firebase deploy --only functions`.
6. In `js/config.js` set `discordAuthUrl` to the **discordStart** URL and `allowGoogleLogin: false`.
7. Google Cloud console ▸ IAM → give the *default compute / App Engine service account* the role **Service Account Token Creator** (needed to mint custom tokens). If login shows “permission iam.serviceAccounts.signBlob denied”, this is the fix.
8. Players now get uid `discord:<their Discord id>`. Admin docs then use that id (`admins/discord:123456789…`).
Note: players who logged in with Google earlier are different accounts (different uid).

## 7. Lock down the API key (recommended)
Google Cloud console ▸ **APIs & Services ▸ Credentials** → the *Browser key* → **HTTP referrers**: `https://yourname.github.io/*`, `http://localhost:*`. The web key is not a secret, but this stops others from using your quota.

## 8. Costs & monitoring
- Per active player: ~1 write/min (batched), ~1 community read/min, 1 config read/5 min, leaderboard reads every 5 min (max 20 docs). The rules add ~1 extra read per balance write (they read `config/live`).
- Console ▸ **Usage** to watch reads/writes. Google Cloud ▸ **Billing ▸ Budgets & alerts** → create a budget (e.g. €10) with alerts.
- If it grows: raise `flushMs`/`pollMs`/`boardMs` in `config.js`.

## 9. What the rules guarantee (and what not)
Every player write must keep these books balanced: `pts + donated + exchCost = earnedTotal` and `gems + gemDonated + shopSpent = gemsMade`.
New earnings must be booked in today’s counter (UTC) and today’s counter can never exceed **`capCeiling`**; goal totals can only grow by exactly what that player donated (same batch); names are immutable; wallets are private; only admins touch `config/live`, `admins`, `buildLocked`.
**Not preventable client-side:** a player faking *how* they earned ❄ (e.g. editing a game score) up to the daily ceiling. That is what the **hard daily cap** limits. Choose the cap/ceiling with the prize split in mind, and review outliers before payout (Admin ▸ Economy ▸ Export CSV; sort by `donated`).
Cap logic: the app enforces the exact cap (`dailyCap` + “Daily cap change” events); the rules enforce `capCeiling`. **Keep `capCeiling` ≥ the biggest cap you will ever use**, otherwise players are blocked by the rules. Gem exchange rate must stay ≥ 3 (rules).
Stricter anti-cheat = move scoring into a Cloud Function (not included).

## 10. Run the event
- 🛠 **Admin console**: *Events* (guided form with ⓘ help), *Calendar* (min/max per day), *Goals* (level targets), *Economy* (cap, ceiling, pool, tiers, split, gem rate), *JSON*.
- When the **Nutcracker** is done: Admin ▸ Economy ▸ **🔒 Freeze Build bracket** (locks the Build prize amount; further pool growth goes to Gems).
- **Payout**: Admin ▸ Economy ▸ **⬇ Export payouts CSV** (uid, name, wallet, donated, shares, reward). Review, then send from your wallet manually.
- Players can “delete” their account in the app = anonymise (name/tag/wallet removed, books stay so the cap can’t be reset). To fully erase someone, delete `users/<uid>`, `wallets/<uid>` in the console.
- If a player’s account was deleted by mistake: remove the `deleted` field and restore `name` in the console.

## 11. Test the rules (optional but recommended)
`cd tests && npm i && npm test` (needs Java for the emulator). These tests were written but **not executed** in the environment where this project was generated – run them once before launch.

## Data layout
`users/{uid}` name, tag, pts, gems, donated, gemDonated, earnedTotal, earnedToday, capDay, exchCost, gemsMade, shopSpent, doors, inv, badges, stats, lastWrite · `wallets/{uid}` address · `community/state` goals{}, cgems, buildLocked · `config/live` (see `admin/live-config.example.json`) · `admins/{uid}`.
