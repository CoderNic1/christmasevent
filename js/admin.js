// In-app ADMIN CONSOLE. Edits the remote config doc (Firebase: config/live; demo: localStorage). No code changes needed to tune the game.
import { CONFIG as C } from './config.js';
import { BASE_GOALS, live, applyLive, events, nowMs } from './remote.js';
import { $, toast, body } from './ui.js';
import { ctx } from './ctx.js';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
let draft = null, tab = 'events'; const D = () => draft ||= JSON.parse(JSON.stringify(live || {}));
export const isAdmin = () => (C.firebase ? C.admins.includes(ctx.store.state.user?.id) : new URLSearchParams(location.search).has('admin'));
export const adminOpen = () => { draft = null; };
const TPL = { banner: '{}', xpoints: '{"mult":2,"games":["gift","tap"]}', gemrate: '{"rate":6}', calbonus: '{"bonus":10}', badge: '{"metric":"donated","min":100}',
  shop: '{"item":{"id":"crown","name":"Snowflake Crown","icon":"👑","price":30,"type":"own","title":"👑 Snow King","desc":"Event exclusive!"}}' };
const HELP = { banner: 'Announcement only.', xpoints: 'Game points × mult (games optional: gift,tap,memory,lights,pop).', gemrate: 'Cheaper ❄→💎 exchange: rate = ❄ per 💎.', calbonus: 'Extra ❄ on every advent door opened.',
  badge: 'Temporary badge: metric donated|plays|doors|gemdonated|earned, min value.', shop: 'Exclusive shop item (kept forever by buyers). type own|use, optional title.' };
