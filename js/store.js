// One interface, two backends: Demo (localStorage, several test accounts) and Fire (Firestore, batched writes).
import { CONFIG as C } from './config.js';
import { discordLogin } from './discord.js';
import { gemRate, titleOf } from './remote.js';
const KEY = 'xmas_demo_v3', G = 'https://www.gstatic.com/firebasejs/10.12.0/';
const blankU = () => ({ pts: 0, donated: 0, gems: 0, gemDonated: 0, wallet: '', doors: [], inv: { x2: 0, cdreset: 0 }, badges: {}, stats: { plays: {}, best: {}, earned: 0, c: {} } });
const SEED = { lights: 600, tree: 700, fire: 400, presents: 350, train: 250 };

class Base {
  cbs = []; s = { user: null, goals: {}, cgems: 0, buildLocked: null, ...blankU() };
  get state() { return this.s; }
  onChange(f) { this.cbs.push(f); } emit() { this.cbs.forEach(f => f()); }
  logout() {} deleteAccount() {} dirty() {} hook() {} lockHook() {}
  addPoints(n) { this.s.pts += n; this.dirty(); this.emit(); }
  recordPlay(id, score, pts) { const t = this.s.stats; t.plays[id] = (t.plays[id] || 0) + 1; t.best[id] = Math.max(t.best[id] || 0, score); t.earned += pts; this.addPoints(pts); }
  count(k, n = 1) { const c = this.s.stats.c; c[k] = (c[k] || 0) + n; this.dirty(); }
  donate(g, n) { n = Math.max(0, Math.min(n, this.s.pts)); if (!n) return 0;
    this.s.pts -= n; this.s.donated += n; this.s.goals[g] = (this.s.goals[g] || 0) + n; this.count('don_' + g); this.hook({ goal: g, n }); this.emit(); return n; }
  exchange(gems) { const cost = gems * gemRate(); if (gems < 1 || cost > this.s.pts) return 0; this.s.pts -= cost; this.s.gems += gems; this.count('exchanged'); this.dirty(); this.emit(); return gems; }
  donateGems(n) { n = Math.max(0, Math.min(n, this.s.gems)); if (!n) return 0; this.s.gems -= n; this.s.gemDonated += n; this.s.cgems += n; this.hook({ gems: n }); this.emit(); return n; }
  buy(it) { if (this.s.gems < it.price || (it.type === 'own' && this.s.inv[it.id])) return false;
    this.s.gems -= it.price; this.s.inv[it.id] = it.type === 'own' ? 1 : (this.s.inv[it.id] || 0) + it.qty; this.count('bought'); this.dirty(); this.emit(); return true; }
  spend(id) { if (!(this.s.inv[id] > 0)) return false; this.s.inv[id]--; this.dirty(); this.emit(); return true; }
  award(id) { this.s.badges[id] = Date.now(); this.dirty(); this.emit(); }
  lockBuild(v) { this.s.buildLocked = v; this.lockHook(v); this.emit(); }
}

