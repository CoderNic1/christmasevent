// All overlay panels (games, goals, advent, leaderboards, prize, gems & shop, badges, profile, radio) + their click actions.
import { CONFIG as C } from './config.js';
import { reward, range } from './logic.js';
import { events, shopItems, doorBonus, xmult, titleOf, gemRate, left, nowMs } from './remote.js';
import { adminHtml, adminAct, adminChange, adminOpen } from './admin.js';
import { makeCard } from './share.js';
import { $, f, toast, openPanel, closePanel, body, current, setGuard } from './ui.js';
import { GAMES, startGame, cooldownLeft, resetCooldowns } from './games.js';
import { BADGES, allBadges, rankOf, holds } from './badges.js';
import { SONGS } from './radio.js';
import { ctx } from './ctx.js';
const S = () => ctx.store.state, short = a => a ? a.slice(0, 6) + '…' + a.slice(-4) : '—', cur = C.currency, L = () => ctx.L;
let cancel = null, boardTab = 'build';
const avatar = (u, big) => `<span class="av ${big ? 'lg' : ''} ${S().inv.frame ? 'gold' : ''}" style="background:${u.color || '#5865f2'}">${u.name[0].toUpperCase()}</span>`;
export { avatar };

const PANELS = {
  games: ['🎮 Mini-games', () => gamesHtml()], goals: ['🎁 Community goals', () => goalsHtml()], cal: ['📅 Advent calendar', () => calHtml()],
  board: ['🏆 Leaderboards', () => '<p class="muted">Loading…</p>'], prize: ['💰 Prize pool & wallet', () => prizeHtml()], shop: ['💎 Gems & Shop', () => shopHtml()],
  events: ['🎉 Events', () => eventsHtml()], admin: ['🛠 Admin console', () => adminHtml()], share: ['📤 Share your stats', () => '<p class="muted">Drawing your picture…</p>'],
  badges: ['🏅 Badges', () => badgesHtml()], profile: ['👤 Your profile', () => profileHtml()], radio: ['📻 Christmas Radio', () => radioHtml()],
};
export function open(id) {
  if ((id === 'profile' || id === 'share') && !S().user) return ctx.login(); if (id === 'admin') adminOpen();
  openPanel(id, PANELS[id][0], PANELS[id][1]()); if (id === 'board') boardFill(); if (id === 'share') shareFill();
}
export function refresh() {           // re-render the open panel (never while typing or inside a game)
  const id = current(); if (!id || cancel || id === 'board' || id === 'game' || document.activeElement?.matches('input')) return;
  if (PANELS[id]) body().innerHTML = PANELS[id][1]();
}
const strip = () => `<div class="strip"><span>❄ Points: <b>${f(S().pts)}</b></span><span>💎 Gems: <b>${f(S().gems)}</b></span><span>Donated: <b>${f(S().donated)}</b></span></div>`;

