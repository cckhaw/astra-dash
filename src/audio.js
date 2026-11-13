// Procedural audio: everything is synthesised with the Web Audio API,
// no samples. A look-ahead scheduler plays an original looping tune for
// each world.
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

// Each song is 8 bars of 8 eighth-notes. `melody` holds MIDI notes (0 =
// rest), `bass` one root per bar, `chords` one triad per bar. The drum
// arrays list which eighth-notes of a bar are hit.
const SONGS = [
  {
    // World 1 — bright and bouncy, C major.
    bpm: 152, lead: 'square', leadVol: 0.11, bassWave: 'triangle', bassPattern: [0, 12, 7, 12],
    kick: [0, 4], snare: [2, 6], hat: [1, 3, 5, 7], stab: [2, 5], stabWave: 'sawtooth',
    melody: [
      [72, 0, 76, 79, 0, 76, 79, 84], [83, 0, 79, 76, 0, 72, 74, 76], [77, 0, 81, 84, 0, 81, 77, 81], [79, 0, 74, 79, 83, 0, 79, 74],
      [76, 0, 72, 76, 81, 0, 84, 81], [77, 77, 0, 81, 84, 0, 81, 77], [79, 0, 83, 86, 0, 83, 79, 83], [84, 0, 79, 76, 72, 0, 0, 0],
    ],
    bass: [36, 36, 41, 43, 45, 41, 43, 36],
    chords: [[60, 64, 67], [60, 64, 67], [65, 69, 72], [67, 71, 74], [69, 72, 76], [65, 69, 72], [67, 71, 74], [60, 64, 67]],
  },
  {
    // World 2 — wistful rainy-day tune, A minor, slower with soft pads.
    bpm: 112, lead: 'triangle', leadVol: 0.2, bassWave: 'sine', bassPattern: [0, 7, 12, 7],
    kick: [0], snare: [], hat: [2, 4, 6], stab: [0], stabWave: 'sine', pad: true,
    melody: [
      [69, 0, 72, 76, 0, 72, 76, 0], [77, 0, 76, 72, 0, 69, 0, 0], [67, 0, 72, 76, 0, 79, 76, 0], [74, 0, 71, 67, 0, 71, 74, 0],
      [69, 0, 72, 76, 0, 81, 0, 79], [77, 0, 76, 72, 0, 69, 72, 0], [71, 0, 68, 64, 0, 68, 71, 0], [76, 0, 0, 74, 71, 68, 64, 0],
    ],
    bass: [45, 41, 48, 43, 45, 41, 40, 40],
    chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60], [56, 59, 64], [56, 59, 64]],
  },
  {
    // World 3 — sunny island calypso, G major, syncopated.
    bpm: 132, lead: 'sine', leadVol: 0.2, bell: true, bassWave: 'triangle', bassPattern: [0, 0, 7, 12],
    kick: [0, 3, 6], snare: [], hat: [0, 1, 2, 3, 4, 5, 6, 7], block: [2, 5], stab: [1, 4, 7], stabWave: 'triangle',
    melody: [
      [79, 0, 83, 0, 86, 83, 0, 79], [84, 0, 88, 84, 0, 79, 0, 76], [86, 0, 81, 0, 78, 81, 0, 86], [83, 0, 79, 0, 74, 0, 79, 0],
      [76, 0, 79, 83, 0, 79, 83, 88], [84, 0, 79, 76, 0, 72, 76, 0], [81, 0, 78, 81, 86, 0, 84, 81], [79, 0, 0, 79, 0, 74, 79, 0],
    ],
    bass: [43, 48, 50, 43, 40, 48, 50, 43],
    chords: [[55, 59, 62], [60, 64, 67], [57, 62, 66], [55, 59, 62], [64, 67, 71], [60, 64, 67], [57, 62, 66], [55, 59, 62]],
  },
  {
    // World 4 — desert caravan, D Phrygian dominant, drone bass and toms.
    bpm: 138, lead: 'sawtooth', leadVol: 0.085, bassWave: 'sawtooth', bassVol: 0.14, bassPattern: [0, 0, 0, 0],
    kick: [0, 4, 5], snare: [], tom: [2, 6, 7], hat: [], stab: [3, 7], stabWave: 'square',
    melody: [
      [74, 0, 75, 78, 0, 75, 74, 0], [78, 79, 81, 0, 79, 78, 75, 74], [75, 0, 78, 79, 0, 82, 81, 0], [79, 78, 75, 0, 74, 0, 0, 0],
      [81, 0, 82, 81, 0, 79, 78, 0], [79, 0, 81, 79, 0, 78, 75, 0], [74, 75, 78, 79, 81, 82, 81, 79], [78, 0, 75, 0, 74, 0, 0, 0],
    ],
    bass: [38, 38, 39, 38, 43, 38, 39, 38],
    chords: [[62, 66, 69], [62, 66, 69], [63, 67, 70], [62, 66, 69], [62, 67, 70], [62, 66, 69], [63, 67, 70], [62, 66, 69]],
  },
  {
    // World 5 — driving finale under the stars, E minor, with bell sparkle.
    bpm: 146, lead: 'square', leadVol: 0.1, bell: true, bassWave: 'triangle', bassPattern: [0, 12, 0, 12],
    kick: [0, 2, 4, 6], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], stab: [0, 3, 6], stabWave: 'sawtooth',
    melody: [
      [76, 0, 79, 83, 0, 79, 76, 0], [84, 0, 83, 79, 0, 76, 72, 0], [74, 0, 79, 83, 0, 86, 83, 0], [81, 0, 78, 74, 0, 78, 81, 0],
      [88, 0, 86, 83, 0, 79, 83, 0], [84, 0, 79, 76, 0, 79, 84, 0], [83, 0, 87, 90, 0, 87, 83, 0], [78, 0, 75, 71, 0, 0, 0, 0],
    ],
    bass: [40, 36, 43, 38, 40, 36, 35, 35],
    chords: [[64, 67, 71], [60, 64, 67], [59, 62, 67], [62, 66, 69], [64, 67, 71], [60, 64, 67], [59, 63, 66], [59, 63, 66]],
  },
];

