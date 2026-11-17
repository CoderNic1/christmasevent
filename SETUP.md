# SETUP – going live with Firebase (project `christmasevent-28619`)

Your web config is already in `js/config.js`. Add **`?demo=1`** to the URL any time to run the local demo instead (no Firebase needed).
Everything below is a one-time manual setup in the Firebase console. ⏱ ~30 min (wallet login function: +10 min).

## 1. Create the database
Console → **Build ▸ Firestore Database ▸ Create database** → *Production mode* → pick a region close to your players (e.g. `eur3` / `europe-west1`).

## 2. Authentication
Console → **Build ▸ Authentication ▸ Get started ▸ Sign-in method**
- Just click **Get started**. You do **not** need to enable any provider: players log in with a wallet and the Cloud Function (step 6) issues the Firebase session (custom token).

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
3. Reload the site: the **🛠 Admin** button appears in the dock. Only people with an `admins/<your wallet address, lower-case>` document can write `config/live`, create events or freeze the bracket (enforced by the rules, not just the UI).
   Add more admins the same way. Admin docs can only be created in the console (rules forbid the app from writing them).

## 6. Wallet login (MetaMask, Crypto.com Onchain, any browser wallet)
How it works: the player connects a wallet → signs a **free** login message (not a transaction, no gas, no access to funds/NFTs; the site only ever calls
`eth_requestAccounts`, `eth_chainId`, `personal_sign`) → the `walletLogin` Cloud Function verifies the signature, checks `whitelist/<address>` (or `admins/<address>`)
and returns a Firebase session. Player uid = **lower-case wallet address**. Not on the list → “you don't hold the NFT / your wallet isn't whitelisted”.
1. Upgrade the project to the **Blaze** plan (needed for Cloud Functions; a login is one tiny function call).
2. Install tools: Node 20, `npm i -g firebase-tools`, `firebase login`, `firebase use christmasevent-28619`.
3. `cd functions && npm i`, copy `.env.example` to `.env` and set `ALLOWED_DOMAINS` = the host(s) the game runs on (e.g. `yourname.github.io,localhost:8000`). No secrets needed.
4. `npm test` (optional – 10 checks of the signature logic), then from the project root: `firebase deploy --only functions,firestore:rules`.
5. Google Cloud console ▸ IAM → give the *default compute / App Engine service account* the role **Service Account Token Creator** (needed to mint custom tokens). If login shows “permission denied / iam.serviceAccounts.signBlob”, this is the cause.
6. `js/config.js`: `functionsRegion` must equal the region in `functions/index.js` (`europe-west1`).
7. Optional: Firestore ▸ Indexes/TTL → add a **TTL policy** on collection `loginNonces`, field `expireAt` (auto-cleans the single-use login records).
8. **First admin:** Firestore ▸ Data → create `admins/<your wallet address in lower-case>` (any field). Admins can log in without a whitelist entry. Then log in and use **🛠 Admin ▸ 👛 Whitelist**.

### Whitelist (who may play)
- **Admin ▸ 👛 Whitelist**: add one wallet (+ optional Discord name & note), **bulk import** (one `0xaddress, discordname` per line), check a wallet, list and remove.
- The Discord name stored there is only a **username suggestion** on first login. Players choose their username once; it must be unique (case-insensitive), 3–24 characters: letters, numbers, space . _ -
- Removing a wallet blocks it immediately (the rules re-check the whitelist on every save). Progress is kept; adding it again restores access.
- To let a player change their username (support case): delete their `usernames/<old name lower-case>` doc, and on `users/<address>` set `named=false` and `name="Elf xxxxxx"` (first 6 hex chars of the address).
- Not supported: smart-contract wallets (e.g. Safe) – the signature check is for normal wallets (EOA).
- Mobile: players can open the site inside the MetaMask / Crypto.com Onchain in-app browser. For a QR/deep-link button set `walletConnectProjectId` in `js/config.js` (free id from https://dashboard.reown.com).
- Existing accounts from the old Discord/Google login are different identities (different uid) and are not carried over.

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
`users/{address}` name, named, tag, pts, gems, donated, gemDonated, earnedTotal, earnedToday, capDay, exchCost, gemsMade, shopSpent, doors, inv, badges, stats, lastWrite · `wallets/{address}` payout address (defaults to the login wallet) · `whitelist/{address}` discord, note, updated, by · `usernames/{lower-case name}` uid, name · `loginNonces/{nonce}` (server only) · `community/state` goals{}, cgems, buildLocked · `config/live` (see `admin/live-config.example.json`) · `admins/{uid}`.