class Demo extends Base {   // localStorage backend; placeholder Discord login; several test accounts
  constructor() {
    super(); this.db = JSON.parse(localStorage.getItem(KEY) || 'null') || { goals: { ...SEED }, cgems: 0, buildLocked: null, users: {}, me: null };
    Object.assign(this.s, { goals: this.db.goals, cgems: this.db.cgems, buildLocked: this.db.buildLocked }); this.sel(this.db.me);
  }
  sel(id) { const u = this.db.users[id]; this.db.me = u ? id : null; this.s.user = u ? { id, name: u.name, color: u.color } : null; Object.assign(this.s, blankU(), u || {}); }
  save() { const u = this.db.users[this.db.me]; if (u) for (const k of Object.keys(blankU())) u[k] = this.s[k];
    Object.assign(this.db, { goals: this.s.goals, cgems: this.s.cgems, buildLocked: this.s.buildLocked }); localStorage.setItem(KEY, JSON.stringify(this.db)); }
  async init() { return this.s.user; }
  async login() { const p = await discordLogin(); if (!p) return null; this.db.users[p.id] ||= { name: p.name, color: p.color, ...blankU() }; this.sel(p.id); this.save(); this.emit(); return this.s.user; }
  logout() { this.save(); this.sel(null); this.save(); this.emit(); }
  deleteAccount() { delete this.db.users[this.db.me]; this.sel(null); this.save(); this.emit(); }
  dirty() { this.save(); } hook() { this.save(); } lockHook() { this.s.cgems += 65; this.save(); }   // 65 💎 = fake NPC gem donors
  setWallet(a) { this.s.wallet = a; this.save(); }
  async loadLive() { let d = localStorage.getItem('xmas_live_v1'); if (!d) { const n = Date.now(), H = 36e5, iso = h => new Date(n + h * H).toISOString();   // sample events so you can see the system working
      d = JSON.stringify({ events: [{ id: 'welcome', type: 'xpoints', icon: '✨', title: 'Welcome Weekend: Double ❄', desc: 'Every mini-game gives 2× snowflakes!', start: iso(-1), end: iso(72), params: { mult: 2 } },
        { id: 'crown', type: 'shop', icon: '👑', title: 'Exclusive: Snowflake Crown', desc: 'A title that is only buyable during this event – gone forever afterwards!', start: iso(-1), end: iso(48), params: { item: { id: 'crown', name: 'Snowflake Crown', icon: '👑', price: 30, type: 'own', title: '👑 Snow King', desc: 'Event exclusive title.' } } }], calendar: { days: {} } }); localStorage.setItem('xmas_live_v1', d); }
    return JSON.parse(d); }
  async saveLive(d) { localStorage.setItem('xmas_live_v1', JSON.stringify(d)); }
  openDoor(d, r) { this.s.doors.push(d); this.s.pts += r; this.save(); this.emit(); }
  cheat(k) {   // test tools (demo only)
    if (k === 'pts') this.s.pts += 500; if (k === 'gems') this.s.gems += 50;
    if (k === 'build') C.goals.forEach(g => { if (!g.final) this.s.goals[g.id] = g.levels.at(-1).t; });
    if (k === 'all') C.goals.forEach(g => this.s.goals[g.id] = g.levels.at(-1).t);
    if (k === 'reset') { localStorage.removeItem(KEY); location.reload(); return; } this.save(); this.emit();
  }
  async board(kind) {
    const npc = kind === 'build' ? { Frosty: 900, Rudolf: 640, Grinch: 410, Buddy: 220 } : this.s.buildLocked != null ? { Frosty: 40, Rudolf: 25 } : {};
    const real = Object.values(this.db.users).map(u => [u.name, kind === 'build' ? u.donated : u.gemDonated, titleOf(u.inv)]).filter(r => r[1] > 0 || kind === 'build');
    const me = this.s.user; real.forEach(r => { if (me && r[0] === me.name) r[1] = kind === 'build' ? this.s.donated : this.s.gemDonated; });
    return [...Object.entries(npc).filter(([n]) => !real.some(r => r[0] === n)).map(([n, v]) => [n, v, '']), ...real].filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }
}

