// Wallet login dialog: choose wallet → read address → sign free message → server checks whitelist → (first time) choose username.
import { CONFIG as C } from './config.js';
import { $, esc, toast } from './ui.js';
import { ctx } from './ctx.js';
import * as W from './wallet.js';
import { cleanName, nameError } from './names.js';

const short = a => a.slice(0, 6) + '…' + a.slice(-4);
let run = 0, step = '', wallets = [], last = null, lastAddr = '';        // `run` cancels stale async flows (dialog closed / another attempt started)
const dlg = () => $('#dlg'), S = () => ctx.store.state;

function show(html, { locked = false } = {}) {
  const d = dlg(); d.innerHTML = `<div class="wd">${html}</div>`; d.oncancel = locked ? e => e.preventDefault() : null;   // Esc must not skip the username step
  if (!d.open) d.showModal();
}
function close() { run++; step = ''; const d = dlg(); if (d.open) d.close(); d.innerHTML = ''; }
const busy = (t, sub = '') => { step = 'busy'; show(`<h3>👛 ${esc(t)}</h3><p class="muted"><span class="spin"></span> ${esc(sub)}</p><div class="acts"><button class="ghost" data-w="close">Cancel</button></div>`); };

// ---------- step 1: choose a wallet ----------
export async function openLogin() {
  bind(); const my = ++run; step = 'pick'; busy('Looking for wallets…');
  wallets = await W.discover(); if (my !== run) return;
  if (C.walletConnectProjectId) wallets.push(W.wcWallet(C.walletConnectProjectId));
  const demo = !ctx.store.live, mobile = W.isMobile(), none = !wallets.some(w => w.kind === 'injected');
  step = 'pick';
  show(`<h3>👛 Connect your wallet</h3>
    <p class="muted">Log in with the wallet that holds the NFT. We only <b>read your address</b> and ask for a <b>free signature</b> to prove it is yours – no transaction, no gas, no access to your funds or NFTs.</p>
    <div class="wlist">${wallets.map((w, i) => `<button class="wbtn" data-w="pick" data-i="${i}">${w.icon ? `<img src="${esc(w.icon)}" alt="" width="28" height="28">` : '<span class="wi">👛</span>'}<b>${esc(w.name)}</b><small>${esc(w.sub || (w.kind === 'injected' ? 'detected' : ''))}</small></button>`).join('')}
      ${demo ? '<button class="wbtn" data-w="demo"><span class="wi">🧪</span><b>Demo wallet</b><small>type any address (demo mode)</small></button>' : ''}</div>
    ${none ? `<p class="muted">No browser wallet found. Install <a href="https://metamask.io/download/" target="_blank" rel="noopener">MetaMask</a> or the Crypto.com Onchain extension – or open this page inside your wallet app’s own browser (MetaMask / Crypto.com Onchain).${mobile ? ` <a href="${esc(W.metamaskAppLink())}">Open in MetaMask app</a>` : ''}</p>` : ''}
    <div class="acts"><button class="ghost" data-w="close">Cancel</button></div>`);
}

// ---------- step 2: connect → sign → server check ----------
async function useWallet(w, pick = false) {
  const my = ++run; last = w; let address = '';
  try {
    busy('Connecting…', 'Approve the connection in your wallet.');
    const c = w.kind === 'demo' ? { address: w.address.toLowerCase(), chainId: 1 } : await W.connect(w, { pick }); if (my !== run) return;
    address = lastAddr = c.address; const proof = { address };
    if (ctx.store.live) {                           // real mode: prove ownership with a free signature (the server verifies it)
      busy('Waiting for your signature…', `Confirm the free sign-in message for ${short(address)} in your wallet.`);
      proof.message = W.buildMessage({ domain: location.host, uri: location.origin + location.pathname, address, chainId: c.chainId, nonce: W.nonce(), issuedAt: new Date().toISOString() });
      proof.signature = await W.sign(w, proof.message, address); if (my !== run) return;
      busy('Checking the whitelist…');
    }
    W.disconnect(w);
    const r = await ctx.store.signIn(proof); if (my !== run) return;
    ctx.afterChange();
    if (S().named) { close(); toast(`Welcome back, ${S().user.name}! 🎅`); } else nameStep(r.suggest);
  } catch (e) {
    if (my !== run) return; W.disconnect(w); step = 'err';
    if (e.code === 'not_whitelisted') show(`<h3>🚫 This wallet can’t join (yet)</h3>
      <p><code>${esc(short(address || lastAddr))}</code> was not found in our list.</p>
      <p>Either this wallet <b>doesn’t hold the required NFT</b>, or it <b>isn’t whitelisted</b> yet.</p>
      <p class="muted">Hold the NFT in another wallet? Switch to that account and try again. Just bought it, or think this is a mistake? Ask an admin to add your wallet.</p>
      <div class="acts">${w.kind === 'injected' ? '<button data-w="again">🔄 Switch account &amp; retry</button>' : ''}<button class="${w.kind === 'injected' ? 'ghost' : ''}" data-w="retry">Other wallet</button><button class="ghost" data-w="close">Close</button></div>`);
    else show(`<h3>⚠ Could not log in</h3><p>${esc(W.friendly(e))}</p><div class="acts"><button data-w="retry">Try again</button><button class="ghost" data-w="close">Close</button></div>`);
  }
}

