// REMOTE CONFIG + TIMED EVENTS. Admins edit one Firestore doc (config/live); it is merged over config.js at runtime. Empty doc = defaults.
import { CONFIG as C } from './config.js';
const BASE = JSON.parse(JSON.stringify(C)); export const BASE_GOALS = BASE.goals;
export let live = {};
export const nowMs = () => { const t = new URLSearchParams(location.search).get('t'); return t ? Date.parse(t) : Date.now(); };   // ?t=2026-12-05T12:00 to test events
export function applyLive(doc) {
  live = doc || {}; const L = live;
  for (const k of ['basePool', 'currency', 'gemRate', 'split', 'tiers', 'aurora', 'shop']) C[k] = JSON.parse(JSON.stringify(BASE[k]));
  C.goals = JSON.parse(JSON.stringify(BASE.goals)); C.calendar = { default: null, days: {} };
  for (const k of ['basePool', 'currency', 'gemRate']) if (L[k] != null) C[k] = L[k];
  if (L.split) C.split = { ...C.split, ...L.split }; if (Array.isArray(L.tiers)) C.tiers = L.tiers; if (Array.isArray(L.aurora)) C.aurora = L.aurora; if (Array.isArray(L.shop)) C.shop = [...C.shop, ...L.shop];
  if (L.calendar) C.calendar = { default: L.calendar.default || null, days: L.calendar.days || {} };
  for (const [id, o] of Object.entries(L.goals || {})) { const g = C.goals.find(x => x.id === id); if (!g) continue;
    if (o.enabled === false) g.off = 1; ['name', 'x', 'y'].forEach(k => { if (o[k] != null && o[k] !== '') g[k] = o[k]; }); (o.levels || []).forEach((t, i) => { if (g.levels[i] && +t > 0) g.levels[i].t = +t; }); }
  C.goals = C.goals.filter(g => !g.off);
}
// ---- events: { id, type, icon, title, desc, start, end (ISO), params } ----
const evs = () => (live.events || []).map(e => ({ ...e, s: Date.parse(e.start), e: Date.parse(e.end) })).filter(e => e.s && e.e);
export const events = { all: evs, active: () => evs().filter(e => nowMs() >= e.s && nowMs() < e.e), upcoming: () => evs().filter(e => e.s > nowMs()).sort((a, b) => a.s - b.s), past: () => evs().filter(e => e.e <= nowMs()).sort((a, b) => b.e - a.e) };
const ofType = t => events.active().filter(e => e.type === t);
export const xmult = gid => ofType('xpoints').filter(e => !e.params?.games || e.params.games.includes(gid)).reduce((a, e) => a * (e.params?.mult || 1), 1);   // game points ×
export const gemRate = () => ofType('gemrate').reduce((a, e) => Math.min(a, e.params?.rate || a), C.gemRate);                                      // cheaper exchange
export const doorBonus = () => ofType('calbonus').reduce((a, e) => a + (e.params?.bonus || 0), 0);                                                // extra ❄ per advent door
export const shopItems = () => [...C.shop, ...ofType('shop').filter(e => e.params?.item).map(e => ({ ...e.params.item, until: e.e, event: e.title }))];  // event-exclusive items
const allItems = () => [...C.shop, ...evs().filter(e => e.type === 'shop' && e.params?.item).map(e => e.params.item)];
export const titleOf = inv => { const it = allItems().filter(i => i.title && inv?.[i.id]).sort((a, b) => b.price - a.price)[0]; return it ? it.title : ''; };
const metric = (s, p) => ({ donated: s.donated, plays: Object.values(s.stats.plays).reduce((a, b) => a + b, 0), doors: s.doors.length, gemdonated: s.gemDonated, earned: s.stats.earned }[p.metric] || 0) >= (p.min || 1);
export const eventBadges = () => evs().filter(e => e.type === 'badge' && e.params).map(e => ({ id: 'ev_' + e.id, name: e.title, icon: e.icon || '🎖️', kind: 'limited', win: [e.s, e.e], desc: e.desc || '', test: s => metric(s, e.params) }));
export const left = ms => { const s = Math.max(0, ms / 1000 | 0), d = s / 86400 | 0, h = s % 86400 / 3600 | 0, m = s % 3600 / 60 | 0; return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m ${s % 60}s`; };