// ---------- games ----------
function gamesHtml() {
  const uid = S().user?.id, x2 = S().inv.x2;
  return strip() + (x2 > 0 ? `<p class="muted">✨ Double Snowflakes active for your next ${x2} round${x2 > 1 ? 's' : ''}!</p>` : '') + `<div class="grid">` + GAMES.map(g => { const cd = uid ? cooldownLeft(g, uid) : 0, best = S().stats.best[g.id];
    return `<button class="gcard" data-act="play" data-id="${g.id}" ${cd ? 'disabled' : ''}><img src="${g.img}" alt=""><b>${g.name}</b><small>${g.desc}</small><small>⏱ ${g.secs}s · max ${g.max} ❄${best ? ' · best ' + best : ''}</small>
    <small class="cd" data-cd="${g.id}">${cd ? 'Ready in ' + cd + 's' : '▶ Play now'}</small></button>`; }).join('') + `</div>`;
}
function play(id) {
  if (!S().user) return ctx.login(); const g = GAMES.find(x => x.id === id);
  openPanel('game', g.name, '<div id="stage"></div>');
  setGuard(() => { if (!cancel) return true; if (!confirm('Quit this round? You will not get points.')) return false; cancel(); cancel = null; return true; });
  cancel = startGame(g, $('#stage'), S().user.id, (pts, score, extra) => {
    cancel = null; setGuard(null); const em = xmult(g.id), dbl = S().inv.x2 > 0 && pts > 0; pts = Math.floor(pts * em); if (dbl) { pts *= 2; ctx.store.spend('x2'); }
    if (g.id === 'memory' && extra?.won && extra.left >= 20) ctx.store.count('memwin20');
    ctx.store.recordPlay(g.id, score, pts); ctx.afterChange();
    $('#stage').innerHTML = `<div class="result"><h3>${pts ? 'Ho ho ho! 🎅' : 'Oh no…'}</h3><div class="pts">+${pts} ❄</div><p class="muted">Score ${score}${dbl ? ' · ✨ doubled!' : ''}${em > 1 ? ' · 🎉 event ×' + em : ''}. Donate your points to a goal!</p>
    <div class="acts" style="justify-content:center"><button data-act="back">🎮 More games</button><button class="ghost" data-act="tog">🎁 Donate points</button></div></div>`;
  });
  $('#stage').addEventListener('click', e => { if (e.target.closest('[data-act=quit]') && closePanel()) open('games'); });
}

// ---------- goals ----------
function goalsHtml() {
  const l = L();
  return strip() + C.goals.map(g => { const lv = l.lvl(g), mx = l.max(g), v = l.val(g), ok = l.full(g), gated = l.gated(g), rem = l.total(g) - v, max = Math.min(S().pts, rem);
    const base = lv ? g.levels[lv - 1].t : 0, nx = g.levels[Math.min(lv, mx - 1)], pct = ok ? 100 : (v - base) / (nx.t - base) * 100, art = g.levels[Math.max(1, lv) - 1].img;
    return `<div class="gl ${ok ? 'ok' : ''} ${gated ? 'gated' : ''}"><img src="${art}" alt="" class="${lv ? '' : 'dim'}"><div class="gi"><b>${g.name}</b> <span class="lvl">${'★'.repeat(lv)}${'☆'.repeat(mx - lv)}</span>
    <span class="muted">${ok ? 'Max level' : `Level ${lv} → ${lv + 1} · ${f(v)} / ${f(nx.t)} ❄`}</span><div class="bar"><i style="width:${pct}%"></i></div>
    ${gated ? '<span class="muted">🔒 Opens when every other goal is finished</span>' : ok ? `<span class="tag">✅ Fully upgraded</span>` : `<div class="don"><input type="number" inputmode="numeric" min="1" max="${max}" placeholder="amount" data-amt="${g.id}"><button data-act="donate" data-id="${g.id}">Donate</button><button class="ghost" data-act="max" data-id="${g.id}">All (${f(max)})</button></div>`}
    ${lv ? `<small class="muted">👆 ${g.act}</small>` : ''}</div></div>`; }).join('');
}
function donate(id, all) {
  if (!S().user) return ctx.login(); const g = C.goals.find(x => x.id === id), l = L(); if (l.gated(g)) return toast('🔒 Finish all other goals first', true);
  const rem = l.total(g) - l.val(g); let n = all ? Math.min(S().pts, rem) : Math.floor(+$(`[data-amt=${id}]`).value);
  if (!(n > 0)) return toast(all ? 'You have no points – play some games!' : 'Enter an amount first', true);
  if (n > S().pts) return toast(`You only have ${f(S().pts)} points`, true);
  n = Math.min(n, rem); ctx.store.donate(id, n); toast(`🎁 Donated ${f(n)} ❄ to ${g.name}!`); ctx.afterChange(); refresh();
}

