// One interface, two backends: Demo (localStorage, several test accounts) and Fire (Firestore, batched writes, rules-compatible bookkeeping).
import { CONFIG as C } from './config.js';
import { discordLogin } from './discord.js';
import { gemRate, dailyCap } from './remote.js';
const KEY = 'xmas_demo_v4', G = 'https://www.gstatic.com/firebasejs/10.12.0/';
const dayInt = () => { const d = new Date(); return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); };   // same formula as firestore.rules
// Bookkeeping fields are what lets the security rules verify points: pts + donated + exchCost == earnedTotal  and  gems + gemDonated + shopSpent == gemsMade
const blankU = () => ({ pts: 0, donated: 0, gems: 0, gemDonated: 0, wallet: '', doors: [], inv: { x2: 0, cdreset: 0 }, badges: {}, tag: '', earnedTotal: 0, earnedToday: 0, capDay: 0, exchCost: 0, gemsMade: 0, shopSpent: 0, stats: { plays: {}, best: {}, earned: 0, c: {} } });
const SEED = { lights: 600, tree: 700, fire: 400, presents: 350, train: 250 };
const hue = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 360;

class Base {
  cbs = []; s = { user: null, goals: {}, cgems: 0, buildLocked: null, ...blankU() }; autoLock = true; lastSync = 0;
  get state() { return this.s; }
  onChange(f) { this.cbs.push(f); } emit() { this.cbs.forEach(f => f()); }
  logout() {} deleteAccount() {} dirty() {} hook() {} lockHook() {} unsynced() { return 0; }
  // ---- earning (all sources pass through the HARD DAILY CAP) ----
  rollover() { const d = dayInt(); if (this.s.capDay !== d) { this.s.capDay = d; this.s.earnedToday = this.unsynced(); } }
  capLeft() { this.rollover(); return Math.max(0, dailyCap() - this.s.earnedToday); }
  earn(n) { const g = Math.max(0, Math.min(Math.floor(n), this.capLeft())); if (g) { this.s.pts += g; this.s.earnedToday += g; this.s.earnedTotal += g; this.dirty(); this.emit(); } return g; }
  recordPlay(id, score, pts) { const t = this.s.stats; t.plays[id] = (t.plays[id] || 0) + 1; t.best[id] = Math.max(t.best[id] || 0, score); const g = this.earn(pts); t.earned += g; this.dirty(); return g; }
  count(k, n = 1) { const c = this.s.stats.c; c[k] = (c[k] || 0) + n; this.dirty(); }
  donate(g, n) { n = Math.max(0, Math.min(n, this.s.pts)); if (!n) return 0;
    this.s.pts -= n; this.s.donated += n; this.s.goals[g] = (this.s.goals[g] || 0) + n; this.count('don_' + g); this.hook({ goal: g, n }); this.emit(); return n; }
  exchange(gems) { const cost = gems * gemRate(); if (gems < 1 || cost > this.s.pts) return 0; this.s.pts -= cost; this.s.exchCost += cost; this.s.gems += gems; this.s.gemsMade += gems; this.count('exchanged'); this.dirty(); this.emit(); return gems; }
  donateGems(n) { n = Math.max(0, Math.min(n, this.s.gems)); if (!n) return 0; this.s.gems -= n; this.s.gemDonated += n; this.s.cgems += n; this.hook({ gems: n }); this.emit(); return n; }
  buy(it) { if (this.s.gems < it.price || (it.type === 'own' && this.s.inv[it.id])) return false;
    this.s.gems -= it.price; this.s.shopSpent += it.price; this.s.inv[it.id] = it.type === 'own' ? 1 : (this.s.inv[it.id] || 0) + (it.qty || 1); if (it.title && !this.s.tag) this.s.tag = it.title;
    this.count('bought'); this.dirty(); this.emit(); return true; }
  spend(id) { if (!(this.s.inv[id] > 0)) return false; this.s.inv[id]--; this.dirty(); this.emit(); return true; }
  setTag(t) { this.s.tag = String(t || '').slice(0, 40); this.dirty(); this.emit(); }
  award(id) { this.s.badges[id] = Date.now(); this.dirty(); this.emit(); }
  lockBuild(v) { this.s.buildLocked = v; this.lockHook(v); this.emit(); }
}

