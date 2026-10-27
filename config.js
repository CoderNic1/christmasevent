// All tunables live here: goals (room elements), prize tiers, timing, Firebase.
export const CONFIG = {
  eventStart: '2026-12-01T00:00:00', eventEnd: '2026-12-25T00:00:00',
  firebase: null,          // paste your Firebase web config object here to go live
  discordAuthUrl: '',      // Cloud Function URL that starts Discord OAuth (see README)
  flushMs: 60000,          // batch user writes: at most 1 write / minute
  pollMs: 60000,           // community state: 1 read / minute
  boardMs: 300000,         // leaderboard cache: 5 min
  currency: 'USDC', basePool: 500,
  // Each goal = one room element that appears when fully funded. x/y/size are % / px in the room.
  goals: [
    { id: 'lights',  name: 'Twinkle Lights', emoji: '✨', target: 300,  x: 50, y: 12, size: 40 },
    { id: 'tree',    name: 'Christmas Tree', emoji: '🎄', target: 600,  x: 70, y: 52, size: 150 },
    { id: 'fire',    name: 'Fireplace',      emoji: '🔥', target: 1000, x: 30, y: 68, size: 80 },
    { id: 'presents',name: 'Presents',       emoji: '🎁', target: 1500, x: 55, y: 82, size: 60 },
    { id: 'snowman', name: 'Snowman',        emoji: '⛄', target: 2500, x: 90, y: 75, size: 90 },
    { id: 'train',   name: 'Toy Train',      emoji: '🚂', target: 4000, x: 15, y: 88, size: 60 },
  ],
  // Prize tiers: when N goals are complete, `bonus` is added to the pool.
  tiers: [{ goals: 1, bonus: 250 }, { goals: 3, bonus: 500 }, { goals: 5, bonus: 1000 }, { goals: 6, bonus: 2000 }],
};