// ---------- step 3: username (once; unique) ----------
export function nameStep(suggest = '') {
  bind(); run++; step = 'name'; const sug = cleanName(suggest);
  show(`<h3>🏷 Choose your username</h3>
    <p class="muted">This is the name everyone sees on the leaderboards.${sug ? ' We suggested your Discord name – change it if you like.' : ''} <b>You can set it only once</b>, so choose with care.</p>
    <input id="uname" maxlength="24" value="${esc(sug)}" placeholder="3–24 letters, numbers, . _ -" autocomplete="off" spellcheck="false" style="width:100%">
    <p id="uerr" class="muted" style="color:#ff9aa2;min-height:1.2em"></p>
    <div class="acts"><button data-w="save">✅ Save username</button><button class="ghost" data-w="logout">Log out</button></div>`, { locked: true });
  $('#uname').focus(); $('#uname').select();
}
async function saveName() {
  const n = $('#uname').value.trim(), err = nameError(n), e = $('#uerr'); if (err) return (e.textContent = err);
  const btn = dlg().querySelector('[data-w=save]'); btn.disabled = true; e.textContent = '';
  try { await ctx.store.claimName(n); close(); ctx.afterChange(); toast(`Welcome, ${n}! 🎄`); }
  catch (er) { e.textContent = er.code === 'name_taken' ? '😕 That username is taken – try another one.' : W.friendly(er); btn.disabled = false; }
}

// ---------- demo wallet (demo mode only) ----------
function demoForm() {
  step = 'demo'; const hints = ctx.store.demoHints || [];
  show(`<h3>🧪 Demo wallet</h3><p class="muted">Demo mode has no blockchain: type any address. Only whitelisted ones get in – anything else shows the “not whitelisted” message. Log in with a whitelisted address plus <code>?admin=1</code> in the URL to manage the list in Admin ▸ Whitelist.</p>
    <input id="daddr" placeholder="0x…" autocomplete="off" spellcheck="false" style="width:100%"><p class="muted">Whitelisted in this demo: ${hints.map(a => `<button class="ghost mini" data-w="fill" data-v="${esc(a)}">${esc(short(a))}</button>`).join(' ')}</p>
    <p id="uerr" class="muted" style="color:#ff9aa2"></p><div class="acts"><button data-w="demogo">Connect</button><button class="ghost" data-w="retry">Back</button></div>`);
  $('#daddr').focus();
}
function demoGo() { const a = $('#daddr').value.trim(); if (!W.isAddr(a)) return ($('#uerr').textContent = 'Enter a valid address: 0x + 40 hex characters.'); useWallet({ kind: 'demo', address: a }); }

let bound = false;
function bind() {
  if (bound) return; bound = true; const d = dlg();
  d.addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return;
    ({ close, retry: openLogin, pick: () => useWallet(wallets[+b.dataset.i]), again: () => useWallet(last, true), demo: demoForm, demogo: demoGo, save: saveName, fill: () => { $('#daddr').value = b.dataset.v; },
      logout: () => { close(); ctx.store.logout(); ctx.afterChange(); } })[b.dataset.w]?.(); });
  d.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); if (step === 'name') saveName(); else if (step === 'demo') demoGo(); } });
  d.addEventListener('close', () => { run++; });
}
