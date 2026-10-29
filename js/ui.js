// Small UI helpers: DOM shortcuts, toasts, snow, overlay panel layer, tiny sound.
export const $ = (s, r = document) => r.querySelector(s), f = n => Math.floor(n).toLocaleString();
export function toast(msg, bad) { const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; $('#toasts').append(t); setTimeout(() => t.remove(), 3000); }
let cur = null, guard = null, onClose = null;
export const current = () => cur, setGuard = g => guard = g;
export function openPanel(id, title, html, opts = {}) {
  const L = $('#layer'); L.hidden = false; onClose = opts.onClose; cur = id;
  L.innerHTML = `<div class="panel" role="dialog" aria-label="${title}"><div class="ph"><h2>${title}</h2><button class="x" data-act="close" aria-label="Close">✕</button></div><div class="pb">${html}</div></div>`;
}
export const body = () => $('#layer .pb');
export function closePanel() {
  if (guard && !guard()) return false;
  if (onClose) onClose(); onClose = guard = cur = null; const L = $('#layer'); L.hidden = true; L.innerHTML = ''; return true;
}
addEventListener('keydown', e => e.key === 'Escape' && cur && closePanel());
export function snow(n = 34) {
  const s = $('#snow'); for (let i = 0; i < n; i++) { const e = document.createElement('i'), z = 2 + Math.random() * 5;
    e.style.cssText = `left:${Math.random() * 100}%;width:${z}px;height:${z}px;animation-duration:${8 + Math.random() * 12}s;animation-delay:-${Math.random() * 15}s;--dx:${Math.random() * 80 - 40}px`; s.append(e); }
}
let ac; export function beep(freq, ms = 250) {
  try { ac ||= new AudioContext(); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = freq; o.type = 'triangle'; o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(.15, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + ms / 1000); o.start(); o.stop(ac.currentTime + ms / 1000); } catch { }
}
