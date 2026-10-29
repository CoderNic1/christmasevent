// All tunables live here: goals (room elements), prize tiers, timing, Firebase.
export const CONFIG = {
  eventStart: '2026-12-01T00:00:00', eventEnd: '2026-12-25T00:00:00',
  firebase: null,          // paste your Firebase web config object here to go live
  discordAuthUrl: '',      // Cloud Function URL that starts Discord OAuth (see README)
  flushMs: 60000,          // batch user writes: at most 1 write / minute
  pollMs: 60000,           // community state: 1 read / minute
  boardMs: 300000,         // leaderboard cache: 5 min
  currency: 'USDC', basePool: 500,
  // Each goal = one room element (SVG in /assets) that lights up when fully funded.
  // x/y = position of its bottom-centre in the room (%), w = width (% of room).
  goals: [
    { id: 'lights',  name: 'Twinkle Lights', img: 'assets/lights.svg',   target: 300,  x: 50, y: 13.5, w: 100 },
    { id: 'tree',    name: 'Christmas Tree', img: 'assets/tree.svg',     target: 600,  x: 74, y: 84, w: 19 },
    { id: 'fire',    name: 'Fireplace',      img: 'assets/fireplace.svg',target: 1000, x: 47, y: 74, w: 22 },
    { id: 'presents',name: 'Presents',       img: 'assets/presents.svg', target: 1500, x: 60, y: 92, w: 13 },
    { id: 'snowman', name: 'Snowman',        img: 'assets/snowman.svg',  target: 2500, x: 91, y: 90, w: 10 },
    { id: 'train',   name: 'Toy Train',      img: 'assets/train.svg',    target: 4000, x: 40, y: 98, w: 16, cls: 'train' },
  ],
  // Prize tiers: when N goals are complete, `bonus` is added to the pool.
  tiers: [{ goals: 1, bonus: 250 }, { goals: 3, bonus: 500 }, { goals: 5, bonus: 1000 }, { goals: 6, bonus: 2000 }],
};
