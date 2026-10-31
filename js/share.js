// Builds a 1200×630 stats picture (Discord-embed friendly) with the user's current room + stats, drawn on a canvas.
import { CONFIG as C } from './config.js';
import { ctx } from './ctx.js';
import { STARTERS } from './room.js';
import { BADGES, rankOf, holds } from './badges.js';
import { titleOf } from './remote.js';
const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const f = n => Math.floor(n).toLocaleString();
export async function makeCard() {
  const S = ctx.store.state, L = ctx.L, u = S.user, W = 1200, H = 630, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  try { await document.fonts.load('700 40px "Mountains of Christmas"'); } catch { }
  const head = '"Mountains of Christmas","Segoe Print","Comic Sans MS",cursive', body = 'Nunito,system-ui,sans-serif';
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0b1a2f'); bg.addColorStop(1, '#10301f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#ffffff22'; for (let i = 0; i < 70; i++) { g.beginPath(); g.arc(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 0, 7); g.fill(); }
  // candy frame + room
  const rx = 28, ry = 110, rw = 700, rh = rw * 9 / 16; g.save(); rr(g, rx - 8, ry - 8, rw + 16, rh + 16, 22); g.fillStyle = '#fff'; g.fill(); g.clip();
  g.fillStyle = '#d63a45'; for (let i = -rh; i < rw + rh; i += 34) { g.beginPath(); g.moveTo(rx + i, ry - 8); g.lineTo(rx + i + 17, ry - 8); g.lineTo(rx + i + 17 - rh - 16, ry + rh + 8); g.lineTo(rx + i - rh - 16, ry + rh + 8); g.fill(); } g.restore();
  g.save(); rr(g, rx, ry, rw, rh, 16); g.clip(); const room = await load('assets/room.svg'); if (room) g.drawImage(room, rx, ry, rw, rh);
  for (const it of [...STARTERS, ...C.goals]) { const n = C.goals.includes(it) ? L.lvl(it) : 1; if (!n) continue; const d = it.levels[n - 1], src = it.id === 'cat' && S.inv.hat ? 'assets/cat-hat.svg' : d.img, im = await load(src); if (!im) continue;
    const w = rw * d.w / 100, h = w * im.naturalHeight / im.naturalWidth, x = rx + rw * ((it.id === 'train' ? 60 : (d.x ?? it.x)) / 100), y = ry + rh * it.y / 100; g.drawImage(im, x - w / 2, y - h, w, h); }
  g.restore();
  // right side
  const x0 = 770; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.font = `700 46px ${head}`; g.fillText('🎄 Community Christmas', 28, 28);
  g.font = `700 22px ${body}`; g.fillStyle = '#f5c542'; const days = Math.max(0, Math.ceil((new Date(C.eventEnd) - Date.now()) / 864e5)); g.fillText(days ? `${days} days until Christmas · help us build the room!` : 'Merry Christmas! 🎅', 30, 78);
  g.fillStyle = u.color || '#5865f2'; g.beginPath(); g.arc(x0 + 34, 148, 34, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `800 34px ${body}`; g.textAlign = 'center'; g.fillText(u.name[0].toUpperCase(), x0 + 34, 130); g.textAlign = 'left';
  g.font = `800 34px ${body}`; g.fillText(u.name.slice(0, 16), x0 + 84, 118); g.font = `600 20px ${body}`; g.fillStyle = '#9fb4d3'; g.fillText(titleOf(S.inv) || 'Christmas helper', x0 + 84, 160);
  const rb = rankOf(ctx.boards, 'build', u.name), rg = rankOf(ctx.boards, 'gems', u.name), lv = C.goals.reduce((a, q) => a + L.lvl(q), 0), mx = C.goals.reduce((a, q) => a + L.max(q), 0);
  const stats = [['❄ Donated', f(S.donated)], ['🏗 Build rank', rb ? '#' + rb : '–'], ['📈 Build share', (L.shareB() * 100).toFixed(1) + '%'], ['💎 Gems donated', f(S.gemDonated)], ['💠 Gem rank', rg ? '#' + rg : '–'], ['🎁 Room upgrades', `${lv}/${mx}`]];
  stats.forEach(([k, v], i) => { const x = x0 + (i % 2) * 205, y = 215 + Math.floor(i / 2) * 100; g.fillStyle = '#16294a'; rr(g, x, y, 195, 88, 14); g.fill(); g.fillStyle = '#9fb4d3'; g.font = `700 17px ${body}`; g.fillText(k, x + 14, y + 12); g.fillStyle = '#f5c542'; g.font = `800 34px ${body}`; g.fillText(v, x + 14, y + 40); });
  const got = BADGES.filter(b => (b.kind === 'rank' ? holds(b, ctx.boards, u.name) : S.badges[b.id])); g.font = '34px sans-serif'; g.fillStyle = '#fff'; g.fillText(got.slice(0, 9).map(b => b.icon).join(' ') || '🏅 …', x0, 520);
  g.font = `600 18px ${body}`; g.fillStyle = '#9fb4d3'; g.fillText(`${got.length} badge${got.length === 1 ? '' : 's'} · ${L.done ? '' : ''}${location.host}${location.pathname}`.replace('  ', ' '), x0, 570);
  g.font = `700 20px ${body}`; g.fillStyle = '#ffffffaa'; g.fillText(`🏆 Prize pool: ${f(L.brackets().P)} ${C.currency}`, 30, rh + ry + 24);
  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('Could not create the image'))), 'image/png'));
}
