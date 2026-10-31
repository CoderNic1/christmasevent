// Pure game maths derived from state (S = () => state). No DOM.
import { CONFIG as C } from './config.js';
export const range = n => { const c = C.calendar || {}, r = c.days?.[n] || c.default; if (r) return [+r[0], +r[1]]; const b = (n % 6 === 0 ? 25 : 5) + n; return [b, b]; };   // admin can set a ❄ range per day
export const reward = n => { const [a, b] = range(n); return a + Math.floor(Math.random() * (b - a + 1)); };
export function logic(S) {
  const val = g => S().goals[g.id] || 0, lvl = g => g.levels.filter(l => val(g) >= l.t).length, max = g => g.levels.length;
  const full = g => lvl(g) >= max(g), total = g => g.levels[max(g) - 1].t;
  const others = () => C.goals.filter(g => !g.final), gated = g => !!g.final && !others().every(full);
  const buildDone = () => C.goals.every(full);                       // = Nutcracker done → exchange opens, Build bracket freezes
  const totalBuilt = () => Object.values(S().goals).reduce((a, b) => a + b, 0);
  const totalEq = () => totalBuilt() + (S().cgems || 0) * C.gemRate;  // "total points donated" used by prize tiers
  const poolRaw = () => C.basePool + C.tiers.filter(t => totalEq() >= t.at).reduce((a, t) => a + t.bonus, 0);
  const brackets = () => { const P = poolRaw(), lock = S().buildLocked, B = lock ?? Math.round(P * C.split.build); return { P, B, G: Math.max(0, P - B), locked: lock != null }; };
  const shareB = () => (totalBuilt() ? S().donated / totalBuilt() : 0), shareG = () => (S().cgems ? S().gemDonated / S().cgems : 0);
  const aurora = () => C.aurora.filter(t => (S().cgems || 0) >= t).length;
  const today = () => { const q = new URLSearchParams(location.search).get('day'); if (q) return +q;      // ?day=12 to test
    const n = new Date(); return n < new Date(C.eventStart) ? 0 : n >= new Date(C.eventEnd) ? 24 : n.getDate(); };
  const next = () => C.goals.filter(g => !full(g) && !gated(g)).sort((a, b) => (nextT(a) - val(a)) - (nextT(b) - val(b)))[0];
  const nextT = g => g.levels[Math.min(lvl(g), max(g) - 1)].t;
  return { val, lvl, max, full, total, gated, buildDone, totalBuilt, totalEq, poolRaw, brackets, shareB, shareG, aurora, today, next, nextT, exchangeOpen: buildDone };
}
