// All overlay panels (games, goals, advent, leaderboard, prize, profile) + their click actions.
import { CONFIG as C } from './config.js';
import { reward } from './logic.js';
import { $, f, toast, openPanel, closePanel, body, current, setGuard } from './ui.js';
import { GAMES, startGame, cooldownLeft } from './games.js';
export const ctx = { store: null, L: null, login: null, afterChange: null };   // set by main.js
const S = () => ctx.store.state, short = a => a ? a.slice(0, 6) + '…' + a.slice(-4) : '—';
let cancel = null;

export function open(id) {
  if (id === 'profile' && !S().user) return ctx.login();
  const m = { games: ['🎮 Mini-games', gamesHtml], goals: ['🎁 Community goals', goalsHtml], cal: ['📅 Advent calendar', calHtml], board: ['🏆 Leaderboard', () => '<p class="muted">Loading…</p>'], prize: ['💰 Prize pool & wallet', prizeHtml], profile: ['👤 Your profile', profileHtml] }[id];
  openPanel(id, m[0], m[1]()); if (id === 'board') boardFill();
}
export function refresh() {           // re-render the open list panel (not while typing or in a game)
  const id = current(); if (!id || cancel || document.activeElement?.matches('input')) return;
  if (['goals', 'prize', 'cal', 'profile', 'games'].includes(id)) { const m = { games: gamesHtml, goals: goalsHtml, cal: calHtml, prize: prizeHtml, profile: profileHtml }; body().innerHTML = m[id](); }
}
const strip = () => `<div class="strip"><span>❄ Your points: <b>${f(S().pts)}</b></span><span>Donated so far: <b>${f(S().donated)}</b></span></div>`;

function gamesHtml() {
  const uid = S().user?.id;
  return strip() + `<div class="grid">` + GAMES.map(g => { const cd = uid ? cooldownLeft(g, uid) : 0, best = S().stats?.best?.[g.id];
    return `<button class="gcard" data-act="play" data-id="${g.id}" ${cd ? 'disabled' : ''}><img src="${g.img}" alt=""><b>${g.name}</b><small>${g.desc}</small><small>⏱ ${g.secs}s · max ${g.max} ❄${best ? ' · best ' + best : ''}</small>
    <small class="cd" data-cd="${g.id}">${cd ? 'Ready in ' + cd + 's' : '▶ Play now'}</small></button>`; }).join('') + `</div>`;
}
function play(id) {
  if (!S().user) return ctx.login(); const g = GAMES.find(x => x.id === id);
  openPanel('game', `${g.name}`, '<div id="stage"></div>');
  const exit = () => { cancel = null; setGuard(null); open('games'); };
  setGuard(() => { if (!cancel) return true; if (!confirm('Quit this round? You will not get points.')) return false; cancel(); cancel = null; return true; });
  cancel = startGame(g, $('#stage'), S().user.id, (pts, score) => {
    cancel = null; setGuard(null); ctx.store.recordPlay(g.id, score, pts); ctx.afterChange();
    $('#stage').innerHTML = `<div class="result"><h3>${pts ? 'Ho ho ho! 🎅' : 'Oh no…'}</h3><div class="pts">+${pts} ❄</div><p class="muted">Score ${score} · points added to your balance. Donate them to a goal!</p>
    <div class="acts" style="justify-content:center"><button data-act="back">🎮 More games</button><button class="ghost" data-act="tog">🎁 Donate points</button></div></div>`;
  });
  $('#stage').addEventListener('click', e => { if (e.target.closest('[data-act=quit]')) { if (closePanel()) open('games'); } });
}

function goalsHtml() {
  return strip() + C.goals.map(g => { const v = Math.min(S().goals[g.id] || 0, g.target), rem = g.target - v, ok = rem <= 0, max = Math.min(S().pts, rem);
    return `<div class="gl ${ok ? 'ok' : ''}"><img src="${g.img}" alt=""><div class="gi"><b>${g.name}</b> <span class="muted">${f(v)} / ${f(g.target)}</span><div class="bar"><i style="width:${v / g.target * 100}%"></i></div>
    ${ok ? '<span class="tag">✅ Unlocked – it is now in the room!</span>' : `<div class="don"><input type="number" min="1" max="${max}" placeholder="amount" data-amt="${g.id}"><button data-act="donate" data-id="${g.id}">Donate</button><button class="ghost" data-act="max" data-id="${g.id}">All (${f(max)})</button></div>`}</div></div>`; }).join('');
}
function donate(id, all) {
  if (!S().user) return ctx.login(); const g = C.goals.find(x => x.id === id), rem = g.target - (S().goals[id] || 0);
  let n = all ? Math.min(S().pts, rem) : Math.floor(+$(`[data-amt=${id}]`).value);
  if (!(n > 0)) return toast(all ? 'You have no points to donate – play some games!' : 'Enter an amount first', true);
  if (n > S().pts) return toast(`You only have ${f(S().pts)} points`, true);
  n = Math.min(n, rem); ctx.store.donate(id, n); toast(`🎁 Donated ${f(n)} ❄ to ${g.name}!`); ctx.afterChange(); refresh();
}