// ---------- advent ----------
function calHtml() {
  const t = L().today(), c = S().stats.c;
  return `<p class="muted">A new door opens every day in December – each one holds a surprise amount of ❄${doorBonus() ? ` (🎉 +${doorBonus()} event bonus!)` : ''}</p><div class="cal">` + Array.from({ length: 24 }, (_, i) => i + 1).map(n => { const o = S().doors.includes(n), av = n <= t, [lo, hi] = range(n);
    return `<button class="door ${o ? 'open' : av ? 'today' : 'lock'}" data-act="door" data-id="${n}" ${!av || o ? 'disabled' : ''}>${o ? '🎁' : av ? n : '🔒'}<small>${o ? '+' + (c['door' + n] ?? '?') + ' ❄' : av ? (lo === hi ? '' : lo + '–' + hi + ' ❄') : 'Dec ' + n}</small></button>`; }).join('') + '</div>';
}
function door(n) { if (!S().user) return ctx.login(); const r = reward(n) + doorBonus(); ctx.store.openDoor(n, r); ctx.store.count('door' + n, r); toast(`🎄 Door ${n}: +${r} ❄!`); ctx.afterChange(); refresh(); }

// ---------- leaderboards (two brackets, reward share shown) ----------
const splitBar = br => `<div class="split"><div class="seg b" style="flex:${Math.max(br.B, 1)}">🏗 Build<b>${f(br.B)} ${cur}</b><small>${br.locked ? '🔒 frozen' : 'live'}</small></div><div class="seg g" style="flex:${Math.max(br.G, 1)}">💎 Gems<b>${f(br.G)} ${cur}</b><small>grows with donations</small></div></div>`;
async function boardFill() {
  const kind = boardTab, rows = await ctx.store.board(kind); if (current() !== 'board') return; ctx.boards[kind] = rows;
  const l = L(), br = l.brackets(), amt = kind === 'build' ? br.B : br.G, total = kind === 'build' ? l.totalBuilt() : S().cgems, mine = kind === 'build' ? S().donated : S().gemDonated, me = S().user?.name, unit = kind === 'build' ? '❄' : '💎';
  const row = (n, v, t, i, isMe) => `<li class="${isMe ? 'me' : ''}"><span class="m">${['🥇', '🥈', '🥉'][i] || (i >= 0 ? i + 1 : '·')}</span><span class="n">${n}${t ? `<small>${t}</small>` : ''}</span><span class="v">${f(v)} ${unit}<small>${total ? (v / total * 100).toFixed(1) : 0}% · ≈ ${(total ? v / total * amt : 0).toFixed(2)} ${cur}</small></span></li>`;
  const note = kind === 'build' ? (br.locked ? '🔒 Building is complete – this bracket is frozen. Final standings!' : 'Ranked by ❄ donated to goals. This bracket freezes when the Nutcracker is done.')
    : (l.exchangeOpen() ? 'Ranked by 💎 donated to the Star Fund. This bracket keeps growing with every donation!' : '🔒 Opens after the Nutcracker: exchange ❄ for 💎 and compete here – the prize pool keeps growing!');
  body().innerHTML = splitBar(br) + `<div class="tabs"><button class="${kind === 'build' ? '' : 'ghost'}" data-act="tab" data-id="build">🏗 Build</button><button class="${kind === 'gems' ? '' : 'ghost'}" data-act="tab" data-id="gems">💎 Gems</button></div>
  <p class="muted">${note}<br>Bracket reward: <b>${f(amt)} ${cur}</b>, split by each player’s share of the total.</p>` +
    (rows.length ? `<ol class="lb">${rows.map((r, i) => row(r[0], r[1], r[2], i, r[0] === me)).join('')}</ol>` : '<p class="muted">Nobody here yet – be the first!</p>') +
    (me && !rows.some(r => r[0] === me) && mine ? `<ol class="lb">${row(me + ' (you)', mine, '', -1, true)}</ol>` : '');
}

