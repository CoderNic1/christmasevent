// One interface, two backends: Demo (localStorage) and Fire (Firestore, batched).
import { CONFIG as C } from './config.js';
const KEY = 'xmas_demo_v1', G = 'https://www.gstatic.com/firebasejs/10.12.0/';
const blank = () => ({ user: null, pts: 0, donated: 0, wallet: '', doors: [], goals: {} });

class Base {
  cbs = []; s = blank();
  get state() { return this.s; }
  onChange(f) { this.cbs.push(f); }
  emit() { this.cbs.forEach(f => f()); }
  addPoints(n) { this.s.pts += n; this.dirty(); this.emit(); }
  donate(g, n) {
    n = Math.max(0, Math.min(n, this.s.pts)); if (!n) return 0;
    this.s.pts -= n; this.s.donated += n; this.s.goals[g] = (this.s.goals[g] || 0) + n;
    this.donateHook(g, n); this.emit(); return n;
  }
  dirty() {} donateHook() {}
}

class Demo extends Base {
  constructor() { super(); this.s = JSON.parse(localStorage.getItem(KEY) || 'null') || { ...blank(), goals: { lights: 120, tree: 80 } }; }
  save() { localStorage.setItem(KEY, JSON.stringify(this.s)); }
  async init() { return this.s.user; }
  async login() { this.s.user = { id: 'demo', name: prompt('Demo name (live mode uses Discord)') || 'Elf' }; this.save(); this.emit(); return this.s.user; }
  dirty() { this.save(); } donateHook() { this.save(); }
  setWallet(a) { this.s.wallet = a; this.save(); }
  openDoor(d, r) { this.s.doors.push(d); this.s.pts += r; this.save(); this.emit(); }
  async board() {
    const f = [['Frosty', 900], ['Rudolf', 640], ['Grinch', 410], ['Buddy', 220]];
    if (this.s.user) f.push([this.s.user.name, this.s.donated]);
    return f.sort((a, b) => b[1] - a[1]).slice(0, 10);
  }
}

class Fire extends Base {
  pend = { pts: 0, donated: 0, goals: {} }; bc = 0; bt = 0; boardCache = null;
  async init() {
    const [app, auth, fs] = await Promise.all(['app', 'auth', 'firestore'].map(m => import(`${G}firebase-${m}.js`)));
    this.fs = fs; this.auth = auth.getAuth(app.initializeApp(C.firebase)); this.db = fs.getFirestore();
    const tok = new URLSearchParams(location.hash.slice(1)).get('token');   // returned by Discord Cloud Function
    if (tok) { await auth.signInWithCustomToken(this.auth, tok); history.replaceState(null, '', location.pathname); }
    await this.auth.authStateReady();
    this.poll(); setInterval(() => this.poll(), C.pollMs); setInterval(() => this.flush(), C.flushMs);
    addEventListener('visibilitychange', () => document.hidden && this.flush());
    const u = this.auth.currentUser; return u ? this.load(u) : null;
  }
  async load(u) {
    const { doc, getDoc, setDoc } = this.fs, ref = this.uref = doc(this.db, 'users', u.uid), snap = await getDoc(ref);
    if (!snap.exists()) await setDoc(ref, { name: u.displayName || 'Elf', pts: 0, donated: 0, wallet: '', doors: [] });
    const d = snap.exists() ? snap.data() : { pts: 0, donated: 0, wallet: '', doors: [] };
    Object.assign(this.s, d, { user: { id: u.uid, name: u.displayName || d.name } }); this.emit(); return this.s.user;
  }
  login() { location.href = C.discordAuthUrl; }
  async poll() {
    const { doc, getDoc } = this.fs, d = await getDoc(doc(this.db, 'community', 'state'));
    if (d.exists()) { this.s.goals = { ...d.data().goals }; for (const g in this.pend.goals) this.s.goals[g] = (this.s.goals[g] || 0) + this.pend.goals[g]; this.emit(); }
  }
  dirty() { this.pend.pts = this.s.pts; this.pend.touch = 1; }
  donateHook(g, n) { this.pend.donated += n; this.pend.goals[g] = (this.pend.goals[g] || 0) + n; this.pend.touch = 1; }
  async flush() {                                // single batch, only if something changed
    if (!this.pend.touch || !this.s.user) return;
    const { writeBatch, doc, increment } = this.fs, p = this.pend, b = writeBatch(this.db);
    b.update(this.uref, { pts: p.pts, donated: increment(p.donated) });
    if (p.donated) b.update(doc(this.db, 'community', 'state'), Object.fromEntries(Object.entries(p.goals).map(([k, v]) => ['goals.' + k, increment(v)])));
    this.pend = { pts: p.pts, donated: 0, goals: {} }; await b.commit();
  }
  setWallet(a) { this.s.wallet = a; this.fs.updateDoc(this.uref, { wallet: a }); }
  openDoor(d, r) { this.s.doors.push(d); this.s.pts += r; this.dirty(); this.fs.updateDoc(this.uref, { doors: this.fs.arrayUnion(d) }); this.emit(); }
  async board() {
    if (this.boardCache && Date.now() - this.bt < C.boardMs) return this.boardCache;
    const { collection, query, orderBy, limit, getDocs } = this.fs;
    const q = await getDocs(query(collection(this.db, 'users'), orderBy('donated', 'desc'), limit(10)));
    this.bt = Date.now(); return this.boardCache = q.docs.map(d => [d.data().name, d.data().donated]);
  }
}
export const createStore = () => (C.firebase ? new Fire() : new Demo());