// A short silent WAV. Looping it in an <audio> element makes iOS treat
// the page as media playback, so sound is not cut by the ring/silent switch.
function silentWavUrl() {
  const rate = 8000;
  const n = rate / 2;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, 'data');
  v.setUint32(40, n, true);
  new Uint8Array(buf, 44).fill(128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicOn = false;
    this.song = SONGS[0];
    this.songIndex = 0;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.primed = false;
  }

  // Call from every user gesture: creates the context on first use and
  // resumes it whenever the browser has suspended or interrupted it.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'playback';
      } catch {
        /* not supported */
      }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.7;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.ctx.onstatechange = () => {
        if (this.ctx.state === 'running' && this.musicOn) this.nextTime = this.ctx.currentTime + 0.08;
      };
    }
    if (this.ctx.state !== 'running') {
      const p = this.ctx.resume();
      if (p && p.catch) p.catch(() => {});
    }
    if (!this.primed) {
      // iOS only starts the output once a buffer has been played inside a gesture.
      this.primed = true;
      const s = this.ctx.createBufferSource();
      s.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      s.connect(this.ctx.destination);
      s.start(0);
      if (!navigator.audioSession) {
        try {
          this.keepAlive = new Audio(silentWavUrl());
          this.keepAlive.loop = true;
          this.keepAlive.setAttribute('playsinline', '');
          this.keepAlive.setAttribute('x-webkit-airplay', 'deny');
        } catch {
          this.keepAlive = null;
        }
      }
    }
    if (this.keepAlive && this.keepAlive.paused && !document.hidden) {
      const p = this.keepAlive.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  // Stop holding the audio session while the tab is in the background.
  background() {
    if (this.keepAlive) this.keepAlive.pause();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02);
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
    o.connect(g);
    g.connect(bus);
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
    s.connect(f);
    f.connect(g);
    g.connect(bus);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  // ---- music ----
  startMusic(index = this.songIndex) {
    this.unlock();
    if (!this.ctx) return;
    const song = SONGS[index % SONGS.length];
    if (this.musicOn && song === this.song) return;
    if (song !== this.song) this.step = 0;
    this.song = song;
    this.songIndex = index;
    clearInterval(this.timer);
    this.musicOn = true;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    this.musicOn = false;
    clearInterval(this.timer);
  }

  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const stepLen = 30 / this.song.bpm; // one eighth-note
    // If the tab was throttled, skip ahead instead of bursting notes.
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.14) {
      this.playStep(this.step, this.nextTime, stepLen);
      this.nextTime += stepLen;
      this.step = (this.step + 1) % 64;
    }
  }

  playStep(step, t, len) {
    const s = this.song;
    const bar = step >> 3;
    const i = step & 7;
    const bus = this.musicBus;
    const m = s.melody[bar][i];
    if (m) {
      this.tone(mtof(m), t, len * (s.pad ? 1.6 : 0.95), { type: s.lead, vol: s.leadVol, bus });
      if (s.bell) this.tone(mtof(m + 12), t, len * 1.4, { type: 'sine', vol: 0.06, bus });
      else this.tone(mtof(m) * 2.005, t, len * 0.5, { type: 'triangle', vol: 0.05, bus });
    }
    if (i % 2 === 0) {
      const b = s.bass[bar] + s.bassPattern[i / 2];
      this.tone(mtof(b), t, len * 1.6, { type: s.bassWave, vol: s.bassVol || 0.3, bus });
    }
    if (s.stab.includes(i)) {
      for (const n of s.chords[bar]) this.tone(mtof(n), t, len * (s.pad ? 7.5 : 0.8), { type: s.stabWave, vol: s.pad ? 0.05 : 0.025, bus, attack: s.pad ? 0.25 : 0.005 });
    }
    if (s.kick.includes(i)) this.tone(140, t, 0.12, { type: 'sine', vol: 0.5, to: 45, bus });
    if (s.snare.includes(i)) this.noise(t, 0.1, { vol: 0.16, freq: 1800, bus });
    if (s.hat.includes(i)) this.noise(t, 0.035, { vol: s.pad ? 0.035 : 0.06, freq: 7000, bus });
    if (s.tom && s.tom.includes(i)) this.tone(i === 7 ? 150 : 110, t, 0.16, { type: 'sine', vol: 0.4, to: 70, bus });
    if (s.block && s.block.includes(i)) this.tone(i === 2 ? 1250 : 940, t, 0.05, { type: 'sine', vol: 0.14, bus });
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
  splash() {
    const t = this.now;
    this.noise(t, 0.35, { vol: 0.3, freq: 1400, type: 'bandpass' });
    this.tone(500, t, 0.25, { type: 'sine', vol: 0.2, to: 120 });
  }
  jet() {
    const t = this.now;
    this.noise(t, 0.4, { vol: 0.28, freq: 900, type: 'bandpass' });
    this.tone(180, t, 0.35, { type: 'sawtooth', vol: 0.12, to: 620 });
  }
  dash() {
    const t = this.now;
    this.noise(t, 0.22, { vol: 0.25, freq: 2600, type: 'bandpass' });
    this.tone(880, t, 0.2, { type: 'square', vol: 0.1, to: 220 });
  }
  gem() {
    this.seq([84, 88, 91, 96], 0.07, { type: 'sine', vol: 0.3 });
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