function calHtml() {
  const t = ctx.L.today();
  return `<p class="muted">A new door opens every day in December – each one holds points for you!</p><div class="cal">` + Array.from({ length: 24 }, (_, i) => i + 1).map(n => { const o = S().doors.includes(n), av = n <= t;
    return `<button class="door ${o ? 'open' : av ? 'today' : 'lock'}" data-act="door" data-id="${n}" ${!av || o ? 'disabled' : ''}>${o ? '🎁' : av ? n : '🔒'}<small>${o ? '+' + reward(n) + ' ❄' : 'Dec ' + n}</small></button>`; }).join('') + '</div>';
}
function door(n) { if (!S().user) return ctx.login(); ctx.store.openDoor(n, reward(n)); toast(`🎄 Door ${n}: +${reward(n)} ❄ points!`); ctx.afterChange(); refresh(); }

async function boardFill() {
  const b = await ctx.store.board(), me = S().user?.name; if (current() !== 'board') return;
  body().innerHTML = `<p class="muted">Ranked by points donated to the community goals.</p><ol class="lb">` + b.map(([n, v], i) => `<li class="${n === me ? 'me' : ''}"><span class="m">${['🥇', '🥈', '🥉'][i] || i + 1}</span><span class="n">${n}</span><b>${f(v)} ❄</b></li>`).join('') + '</ol>';
}

function prizeHtml() {
  const L = ctx.L, share = L.share();
  return `<p class="pool">${f(L.pool())} ${C.currency}</p><p class="muted" style="text-align:center">Total prize pool · grows as the community completes goals</p><div class="tiers">` +
    [{ goals: 0, bonus: C.basePool, base: 1 }, ...C.tiers].map(t => { const on = t.base || L.done() >= t.goals;
      return `<div class="tier ${on ? 'on' : ''}"><span>${on ? '✅' : '🔒'}</span><b>${t.base ? 'Base pool' : t.goals + ' goal' + (t.goals > 1 ? 's' : '') + ' reached'}</b>${t.base ? '<span style="flex:1"></span>' : `<div class="bar"><i style="width:${Math.min(100, L.done() / t.goals * 100)}%"></i></div>`}<b>${t.base ? '' : '+'}${f(t.bonus)} ${C.currency}</b></div>`; }).join('') +
    `</div><div class="strip"><span>Your share: <b>${(share * 100).toFixed(2)}%</b> ≈ <b>${(share * L.pool()).toFixed(2)} ${C.currency}</b></span><span class="muted">Payout is proportional to donated points</span></div>
    <h3>Payout wallet (EVM address)</h3><div class="don"><input id="wallet" style="flex:1;min-width:220px" placeholder="0x…" value="${S().wallet || ''}"><button data-act="wallet">Save wallet</button></div><p class="muted">Use an address you control (Ethereum, Polygon, Base, BNB… all EVM). Never share your seed phrase.</p>`;
}
function saveWallet() { const a = $('#wallet').value.trim(); if (!S().user) return ctx.login();
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) return toast('❌ That is not a valid EVM address (0x + 40 hex characters)', true); ctx.store.setWallet(a); toast('✅ Wallet saved'); }

function profileHtml() {
  const u = S().user, st = S().stats || { plays: {}, best: {}, earned: 0 }, plays = Object.values(st.plays).reduce((a, b) => a + b, 0);
  return `<div class="pf"><span class="av lg" style="background:${u.color || '#5865f2'}">${u.name[0].toUpperCase()}</span><div><h3 style="margin:0;font-size:1.6rem">${u.name}</h3><span class="muted">Discord account · ${short(u.id)}</span></div></div>
  <div class="stats"><div class="stat"><b>${f(S().pts)}</b>Points to spend</div><div class="stat"><b>${f(S().donated)}</b>Donated</div><div class="stat"><b>${(ctx.L.share() * 100).toFixed(2)}%</b>Prize share</div>
  <div class="stat"><b>${f(st.earned)}</b>Earned in games</div><div class="stat"><b>${plays}</b>Rounds played</div><div class="stat"><b>${S().doors.length}/24</b>Doors opened</div></div>
  <h3>Best scores</h3><div class="stats">` + GAMES.map(g => `<div class="stat"><img src="${g.img}" height="34" alt=""><br>${g.name}<b>${st.best[g.id] || '–'}</b></div>`).join('') + `</div>
  <p class="muted">Wallet: ${S().wallet ? short(S().wallet) : 'not set yet (Prize & Wallet)'}</p>
  <div class="acts"><button class="ghost" data-act="logout">🚪 Log out</button><button class="danger" data-act="delete">🗑 Delete account</button></div>`;
}

export function bind() {
  $('#layer').addEventListener('click', e => {
    if (e.target.id === 'layer') return closePanel();
    const b = e.target.closest('[data-act]'); if (!b) return; const id = b.dataset.id;
    ({ close: () => closePanel(), play: () => play(id), back: () => open('games'), tog: () => open('goals'), donate: () => donate(id), max: () => donate(id, true), door: () => door(+id), wallet: saveWallet,
      logout: () => { if (closePanel()) { ctx.store.logout(); ctx.afterChange(); toast('Logged out – see you soon! 🎅'); } },
      delete: () => { if (confirm('Delete your account and its data? This cannot be undone.\n(Points you already donated stay in the community goals.)')) { closePanel(); Promise.resolve(ctx.store.deleteAccount()).then(() => { ctx.afterChange(); toast('Account deleted'); }); } } })[b.dataset.act]?.();
  });
}
