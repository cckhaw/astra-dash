// Procedural audio: everything is synthesised with the Web Audio API,
// no samples. A look-ahead scheduler plays an original looping tune.
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

const MELODY = [
  [72, 0, 76, 79, 0, 76, 79, 84],
  [83, 0, 79, 76, 0, 72, 74, 76],
  [77, 0, 81, 84, 0, 81, 77, 81],
  [79, 0, 74, 79, 83, 0, 79, 74],
  [76, 0, 72, 76, 81, 0, 84, 81],
  [77, 77, 0, 81, 84, 0, 81, 77],
  [79, 0, 83, 86, 0, 83, 79, 83],
  [84, 0, 79, 76, 72, 0, 0, 0],
];
const BASS = [36, 36, 41, 43, 45, 41, 43, 36];
const CHORD = [
  [60, 64, 67], [60, 64, 67], [65, 69, 72], [67, 71, 74],
  [69, 72, 76], [65, 69, 72], [67, 71, 74], [60, 64, 67],
];
const STEP = 60 / 152 / 2; // one 8th note

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicOn = false;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  // Must be called from a user gesture.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.5;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.02);
    return this.muted;
  }

  tone(freq, t, dur, { type = 'square', vol = 0.2, to = null, bus = this.sfxBus, attack = 0.005 } = {}) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(t, dur, { vol = 0.2, freq = 4000, type = 'highpass', bus = this.sfxBus } = {}) {
    if (!this.ctx) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  // ---- music ----
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    this.musicOn = false;
    clearInterval(this.timer);
  }

  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    // If the tab was throttled, skip ahead instead of bursting notes.
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.14) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step = (this.step + 1) % 64;
    }
  }

  playStep(step, t) {
    const bar = step >> 3;
    const i = step & 7;
    const bus = this.musicBus;
    const m = MELODY[bar][i];
    if (m) {
      this.tone(mtof(m), t, STEP * 0.95, { type: 'square', vol: 0.11, bus });
      this.tone(mtof(m) * 2.005, t, STEP * 0.5, { type: 'triangle', vol: 0.05, bus });
    }
    if (i % 2 === 0) {
      const b = BASS[bar] + [0, 12, 7, 12][i / 2];
      this.tone(mtof(b), t, STEP * 1.6, { type: 'triangle', vol: 0.3, bus });
    }
    if (i === 2 || i === 5) {
      for (const n of CHORD[bar]) this.tone(mtof(n), t, STEP * 0.8, { type: 'sawtooth', vol: 0.025, bus });
    }
    if (i === 0 || i === 4) this.tone(140, t, 0.12, { type: 'sine', vol: 0.5, to: 45, bus });
    if (i === 2 || i === 6) this.noise(t, 0.1, { vol: 0.16, freq: 1800, bus });
    if (i % 2 === 1) this.noise(t, 0.035, { vol: 0.07, freq: 7000, bus });
  }

  // ---- sound effects ----
  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }
  seq(notes, step, opts) {
    const t = this.now;
    notes.forEach((n, i) => n && this.tone(mtof(n), t + i * step, step * 1.4, opts));
  }
  jump() {
    this.tone(330, this.now, 0.16, { vol: 0.16, to: 720 });
  }
  doubleJump() {
    this.tone(520, this.now, 0.18, { vol: 0.16, to: 1150 });
  }
  coin() {
    const t = this.now;
    this.tone(mtof(83), t, 0.07, { vol: 0.14 });
    this.tone(mtof(88), t + 0.07, 0.28, { vol: 0.14 });
  }
  block() {
    const t = this.now;
    this.tone(190, t, 0.1, { type: 'triangle', vol: 0.4, to: 90 });
    this.tone(700, t, 0.04, { vol: 0.08 });
  }
  brick() {
    const t = this.now;
    this.noise(t, 0.22, { vol: 0.3, freq: 900, type: 'bandpass' });
    this.tone(150, t, 0.12, { type: 'triangle', vol: 0.3, to: 60 });
  }
  stomp() {
    const t = this.now;
    this.tone(520, t, 0.14, { vol: 0.18, to: 110 });
    this.noise(t, 0.08, { vol: 0.15, freq: 1200, type: 'lowpass' });
  }
  pound() {
    const t = this.now;
    this.tone(120, t, 0.32, { type: 'sine', vol: 0.7, to: 32 });
    this.noise(t, 0.2, { vol: 0.3, freq: 500, type: 'lowpass' });
  }
  slamStart() {
    this.tone(900, this.now, 0.14, { type: 'sawtooth', vol: 0.08, to: 250 });
  }
  powerup() {
    this.seq([72, 76, 79, 84, 79, 84, 88], 0.06, { vol: 0.14 });
  }
  itemAppear() {
    this.seq([60, 64, 67, 72], 0.05, { type: 'triangle', vol: 0.25 });
  }
  oneUp() {
    this.seq([76, 79, 88, 84, 86, 91], 0.09, { vol: 0.14 });
  }
  checkpoint() {
    this.seq([67, 72, 79], 0.08, { type: 'triangle', vol: 0.3 });
  }
  hurt() {
    this.tone(440, this.now, 0.4, { type: 'sawtooth', vol: 0.18, to: 70 });
  }
  fanfare() {
    this.stopMusic();
    const t = this.now + 0.05;
    const notes = [60, 64, 67, 72, 76, 79, 0, 76, 79];
    notes.forEach((n, i) => {
      if (!n) return;
      const last = i === notes.length - 1;
      const dur = last ? 0.9 : 0.16;
      this.tone(mtof(n), t + i * 0.13, dur, { vol: 0.16 });
      this.tone(mtof(n - 12), t + i * 0.13, dur, { type: 'triangle', vol: 0.22 });
    });
  }
  gameOver() {
    this.stopMusic();
    this.seq([72, 67, 64, 60, 59, 55, 48], 0.2, { type: 'triangle', vol: 0.3 });
  }
}

export const audio = new AudioEngine();
