// In-app ADMIN CONSOLE. Edits the remote config doc (Firebase: config/live; demo: localStorage). No code changes needed to tune the game.
import { CONFIG as C } from './config.js';
import { BASE_GOALS, live, applyLive, nowMs } from './remote.js';
import { GAMES } from './games.js';
import { $, f, toast, body } from './ui.js';
import { ctx } from './ctx.js';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
let draft = null, tab = 'events', infoOpen = null; const D = () => draft ||= JSON.parse(JSON.stringify(live || {}));
export const isAdmin = () => !!ctx.store?.admin;
export const adminOpen = () => { draft = null; };
const N = (k, l, d, h) => ({ k, l, t: 'number', d, h });
// ---- every event type: what it does, its parameters (with help + default) and an example ----
const TYPES = {
  banner: { label: '📣 Announcement', what: 'Shows a banner chip and an entry in the Events panel for the whole window. Changes nothing in gameplay – use it for news.', fields: [], example: 'Title “Maintenance Friday 20:00 UTC”, text “Short downtime, your progress is safe.”' },
  xpoints: { label: '✨ Bonus snowflakes', what: 'Multiplies the ❄ players earn from mini-games while live (the daily cap still applies).', fields: [N('mult', 'Multiplier', 2, '2 = double, 1.5 = +50%'), { k: 'games', l: 'Only these games', t: 'games', h: 'Tick none (or all) = every game' }], example: '“Double Snowflake Weekend”: multiplier 2, all games, Saturday → Sunday.' },
  cap: { label: '⚡ Daily cap change', what: 'Temporarily raises (or lowers) the hard daily earning cap for everyone.', fields: [N('mult', 'Multiply cap by', '', 'e.g. 2 = double the cap'), N('add', '…and/or add ❄', '', 'e.g. 200 = +200 per day')], example: '“Power Hour”: multiply 2 for 24 h → cap 400 becomes 800. Keep Economy ▸ “rules ceiling” at least as high as the biggest cap you use!' },
  gemrate: { label: '💎 Gem sale', what: 'Makes exchanging ❄ → 💎 cheaper while live.', fields: [N('rate', '❄ per 💎', 6, 'Lower = cheaper. Do not go below 3 (security rules).')], example: '“Gem Sale”: rate 6 for 24 h (normal is 10).' },
  calbonus: { label: '🚪 Advent door bonus', what: 'Adds extra ❄ to every advent door opened while live.', fields: [N('bonus', 'Extra ❄ per door', 10, 'Added on top of the normal reward')], example: '“Door Bonus Day”: +10 ❄ per door.' },
  shop: { label: '👑 Exclusive shop item', what: 'Adds an item to the shop that can ONLY be bought during the event. Buyers keep it forever. Items with a “title” become nametags.', example: '“Snowflake Crown”: id crown, price 30 💎, type own, title “👑 Snow King”.',
    fields: [{ k: 'id', l: 'Item id', t: 'text', d: 'crown', h: 'Unique, no spaces' }, { k: 'name', l: 'Name', t: 'text', d: 'Snowflake Crown' }, { k: 'icon', l: 'Icon', t: 'text', d: '👑' }, N('price', 'Price (💎)', 30), { k: 'type', l: 'Type', t: 'select', o: ['own', 'use'], h: 'own = one-time cosmetic · use = consumable (needs code support)' },
      { k: 'title', l: 'Nametag text', t: 'text', d: '👑 Snow King', h: 'Optional: players can wear it as nametag' }, { k: 'desc', l: 'Description', t: 'text', d: 'Event exclusive!' }] },
  badge: { label: '🎖️ Temporary badge', what: 'A badge players can only earn while the event is live (kept forever once earned).', fields: [{ k: 'metric', l: 'Condition', t: 'select', o: ['donated', 'plays', 'doors', 'gemdonated', 'earned'], h: 'donated = ❄ given to goals · plays = rounds · doors · gemdonated · earned = ❄ earned in games' }, N('min', 'At least', 100, 'Value to reach')], example: '“Generous Week”: condition donated, at least 200, Mon → Sun.' },
};
const TEMPLATES = [['✨ Double ❄ weekend', 'xpoints', '✨', 'Double Snowflake Weekend', 'All mini-games give 2× snowflakes!', { mult: 2 }, 48], ['⚡ Cap boost', 'cap', '⚡', 'Power Hour', 'The daily earning cap is doubled!', { mult: 2 }, 24], ['💎 Gem sale', 'gemrate', '💎', 'Gem Sale', 'Cheaper ❄ → 💎 exchange!', { rate: 6 }, 24],
  ['👑 Exclusive item', 'shop', '👑', 'Exclusive: Snowflake Crown', 'Only buyable during this event!', { item: { id: 'crown', name: 'Snowflake Crown', icon: '👑', price: 30, type: 'own', title: '👑 Snow King', desc: 'Event exclusive!' } }, 72], ['🎖️ Badge week', 'badge', '🎖️', 'Generous Week', 'Donate 200 ❄ this week for a special badge!', { metric: 'donated', min: 200 }, 168], ['🚪 Door bonus', 'calbonus', '🚪', 'Door Bonus Day', 'Extra ❄ in every advent door!', { bonus: 10 }, 24]];