class Demo extends Base {   // localStorage backend; placeholder Discord login; several test accounts
  constructor() {
    super(); this.db = JSON.parse(localStorage.getItem(KEY) || 'null') || { goals: { ...SEED }, cgems: 0, buildLocked: null, users: {}, me: null };
    Object.assign(this.s, { goals: this.db.goals, cgems: this.db.cgems, buildLocked: this.db.buildLocked }); this.sel(this.db.me);
  }
  get admin() { return new URLSearchParams(location.search).has('admin'); } set admin(v) {}
  sel(id) { const u = this.db.users[id]; this.db.me = u ? id : null; this.s.user = u ? { id, name: u.name, color: u.color } : null; Object.assign(this.s, blankU(), u || {}); }
  save() { const u = this.db.users[this.db.me]; if (u) for (const k of Object.keys(blankU())) u[k] = this.s[k];
    Object.assign(this.db, { goals: this.s.goals, cgems: this.s.cgems, buildLocked: this.s.buildLocked }); localStorage.setItem(KEY, JSON.stringify(this.db)); this.lastSync = Date.now(); }
  async init() { return this.s.user; }
  async login() { const p = await discordLogin(); if (!p) return null; this.db.users[p.id] ||= { name: p.name, color: p.color, ...blankU() }; this.sel(p.id); this.save(); this.emit(); return this.s.user; }
  logout() { this.save(); this.sel(null); this.save(); this.emit(); }
  deleteAccount() { delete this.db.users[this.db.me]; this.sel(null); this.save(); this.emit(); }
  dirty() { this.save(); } hook() { this.save(); } lockHook() { this.s.cgems += 65; this.save(); }   // 65 💎 = fake NPC gem donors
  setWallet(a) { this.s.wallet = a; this.save(); }
  openDoor(d, r) { this.s.doors.push(d); const g = this.earn(r); this.save(); this.emit(); return g; }
  async loadLive() { let d = localStorage.getItem('xmas_live_v1'); if (!d) { const n = Date.now(), H = 36e5, iso = h => new Date(n + h * H).toISOString();   // sample events so you can see the system working
      d = JSON.stringify({ events: [{ id: 'welcome', type: 'xpoints', icon: '✨', title: 'Welcome Weekend: Double ❄', desc: 'Every mini-game gives 2× snowflakes!', start: iso(-1), end: iso(72), params: { mult: 2 } },
        { id: 'crown', type: 'shop', icon: '👑', title: 'Exclusive: Snowflake Crown', desc: 'A title that is only buyable during this event – gone forever afterwards!', start: iso(-1), end: iso(48), params: { item: { id: 'crown', name: 'Snowflake Crown', icon: '👑', price: 30, type: 'own', title: '👑 Snow King', desc: 'Event exclusive title.' } } }], calendar: { days: {} } }); localStorage.setItem('xmas_live_v1', d); }
    return JSON.parse(d); }
  async saveLive(d) { localStorage.setItem('xmas_live_v1', JSON.stringify(d)); }
  async exportPayouts() { return Object.entries(this.db.users).map(([id, u]) => ({ id, name: u.name, wallet: u.wallet, donated: id === this.db.me ? this.s.donated : u.donated, gemDonated: id === this.db.me ? this.s.gemDonated : u.gemDonated })); }
  cheat(k) {   // test tools (demo only)
    if (k === 'pts') { this.s.pts += 500; this.s.earnedTotal += 500; } if (k === 'gems') { this.s.gems += 50; this.s.gemsMade += 50; this.s.exchCost += 500; this.s.earnedTotal += 500; }
    if (k === 'build') C.goals.forEach(g => { if (!g.final) this.s.goals[g.id] = g.levels.at(-1).t; });
    if (k === 'all') C.goals.forEach(g => this.s.goals[g.id] = g.levels.at(-1).t);
    if (k === 'cap') this.s.earnedToday = 1e9; if (k === 'uncap') this.s.earnedToday = 0;
    if (k === 'reset') { localStorage.removeItem(KEY); location.reload(); return; } this.save(); this.emit();
  }
  async board(kind) {
    const npc = kind === 'build' ? { Frosty: 900, Rudolf: 640, Grinch: 410, Buddy: 220 } : this.s.buildLocked != null ? { Frosty: 40, Rudolf: 25 } : {};
    const real = Object.values(this.db.users).map(u => [u.name, kind === 'build' ? u.donated : u.gemDonated, u.tag || '']).filter(r => r[1] > 0 || kind === 'build');
    const me = this.s.user; real.forEach(r => { if (me && r[0] === me.name) { r[1] = kind === 'build' ? this.s.donated : this.s.gemDonated; r[2] = this.s.tag; } });
    return [...Object.entries(npc).filter(([n]) => !real.some(r => r[0] === n)).map(([n, v]) => [n, v, '']), ...real].filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }
}

