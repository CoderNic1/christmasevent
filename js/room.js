// The room scene: items are built once; only src/classes change (so SVG animations never restart). Also click interactions.
import { CONFIG as C } from './config.js';
import { $, beep } from './ui.js';
import { ctx } from './ctx.js';
const STARTERS = [{ id: 'cat', name: 'Sleepy cat', x: 30, y: 93, levels: [{ img: 'assets/cat.svg', w: 10 }] }, { id: 'candle', name: 'Candle', x: 12, y: 95, levels: [{ img: 'assets/candle.svg', w: 2.2 }] }];
const prev = {}; let built = false;
const pick = a => a[Math.floor(Math.random() * a.length)], anim = (el, c, ms = 700) => { el.classList.add(c); setTimeout(() => el.classList.remove(c), ms); };

export function particles(el, chars, n = 10, big) {
  const r = $('#room').getBoundingClientRect(), b = el.getBoundingClientRect();
  for (let i = 0; i < n; i++) { const s = document.createElement('b'); s.className = 'spark'; s.textContent = chars[i % chars.length];
    s.style.left = b.left - r.left + b.width / 2 + 'px'; s.style.top = b.top - r.top + b.height / 3 + 'px';
    s.style.setProperty('--dx', Math.random() * (big ? 240 : 100) - (big ? 120 : 50) + 'px'); s.style.setProperty('--dy', -Math.random() * (big ? 180 : 90) - 20 + 'px');
    $('#room').append(s); setTimeout(() => s.remove(), 1200); }
}
export function bubble(el, t) {
  const r = $('#room').getBoundingClientRect(), b = el.getBoundingClientRect(), d = document.createElement('div'); d.className = 'bub'; d.textContent = t;
  d.style.left = Math.min(Math.max(b.left - r.left + b.width / 2, 100), r.width - 100) + 'px'; d.style.top = Math.max(26, b.top - r.top - 6) + 'px';
  $('#room').append(d); setTimeout(() => d.remove(), 2300);
}
export function updateRoom(L, S) {
  if (!built) { $('#items').innerHTML = [...STARTERS, ...C.goals].map(g => `<img alt="${g.name}" title="${g.name}" data-id="${g.id}" class="${g.cls || ''}">`).join(''); built = true; }
  const first = !Object.keys(prev).length;
  [...STARTERS, ...C.goals].forEach(g => {
    const el = $(`#items [data-id="${g.id}"]`), n = C.goals.includes(g) ? L.lvl(g) : 1;
    const def = g.levels[Math.max(1, n) - 1], hat = g.id === 'cat' && S.inv.hat, src = hat ? 'assets/cat-hat.svg' : def.img, key = src + '|' + n;
    if (prev[g.id] !== key) { const up = prev[g.id] && n > +prev[g.id].split('|')[1];
      el.src = src; el.style.left = (def.x ?? g.x) + '%'; el.style.top = g.y + '%'; el.style.width = def.w + '%'; el.classList.toggle('locked', n === 0);
      if (up && !first) { anim(el, 'pop', 1000); setTimeout(() => particles(el, ['✨', '⭐', '❄️'], 18, true), 50); } prev[g.id] = key; }
  });
  $('#room .glow').style.opacity = C.goals.reduce((a, g) => a + L.lvl(g), 0) / C.goals.reduce((a, g) => a + g.levels.length, 0) * .8;
  $('#aurora').style.opacity = L.aurora() / C.aurora.length * .8;
  $('#room').classList.toggle('party', L.buildDone());
  $('#hint').style.opacity = C.goals.filter(g => L.lvl(g)).length < 2 ? 1 : 0;
}

// ---------- interactions ----------
function bonus(id, lo, hi, mins = 10) {          // small snowflake gift with a per-user cooldown
  const u = ctx.store.state.user; if (!u) return 0; const k = `xmas_ia_${u.id}_${id}`; if (Date.now() - (+localStorage[k] || 0) < mins * 60000) return 0;
  localStorage[k] = Date.now(); const n = lo + Math.floor(Math.random() * (hi - lo + 1)); ctx.store.addPoints(n); return n;
}
const ACT = {
  tree(el) { anim(el, 'a-shake'); particles(el, ['🔴', '🟡', '✨', '❄️'], 8); beep(784, 140); const n = bonus('tree', 1, 3); bubble(el, n ? `🎁 A gift fell out: +${n} ❄` : '🎄 Ding ding! (try again later for a gift)'); },
  lights(el) { const m = ((+el.dataset.m || 0) + 1) % 3; el.dataset.m = m; el.classList.remove('lm1', 'lm2'); if (m) el.classList.add('lm' + m); beep(660 + m * 120, 120); bubble(el, ['✨ Classic twinkle', '🌈 Rainbow party!', '🌙 Cozy dim'][m]); },
  fire(el) { anim(el, 'a-pulse'); particles(el, ['🔥', '✨'], 8); anim($('#room .glow'), 'flash', 600); bubble(el, '🔥 Crackle, pop! So cozy.'); },
  presents(el) { anim(el, 'a-shake'); particles(el, ['🎀', '⭐', '🎁'], 7); const n = bonus('presents', 1, 3); bubble(el, n ? `🎁 Surprise inside: +${n} ❄` : '🎁 Rattle rattle… no peeking!'); },
  train(el) { el.style.animationDuration = '9s'; setTimeout(() => el.style.animationDuration = '', 3500); particles(el, ['☁️'], 5); bubble(el, '🚂 Toot toot!'); beep(392, 180); setTimeout(() => beep(523, 260), 200); },
  radio(el) { const on = ctx.radio.toggle(); if (on) ctx.store.count('radio_on'); bubble(el, on ? `📻 ♪ ${ctx.radio.song.name}` : '📻 Radio off'); },
  snowman(el) { anim(el, 'a-wave'); bubble(el, pick(['Ho ho… I mean, brrr! ❄️', 'Please don’t touch my carrot!', 'Is it Christmas yet?', 'I’m cool. Literally. 😎'])); },
  nutcracker(el) { anim(el, 'a-pulse'); particles(el, ['🥜', '⭐'], 6); beep(220, 80); setTimeout(() => beep(165, 140), 90); bubble(el, pick(['🥜 Crack! Merry Christmas!', '🪖 Nutcracker reporting for duty!'])); },
  cat(el) { particles(el, ['💗', '💤'], 5); bubble(el, pick(['😻 Purr…', '😺 Mrrp!', '😽 *stretches*'])); },
  candle(el) { particles(el, ['✨'], 4); bubble(el, '🕯️ Make a wish!'); },
};
export function setup(L) {
  $('#items').addEventListener('click', e => {
    const el = e.target.closest('img'); if (!el) return; const id = el.dataset.id, g = C.goals.find(x => x.id === id);
    if (g && !L.lvl(g)) return bubble(el, L.gated(g) ? '🔒 Finish all other goals first!' : `🔒 Locked – donate to unlock the ${g.name}`);
    if (ctx.store.state.user && id !== 'radio') ctx.store.count('ia_' + id); ACT[id]?.(el);
  });
  setInterval(() => { const el = $('#items [data-id="radio"]'); if (!el) return; el.classList.toggle('radio-on', ctx.radio.on); if (ctx.radio.on) particles(el, ['♪', '♫', '♬'], 1); }, 1300);
}