const iso = ms => new Date(ms - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

function general() { const c = draft; return `<div class="card2"><h3>Pool & economy</h3><div class="form">
  <label>Base pool<input type="number" data-a="basePool" value="${esc(c.basePool ?? C.basePool)}"></label><label>Currency<input data-a="currency" value="${esc(c.currency ?? C.currency)}"></label>
  <label>❄ per 💎<input type="number" data-a="gemRate" value="${esc(c.gemRate ?? C.gemRate)}"></label><label>Build share %<input type="number" data-a="split" value="${Math.round((c.split?.build ?? C.split.build) * 100)}"></label></div>
  <label class="blk">Prize tiers (one per line: <code>pointsDonated:bonus</code>)<textarea data-a="tiers" rows="5">${(c.tiers || C.tiers).map(t => `${t.at}:${t.bonus}`).join('\n')}</textarea></label>
  <label class="blk">Northern-lights levels (💎 totals, comma separated)<input data-a="aurora" value="${(c.aurora || C.aurora).join(',')}"></label></div>`; }
function goals() { return `<p class="muted">Cumulative ❄ target per level. Empty = default. Untick to hide a goal.</p>` + BASE_GOALS.map(g => { const o = draft.goals?.[g.id] || {};
  return `<div class="card2"><label><input type="checkbox" data-g="${g.id}" data-f="en" ${o.enabled === false ? '' : 'checked'}> <b>${esc(g.name)}</b></label> <input data-g="${g.id}" data-f="name" placeholder="rename" value="${esc(o.name || '')}">
  <div class="form">${g.levels.map((l, i) => `<label>Level ${i + 1} (default ${l.t})<input type="number" data-g="${g.id}" data-f="lv${i}" value="${esc(o.levels?.[i] ?? '')}"></label>`).join('')}</div></div>`; }).join(''); }
function calendar() { const c = draft.calendar || {}, d = c.default || ['', '']; return `<p class="muted">Random ❄ reward range per advent door. Empty = built-in default (5+day, bigger every 6th door).</p>
  <div class="card2"><b>Default for every day</b><div class="form"><label>Min<input type="number" data-c="dmin" value="${esc(d[0])}"></label><label>Max<input type="number" data-c="dmax" value="${esc(d[1])}"></label></div></div><div class="card2"><b>Per day override</b><div class="calgrid">` +
  Array.from({ length: 24 }, (_, i) => i + 1).map(n => { const r = c.days?.[n] || ['', '']; return `<div><small>Dec ${n}</small><input type="number" placeholder="min" data-c="m${n}" value="${esc(r[0])}"><input type="number" placeholder="max" data-c="x${n}" value="${esc(r[1])}"></div>`; }).join('') + '</div></div>'; }
function evs() { const list = draft.events || [], now = nowMs(); return `<div class="card2"><h3>Timed events</h3>` + (list.length ? list.map((e, i) => { const s = Date.parse(e.start), z = Date.parse(e.end), st = now < s ? '🗓 upcoming' : now < z ? '🟢 live' : '⚪ ended';
    return `<div class="evrow"><span>${e.icon || '🎉'} <b>${esc(e.title)}</b> <small>${e.type} · ${new Date(s).toLocaleString()} → ${new Date(z).toLocaleString()} · ${st}</small></span><button class="danger" data-act="adel" data-id="${i}">✕</button></div>`; }).join('') : '<p class="muted">No events yet.</p>') + `</div>
  <div class="card2"><h3>➕ Push a new event</h3><div class="form"><label>Type<select data-e="type">${Object.keys(TPL).map(t => `<option>${t}</option>`).join('')}</select></label><label>Icon<input data-e="icon" value="🎉" maxlength="4"></label>
  <label>Start<input type="datetime-local" data-e="start" value="${iso(Date.now())}"></label><label>End<input type="datetime-local" data-e="end" value="${iso(Date.now() + 864e5)}"></label></div>
  <label class="blk">Title<input data-e="title" placeholder="Double Snowflake Weekend"></label><label class="blk">Description<input data-e="desc" placeholder="Shown to players"></label>
  <label class="blk">Parameters (JSON) <small id="ehelp" class="muted">${HELP.banner}</small><textarea data-e="params" rows="4">${TPL.banner}</textarea></label><button data-act="aadd">Publish event</button></div>`; }
const raw = () => `<p class="muted">Advanced: the whole live config. Tip: you can paste this into Firestore doc <code>config/live</code>.</p><textarea id="rawjson" rows="16" class="mono">${esc(JSON.stringify(draft, null, 2))}</textarea>`;
export function adminHtml() {
  D(); const T = { events: ['🎉 Events', evs], calendar: ['📅 Calendar', calendar], goals: ['🎁 Goals', goals], general: ['💰 Economy', general], raw: ['{ } JSON', raw] };
  return `<div class="tabs wrap">${Object.entries(T).map(([k, v]) => `<button class="${k === tab ? '' : 'ghost'}" data-act="atab" data-id="${k}">${v[0]}</button>`).join('')}</div>` + T[tab][1]() +
    (tab === 'events' ? '' : `<div class="acts"><button data-act="asave">💾 Save & publish</button></div>`) + `<p class="muted">Changes go live for everyone within ~5 minutes (clients re-read the config doc every 5 min).</p>`;
}
const val = s => $(s)?.value;
function collect() {                       // read the current tab's inputs into the draft
  const d = D(), q = s => document.querySelector(s);
  if (tab === 'general') { for (const k of ['basePool', 'gemRate']) { const v = val(`[data-a=${k}]`); if (v !== '') d[k] = +v; } d.currency = val('[data-a=currency]') || undefined;
    const sp = val('[data-a=split]'); if (sp !== '') d.split = { build: +sp / 100, gems: 1 - sp / 100 };
    d.tiers = val('[data-a=tiers]').split('\n').map(l => l.trim().split(':').map(Number)).filter(a => a[0] > 0).map(([at, bonus]) => ({ at, bonus: bonus || 0 }));
    d.aurora = val('[data-a=aurora]').split(',').map(Number).filter(n => n > 0); }
  if (tab === 'goals') { d.goals = {}; BASE_GOALS.forEach(g => { const o = {}, en = q(`[data-g=${g.id}][data-f=en]`).checked, nm = val(`[data-g=${g.id}][data-f=name]`), lv = g.levels.map((_, i) => val(`[data-g=${g.id}][data-f=lv${i}]`));
    if (!en) o.enabled = false; if (nm) o.name = nm; if (lv.some(v => v !== '')) o.levels = lv.map(v => (v === '' ? 0 : +v)); if (Object.keys(o).length) d.goals[g.id] = o; }); }
  if (tab === 'calendar') { const dn = val('[data-c=dmin]'), dx = val('[data-c=dmax]'); d.calendar = { default: dn !== '' && dx !== '' ? [+dn, +dx] : null, days: {} };
    for (let n = 1; n <= 24; n++) { const a = val(`[data-c=m${n}]`), b = val(`[data-c=x${n}]`); if (a !== '' && b !== '') d.calendar.days[n] = [+a, +b]; } }
  if (tab === 'raw') draft = JSON.parse(val('#rawjson'));
}
async function publish() { await ctx.store.saveLive(draft); applyLive(draft); ctx.afterChange(); toast('✅ Published'); }
export function adminChange(e) { if (e.target.dataset?.e === 'type') { $('[data-e=params]').value = TPL[e.target.value]; $('#ehelp').textContent = HELP[e.target.value]; } }
export function adminAct(a, id) {
  const fn = { atab: () => { try { collect(); } catch (e) { return toast('Invalid JSON: ' + e.message, true); } tab = id; body().innerHTML = adminHtml(); },
    asave: async () => { try { collect(); await publish(); body().innerHTML = adminHtml(); } catch (e) { toast('⚠ ' + e.message, true); } },
    aadd: async () => { try { const t = val('[data-e=title]'); if (!t) return toast('Give the event a title', true); const e = { id: 'e' + Date.now().toString(36), type: val('[data-e=type]'), icon: val('[data-e=icon]'), title: t, desc: val('[data-e=desc]'),
        start: new Date(val('[data-e=start]')).toISOString(), end: new Date(val('[data-e=end]')).toISOString(), params: JSON.parse(val('[data-e=params]') || '{}') };
        if (!(Date.parse(e.end) > Date.parse(e.start))) return toast('End must be after start', true); (D().events ||= []).push(e); await publish(); body().innerHTML = adminHtml(); } catch (er) { toast('⚠ ' + er.message, true); } },
    adel: async () => { if (!confirm('Delete this event? (Buyers of event items keep them only while the event stays in the list.)')) return; D().events.splice(+id, 1); await publish(); body().innerHTML = adminHtml(); } }[a];
  if (!fn) return false; fn(); return true;
}
