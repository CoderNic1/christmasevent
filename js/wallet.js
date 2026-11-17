// ─────────────────────────────────────────────────────────────────────────────
// WALLET ACCESS – READ-ONLY.
// The ONLY wallet calls this site ever makes are:
//   eth_requestAccounts  – "which address is connected?"  (also: wallet_requestPermissions, only to let the user pick another account)
//   eth_chainId          – which network the wallet is on (goes into the sign-in message)
//   personal_sign        – a FREE signature on a login message. It is not a transaction, costs no gas, moves nothing and
//                          grants no allowance. It only proves that the visitor controls the address.
// There is no eth_sendTransaction, no approvals, no token/NFT permissions anywhere in this code base.
//
// Wallets are found via EIP-6963 (MetaMask, Crypto.com Onchain, Coinbase, Rabby… all announce themselves), with a fallback to
// window.ethereum for older wallets. Phone users without an extension can use WalletConnect (optional, needs a free project id)
// or open the site inside the wallet app's own browser (MetaMask / Crypto.com Onchain both have one).
// ─────────────────────────────────────────────────────────────────────────────
const enc = new TextEncoder(), hex = u8 => [...u8].map(b => b.toString(16).padStart(2, '0')).join('');
export const isAddr = a => /^0x[a-fA-F0-9]{40}$/.test(a || '');

// ---- keccak-256 (tiny, dependency-free) – only used to write the address in EIP-55 "checksum" case, which wallets expect in sign-in messages ----
const M64 = (1n << 64n) - 1n, rotl = (x, n) => (n ? ((x << BigInt(n)) | (x >> BigInt(64 - n))) & M64 : x);
function keccakF(s) {
  let R = 1;
  for (let r = 0; r < 24; r++) {
    const C = [0, 1, 2, 3, 4].map(x => s[x] ^ s[x + 5] ^ s[x + 10] ^ s[x + 15] ^ s[x + 20]);
    for (let x = 0; x < 5; x++) { const D = C[(x + 4) % 5] ^ rotl(C[(x + 1) % 5], 1); for (let y = 0; y < 25; y += 5) s[y + x] ^= D; }
    let x = 1, y = 0, cur = s[1];
    for (let t = 0; t < 24; t++) { [x, y] = [y, (2 * x + 3 * y) % 5]; const tmp = s[x + 5 * y]; s[x + 5 * y] = rotl(cur, (((t + 1) * (t + 2)) / 2) % 64); cur = tmp; }
    for (let y = 0; y < 25; y += 5) { const row = s.slice(y, y + 5); for (let x = 0; x < 5; x++) s[y + x] = row[x] ^ (~row[(x + 1) % 5] & row[(x + 2) % 5] & M64); }
    for (let j = 0; j < 7; j++) { R = ((R << 1) ^ ((R >> 7) * 0x71)) % 256; if (R & 2) s[0] ^= 1n << BigInt((1 << j) - 1); }
  }
}
export function keccak256(bytes) {
  const rate = 136, s = Array(25).fill(0n), p = new Uint8Array(Math.ceil((bytes.length + 1) / rate) * rate);
  p.set(bytes); p[bytes.length] ^= 0x01; p[p.length - 1] ^= 0x80;
  for (let o = 0; o < p.length; o += rate) {
    for (let i = 0; i < rate / 8; i++) { let v = 0n; for (let j = 7; j >= 0; j--) v = (v << 8n) | BigInt(p[o + i * 8 + j]); s[i] ^= v; }
    keccakF(s);
  }
  const out = new Uint8Array(32); for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) out[i * 8 + j] = Number((s[i] >> BigInt(8 * j)) & 0xffn);
  return out;
}
export function checksum(addr) {
  const l = addr.slice(2).toLowerCase(), h = hex(keccak256(enc.encode(l)));
  return '0x' + [...l].map((c, i) => (parseInt(h[i], 16) >= 8 ? c.toUpperCase() : c)).join('');
}

