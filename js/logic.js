// Pure game logic derived from state (S = () => state). No DOM here.
import { CONFIG as C } from './config.js';
export const reward = n => (n % 6 === 0 ? 25 : 5) + n;
export function logic(S) {
  const full = g => (S().goals[g.id] || 0) >= g.target, done = () => C.goals.filter(full).length;
  const total = () => Object.values(S().goals).reduce((a, b) => a + b, 0);
  const pool = () => C.basePool + C.tiers.filter(t => done() >= t.goals).reduce((a, t) => a + t.bonus, 0);
  const share = () => (total() ? S().donated / total() : 0);
  const today = () => { const q = new URLSearchParams(location.search).get('day'); if (q) return +q;   // ?day=12 to test
    const n = new Date(); return n < new Date(C.eventStart) ? 0 : n >= new Date(C.eventEnd) ? 24 : n.getDate(); };
  const next = () => C.goals.filter(g => !full(g)).sort((a, b) => (a.target - (S().goals[a.id] || 0)) - (b.target - (S().goals[b.id] || 0)))[0];
  return { full, done, total, pool, share, today, next };
}