class Fire extends Base {   // Firestore backend. Data layout + invariants are enforced by firestore.rules.
  pend = { goals: {}, donated: 0, cg: 0, touch: 0 }; bc = {}; bt = {}; autoLock = false; admin = false; live = true; synced = null; fails = 0; lastTry = 0;
  unsynced() { return this.synced == null ? 0 : Math.max(0, this.s.earnedTotal - this.synced); }
  async init() {
    const [app, auth, fs] = await Promise.all(['app', 'auth', 'firestore'].map(m => import(`${G}firebase-${m}.js`)));
    this.fs = fs; this.A = auth; this.auth = auth.getAuth(app.initializeApp(C.firebase)); this.db = fs.getFirestore();
    const tok = new URLSearchParams(location.hash.slice(1)).get('token');   // returned by the Discord Cloud Function
    if (tok) { await auth.signInWithCustomToken(this.auth, tok); history.replaceState(null, '', location.pathname); }
    await this.auth.authStateReady(); this.poll(); setInterval(() => this.poll(), C.pollMs); setInterval(() => this.flush().catch(e => this.failed(e)), C.flushMs);
    addEventListener('visibilitychange', () => document.hidden && Date.now() - this.lastTry > 10000 && this.flush().catch(e => this.failed(e)));
    const u = this.auth.currentUser; return u ? this.load(u) : null;
  }
  async load(u) {
    const { doc, getDoc, setDoc, serverTimestamp } = this.fs, ref = this.uref = doc(this.db, 'users', u.uid), claims = (await u.getIdTokenResult()).claims, name = String(claims.name || u.displayName || 'Elf').slice(0, 24);
    let snap = await getDoc(ref); const { wallet, ...fresh } = blankU();
    if (!snap.exists()) { await setDoc(ref, { name, ...fresh, lastWrite: serverTimestamp() }); snap = await getDoc(ref); }
    const d = snap.data(); if (d.deleted) { await this.auth.signOut(); throw new Error('This account was deleted. Ask an admin to restore it.'); }
    Object.assign(this.s, blankU(), d, { user: { id: u.uid, name: d.name, color: `hsl(${hue(u.uid)} 60% 50%)` } }); this.synced = this.s.earnedTotal; this.pend = { goals: {}, donated: 0, cg: 0, touch: 0 };
    const w = await getDoc(doc(this.db, 'wallets', u.uid)); this.s.wallet = w.exists() ? w.data().address : '';
    this.admin = (await getDoc(doc(this.db, 'admins', u.uid))).exists(); this.lastSync = Date.now(); this.emit(); return this.s.user;
  }
  async login() {
    if (C.discordAuthUrl) { location.href = C.discordAuthUrl; return null; }
    if (!C.allowGoogleLogin) throw new Error('Set CONFIG.discordAuthUrl (see SETUP.md)');
    const A = this.A; await A.signInWithPopup(this.auth, new A.GoogleAuthProvider()); return this.load(this.auth.currentUser);
  }
  async logout() { await this.flush().catch(() => { }); await this.auth.signOut(); location.reload(); }
  async deleteAccount() {      // anonymise (rules forbid deleting the doc: that would reset the daily cap). Admin can hard-delete in the console.
    const { updateDoc, deleteDoc, doc, serverTimestamp } = this.fs; await deleteDoc(doc(this.db, 'wallets', this.s.user.id)).catch(() => { });
    await updateDoc(this.uref, { deleted: true, name: 'Deleted elf', tag: '', lastWrite: serverTimestamp() }); await this.auth.signOut(); location.reload();
  }
  async poll() {
    const { doc, getDoc } = this.fs; let d; try { d = await getDoc(doc(this.db, 'community', 'state')); } catch (e) { return console.warn(e); }
    if (!d.exists()) return console.warn('community/state is missing – see SETUP.md step 4'); const v = d.data(); this.lastSync = Date.now();
    this.s.goals = { ...v.goals }; this.s.cgems = (v.cgems || 0) + this.pend.cg; this.s.buildLocked = v.buildLocked ?? null;
    for (const g in this.pend.goals) this.s.goals[g] = (this.s.goals[g] || 0) + this.pend.goals[g]; this.emit();
  }
  dirty() { this.pend.touch = 1; }
  hook(h) { this.pend.touch = 1; if (h.goal) { this.pend.donated += h.n; this.pend.goals[h.goal] = (this.pend.goals[h.goal] || 0) + h.n; } if (h.gems) this.pend.cg += h.gems; }
  lockHook(v) { this.fs.updateDoc(this.fs.doc(this.db, 'community', 'state'), { buildLocked: v }).catch(console.warn); }   // admin only (rules)
  async flush() {                       // ONE batched write per interval; user doc + community doc in the same batch (rules cross-check them)
    if (!this.pend.touch || !this.s.user) return; this.rollover(); this.lastTry = Date.now(); const { writeBatch, doc, increment, serverTimestamp } = this.fs, p = this.pend, s = this.s, b = writeBatch(this.db), snap = s.earnedTotal;
    b.update(this.uref, { pts: s.pts, gems: s.gems, gemDonated: s.gemDonated, donated: increment(p.donated), earnedTotal: s.earnedTotal, earnedToday: s.earnedToday, capDay: s.capDay, exchCost: s.exchCost, gemsMade: s.gemsMade, shopSpent: s.shopSpent,
      inv: s.inv, badges: s.badges, stats: s.stats, doors: s.doors, tag: s.tag, lastWrite: serverTimestamp() });
    const cu = Object.fromEntries(Object.entries(p.goals).map(([k, v]) => ['goals.' + k, increment(v)])); if (p.cg) cu.cgems = increment(p.cg);
    if (Object.keys(cu).length) b.update(doc(this.db, 'community', 'state'), cu);
    this.pend = { goals: {}, donated: 0, cg: 0, touch: 0 };
    try { await b.commit(); this.synced = snap; this.lastSync = Date.now(); this.fails = 0; }
    catch (e) { for (const k in p.goals) this.pend.goals[k] = (this.pend.goals[k] || 0) + p.goals[k]; this.pend.donated += p.donated; this.pend.cg += p.cg; this.pend.touch = 1; throw e; }
  }
  async failed(e) {                     // retry once; after two failures assume a sync conflict (e.g. 2 tabs) and reload the server state
    console.warn('sync failed', e); if (++this.fails < 2) return;
    this.fails = 0; dispatchEvent(new CustomEvent('xmas-notice', { detail: '⚠ Sync conflict – your progress was reloaded from the server.' })); try { await this.load(this.auth.currentUser); } catch (er) { console.warn(er); }
  }
  setWallet(a) { this.s.wallet = a; this.fs.setDoc(this.fs.doc(this.db, 'wallets', this.s.user.id), { address: a, updated: this.fs.serverTimestamp() }); }   // private doc (rules)
  openDoor(d, r) { this.s.doors.push(d); const g = this.earn(r); this.dirty(); this.emit(); return g; }
  async loadLive() { try { const d = await this.fs.getDoc(this.fs.doc(this.db, 'config', 'live')); return d.exists() ? d.data() : null; } catch (e) { console.warn(e); return null; } }   // 1 read / 5 min
  async saveLive(d) { await this.fs.setDoc(this.fs.doc(this.db, 'config', 'live'), d); }                                                                                              // admin only (rules)
  async exportPayouts() {               // admin only: all users + their private wallets
    const { collection, getDocs } = this.fs, [u, w] = await Promise.all([getDocs(collection(this.db, 'users')), getDocs(collection(this.db, 'wallets'))]), wal = Object.fromEntries(w.docs.map(d => [d.id, d.data().address]));
    return u.docs.filter(d => !d.data().deleted).map(d => ({ id: d.id, name: d.data().name, wallet: wal[d.id] || '', donated: d.data().donated || 0, gemDonated: d.data().gemDonated || 0 }));
  }
  async board(kind) {
    if (this.bc[kind] && Date.now() - this.bt[kind] < C.boardMs) return this.bc[kind];
    const { collection, query, orderBy, limit, getDocs } = this.fs, fld = kind === 'build' ? 'donated' : 'gemDonated';
    const q = await getDocs(query(collection(this.db, 'users'), orderBy(fld, 'desc'), limit(10)));
    this.bt[kind] = Date.now(); return this.bc[kind] = q.docs.filter(d => !d.data().deleted).map(d => [d.data().name, d.data()[fld] || 0, d.data().tag || '']).filter(r => r[1] > 0);
  }
}
export const createStore = demo => (C.firebase && !demo ? new Fire() : new Demo());
