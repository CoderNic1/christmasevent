// Game engine + 5 mini-games. Each game: secs (round countdown), cd (cooldown s), max (point cap), pts(score, extra) → points.
import { beep } from './ui.js';
const CK = (id, uid) => `xmas_cd_${uid}_${id}`, rnd = (a, b) => a + Math.random() * (b - a), shuffle = a => a.sort(() => Math.random() - .5);
export const cooldownLeft = (g, uid) => Math.max(0, Math.ceil((+localStorage.getItem(CK(g.id, uid)) || 0) + g.cd - Date.now() / 1000));
const pos = (e, el) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function float(el, x, y, txt, bad) { const e = document.createElement('b'); e.className = 'float' + (bad ? ' bad' : ''); e.textContent = txt; e.style.left = x + 'px'; e.style.top = y + 'px'; el.append(e); setTimeout(() => e.remove(), 800); }

export const GAMES = [
  { id: 'gift', name: 'Gift Catch', img: 'assets/gift.svg', secs: 25, cd: 90, max: 40, desc: 'Grab falling gifts. Golden = +5, coal = -2!', pts: s => s,
    run(c) { c.every(() => { const r = Math.random(), kind = r < .22 ? 'coal' : r < .3 ? 'gold' : 'gift', b = document.createElement('button');
      b.className = 'fall' + (kind === 'gold' ? ' gold' : ''); b.innerHTML = `<img src="assets/${kind === 'coal' ? 'coal' : 'gift'}.svg" alt="">`;
      b.style.left = rnd(2, 88) + '%'; b.style.setProperty('--h', c.el.clientHeight + 100 + 'px'); b.style.animationDuration = rnd(2.2, 3.6) + 's';
      b.onpointerdown = e => { if (b.dead) return; b.dead = 1; const d = kind === 'coal' ? -2 : kind === 'gold' ? 5 : 1, [x, y] = pos(e, c.el);
        c.add(d); float(c.el, x, y, (d > 0 ? '+' : '') + d, d < 0); b.remove(); if (d < 0) { c.el.classList.add('shake'); setTimeout(() => c.el.classList.remove('shake'), 300); } };
      c.el.append(b); setTimeout(() => b.remove(), 4200); }, 480); } },
  { id: 'tap', name: 'Cookie Rush', img: 'assets/cookie.svg', secs: 12, cd: 90, max: 30, desc: 'Tap the cookie like crazy! Golden cookies = +10.', pts: s => s / 4,
    run(c) { const b = document.createElement('button'); b.className = 'cookie'; b.innerHTML = '<img src="assets/cookie.svg" alt="cookie">'; c.el.append(b);
      b.onpointerdown = e => { c.add(1); const [x, y] = pos(e, c.el); float(c.el, x, y, '+1'); };
      c.every(() => { const g = document.createElement('button'); g.className = 'gcookie'; g.innerHTML = '<img src="assets/cookie.svg" alt="">'; g.style.left = rnd(5, 80) + '%'; g.style.top = rnd(8, 70) + '%';
        g.onpointerdown = e => { c.add(10); const [x, y] = pos(e, c.el); float(c.el, x, y, '+10'); g.remove(); }; c.el.append(g); setTimeout(() => g.remove(), 1400); }, 3500); } },
  { id: 'memory', name: 'Memory Match', img: 'assets/ornament.svg', secs: 60, cd: 150, max: 40, desc: 'Find all 8 festive pairs before time runs out.', pts: (s, x) => s * 3 + (x.won ? 10 + Math.floor(x.left / 3) : 0),
    run(c) { const g = document.createElement('div'); g.className = 'mem'; c.el.append(g); let open = [], lock = false, matched = 0;
      shuffle(['🎅', '🎄', '⛄', '🦌', '🔔', '🍪', '🧦', '⭐'].flatMap(x => [x, x])).forEach(sym => { const k = document.createElement('button'); k.className = 'mc'; k.dataset.s = sym; k.innerHTML = `<span class="bk">🎄</span><span class="ft">${sym}</span>`; g.append(k);
        k.onclick = () => { if (lock || k.classList.contains('up') || k.classList.contains('done')) return; k.classList.add('up'); open.push(k);
          if (open.length < 2) return; lock = true; const [a, b] = open;
          if (a.dataset.s === b.dataset.s) { a.classList.add('done'); b.classList.add('done'); open = []; lock = false; c.add(1); if (++matched === 8) { c.extra.won = 1; c.extra.left = c.left; c.after(() => c.end(), 700); } }
          else c.after(() => { a.classList.remove('up'); b.classList.remove('up'); open = []; lock = false; }, 700); }; }); } },
  { id: 'lights', name: 'Light Sequence', img: 'assets/bulb.svg', secs: 75, cd: 120, max: 40, desc: 'Watch the lights, then repeat the pattern. Sound on! 🔔', pts: s => s * 3,
    run(c) { const cols = ['#e0434d', '#2fa85a', '#f2c445', '#3b82d6'], fr = [262, 330, 392, 523];
      c.el.innerHTML = '<div class="seq"></div><div class="seqmsg"></div>'; const grid = c.el.firstChild, msg = t => c.el.lastChild.textContent = t; let seq = [], step = 0, ok = false;
      const btn = cols.map((col, i) => { const b = document.createElement('button'); b.className = 'sb'; b.style.cssText = `background:${col};--c:${col}`; grid.append(b); return b; });
      const lit = (i, ms = 350) => { btn[i].classList.add('lit'); beep(fr[i], ms); setTimeout(() => btn[i].classList.remove('lit'), ms); };
      const play = () => { ok = false; step = 0; msg('Watch…'); seq.forEach((s, k) => c.after(() => lit(s), 500 + k * 600)); c.after(() => { ok = true; msg('Your turn!'); }, 500 + seq.length * 600); };
      const next = () => { seq.push(Math.floor(Math.random() * 4)); play(); };
      btn.forEach((b, i) => b.onpointerdown = () => { if (!ok) return; lit(i, 200);
        if (seq[step] === i) { if (++step === seq.length) { c.add(1); ok = false; msg('Nice! ✨'); c.after(next, 800); } } else { ok = false; msg('Oops! ❌'); c.after(() => c.end(), 900); } });
      c.after(next, 400); } },
  { id: 'pop', name: 'Snowman Pop', img: 'assets/snowman.svg', secs: 30, cd: 120, max: 35, desc: 'Pop the snowmen – but not the Grinch (-3)!', pts: s => s,
    run(c) { const p = document.createElement('div'); p.className = 'pop'; c.el.append(p); let ms = 950;
      const holes = Array.from({ length: 9 }, () => { const h = document.createElement('div'); h.className = 'hole'; h.innerHTML = '<img alt="">'; p.append(h); return h; });
      holes.forEach(h => h.onpointerdown = e => { if (!h.classList.contains('up')) return; h.classList.remove('up'); const bad = h.dataset.bad, [x, y] = pos(e, c.el); c.add(bad ? -3 : 1); float(c.el, x, y, bad ? '-3' : '+1', !!bad); });
      const loop = () => { const h = holes[Math.floor(Math.random() * 9)]; if (!h.classList.contains('up')) { const bad = Math.random() < .2, tk = h.tk = {};
        h.firstChild.src = bad ? 'assets/grinch.svg' : 'assets/snowman.svg'; h.dataset.bad = bad ? 1 : ''; h.classList.add('up'); c.after(() => { if (h.tk === tk) h.classList.remove('up'); }, ms); }
        ms = Math.max(480, ms - 10); c.after(loop, Math.max(380, ms * .7)); }; loop(); } },
];

