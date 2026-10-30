// All tunables live here: goals (with levels), prize tiers/split, gems, shop, timing, Firebase.
const A = n => `assets/${n}.svg`;
export const CONFIG = {
  eventStart: '2026-12-01T00:00:00', eventEnd: '2026-12-25T00:00:00',
  firebase: null,            // paste your Firebase web config object to go live
  discordAuthUrl: '',        // Cloud Function URL that starts Discord OAuth (see README)
  flushMs: 60000, pollMs: 60000, boardMs: 300000,   // batched writes / community poll / leaderboard cache
  currency: 'USDC', basePool: 500,
  // PRIZE POOL: base + a bonus for every tier reached. Tiers are based on TOTAL POINTS DONATED
  // (❄ donated to goals + 💎 donated to the Star Fund × gemRate).
  tiers: [{ at: 2000, bonus: 250 }, { at: 5000, bonus: 500 }, { at: 10000, bonus: 1000 }, { at: 20000, bonus: 2000 }, { at: 40000, bonus: 4000 }],
  split: { build: 0.7, gems: 0.3 },   // share of the pool per leaderboard. The Build share is FROZEN once the Nutcracker is done;
                                      // all later pool growth goes to the Gem leaderboard.
  gemRate: 10,                        // 10 ❄ = 1 💎 (only after the Nutcracker is unlocked)
  aurora: [100, 400, 1000],           // total 💎 in the Star Fund → Northern Lights levels in the room
  // GOALS: levels are cumulative ❄ targets. x/y = bottom-centre in the room (%), w = width (% of room) per level.
  // `final: true` = only open for donations when every other goal is finished (the Nutcracker).
  goals: [
    { id: 'lights', name: 'Twinkle Lights', x: 16.7, y: 13.5, act: 'Click to change the light show', levels: [{ t: 300, img: A('lights1'), w: 33.4 }, { t: 900, img: A('lights'), w: 100, x: 50 }] },
    { id: 'tree', name: 'Christmas Tree', x: 74, y: 84, act: 'Click to shake the tree', levels: [{ t: 400, img: A('tree1'), w: 15 }, { t: 1200, img: A('tree'), w: 19 }, { t: 3000, img: A('tree3'), w: 24 }] },
    { id: 'fire', name: 'Fireplace', x: 47, y: 74, act: 'Click to poke the fire', levels: [{ t: 600, img: A('fireplace1'), w: 22 }, { t: 1500, img: A('fireplace'), w: 22 }] },
    { id: 'presents', name: 'Presents', x: 60, y: 92, act: 'Click to shake a present', levels: [{ t: 500, img: A('presents1'), w: 6 }, { t: 1000, img: A('presents'), w: 13 }, { t: 2200, img: A('presents3'), w: 18 }] },
    { id: 'train', name: 'Toy Train', x: 40, y: 98, cls: 'train', act: 'Click to toot the whistle', levels: [{ t: 800, img: A('train1'), w: 11 }, { t: 2000, img: A('train'), w: 16 }] },
    { id: 'radio', name: 'Christmas Radio', x: 21, y: 83, act: 'Click to turn the music on/off', levels: [{ t: 1000, img: A('radio'), w: 8 }] },
    { id: 'snowman', name: 'Garden Snowman', x: 15.6, y: 46, act: 'Click to say hi (he lives outside!)', levels: [{ t: 700, img: A('snowman'), w: 4.6 }] },
    { id: 'nutcracker', name: 'Nutcracker', x: 91, y: 91, final: true, act: 'Click to crack a nut', levels: [{ t: 4000, img: A('nutcracker'), w: 7 }] },
  ],
  // SHOP (spend 💎 on personal things). type 'use' = consumable (qty uses), 'own' = one-time cosmetic.
  shop: [
    { id: 'cdreset', name: 'Cooldown Reset', icon: '⏩', price: 5, type: 'use', qty: 1, desc: 'Instantly resets all mini-game cooldowns.' },
    { id: 'x2', name: 'Double Snowflakes', icon: '✨', price: 10, type: 'use', qty: 3, desc: 'Your next 3 game rounds give 2× ❄.' },
    { id: 'title', name: 'Title: Elf Captain', icon: '🧝', price: 15, type: 'own', desc: 'Shown next to your name on leaderboards.' },
    { id: 'frame', name: 'Golden Avatar Frame', icon: '🖼️', price: 20, type: 'own', desc: 'A golden ring around your avatar.' },
    { id: 'hat', name: 'Santa Hat for the Cat', icon: '🎅', price: 25, type: 'own', desc: 'In your room the sleepy cat wears a hat.' },
  ],
};