// ---- the login message: standard EIP-4361 "Sign-In with Ethereum" text. MetaMask recognises it, shows a proper sign-in screen and
//      refuses it if the website's address does not match `domain` (phishing protection). Parsed again by functions/login-core.js. ----
export const STATEMENT = 'Sign in to Community Christmas. This signature is free: it is not a transaction and gives this site no access to your funds or NFTs.';
export const nonce = () => hex(crypto.getRandomValues(new Uint8Array(16)));
export const buildMessage = ({ domain, uri, address, chainId, nonce, issuedAt }) =>
  `${domain} wants you to sign in with your Ethereum account:\n${checksum(address)}\n\n${STATEMENT}\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;

// ---- wallet discovery ----
const found = new Map(), sleep = ms => new Promise(r => setTimeout(r, ms));
if (typeof window !== 'undefined') {
  addEventListener('eip6963:announceProvider', e => { const d = e.detail; if (d?.info?.uuid && d.provider) found.set(d.info.uuid, d); });
  dispatchEvent(new Event('eip6963:requestProvider'));
}
const guessName = p => (p.isDeficonnectProvider ? 'Crypto.com Onchain' : p.isMetaMask ? 'MetaMask' : p.isCoinbaseWallet ? 'Coinbase Wallet' : p.isBraveWallet ? 'Brave Wallet' : 'Browser wallet');
const rank = n => (/metamask/i.test(n) ? 0 : /crypto\.com/i.test(n) ? 1 : 2);
function list() {
  const out = [...found.values()].map(d => ({ id: d.info.uuid, name: String(d.info.name || 'Wallet'), icon: /^data:image\//.test(d.info.icon || '') ? d.info.icon : '', provider: d.provider, kind: 'injected' }));
  const seen = new Set(out.map(w => w.provider)), names = new Set(out.map(w => w.name.toLowerCase()));
  const eth = window.ethereum, legacy = [...(Array.isArray(eth?.providers) && eth.providers.length ? eth.providers : eth ? [eth] : []), window.deficonnectProvider].filter(Boolean);
  for (const p of legacy) { const name = guessName(p); if (seen.has(p) || names.has(name.toLowerCase())) continue; seen.add(p); names.add(name.toLowerCase()); out.push({ id: 'legacy:' + out.length, name, icon: '', provider: p, kind: 'injected' }); }
  return out.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
}
export async function discover() {
  let l = list(); if (l.length) return l;
  dispatchEvent(new Event('eip6963:requestProvider')); await sleep(350); return list();     // slow wallets announce a moment later
}

// ---- connect (read the address) + sign ----
export async function connect(w, { pick = false } = {}) {
  if (w.kind === 'wc') return wcConnect(w);
  if (pick) { try { await w.provider.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] }); } catch (e) { if (e?.code === 4001) throw e; } }   // account picker (read-only permission); unsupported wallets simply skip it
  const acc = await w.provider.request({ method: 'eth_requestAccounts' }), address = acc?.[0];
  if (!isAddr(address)) throw new Error('The wallet did not share an account.');
  let chainId = 1; try { chainId = parseInt(await w.provider.request({ method: 'eth_chainId' }), 16) || 1; } catch { }
  return { address: address.toLowerCase(), chainId };
}
export const sign = (w, message, address) => w.provider.request({ method: 'personal_sign', params: ['0x' + hex(enc.encode(message)), address] });
export const disconnect = w => { if (w.kind === 'wc') Promise.resolve(w.provider?.disconnect?.()).catch(() => { }); };   // WalletConnect session is only needed for the one signature

// ---- WalletConnect (optional: CONFIG.walletConnectProjectId) – QR / deep link for mobile wallets such as the Crypto.com Onchain app ----
const WC_SRC = 'https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.17.0/dist/index.umd.js', WC_GLOBAL = '@walletconnect/ethereum-provider';
let wcLoading;
export const loadWC = () => (wcLoading ||= new Promise((ok, no) => {
  if (window[WC_GLOBAL]?.EthereumProvider) return ok();
  window.process ||= { env: {}, versions: {}, browser: true };      // the WalletConnect bundle expects a Node-style `process` global
  const s = document.createElement('script'); s.src = WC_SRC; s.onload = ok; s.onerror = () => { wcLoading = null; no(new Error('Could not load WalletConnect (network blocked?).')); }; document.head.append(s);
}));
export const wcWallet = projectId => ({ id: 'walletconnect', name: 'WalletConnect', sub: 'Crypto.com app & other mobile wallets', icon: '', kind: 'wc', projectId });
async function wcConnect(w) {
  await loadWC();
  const p = await window[WC_GLOBAL].EthereumProvider.init({ projectId: w.projectId, chains: [1], showQrModal: true, methods: ['personal_sign'],
    metadata: { name: 'Community Christmas', description: 'Community Christmas event', url: location.origin, icons: [new URL('assets/favicon.svg', location.href).href] } });
  await p.connect(); w.provider = p;
  const address = p.accounts?.[0]; if (!isAddr(address)) throw new Error('The wallet did not share an account.');
  return { address: address.toLowerCase(), chainId: Number(p.chainId) || 1 };
}

// ---- helpers for the UI ----
export const isMobile = () => /android|iphone|ipad|ipod/i.test(navigator.userAgent);
export const metamaskAppLink = () => 'https://metamask.app.link/dapp/' + location.host + location.pathname + location.search;
export function friendly(e) {
  if (e?.code === 4001 || e?.code === 'ACTION_REJECTED' || /user (rejected|denied|cancel)|rejected the request|request reset/i.test(e?.message || '')) return 'You cancelled the request in your wallet.';
  if (e?.code === -32002) return 'Your wallet already has a pending request – open it and approve or reject it first.';
  return String(e?.message || e || 'Something went wrong.').replace(/^Firebase: /, '');
}
