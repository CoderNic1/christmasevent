// Badges. kind: 'perm' (always obtainable) · 'limited' (only obtainable inside a day window of the event) · 'rank' (live: held only while you are in that leaderboard position).
const c = (s, k) => s.stats.c[k] || 0, plays = s => Object.values(s.stats.plays).reduce((a, b) => a + b, 0);
export const BADGES = [
  { id: 'first', name: 'First Steps', icon: '👣', kind: 'perm', desc: 'Play your first mini-game', test: s => plays(s) >= 1 },
  { id: 'allgames', name: 'Game Master', icon: '🎮', kind: 'perm', desc: 'Play all 5 mini-games', test: s => Object.keys(s.stats.plays).length >= 5 },
  { id: 'earner', name: 'Snowflake Collector', icon: '❄️', kind: 'perm', desc: 'Earn 250 ❄ in games', test: s => s.stats.earned >= 250 },
  { id: 'mem', name: 'Elephant Memory', icon: '🧠', kind: 'perm', desc: 'Win Memory Match with 20+ seconds left', test: s => c(s, 'memwin20') >= 1 },
  { id: 'give1', name: 'Generous Elf', icon: '🎁', kind: 'perm', desc: 'Donate 100 ❄', test: s => s.donated >= 100 },
  { id: 'give2', name: 'Santa’s Helper', icon: '🎅', kind: 'perm', desc: 'Donate 1,000 ❄', test: s => s.donated >= 1000 },
  { id: 'doors5', name: 'Door Opener', icon: '🚪', kind: 'perm', desc: 'Open 5 advent doors', test: s => s.doors.length >= 5 },
  { id: 'doors24', name: 'Advent Hero', icon: '📅', kind: 'perm', desc: 'Open all 24 doors', test: s => s.doors.length >= 24 },
  { id: 'tree', name: 'Tree Shaker', icon: '🎄', kind: 'perm', desc: 'Shake the tree 10 times', test: s => c(s, 'ia_tree') >= 10 },
  { id: 'cat', name: 'Cat Whisperer', icon: '😻', kind: 'perm', desc: 'Pet the sleepy cat 10 times', test: s => c(s, 'ia_cat') >= 10 },
  { id: 'dj', name: 'Radio DJ', icon: '📻', kind: 'perm', desc: 'Switch the Christmas radio on', test: s => c(s, 'radio_on') >= 1 },
  { id: 'wallet', name: 'Ready for Rewards', icon: '👛', kind: 'perm', desc: 'Save a payout wallet', test: s => !!s.wallet },
  { id: 'nut', name: 'Nutcracker Hero', icon: '🥜', kind: 'perm', desc: 'Donate to the Nutcracker', test: s => c(s, 'don_nutcracker') >= 1 },
  { id: 'gem', name: 'Gem Collector', icon: '💎', kind: 'perm', desc: 'Exchange ❄ into 💎', test: s => c(s, 'exchanged') >= 1 },
  { id: 'shop', name: 'Treat Yourself', icon: '🛍️', kind: 'perm', desc: 'Buy something in the shop', test: s => c(s, 'bought') >= 1 },
  // limited: only obtainable while the event day is inside window [from,to]; kept forever once earned
  { id: 'early', name: 'Early Elf', icon: '🐣', kind: 'limited', window: [1, 3], desc: 'Donate during the first 3 days of the event', test: s => s.donated > 0 },
  { id: 'week1', name: 'First Week Hero', icon: '🏁', kind: 'limited', window: [1, 7], desc: 'Play 10 rounds in the first week', test: s => plays(s) >= 10 },
  { id: 'eve', name: 'Christmas Eve Elf', icon: '🌟', kind: 'limited', window: [24, 24], desc: 'Play a game on Christmas Eve (Dec 24)', test: s => plays(s) >= 1 },
  // rank: live – shown as ACTIVE only while you hold the position
  { id: 'top10b', name: 'Top 10 Builder', icon: '🏗️', kind: 'rank', board: 'build', max: 10, desc: 'Be in the top 10 of the Build leaderboard' },
  { id: 'top1b', name: 'Master Builder', icon: '👑', kind: 'rank', board: 'build', max: 1, desc: 'Be #1 on the Build leaderboard' },
  { id: 'top10g', name: 'Gem Top 10', icon: '💠', kind: 'rank', board: 'gems', max: 10, desc: 'Be in the top 10 of the Gem leaderboard' },
  { id: 'top1g', name: 'Gem Champion', icon: '🏆', kind: 'rank', board: 'gems', max: 1, desc: 'Be #1 on the Gem leaderboard' },
];
export const rankOf = (boards, kind, name) => (name ? boards[kind].findIndex(r => r[0] === name) + 1 : 0);   // 0 = not ranked
export const holds = (b, boards, name) => { const r = rankOf(boards, b.board, name); return r > 0 && r <= b.max; };
