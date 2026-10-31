import { CONFIG as C } from './config.js';
import { createStore } from './store.js';
import { logic } from './logic.js';
import { updateRoom, setup } from './room.js';
import { GAMES, cooldownLeft } from './games.js';
import { allBadges } from './badges.js';
import { Radio } from './radio.js';
import { applyLive, events, left, nowMs } from './remote.js';
import { isAdmin } from './admin.js';
import { $, f, snow, toast } from './ui.js';
import { ctx } from './ctx.js';
import { open, refresh, bind, avatar } from './panels.js';
let store = createStore(); const S = () => store.state, L = logic(S); ctx.L = L; ctx.radio = new Radio();
const fail = e => { $('#err').hidden = false; $('#err').textContent = '⚠ ' + e.message; };
ctx.login = async () => { try { await store.login(); render(); loadBoards(); } catch (e) { fail(e); } };
let bt = 0; async function loadBoards() { if (Date.now() - bt < 20000) return; bt = Date.now(); try { ctx.boards.build = await store.board('build'); ctx.boards.gems = await store.board('gems'); } catch (e) { console.warn(e); } }

function checkBadges() {          // award permanent + limited badges (rank badges are live, never stored)
  if (!S().user) return; const day = L.today();
  for (const b of allBadges()) { if (b.kind === 'rank' || S().badges[b.id]) continue; if (b.window && !(day >= b.window[0] && day <= b.window[1])) continue; if (b.win && !(nowMs() >= b.win[0] && nowMs() < b.win[1])) continue;
    if (b.test(S(), day)) { store.award(b.id); toast(`🏅 New badge: ${b.icon} ${b.name}!`); } }
}
function render() {
  const u = S().user, n = L.next();
  $('#profile').innerHTML = u ? `${avatar(u)}${u.name}` : '💬 Login with Discord';
  $('#ptschip').hidden = !u; $('#ptschip').textContent = `❄ ${f(S().pts)}`;
  $('#gemchip').hidden = !(u && (S().gems || L.exchangeOpen())); $('#gemchip').textContent = `💎 ${f(S().gems)}`;
  $('#poolchip').textContent = `💰 ${f(L.brackets().P)} ${C.currency}`;
  updateRoom(L, S());
  $('#next').innerHTML = n ? `<img src="${n.levels[Math.max(1, L.lvl(n)) - 1].img}" alt=""><div class="nx"><b>Next: ${n.name}${L.max(n) > 1 ? ` (level ${L.lvl(n) + 1})` : ''}</b> <span class="muted">${f(L.val(n))} / ${f(L.nextT(n))} ❄</span><div class="bar"><i style="width:${Math.min(100, L.val(n) / L.nextT(n) * 100)}%"></i></div></div><button data-open="goals">🎁 Donate</button>`
    : '<div class="nx"><b>🎉 Building complete – the whole room is alive!</b> <span class="muted">Now exchange ❄ for 💎 and compete on the Gem leaderboard.</span></div><button data-open="shop">💎 Gems</button>';
  const done = C.goals.reduce((a, g) => a + L.lvl(g), 0), all = C.goals.reduce((a, g) => a + L.max(g), 0);
  $('#b-goals').textContent = `${done}/${all}`; $('#b-shop').textContent = L.exchangeOpen() ? '' : '🔒';
  $('#b-cal').textContent = u && Array.from({ length: L.today() }, (_, i) => i + 1).some(d => !S().doors.includes(d)) ? '!' : '';
  if (L.buildDone() && S().buildLocked == null) store.lockBuild(Math.round(L.poolRaw() * C.split.build));   // freeze the Build bracket
  $('#banner').innerHTML = events.active().map(e => `<button data-open="events" class="evchip">${e.icon || '🎉'} <b>${e.title}</b> · ends in <span data-until="${e.e}"></span></button>`).join('');
  $('[data-open=admin]').hidden = !isAdmin();
  checkBadges(); loadBoards(); refresh();
}
ctx.afterChange = render;
function tick() {
  const s = Math.max(0, (new Date(C.eventEnd) - Date.now()) / 1000 | 0), p = x => String(x).padStart(2, '0');
  $('#cd').textContent = s ? `🎅 ${s / 86400 | 0}d ${p(s % 86400 / 3600 | 0)}h ${p(s % 3600 / 60 | 0)}m ${p(s % 60)}s` : '🎄 Merry Christmas!';
  const uid = S().user?.id; let ready = 0;
  GAMES.forEach(g => { const c = uid ? cooldownLeft(g, uid) : 0; if (!c) ready++; const el = document.querySelector(`[data-cd=${g.id}]`);
    if (el) { el.textContent = c ? 'Ready in ' + c + 's' : '▶ Play now'; el.closest('button').disabled = !!c; } });
  $('#b-games').textContent = uid ? `${ready} ready` : '';
  document.querySelectorAll('[data-until]').forEach(el => el.textContent = left(+el.dataset.until - nowMs()));
}
document.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) open(b.dataset.open); });
$('#profile').onclick = () => (S().user ? open('profile') : ctx.login());
$('#radiochip').onclick = () => open('radio');
ctx.radio.onChange(() => { const r = ctx.radio; $('#radiochip').hidden = !r.on; $('#radiochip').textContent = `♪ ${r.song.name}`; refresh(); });
snow(); bind(); setup(L);
try { await store.init(); }
catch (e) { fail(new Error('Firebase failed (' + e.message + ') – running in demo mode.')); store = createStore(true); await store.init(); }
ctx.store = store; applyLive(await store.loadLive());
if (C.firebase) setInterval(async () => { applyLive(await store.loadLive()); render(); }, 300000);   // admin changes arrive within 5 min (1 read)
store.onChange(render); render(); tick(); setInterval(tick, 1000);