// ---------- prize ----------
function prizeHtml() {
  const l = L(), br = l.brackets(), eq = l.totalEq(), sb = l.shareB() * br.B, sg = l.shareG() * br.G;
  return `<p class="pool">${f(br.P)} ${cur}</p><p class="muted" style="text-align:center">Total prize pool · grows as the community donates points</p>${splitBar(br)}
  <div class="tiers">` + [{ at: 0, bonus: C.basePool }, ...C.tiers].map(t => { const on = eq >= t.at;
    return `<div class="tier ${on ? 'on' : ''}"><span>${on ? '✅' : '🔒'}</span><b>${t.at ? f(t.at) + ' pts donated' : 'Base pool'}</b>${t.at ? `<div class="bar"><i style="width:${Math.min(100, eq / t.at * 100)}%"></i></div>` : '<span style="flex:1"></span>'}<b>${t.at ? '+' : ''}${f(t.bonus)} ${cur}</b></div>`; }).join('') +
  `</div><p class="muted">Total donated: <b>${f(eq)}</b> pts (❄ to goals + 💎 to the Star Fund × ${C.gemRate}). Tiers add to the pool automatically.</p>
  <div class="strip"><span>🏗 Build share: <b>${(l.shareB() * 100).toFixed(2)}%</b> ≈ <b>${sb.toFixed(2)} ${cur}</b></span><span>💎 Gem share: <b>${(l.shareG() * 100).toFixed(2)}%</b> ≈ <b>${sg.toFixed(2)} ${cur}</b></span></div>
  <h3>Payout wallet (EVM address)</h3><div class="don"><input id="wallet" style="flex:1;min-width:200px" placeholder="0x…" value="${S().wallet || ''}"><button data-act="wallet">Save wallet</button></div><p class="muted">Use an address you control (Ethereum, Polygon, Base, BNB… all EVM). Never share your seed phrase.</p>`;
}
function saveWallet() { const a = $('#wallet').value.trim(); if (!S().user) return ctx.login();
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) return toast('❌ Not a valid EVM address (0x + 40 hex characters)', true); ctx.store.setWallet(a); toast('✅ Wallet saved'); ctx.afterChange(); }

// ---------- gems & shop ----------
function shopHtml() {
  const l = L(), open = l.exchangeOpen(), s = S(), lv = l.aurora(), nxt = C.aurora[lv];
  return strip() + `<div class="card2"><h3>🔁 Exchange ❄ → 💎</h3>` + (open ? `<p class="muted">${gemRate()} ❄ = 1 💎. Gems are personal: spend them in the shop or donate them to the Star Fund.</p><div class="don"><input type="number" inputmode="numeric" min="1" placeholder="💎 amount" data-gx><button data-act="exch">Exchange</button><button class="ghost" data-act="exchmax">Max (${Math.floor(s.pts / gemRate())} 💎)</button></div>`
    : '<p class="muted">🔒 Unlocks when the Nutcracker is complete. The Nutcracker opens once every other goal is finished – keep building together!</p>') + `</div>
  <div class="card2"><h3>⭐ Star Fund <small>(second leaderboard)</small></h3><p class="muted">Donated 💎 lights up the Northern Lights in the room. Community total: <b>${f(s.cgems)} 💎</b> · Northern Lights level ${lv}/${C.aurora.length}${nxt ? ` (next at ${f(nxt)} 💎)` : ' ✨ max!'}<br>You donated: <b>${f(s.gemDonated)} 💎</b></p>
  ${open ? `<div class="don"><input type="number" inputmode="numeric" min="1" placeholder="💎 amount" data-gd><button data-act="gdon">Donate</button><button class="ghost" data-act="gmax">All (${f(s.gems)})</button></div>` : '<p class="muted">🔒 Opens together with the exchange.</p>'}</div>
  <div class="card2"><h3>🛍️ Shop <small>(personal – paid with 💎)</small></h3><div class="grid">` + shopItems().map(it => { const have = s.inv[it.id] || 0, owned = it.type === 'own' && have;
    return `<div class="gcard shop"><b style="font-size:2rem">${it.icon}</b><b>${it.name}</b><small>${it.desc}</small>${it.until ? `<small class="cd">⏳ Exclusive – ends in <span data-until="${it.until}"></span></small>` : ''}${it.type === 'use' ? `<small>You have: <b>${have}</b></small>` : ''}
    <button data-act="buy" data-id="${it.id}" ${owned || s.gems < it.price ? 'disabled' : ''}>${owned ? '✅ Owned' : `Buy · ${it.price} 💎`}</button>${it.id === 'cdreset' && have ? '<button class="ghost" data-act="use" data-id="cdreset">Use now</button>' : ''}</div>`; }).join('') + '</div></div>';
}
const num = sel => Math.floor(+$(sel).value);
const gemAct = {
  exch: () => { const n = num('[data-gx]'); if (!(n > 0)) return toast('Enter how many 💎', true); if (n * gemRate() > S().pts) return toast(`Not enough ❄ (need ${f(n * gemRate())})`, true); ctx.store.exchange(n); toast(`💎 +${n} gems!`); },
  exchmax: () => { const n = Math.floor(S().pts / gemRate()); if (!n) return toast(`You need at least ${gemRate()} ❄`, true); ctx.store.exchange(n); toast(`💎 +${n} gems!`); },
  gdon: () => { const n = num('[data-gd]'); if (!(n > 0)) return toast('Enter how many 💎', true); if (n > S().gems) return toast('Not enough 💎', true); ctx.store.donateGems(n); toast(`⭐ Donated ${n} 💎 to the Star Fund!`); },
  gmax: () => { if (!S().gems) return toast('You have no 💎', true); toast(`⭐ Donated ${ctx.store.donateGems(S().gems)} 💎!`); },
  buy: id => { const it = shopItems().find(x => x.id === id); if (!it) return toast('This item is no longer available', true); if (ctx.store.buy(it)) toast(`${it.icon} ${it.name} – yours!`); else toast('Cannot buy this', true); },
  use: () => { resetCooldowns(S().user.id); ctx.store.spend('cdreset'); toast('⏩ All cooldowns reset!'); },
};

