// Christmas Radio: public-domain carols played by a tiny WebAudio synth (no audio files needed).
const N = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const hz = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return 440 * 2 ** ((12 * (+m[2] + 1) + N[m[1]] - 69) / 12); };
// notes: "NOTE:beats" (R = rest). Add your own songs here!
export const SONGS = [
  { name: 'Jingle Bells', bpm: 132, notes: 'E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:.5 E4:4 F4:1 F4:1 F4:1.5 F4:.5 F4:1 E4:1 E4:1 E4:.5 E4:.5 E4:1 D4:1 D4:1 E4:1 D4:2 G4:2 R:1' },
  { name: 'We Wish You a Merry Christmas', bpm: 138, notes: 'D4:1 G4:1 G4:.5 A4:.5 G4:.5 F#4:.5 E4:1 E4:1 E4:1 A4:1 A4:.5 B4:.5 A4:.5 G4:.5 F#4:1 D4:1 D4:.5 D4:.5 B4:1 B4:.5 C5:.5 B4:.5 A4:.5 G4:1 E4:1 D4:.5 D4:.5 E4:1 A4:1 F#4:1 G4:3 R:1' },
  { name: 'Silent Night', bpm: 84, notes: 'G4:1.5 A4:.5 G4:1 E4:3 G4:1.5 A4:.5 G4:1 E4:3 D5:2 D5:1 B4:3 C5:2 C5:1 G4:3 A4:2 A4:1 C5:1.5 B4:.5 A4:1 G4:1.5 A4:.5 G4:1 E4:3 A4:2 A4:1 C5:1.5 B4:.5 A4:1 G4:1.5 A4:.5 G4:1 E4:3 D5:2 D5:1 F5:1.5 D5:.5 B4:1 C5:3 E5:3 C5:1 G4:1 E4:1 G4:1.5 F4:.5 D4:1 C4:3 R:2' },
  { name: 'Deck the Halls', bpm: 126, notes: 'G4:1.5 F4:.5 E4:1 D4:1 C4:1 D4:1 E4:1 C4:1 D4:.5 E4:.5 F4:.5 D4:.5 E4:1.5 D4:.5 C4:1 B3:1 C4:2 R:1' },
];
export class Radio {
  i = 0; on = false; nodes = []; ls = []; vol = +(localStorage.xmas_vol ?? .5);
  get song() { return SONGS[this.i]; }
  onChange(f) { this.ls.push(f); } emit() { this.ls.forEach(f => f()); }
  play(i = this.i) {
    this.stop(true); this.i = (i + SONGS.length) % SONGS.length; this.on = true;
    this.ac ||= new (window.AudioContext || window.webkitAudioContext)(); this.ac.resume?.();
    const ac = this.ac, s = this.song, beat = 60 / s.bpm, out = this.gain = ac.createGain(); out.gain.value = this.vol; out.connect(ac.destination);
    let t = ac.currentTime + .15; for (const tok of s.notes.split(' ')) { const [n, d] = tok.split(':'), dur = +d * beat; if (n !== 'R') this.tone(hz(n), t, dur, out); t += dur; }
    this.timer = setTimeout(() => this.on && this.play(this.i + 1), (t - ac.currentTime + .8) * 1000); this.emit();
  }
  tone(f, t, dur, out) {                                  // soft bell: triangle + quiet octave
    [[f, 'triangle', .5], [f * 2, 'sine', .15]].forEach(([fr, type, g]) => { const o = this.ac.createOscillator(), e = this.ac.createGain(); o.type = type; o.frequency.value = fr;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + .02); e.gain.exponentialRampToValueAtTime(.001, t + Math.max(.3, dur * .95));
      o.connect(e); e.connect(out); o.start(t); o.stop(t + dur + .15); this.nodes.push(o); });
  }
  stop(keep) { clearTimeout(this.timer); this.nodes.forEach(o => { try { o.stop(); } catch { } }); this.nodes = []; this.gain?.disconnect(); if (!keep) { this.on = false; this.emit(); } }
  toggle() { this.on ? this.stop() : this.play(); return this.on; }
  setVol(v) { this.vol = v; localStorage.xmas_vol = v; if (this.gain) this.gain.gain.value = v; }
}