const iso = ms => new Date(ms - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
let ev = { type: 'xpoints', icon: '✨', title: '', desc: '', start: Date.now(), end: Date.now() + 864e5, params: {} };

const fieldHtml = (fd, v) => `<label>${fd.l}${fd.h ? ` <small title="${esc(fd.h)}">ⓘ</small>` : ''}` + (fd.t === 'select' ? `<select data-p="${fd.k}">${fd.o.map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select>`
  : fd.t === 'games' ? `<span class="chk">${GAMES.map(g => `<label><input type="checkbox" data-p="games" value="${g.id}" ${(v || []).includes(g.id) ? 'checked' : ''}> ${g.name}</label>`).join('')}</span>` : `<input type="${fd.t}" step="any" data-p="${fd.k}" value="${esc(v ?? fd.d ?? '')}">`) + '</label>';
function paramsOf(t) {            // form → params object
  const T = TYPES[t], q = k => document.querySelector(`[data-p=${k}]`), out = {};
  for (const fd of T.fields) { if (fd.t === 'games') { const g = [...document.querySelectorAll('[data-p=games]:checked')].map(x => x.value); if (g.length && g.length < GAMES.length) out.games = g; } else { const v = q(fd.k).value; if (v !== '') out[fd.k] = fd.t === 'number' ? +v : v; } }
  if (t === 'shop') { const { id, name, icon, price, type, title, desc } = out; return { item: { id, name, icon, price, type, ...(title ? { title } : {}), desc } }; } return out;
}
function infoHtml(types) { return `<div class="help">` + types.map(t => { const T = TYPES[t]; return `<h4>${T.label} <code>${t}</code></h4><p>${T.what}</p>${T.fields.length ? `<table><tr><th>Field</th><th>Meaning</th><th>Example</th></tr>${T.fields.map(fd => `<tr><td><b>${fd.l}</b></td><td>${fd.h || ''}</td><td>${fd.t === 'games' ? 'gift, tap, memory…' : fd.d === '' ? '—' : esc(fd.d)}</td></tr>`).join('')}</table>` : ''}<p><b>Example:</b> ${T.example}</p>`; }).join('<hr>') + '</div>'; }
function readEv() { if (!$('[data-e=title]')) return; ev = { ...ev, icon: $('[data-e=icon]').value, title: $('[data-e=title]').value, desc: $('[data-e=desc]').value, start: Date.parse($('[data-e=start]').value) || ev.start, end: Date.parse($('[data-e=end]').value) || ev.end }; }

function events() {
  const list = draft.events || [], now = nowMs(), T = TYPES[ev.type];
  return `<div class="card2"><h3>Timed events <button class="ghost mini" data-act="ainfo" data-id="all" title="All event types">ⓘ</button></h3>${infoOpen === 'all' ? infoHtml(Object.keys(TYPES)) : ''}` + (list.length ? list.map((e, i) => { const s = Date.parse(e.start), z = Date.parse(e.end), st = now < s ? '🗓 upcoming' : now < z ? '🟢 live' : '⚪ ended';
    return `<div class="evrow"><span>${e.icon || '🎉'} <b>${esc(e.title)}</b> <small>${e.type} · ${new Date(s).toLocaleString()} → ${new Date(z).toLocaleString()} · ${st}</small></span><button class="danger" data-act="adel" data-id="${i}">✕</button></div>`; }).join('') : '<p class="muted">No events yet.</p>') + `</div>
  <div class="card2"><h3>➕ New event</h3><p class="muted">Quick start:</p><div class="acts">${TEMPLATES.map((t, i) => `<button class="ghost mini" data-act="atpl" data-id="${i}">${t[0]}</button>`).join('')}</div>
  <div class="form"><label>Type <button class="ghost mini" data-act="ainfo" data-id="${ev.type}" title="What does this type do?">ⓘ</button><select data-e="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${k === ev.type ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label><label>Icon<input data-e="icon" value="${esc(ev.icon)}" maxlength="4"></label></div>
  ${infoOpen === ev.type ? infoHtml([ev.type]) : `<p class="muted">${T.what}</p>`}
  <div class="form"><label>Title (shown to players)<input data-e="title" value="${esc(ev.title)}" placeholder="Double Snowflake Weekend"></label><label>Description<input data-e="desc" value="${esc(ev.desc)}" placeholder="Short text for players"></label></div>
  <div class="form"><label>Starts<input type="datetime-local" data-e="start" value="${iso(ev.start)}"></label><label>Ends<input type="datetime-local" data-e="end" value="${iso(ev.end)}"></label></div>
  <div class="acts"><span class="muted">Duration:</span>${[[1, '1 h'], [24, '1 day'], [72, '3 days'], [168, '1 week']].map(([h, l]) => `<button class="ghost mini" data-act="adur" data-id="${h}">${l}</button>`).join('')}</div>
  ${T.fields.length ? `<div class="form">${T.fields.map(fd => fieldHtml(fd, fd.t === 'shop' ? '' : (ev.type === 'shop' ? ev.params.item?.[fd.k] : ev.params[fd.k]))).join('')}</div>` : ''}
  <div class="acts"><button data-act="aadd">🚀 Publish event</button></div></div>`;
}
function calendar() { const c = draft.calendar || {}, d = c.default || ['', '']; return `<p class="muted">Random ❄ reward range per advent door. Empty = built-in default (5 + day, bigger every 6th door).</p>
  <div class="card2"><b>Default for every day</b><div class="form"><label>Min<input type="number" data-c="dmin" value="${esc(d[0])}"></label><label>Max<input type="number" data-c="dmax" value="${esc(d[1])}"></label></div></div><div class="card2"><b>Per-day override</b><div class="calgrid">` +
  Array.from({ length: 24 }, (_, i) => i + 1).map(n => { const r = c.days?.[n] || ['', '']; return `<div><small>Dec ${n}</small><input type="number" placeholder="min" data-c="m${n}" value="${esc(r[0])}"><input type="number" placeholder="max" data-c="x${n}" value="${esc(r[1])}"></div>`; }).join('') + '</div></div>'; }
function goals() { return `<p class="muted">Cumulative ❄ target per level. Empty = default. Untick to hide a goal.</p>` + BASE_GOALS.map(g => { const o = draft.goals?.[g.id] || {};
  return `<div class="card2"><label><input type="checkbox" data-g="${g.id}" data-f="en" ${o.enabled === false ? '' : 'checked'}> <b>${esc(g.name)}</b></label> <input data-g="${g.id}" data-f="name" placeholder="rename" value="${esc(o.name || '')}">
  <div class="form">${g.levels.map((l, i) => `<label>Level ${i + 1} (default ${l.t})<input type="number" data-g="${g.id}" data-f="lv${i}" value="${esc(o.levels?.[i] ?? '')}"></label>`).join('')}</div></div>`; }).join(''); }
function economy() { const c = draft, L = ctx.L, canFreeze = ctx.store.autoLock === false && L.buildDone() && ctx.store.state.buildLocked == null;
  return `<div class="card2"><h3>⚡ Hard daily cap</h3><div class="form"><label>Daily cap (❄ earnable per UTC day) <small title="Games + advent doors + room gifts all count">ⓘ</small><input type="number" data-a="dailyCap" value="${esc(c.dailyCap ?? C.dailyCap)}"></label>
  <label>Rules ceiling <small title="Firestore rules refuse more than this per day, even with events. Must be ≥ the biggest cap you will ever use (incl. cap events).">ⓘ</small><input type="number" data-a="capCeiling" value="${esc(c.capCeiling ?? 1000)}"></label></div>
  <p class="muted">The app enforces the exact cap (including “Daily cap change” events); the security rules enforce the ceiling as a safety net.</p></div>
  <div class="card2"><h3>Pool & economy</h3><div class="form"><label>Base pool<input type="number" data-a="basePool" value="${esc(c.basePool ?? C.basePool)}"></label><label>Currency<input data-a="currency" value="${esc(c.currency ?? C.currency)}"></label>
  <label>❄ per 💎 (min 3)<input type="number" data-a="gemRate" value="${esc(c.gemRate ?? C.gemRate)}"></label><label>Build share %<input type="number" data-a="split" value="${Math.round((c.split?.build ?? C.split.build) * 100)}"></label></div>
  <label class="blk">Prize tiers (one per line: <code>pointsDonated:bonus</code>)<textarea data-a="tiers" rows="5">${(c.tiers || C.tiers).map(t => `${t.at}:${t.bonus}`).join('\n')}</textarea></label>
  <label class="blk">Northern-lights levels (💎 totals, comma separated)<input data-a="aurora" value="${(c.aurora || C.aurora).join(',')}"></label></div>
  <div class="card2"><h3>🏁 Payouts</h3>${canFreeze ? `<p class="muted">Building is complete. Freeze the Build bracket at the current value (${f(Math.round(L.poolRaw() * C.split.build))} ${C.currency}):</p><div class="acts"><button class="danger" data-act="afreeze">🔒 Freeze Build bracket now</button></div>` : '<p class="muted">The Build bracket can be frozen here once every goal is complete.</p>'}
  <div class="acts"><button class="ghost" data-act="aexport">⬇ Export payouts CSV</button></div><p class="muted">CSV = every player with wallet, donated amounts and the reward from the current brackets.</p></div>`; }
const raw = () => `<p class="muted">Advanced: the whole live config. Same content as Firestore doc <code>config/live</code>.</p><textarea id="rawjson" rows="16" class="mono">${esc(JSON.stringify(draft, null, 2))}</textarea>`;
export function adminHtml() {
  D(); const T = { events: ['🎉 Events', events], calendar: ['📅 Calendar', calendar], goals: ['🎁 Goals', goals], economy: ['💰 Economy', economy], raw: ['{ } JSON', raw] };
  return `<div class="tabs wrap">${Object.entries(T).map(([k, v]) => `<button class="${k === tab ? '' : 'ghost'}" data-act="atab" data-id="${k}">${v[0]}</button>`).join('')}</div>` + T[tab][1]() +
    (['events'].includes(tab) ? '' : `<div class="acts"><button data-act="asave">💾 Save & publish</button></div>`) + `<p class="muted">Changes go live for everyone within ~5 minutes (clients re-read the config every 5 min).</p>`;
}
const val = s => $(s)?.value;
function collect() {
  const d = D(), q = s => document.querySelector(s);
  if (tab === 'economy') { for (const k of ['basePool', 'gemRate', 'dailyCap', 'capCeiling']) { const v = val(`[data-a=${k}]`); if (v !== '') d[k] = +v; } d.currency = val('[data-a=currency]') || undefined;
    if (d.gemRate < 3) throw new Error('Gem rate must be at least 3 (security rules)'); const sp = val('[data-a=split]'); if (sp !== '') d.split = { build: +sp / 100, gems: 1 - sp / 100 };
    d.tiers = val('[data-a=tiers]').split('\n').map(l => l.trim().split(':').map(Number)).filter(a => a[0] > 0).map(([at, bonus]) => ({ at, bonus: bonus || 0 })); d.aurora = val('[data-a=aurora]').split(',').map(Number).filter(n => n > 0); }
  if (tab === 'goals') { d.goals = {}; BASE_GOALS.forEach(g => { const o = {}, en = q(`[data-g=${g.id}][data-f=en]`).checked, nm = val(`[data-g=${g.id}][data-f=name]`), lv = g.levels.map((_, i) => val(`[data-g=${g.id}][data-f=lv${i}]`));
    if (!en) o.enabled = false; if (nm) o.name = nm; if (lv.some(v => v !== '')) o.levels = lv.map(v => (v === '' ? 0 : +v)); if (Object.keys(o).length) d.goals[g.id] = o; }); }
  if (tab === 'calendar') { const dn = val('[data-c=dmin]'), dx = val('[data-c=dmax]'); d.calendar = { default: dn !== '' && dx !== '' ? [+dn, +dx] : null, days: {} };
    for (let n = 1; n <= 24; n++) { const a = val(`[data-c=m${n}]`), b = val(`[data-c=x${n}]`); if (a !== '' && b !== '') d.calendar.days[n] = [+a, +b]; } }
  if (tab === 'raw') draft = JSON.parse(val('#rawjson'));
}
async function publish() { await ctx.store.saveLive(draft); applyLive(draft); ctx.afterChange(); toast('✅ Published'); }
const redraw = () => { body().innerHTML = adminHtml(); };
export function adminChange(e) { if (e.target.dataset?.e === 'type') { readEv(); ev.type = e.target.value; ev.params = {}; redraw(); } }
const download = (name, text, type = 'text/csv') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };
export function adminAct(a, id) {
  const fn = { atab: () => { try { readEv(); collect(); } catch (e) { return toast('⚠ ' + e.message, true); } tab = id; redraw(); },
    asave: async () => { try { collect(); await publish(); redraw(); } catch (e) { toast('⚠ ' + e.message, true); } },
    ainfo: () => { readEv(); infoOpen = infoOpen === id ? null : id; redraw(); },
    atpl: () => { const t = TEMPLATES[+id]; ev = { type: t[1], icon: t[2], title: t[3], desc: t[4], start: Date.now(), end: Date.now() + t[6] * 36e5, params: t[5] }; infoOpen = null; redraw(); },
    adur: () => { readEv(); ev.end = ev.start + +id * 36e5; redraw(); },
    aadd: async () => { try { readEv(); if (!ev.title.trim()) return toast('Give the event a title', true); if (!(ev.end > ev.start)) return toast('The end must be after the start', true);
        const params = paramsOf(ev.type); if (ev.type === 'shop' && !(params.item.id && params.item.name && params.item.price > 0)) return toast('Shop item needs an id, a name and a price', true);
        (D().events ||= []).push({ id: 'e' + Date.now().toString(36), type: ev.type, icon: ev.icon, title: ev.title.trim(), desc: ev.desc, start: new Date(ev.start).toISOString(), end: new Date(ev.end).toISOString(), params });
        await publish(); ev = { ...ev, title: '', desc: '', params: {}, start: Date.now(), end: Date.now() + 864e5 }; redraw(); } catch (er) { toast('⚠ ' + er.message, true); } },
    adel: async () => { if (!confirm('Delete this event? (Items/badges from the event stop being listed. Better to let it simply end.)')) return; D().events.splice(+id, 1); await publish(); redraw(); },
    afreeze: () => { const v = Math.round(ctx.L.poolRaw() * C.split.build); if (confirm(`Freeze the Build bracket at ${v} ${C.currency}? This cannot be undone.`)) { ctx.store.lockBuild(v); toast('🔒 Build bracket frozen'); redraw(); } },
    aexport: async () => { try { const rows = await ctx.store.exportPayouts(), L = ctx.L, br = L.brackets(), tb = L.totalBuilt(), tg = ctx.store.state.cgems;   // shares use the community totals (same as the leaderboards)
        const csv = ['uid,name,wallet,donated_build,donated_gems,build_share_pct,gem_share_pct,reward_' + C.currency, ...rows.map(r => { const sb = tb ? r.donated / tb : 0, sg = tg ? r.gemDonated / tg : 0;
          return [r.id, `"${String(r.name).replace(/"/g, '""')}"`, r.wallet, r.donated, r.gemDonated, (sb * 100).toFixed(3), (sg * 100).toFixed(3), (sb * br.B + sg * br.G).toFixed(2)].join(','); })].join('\n'); download('payouts.csv', csv); toast(`⬇ ${rows.length} players exported`); } catch (e) { toast('⚠ ' + e.message, true); } } }[a];
  if (!fn) return false; fn(); return true;
}
