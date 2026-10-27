// Each game: secs = round countdown, cd = cooldown (s) before replay, max = point cap per round.
export const GAMES = [
  { id: 'gift', name: 'Gift Catch', emoji: '🎁', secs: 20, cd: 120, max: 30, info: 'Click gifts, avoid coal!' },
  { id: 'tap',  name: 'Cookie Rush', emoji: '🍪', secs: 10, cd: 120, max: 25, info: 'Tap the cookie fast!' },
];
const K = id => 'xmas_cd_' + id;
export const cooldownLeft = g => Math.max(0, Math.ceil((+localStorage.getItem(K(g.id)) || 0) + g.cd - Date.now() / 1000));

export function playGame(g, arena, finish) {
  arena.hidden = false; arena.innerHTML = '<p class="muted"><b id="t"></b> · score <b id="sc">0</b> — ' + g.info + '</p>';
  let score = 0, left = g.secs; const sc = () => arena.querySelector('#sc').textContent = score;
  const t = arena.querySelector('#t'), tick = () => t.textContent = left + 's';
  tick(); let spawn;
  if (g.id === 'gift') spawn = setInterval(() => {
    const b = document.createElement('button'), coal = Math.random() < .25;
    b.className = 'fall'; b.textContent = coal ? '🪨' : '🎁'; b.style.left = Math.random() * 85 + '%'; b.style.animationDuration = 2 + Math.random() * 1.5 + 's';
    b.onclick = () => { score = Math.max(0, score + (coal ? -2 : 1)); sc(); b.remove(); };
    arena.append(b); setTimeout(() => b.remove(), 4000);
  }, 450);
  else { const c = document.createElement('button'); c.textContent = '🍪'; c.style.cssText = 'font-size:5rem;background:none;margin-top:50px'; c.onclick = () => { score++; sc(); }; arena.append(c); }
  const iv = setInterval(() => {
    tick(); if (--left >= 0) return; clearInterval(iv); clearInterval(spawn);
    const pts = Math.min(g.max, g.id === 'gift' ? score : Math.floor(score / 4));   // cap = soft anti-cheat
    localStorage.setItem(K(g.id), Math.floor(Date.now() / 1000));
    arena.innerHTML = `<h3>Time's up! +${pts} ❄ points</h3>`; finish(pts);
  }, 1000);
}
