import { CONFIG as C } from './config.js';
import { createStore } from './store.js';
import { GAMES, playGame, cooldownLeft } from './games.js';
const $ = s => document.querySelector(s), f = n => Math.floor(n).toLocaleString();
const store = createStore(), S = () => store.state; let user = null;
const full = g => (S().goals[g.id] || 0) >= g.target;
const totalDonated = () => Object.values(S().goals).reduce((a, b) => a + b, 0);
const done = () => C.goals.filter(full).length;
const pool = () => C.basePool + C.tiers.filter(t => done() >= t.goals).reduce((a, t) => a + t.bonus, 0);
const need = () => user || (store.login(), null);

function render() {
  user = S().user; $('#login').textContent = user ? '👤 ' + user.name : 'Login with Discord'; $('#login').disabled = !!user;
  $('#pts').textContent = user ? `❄ ${f(S().pts)} pts · donated ${f(S().donated)}` : '';
  $('#items').innerHTML = C.goals.map(g => `<span class="${full(g) ? '' : 'locked'}" style="left:${g.x}%;top:${g.y}%;font-size:${g.size}px" title="${g.name}">${g.emoji}</span>`).join('');
  $('#pool').textContent = `${f(pool())} ${C.currency}`;
  $('#tiers').innerHTML = C.tiers.map(t => `<div class="tier ${done() >= t.goals ? 'on' : ''}">${done() >= t.goals ? '✅' : '🔒'} ${t.goals} goals → +${f(t.bonus)} ${C.currency}</div>`).join('');
  const share = totalDonated() ? S().donated / totalDonated() : 0;
  $('#share').textContent = `Your share: ${(share * 100).toFixed(2)}% ≈ ${(share * pool()).toFixed(2)} ${C.currency} (grows with the pool, shrinks as others donate)`;
  if (document.activeElement !== $('#wallet')) $('#wallet').value = S().wallet || '';
  $('#goals').innerHTML = C.goals.map(g => { const v = Math.min(S().goals[g.id] || 0, g.target);
    return `<div class="row">${g.emoji} <b>${g.name}</b> <span class="muted">${f(v)}/${f(g.target)}</span><div class="bar"><i style="width:${v / g.target * 100}%"></i></div>
    <button data-g="${g.id}" data-n="10" ${full(g) ? 'disabled' : ''}>Donate 10</button> <button data-g="${g.id}" data-n="100" ${full(g) ? 'disabled' : ''}>Donate 100</button></div>`; }).join('');
  renderCal(); renderGames();
}
function renderGames() {
  $('#games').innerHTML = GAMES.map(g => `<div class="row">${g.emoji} <b>${g.name}</b> <span class="muted">${g.secs}s round</span> <button data-play="${g.id}"></button></div>`).join('');
}
function today() {
  const q = new URLSearchParams(location.search).get('day'); if (q) return +q;      // ?day=12 to test
  const n = new Date(); return n < new Date(C.eventStart) ? 0 : n >= new Date(C.eventEnd) ? 24 : n.getDate();
}
function renderCal() {
  $('#cal').innerHTML = Array.from({ length: 24 }, (_, i) => i + 1).map(d => { const o = S().doors.includes(d);
    return `<button data-d="${d}" class="${o ? 'open' : ''}" ${d > today() || o ? 'disabled' : ''}>${o ? '🎁' : d}</button>`; }).join('');
}
function tick() {
  const ms = new Date(C.eventEnd) - Date.now(), s = Math.max(0, ms / 1000 | 0);
  $('#cd').textContent = `🎅 ${s / 86400 | 0}d ${String(s % 86400 / 3600 | 0).padStart(2, '0')}h ${String(s % 3600 / 60 | 0).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`;
  document.querySelectorAll('[data-play]').forEach(b => { const g = GAMES.find(x => x.id === b.dataset.play), c = cooldownLeft(g);
    b.disabled = c > 0 || !$('#arena').hidden && $('#arena').dataset.live === '1'; b.textContent = c > 0 ? `Ready in ${c}s` : 'Play'; });
}
async function board() { const b = await store.board(); $('#board').innerHTML = b.map(([n, v]) => `<li>${n} — ${f(v)} donated</li>`).join(''); }

document.addEventListener('click', e => {
  const t = e.target;
  if (t.dataset.g) { if (!need()) return; store.donate(t.dataset.g, Math.min(+t.dataset.n, C.goals.find(g => g.id === t.dataset.g).target - (S().goals[t.dataset.g] || 0))); board(); }
  if (t.dataset.d && need()) store.openDoor(+t.dataset.d, 5 + +t.dataset.d);
  if (t.dataset.play && need()) { const g = GAMES.find(x => x.id === t.dataset.play), a = $('#arena'); a.dataset.live = '1';
    playGame(g, a, p => { a.dataset.live = '0'; store.addPoints(p); }); }
});
$('#login').onclick = async () => { await store.login(); render(); board(); };
$('#saveW').onclick = () => { const a = $('#wallet').value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) return $('#wmsg').textContent = ' ❌ Invalid EVM address';
  if (!need()) return; store.setWallet(a); $('#wmsg').textContent = ' ✅ Saved'; };

store.onChange(render);
user = await store.init(); render(); board(); tick(); setInterval(tick, 1000);
