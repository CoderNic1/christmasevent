// The room scene: built once, then only classes toggle (so SVG animations never restart).
import { CONFIG as C } from './config.js';
import { $ } from './ui.js';
const STARTERS = [{ img: 'assets/cat.svg', x: 30, y: 93, w: 10 }, { img: 'assets/candle.svg', x: 12, y: 95, w: 2.2 }];
let built = false; const prev = {};
function burst(el) {
  const r = $('#room').getBoundingClientRect(), b = el.getBoundingClientRect();
  for (let i = 0; i < 18; i++) { const s = document.createElement('b'); s.className = 'spark'; s.textContent = ['✨', '⭐', '❄️'][i % 3];
    s.style.left = b.left - r.left + b.width / 2 + 'px'; s.style.top = b.top - r.top + b.height / 2 + 'px';
    s.style.setProperty('--dx', Math.random() * 240 - 120 + 'px'); s.style.setProperty('--dy', -Math.random() * 180 + 'px');
    $('#room').append(s); setTimeout(() => s.remove(), 1200); }
}
export function updateRoom(L) {
  if (!built) { $('#items').innerHTML = [...STARTERS, ...C.goals].map(g => `<img src="${g.img}" alt="${g.name || ''}" title="${g.name || ''}" data-id="${g.id || ''}" class="${g.cls || ''}" style="left:${g.x}%;top:${g.y}%;width:${g.w}%">`).join(''); built = true; }
  const first = !Object.keys(prev).length;
  C.goals.forEach(g => { const el = $(`#items [data-id="${g.id}"]`), ok = L.full(g); el.classList.toggle('locked', !ok);
    if (ok && prev[g.id] === false && !first) { el.classList.add('pop'); setTimeout(() => el.classList.remove('pop'), 1000); burst(el); }
    prev[g.id] = ok; });
  $('#room .glow').style.opacity = L.done() / C.goals.length * .8;
  $('#room').classList.toggle('party', L.done() === C.goals.length);
  $('#hint').style.opacity = L.done() < 2 ? 1 : 0;
}
