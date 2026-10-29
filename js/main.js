import { CONFIG as C } from './config.js';
import { createStore } from './store.js';
import { logic } from './logic.js';
import { updateRoom } from './room.js';
import { GAMES, cooldownLeft } from './games.js';
import { $, f, snow, toast } from './ui.js';
import { ctx, open, refresh, bind } from './panels.js';
let store = createStore(); const S = () => store.state, L = logic(S); ctx.L = L;
const fail = e => { $('#err').hidden = false; $('#err').textContent = '⚠ ' + e.message; };
ctx.login = async () => { try { await store.login(); render(); } catch (e) { fail(e); } };

function render() {
  const u = S().user;
  $('#profile').innerHTML = u ? `<span class="av" style="background:${u.color || '#5865f2'}">${u.name[0].toUpperCase()}</span>${u.name}` : '💬 Login with Discord';
  $('#ptschip').hidden = !u; $('#ptschip').textContent = `❄ ${f(S().pts)}`; $('#poolchip').textContent = `💰 ${f(L.pool())} ${C.currency}`;
  updateRoom(L);
  const n = L.next();
  $('#next').innerHTML = n ? `<img src="${n.img}" alt=""><div style="flex:1;min-width:160px"><b>Next goal: ${n.name}</b> <span class="muted">${f(S().goals[n.id] || 0)} / ${f(n.target)}</span><div class="bar"><i style="width:${(S().goals[n.id] || 0) / n.target * 100}%"></i></div></div><button data-open="goals">🎁 Donate</button>`
    : '<b>🎉 Every goal is complete – the whole room is lit up! Rewards unlock at the end of the event.</b>';
  $('#b-goals').textContent = `${L.done()}/${C.goals.length}`;
  $('#b-cal').textContent = u && Array.from({ length: L.today() }, (_, i) => i + 1).some(d => !S().doors.includes(d)) ? '!' : '';
  refresh();
}
ctx.afterChange = render;
function tick() {
  const s = Math.max(0, (new Date(C.eventEnd) - Date.now()) / 1000 | 0), p = n => String(n).padStart(2, '0');
  $('#cd').textContent = s ? `🎅 ${s / 86400 | 0}d ${p(s % 86400 / 3600 | 0)}h ${p(s % 3600 / 60 | 0)}m ${p(s % 60)}s` : '🎄 Merry Christmas!';
  const uid = S().user?.id; let ready = 0;
  GAMES.forEach(g => { const c = uid ? cooldownLeft(g, uid) : 0; if (!c) ready++;
    const el = document.querySelector(`[data-cd=${g.id}]`); if (el) { el.textContent = c ? 'Ready in ' + c + 's' : '▶ Play now'; el.closest('button').disabled = !!c; } });
  $('#b-games').textContent = uid ? `${ready} ready` : '';
}
document.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) open(b.dataset.open); });
$('#profile').onclick = () => (S().user ? open('profile') : ctx.login());
snow(); bind();
try { await store.init(); }
catch (e) { fail(new Error('Firebase failed (' + e.message + ') – running in demo mode.')); store = createStore(true); await store.init(); }
ctx.store = store; store.onChange(render); render(); tick(); setInterval(tick, 1000);