class Fire extends Base {
  pend = { goals: {}, donated: 0, cg: 0, touch: 0 }; bc = {}; bt = {};
  async init() {
    const [app, auth, fs] = await Promise.all(['app', 'auth', 'firestore'].map(m => import(`${G}firebase-${m}.js`)));
    this.fs = fs; this.auth = auth.getAuth(app.initializeApp(C.firebase)); this.db = fs.getFirestore();
    const tok = new URLSearchParams(location.hash.slice(1)).get('token');   // returned by the Discord Cloud Function
    if (tok) { await auth.signInWithCustomToken(this.auth, tok); history.replaceState(null, '', location.pathname); }
    await this.auth.authStateReady(); this.poll(); setInterval(() => this.poll(), C.pollMs); setInterval(() => this.flush().catch(console.warn), C.flushMs);
    addEventListener('visibilitychange', () => document.hidden && this.flush().catch(console.warn));
    const u = this.auth.currentUser; return u ? this.load(u) : null;
  }
  async load(u) {
    const { doc, getDoc, setDoc } = this.fs, ref = this.uref = doc(this.db, 'users', u.uid), snap = await getDoc(ref);
    if (!snap.exists()) await setDoc(ref, { name: u.displayName || 'Elf', ...blankU() });
    Object.assign(this.s, blankU(), snap.exists() ? snap.data() : {}, { user: { id: u.uid, name: u.displayName || 'Elf' } }); this.emit(); return this.s.user;
  }
  login() { if (!C.discordAuthUrl) throw new Error('Set CONFIG.discordAuthUrl (Discord Cloud Function, see README)'); location.href = C.discordAuthUrl; }
  async logout() { await this.auth.signOut(); location.reload(); }
  async deleteAccount() { await this.fs.deleteDoc(this.uref); try { await this.auth.currentUser.delete(); } catch { await this.auth.signOut(); } location.reload(); }
  async poll() {
    const { doc, getDoc } = this.fs; let d; try { d = await getDoc(doc(this.db, 'community', 'state')); } catch (e) { return console.warn(e); }
    if (!d.exists()) return; const v = d.data(); this.s.goals = { ...v.goals }; this.s.cgems = (v.cgems || 0) + this.pend.cg; this.s.buildLocked = v.buildLocked ?? null;
    for (const g in this.pend.goals) this.s.goals[g] = (this.s.goals[g] || 0) + this.pend.goals[g]; this.emit();
  }
  dirty() { this.pend.touch = 1; }
  hook(h) { this.pend.touch = 1; if (h.goal) { this.pend.donated += h.n; this.pend.goals[h.goal] = (this.pend.goals[h.goal] || 0) + h.n; } if (h.gems) this.pend.cg += h.gems; }
  lockHook(v) { this.fs.updateDoc(this.fs.doc(this.db, 'community', 'state'), { buildLocked: v }).catch(console.warn); }   // rules: allow only if currently unset
  async flush() {                       // ONE batched write per interval, only when something changed
    if (!this.pend.touch || !this.s.user) return; const { writeBatch, doc, increment } = this.fs, p = this.pend, b = writeBatch(this.db), s = this.s;
    b.update(this.uref, { pts: s.pts, gems: s.gems, gemDonated: s.gemDonated, donated: increment(p.donated), inv: s.inv, badges: s.badges, stats: s.stats, doors: s.doors });
    const cu = Object.fromEntries(Object.entries(p.goals).map(([k, v]) => ['goals.' + k, increment(v)])); if (p.cg) cu.cgems = increment(p.cg);
    if (Object.keys(cu).length) b.update(doc(this.db, 'community', 'state'), cu);
    this.pend = { goals: {}, donated: 0, cg: 0, touch: 0 };
    try { await b.commit(); } catch (e) { for (const k in p.goals) this.pend.goals[k] = (this.pend.goals[k] || 0) + p.goals[k]; this.pend.donated += p.donated; this.pend.cg += p.cg; this.pend.touch = 1; throw e; }
  }
  async loadLive() { try { const d = await this.fs.getDoc(this.fs.doc(this.db, 'config', 'live')); return d.exists() ? d.data() : null; } catch (e) { console.warn(e); return null; } }   // 1 read / 5 min
  async saveLive(d) { await this.fs.setDoc(this.fs.doc(this.db, 'config', 'live'), d); }                                                                            // rules: admin UIDs only
  setWallet(a) { this.s.wallet = a; this.fs.updateDoc(this.uref, { wallet: a }); }
  openDoor(d, r) { this.s.doors.push(d); this.s.pts += r; this.dirty(); this.emit(); }
  async board(kind) {
    if (this.bc[kind] && Date.now() - this.bt[kind] < C.boardMs) return this.bc[kind];
    const { collection, query, orderBy, limit, getDocs } = this.fs, fld = kind === 'build' ? 'donated' : 'gemDonated';
    const q = await getDocs(query(collection(this.db, 'users'), orderBy(fld, 'desc'), limit(10)));
    this.bt[kind] = Date.now(); return this.bc[kind] = q.docs.map(d => [d.data().name, d.data()[fld] || 0, titleOf(d.data().inv)]).filter(r => r[1] > 0);
  }
}
export const createStore = demo => (C.firebase && !demo ? new Fire() : new Demo());
