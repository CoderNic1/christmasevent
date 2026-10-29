import { CONFIG as C } from './config.js';
import { createStore } from './store.js';
import { GAMES, playGame, cooldownLeft } from './games.js';
const $ = s => document.querySelector(s), f = n => Math.floor(n).toLocaleString();
let store = createStore(), user = null, built = false; const prev = {};
const S = () => store.state, full = g => (S().goals[g.id] || 0) >= g.target;
const totalDonated = () => Object.values(S().goals).reduce((a, b) => a + b, 0);
const done = () => C.goals.filter(full).length;
const pool = () => C.basePool + C.tiers.filter(t => done() >= t.goals).reduce((a, t) => a + t.bonus, 0);
const need = () => user || ($('#login').click(), null);
// Always-visible starter décor (sleeping cat + candle) so the cold room is already alive.
const STARTERS = [{ img: 'assets/cat.svg', x: 30, y: 93, w: 10 }, { img: 'assets/candle.svg', x: 12, y: 95, w: 2.2 }];

function buildRoom() {
  $('#items').innerHTML = [...STARTERS, ...C.goals].map(g => `<img src="${g.img}" alt="${g.name || ''}" title="${g.name || ''}" data-id="${g.id || ''}" class="${g.cls || ''}" style="left:${g.x}%;top:${g.y}%;width:${g.w}%">`).join('');
  built = true;
}
function burst(el) {            // sparkles when a goal is completed
  const r = $('#room').getBoundingClientRect(), b = el.getBoundingClientRect();
  for (let i = 0; i < 16; i++) { const s = document.createElement('b'); s.className = 'spark'; s.textContent = '✨';
    s.style.left = b.left - r.left + b.width / 2 + 'px'; s.style.top = b.top - r.top + b.height / 2 + 'px';
    s.style.setProperty('--dx', Math.random() * 200 - 100 + 'px'); s.style.setProperty('--dy', -Math.random() * 160 + 'px');
    $('#room').append(s); setTimeout(() => s.remove(), 1200); }
}
function updateRoom() {
  if (!built) buildRoom();
  const first = !Object.keys(prev).length;
  C.goals.forEach(g => { const el = $(`#items [data-id="${g.id}"]`), ok = full(g);
    el.classList.toggle('locked', !ok);
    if (ok && prev[g.id] === false && !first) { el.classList.add('pop'); setTimeout(() => el.classList.remove('pop'), 1000); burst(el); }
    prev[g.id] = ok; });
  $('#room .glow').style.opacity = done() / C.goals.length * .8;
  $('#room').classList.toggle('party', done() === C.goals.length);
  $('#hint').style.opacity = done() < 2 ? 1 : 0;
}
function render() {
  user = S().user; $('#logout').hidden = !user; $('#login').disabled = !!user;
  $('#login').innerHTML = user ? `<span class="av" style="background:${user.color || '#5865f2'}">${user.name[0].toUpperCase()}</span>${user.name}` : 'Login with Discord';
  $('#pts').textContent = user ? `❄ ${f(S().pts)} pts · donated ${f(S().donated)}` : '';
  updateRoom();
  $('#pool').textContent = `${f(pool())} ${C.currency}`;
  $('#tiers').innerHTML = C.tiers.map(t => `<div class="tier ${done() >= t.goals ? 'on' : ''}">${done() >= t.goals ? '✅' : '🔒'} ${t.goals} goal${t.goals > 1 ? "s" : ""} → +${f(t.bonus)} ${C.currency}</div>`).join('');
  const share = totalDonated() ? S().donated / totalDonated() : 0;
  $('#share').textContent = `Your share: ${(share * 100).toFixed(2)}% ≈ ${(share * pool()).toFixed(2)} ${C.currency} (changes as the pool and donations change)`;
  if (document.activeElement !== $('#wallet')) $('#wallet').value = S().wallet || '';
  $('#goals').innerHTML = C.goals.map(g => { const v = Math.min(S().goals[g.id] || 0, g.target), d = full(g) ? 'disabled' : '';
    return `<div class="row"><img src="${g.img}" height="26" alt=""> <b>${g.name}</b> <span class="muted">${f(v)}/${f(g.target)}</span><div class="bar"><i style="width:${v / g.target * 100}%"></i></div>
    <button data-g="${g.id}" data-n="10" ${d}>Donate 10</button> <button data-g="${g.id}" data-n="100" ${d}>Donate 100</button> <button data-g="${g.id}" data-n="999999" ${d}>All</button></div>`; }).join('');
  $('#cal').innerHTML = Array.from({ length: 24 }, (_, i) => i + 1).map(d => { const o = S().doors.includes(d);
    return `<button data-d="${d}" class="${o ? 'open' : ''}" ${d > today() || o ? 'disabled' : ''}>${o ? '🎁' : d}</button>`; }).join('');
  if (!$('#games').children.length) $('#games').innerHTML = GAMES.map(g => `<div class="row"><img src="${g.img}" height="28" alt=""> <b>${g.name}</b> <span class="muted">${g.secs}s round</span> <button data-play="${g.id}"></button></div>`).join('');
}
function today() {
  const q = new URLSearchParams(location.search).get('day'); if (q) return +q;      // ?day=12 to test
  const n = new Date(); return n < new Date(C.eventStart) ? 0 : n >= new Date(C.eventEnd) ? 24 : n.getDate();
}
function tick() {
  const s = Math.max(0, (new Date(C.eventEnd) - Date.now()) / 1000 | 0), p = n => String(n).padStart(2, '0');
  if (!s) $('#cd').textContent = '🎄 Merry Christmas!'; else $('#cd').textContent = `🎅 ${s / 86400 | 0}d ${p(s % 86400 / 3600 | 0)}h ${p(s % 3600 / 60 | 0)}m ${p(s % 60)}s`;
  document.querySelectorAll('[data-play]').forEach(b => { const g = GAMES.find(x => x.id === b.dataset.play), c = cooldownLeft(g);
    b.disabled = c > 0 || $('#arena').dataset.live === '1'; b.textContent = c > 0 ? `Ready in ${c}s` : 'Play'; });
}
async function board() { const b = await store.board(); $('#board').innerHTML = b.map(([n, v]) => `<li>${n} — ${f(v)} donated</li>`).join(''); }