export function startGame(g, stage, uid, done) {
  stage.innerHTML = `<div class="hud"><span>⏱ <b id="t">${g.secs}</b>s</span><span class="big">⭐ <b id="sc">0</b></span><button class="ghost" data-act="quit">✕ Quit</button></div><div class="arena"></div>`;
  const el = stage.querySelector('.arena'), tm = [], c = { el, score: 0, left: g.secs, over: false, extra: {} };
  const clear = () => tm.forEach(t => { clearInterval(t); clearTimeout(t); });
  c.every = (fn, ms) => { tm.push(setInterval(() => !c.over && fn(), ms)); };
  c.after = (fn, ms) => { tm.push(setTimeout(() => !c.over && fn(), ms)); };
  c.add = n => { c.score = Math.max(0, c.score + n); stage.querySelector('#sc').textContent = c.score; };
  c.end = () => { if (c.over) return; c.over = true; clear(); const pts = Math.min(g.max, Math.max(0, Math.floor(g.pts(c.score, c.extra))));
    localStorage.setItem(CK(g.id, uid), Math.floor(Date.now() / 1000)); done(pts, c.score); };
  c.every(() => { stage.querySelector('#t').textContent = Math.max(0, --c.left); if (c.left <= 0) c.end(); }, 1000);
  g.run(c); return () => { c.over = true; clear(); };       // returned fn = cancel (no points, no cooldown)
}