// ---------- badges ----------
function badgesHtml() {
  const s = S(), day = L().today(), name = s.user?.name, card = (b, state, cls, note) => `<div class="badge ${cls}"><i>${b.icon}</i><b>${b.name}</b><small>${b.desc}</small><em>${note}</em></div>`;
  const sec = (t, sub, html) => `<h3>${t}</h3><p class="muted">${sub}</p><div class="badges">${html}</div>`;
  return `<div class="strip"><span>Collected: <b>${allBadges().filter(b => b.kind !== 'rank' && s.badges[b.id]).length}</b> / ${allBadges().filter(b => b.kind !== 'rank').length}</span><span>Active rank badges: <b>${BADGES.filter(b => b.kind === 'rank' && holds(b, ctx.boards, name)).length}</b></span></div>` +
    sec('Achievements', 'Always obtainable – yours forever.', BADGES.filter(b => b.kind === 'perm').map(b => card(b, 0, s.badges[b.id] ? 'got' : '', s.badges[b.id] ? '✅ Earned' : 'Not yet')).join('')) +
    sec('⏳ Limited-time', 'Only obtainable during a window of the event. Once earned, they are yours forever!', allBadges().filter(b => b.kind === 'limited').map(b => { const got = s.badges[b.id], now = nowMs(), win = b.win, [a, z] = b.window || [0, 0], over = win ? now >= win[1] : day > z, soon = win ? now < win[0] : day < a;
      return card(b, 0, got ? 'got' : over ? 'miss' : '', got ? '✅ Earned' : over ? '🔒 Missed – no longer obtainable' : soon ? (win ? '🗓 Starts ' + new Date(win[0]).toLocaleDateString() : `Starts Dec ${a}`) : win ? `⏳ Ends in <span data-until="${win[1]}"></span>` : `⏳ Obtainable until Dec ${z}`); }).join('')) +
    sec('🔴 Live rank badges', 'Held only while you keep that leaderboard position – others can take them from you!', BADGES.filter(b => b.kind === 'rank').map(b => { const r = rankOf(ctx.boards, b.board, name), on = holds(b, ctx.boards, name);
      return card(b, 0, on ? 'got live' : '', on ? `🟢 Active now (rank #${r})` : r ? `Rank #${r} – not enough` : 'Not ranked'); }).join(''));
}