document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.g) { if (!need()) return; const g = C.goals.find(x => x.id === t.dataset.g);
    store.donate(g.id, Math.min(+t.dataset.n, g.target - (S().goals[g.id] || 0))); board(); }
  if (t.dataset.d && need()) store.openDoor(+t.dataset.d, 5 + +t.dataset.d);
  if (t.dataset.play && need()) { const g = GAMES.find(x => x.id === t.dataset.play), a = $('#arena'); a.dataset.live = '1';
    playGame(g, a, p => { a.dataset.live = '0'; store.addPoints(p); }); }
});
const fail = e => { $('#err').hidden = false; $('#err').textContent = '⚠ ' + e.message; };
$('#login').onclick = async () => { try { await store.login(); render(); board(); } catch (e) { fail(e); } };
$('#logout').onclick = () => { store.logout(); render(); board(); };
$('#saveW').onclick = () => { const a = $('#wallet').value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) return $('#wmsg').textContent = ' ❌ Invalid EVM address';
  if (!need()) return; store.setWallet(a); $('#wmsg').textContent = ' ✅ Saved'; };

try { user = await store.init(); }
catch (e) { document.getElementById('err').hidden = false; document.getElementById('err').textContent = '⚠ Firebase failed (' + e.message + ') – running in demo mode.'; store = createStore(true); user = await store.init(); }
store.onChange(render); render(); board(); tick(); setInterval(tick, 1000);