// ---------- profile ----------
function profileHtml() {
  const u = S().user, st = S().stats, plays = Object.values(st.plays).reduce((a, b) => a + b, 0), l = L();
  const icons = allBadges().filter(b => (b.kind === 'rank' ? holds(b, ctx.boards, u.name) : S().badges[b.id])).map(b => `<span title="${b.name}">${b.icon}</span>`).join('') || '<span class="muted">none yet</span>';
  return `<div class="pf">${avatar(u, 1)}<div><h3 style="margin:0;font-size:1.6rem">${u.name}</h3><span class="muted">${titleOf(S().inv) ? titleOf(S().inv) + ' · ' : ''}Discord · ${short(u.id)}</span><div class="bicons">${icons}</div></div></div>
  <div class="stats"><div class="stat"><b>${f(S().pts)}</b>❄ Points</div><div class="stat"><b>${f(S().gems)}</b>💎 Gems</div><div class="stat"><b>${f(S().donated)}</b>Donated ❄</div><div class="stat"><b>${f(S().gemDonated)}</b>Donated 💎</div>
  <div class="stat"><b>${(l.shareB() * 100).toFixed(1)}%</b>Build share</div><div class="stat"><b>${(l.shareG() * 100).toFixed(1)}%</b>Gem share</div><div class="stat"><b>${f(st.earned)}</b>Earned in games</div><div class="stat"><b>${plays}</b>Rounds</div><div class="stat"><b>${S().doors.length}/24</b>Doors</div></div>
  <h3>Best scores</h3><div class="stats">` + GAMES.map(g => `<div class="stat"><img src="${g.img}" height="30" alt=""><br>${g.name}<b>${st.best[g.id] || '–'}</b></div>`).join('') + `</div>
  <p class="muted">Wallet: ${S().wallet ? short(S().wallet) : 'not set yet (Prize & Wallet)'}</p>
  <div class="acts"><button data-act="open" data-id="share">📤 Share stats</button><button class="ghost" data-act="open" data-id="badges">🏅 Badges</button><button class="ghost" data-act="logout">🚪 Log out</button><button class="danger" data-act="delete">🗑 Delete account</button></div>` +
  (ctx.store.cheat ? `<details class="card2" open><summary>🧪 Test tools (demo mode only)</summary><div class="acts"><button class="ghost" data-act="cheat" data-id="pts">+500 ❄</button><button class="ghost" data-act="cheat" data-id="build">Complete all except Nutcracker</button><button class="ghost" data-act="cheat" data-id="all">Complete everything</button><button class="ghost" data-act="cheat" data-id="gems">+50 💎</button><button class="danger" data-act="cheat" data-id="reset">Reset demo data</button></div></details>` : '');
}

// ---------- events ----------
function eventsHtml() {
  const card = (e, st) => `<div class="ev ${st}"><i>${e.icon || '🎉'}</i><div><b>${e.title}</b><small>${e.desc || ''}</small><em>${st === 'act' ? `⏳ ends in <span data-until="${e.e}"></span>` : st === 'up' ? `🗓 starts in <span data-until="${e.s}"></span>` : 'Ended'}</em></div></div>`;
  const a = events.active(), u = events.upcoming(), z = events.past().slice(0, 4);
  return (a.length ? '<h3>🟢 Live now</h3>' + a.map(e => card(e, 'act')).join('') : '<p class="muted">No event is live right now – check back soon!</p>') + (u.length ? '<h3>🗓 Coming up</h3>' + u.map(e => card(e, 'up')).join('') : '') + (z.length ? '<h3>Past events</h3>' + z.map(e => card(e, 'old')).join('') : '');
}
// ---------- share picture ----------
let shareBlob = null;
async function shareFill() {
  try { shareBlob = await makeCard(); const url = URL.createObjectURL(shareBlob); if (current() !== 'share') return;
    body().innerHTML = `<img class="sharepic" src="${url}" alt="Your stats"><div class="acts"><button data-act="shdl">⬇ Download PNG</button><button class="ghost" data-act="shcopy">📋 Copy image</button>${navigator.canShare ? '<button class="ghost" data-act="shshare">📤 Share…</button>' : ''}</div><p class="muted">Paste it straight into Discord, or upload the PNG!</p>`;
  } catch (e) { if (current() === 'share') body().innerHTML = `<p>Could not create the picture: ${e.message}</p>`; }
}
const shareAct = {
  shdl: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(shareBlob); a.download = 'christmas-stats.png'; a.click(); },
  shcopy: async () => { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': shareBlob })]); toast('📋 Copied – paste it in Discord!'); } catch { toast('Copy not supported here – use Download', true); } },
  shshare: async () => { try { await navigator.share({ files: [new File([shareBlob], 'christmas-stats.png', { type: 'image/png' })], title: 'My Community Christmas stats' }); } catch { } },
};
// ---------- radio ----------
function radioHtml() {
  const r = ctx.radio, g = C.goals.find(x => x.id === 'radio');
  if (!L().lvl(g)) return '<p>🔒 Unlock the Christmas Radio first (Goals).</p>';
  return `<div class="player"><img src="assets/radio.svg" alt="" width="120"><div><b class="np">${r.on ? '♪ ' : ''}${r.song.name}</b><div class="acts"><button class="ghost" data-act="rprev">⏮</button><button data-act="rtoggle">${r.on ? '⏸ Turn off' : '▶ Turn on'}</button><button class="ghost" data-act="rnext">⏭</button></div>
  <label class="muted">🔊 Volume <input id="vol" type="range" min="0" max="1" step=".05" value="${r.vol}"></label></div></div><h3>Playlist</h3><ol class="lb">` +
    SONGS.map((s, i) => `<li class="${i === r.i && r.on ? 'me' : ''}"><span class="m">${i === r.i && r.on ? '♪' : i + 1}</span><span class="n">${s.name}</span><button class="ghost" data-act="rsong" data-id="${i}">▶</button></li>`).join('') + '</ol><p class="muted">Public-domain carols, played live by a tiny synthesizer.</p>';
}
const radioAct = { rtoggle: () => { if (ctx.radio.toggle()) ctx.store.count('radio_on'); }, rprev: () => ctx.radio.play(ctx.radio.i - 1), rnext: () => ctx.radio.play(ctx.radio.i + 1), rsong: id => { ctx.radio.play(+id); ctx.store.count('radio_on'); } };

export function bind() {
  $('#layer').addEventListener('change', adminChange);
  $('#layer').addEventListener('input', e => { if (e.target.id === 'vol') ctx.radio.setVol(+e.target.value); });
  $('#layer').addEventListener('click', e => {
    if (e.target.id === 'layer') return closePanel();
    const b = e.target.closest('[data-act]'); if (!b) return; const id = b.dataset.id, a = b.dataset.act, need = () => S().user || (ctx.login(), false);
    if (adminAct(a, id)) return; if (shareAct[a]) return shareAct[a]();
    if (gemAct[a]) { if (need()) { gemAct[a](id); ctx.afterChange(); refresh(); } return; }
    if (radioAct[a]) { radioAct[a](id); ctx.afterChange(); refresh(); return; }
    ({ close: () => closePanel(), play: () => play(id), back: () => open('games'), tog: () => open('goals'), open: () => open(id), donate: () => donate(id), max: () => donate(id, true), door: () => door(+id), wallet: saveWallet,
      tab: () => { boardTab = id; boardFill(); }, cheat: () => { ctx.store.cheat(id); ctx.afterChange(); refresh(); },
      logout: () => { if (closePanel()) { ctx.store.logout(); ctx.afterChange(); toast('Logged out – see you soon! 🎅'); } },
      delete: () => { if (confirm('Delete your account and its data? This cannot be undone.\n(Points you already donated stay in the community goals.)')) { closePanel(); Promise.resolve(ctx.store.deleteAccount()).then(() => { ctx.afterChange(); toast('Account deleted'); }); } } })[a]?.();
  });
}
