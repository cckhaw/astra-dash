import * as THREE from 'three';
import { LEVELS, INTRO, OUTRO } from './levels.js';
import * as M from './models.js';
import { audio } from './audio.js';
import { input, clearEdges } from './input.js';

const GRAVITY = 38;
const JUMP_V = 13.5;
const DOUBLE_V = 12;
const RUN_SPEED = 7.6;
const HW = 0.34; // player half-width
const PH = 1.25; // player height
const EPS = 0.001;
const LEDGE_HELP = 0.6; // how far below a ledge top a near-miss still counts
const WATER_Y = -9;
const HS_KEY = 'astra-dash-highscore';
const POWER_TIME = 12;
const START_LIVES = 5;

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

function loadHighScore() {
  try {
    return Number(localStorage.getItem(HS_KEY)) || 0;
  } catch {
    return 0;
  }
}

export class Game {
  constructor(canvas, ui) {
    this.ui = ui;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(input.touch ? 1024 : 2048, input.touch ? 1024 : 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -24;
    sc.right = sc.top = 24;
    sc.near = 1;
    sc.far = 70;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.hero = M.makeHero();
    this.blob = M.makeBlobShadow();
    this.ring = M.makeLandingRing();
    this.beam = M.makeDropLine();
    this.scene.add(this.hero, this.blob, this.ring, this.beam);

    this.cam = { yaw: 0, target: new THREE.Vector3(), shake: 0, lift: 0 };
    this.state = 'menu';
    this.levelIndex = 0;
    this.score = 0;
    this.coins = 0;
    this.lives = START_LIVES;
    this.high = loadHighScore();
    this.time = 0;
    this.clock = 0;
    this.p = this.newPlayer();
    this.level = new THREE.Group();
    this.scene.add(this.level);
    this.partGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    this.partMats = new Map();

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loadLevel(0);

    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      this.frame(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  newPlayer() {
    return {
      pos: new THREE.Vector3(), vel: new THREE.Vector3(), grounded: false, ground: null,
      coyote: 0, buffer: 0, jumps: 0, cut: true, pounding: false, hover: 0, invuln: 0,
      facing: Math.PI, flip: 0, squash: 0, runT: 0, jumpPower: 0, speedPower: 0,
    };
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, input.touch ? 1.5 : 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 72 : 55;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------
  // Level construction
  // ------------------------------------------------------------------
  loadLevel(index) {
    this.levelIndex = index;
    const def = LEVELS[index];
    const theme = (this.theme = def.theme);
    this.scene.remove(this.level);
    this.level = new THREE.Group();
    this.scene.add(this.level);

    this.solids = [];
    this.movers = [];
    this.pickups = [];
    this.slimes = [];
    this.lavas = [];
    this.checkpoints = [];
    this.tweens = [];
    this.parts = [];
    this.flag = null;
    this.spawnPoint = new THREE.Vector3(0, 0, 0);

    this.scene.background = M.makeSky(theme.skyTop, theme.skyBottom);
    this.scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
    this.sun.color.set(theme.sun);
    this.sun.intensity = theme.sunPower;
    this.hemi.intensity = theme.hemiPower;
    this.hemi.color.set(theme.hemiSky);
    this.hemi.groundColor.set(theme.hemiGround);

    this.waterY = def.waterY ?? WATER_Y;
    this.safeWater = !!def.safeWater;
    def.build(this.builder());

    this.scatterProps(theme);
    this.buildScenery(def, theme);
    this.buildWeather(theme.weather);

    this.time = def.time;
    this.respawn(true);
    this.safeAt = this.spawnPoint.clone();
    this.cam.yaw = 0;
    this.cam.target.copy(this.p.pos);
    this.syncHud(true);
  }

  // Sea, sky, clouds and distant landforms; each theme picks its own.
  buildScenery(def, theme) {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: theme.water, emissive: theme.waterGlow || 0x000000, transparent: true, opacity: 0.92 }),
    );
    water.position.set(0, this.waterY, -70);
    water.receiveShadow = true;
    this.level.add(water);

    this.clouds = [];
    for (let i = 0; i < theme.clouds.count; i++) {
      const c = M.makeCloud(theme.clouds);
      c.position.set(-95 + Math.random() * 190, theme.clouds.low + Math.random() * 20, 40 - Math.random() * 240);
      c.scale.setScalar(0.8 + Math.random() * theme.clouds.size);
      this.clouds.push(c);
      this.level.add(c);
    }

    // Things painted on the sky travel with the camera so they never get closer.
    this.sky = new THREE.Group();
    this.level.add(this.sky);
    const k = theme.sky;
    if (k.rainbow) {
      const r = M.makeArc();
      r.position.set(-10, this.waterY, -190);
      this.sky.add(r);
    }
    if (k.aurora) {
      const a = M.makeArc(['#3dffb0', '#35e0c8', '#4dabf7', '#9b6bff'], { radius: 110, width: 3.2, opacity: 0.3 });
      a.position.set(20, this.waterY - 30, -230);
      a.scale.y = 0.75;
      this.sky.add(a);
    }
    if (k.disc) {
      const d = M.makeDisc(k.disc.color, k.disc.size, k.disc.glow);
      d.position.set(k.disc.x, k.disc.y, -260);
      this.sky.add(d);
    }
    if (k.stars) this.sky.add(M.makeStars());

    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * (27 + Math.random() * 32);
      const z = 14 - i * 10.5;
      let obj;
      if (theme.far === 'peaks') {
        const h = 16 + Math.random() * 22;
        obj = M.makePeak(6 + Math.random() * 6, h, theme.rock);
        obj.position.set(x * 1.25, this.waterY - 1, z);
      } else {
        const w = theme.far === 'mesas' ? 3.5 + Math.random() * 4 : 4 + Math.random() * 6;
        const h = theme.far === 'mesas' ? 14 + Math.random() * 16 : 3 + Math.random() * 5;
        obj = M.makeIsland(w, h, w, theme);
        // Hills and mesas rise from the sea; islets float.
        const y = theme.far === 'isles' ? -4 + Math.random() * 9 : this.waterY + h / 2 - 1;
        obj.position.set(x, y, z);
        if (i % 3 === 0) {
          const t = M.makeTree(theme);
          t.position.set(x, y + h / 2, z);
          this.level.add(t);
        }
      }
      this.level.add(obj);
    }
  }

  // Scatter small decorations over the big ledges, keeping clear of
  // anything the player interacts with.
  scatterProps(theme) {
    for (const s of this.solids.filter((o) => o.deco)) {
      const w = s.max.x - s.min.x - 1.6;
      const d = s.max.z - s.min.z - 1.6;
      const count = Math.min(16, Math.floor((w * d) / 16));
      for (let i = 0; i < count; i++) {
        const x = s.min.x + 0.8 + Math.random() * w;
        const z = s.min.z + 0.8 + Math.random() * d;
        const top = s.max.y;
        const near = (px, pz, r) => Math.abs(px - x) < r && Math.abs(pz - z) < r;
        if (near(this.spawnPoint.x, this.spawnPoint.z, 1.5)) continue;
        if (this.solids.some((o) => o !== s && o.max.y > top && x > o.min.x - 0.9 && x < o.max.x + 0.9 && z > o.min.z - 0.9 && z < o.max.z + 0.9)) continue;
        if (this.lavas.some((l) => x > l.minX - 0.7 && x < l.maxX + 0.7 && z > l.minZ - 0.7 && z < l.maxZ + 0.7 && Math.abs(l.y - top) < 0.5)) continue;
        if (this.checkpoints.some((c) => near(c.pos.x, c.pos.z, 1.2))) continue;
        if (this.pickups.some((c) => near(c.pos.x, c.pos.z, 0.7) && Math.abs(c.pos.y - top) < 1.5)) continue;
        const prop = M.makeProp(theme.props[Math.floor(Math.random() * theme.props.length)], theme);
        prop.position.set(x, top, z);
        this.level.add(prop);
      }
    }
  }

  // Weather is a cloud of particles in a box that follows the camera.
  buildWeather(kind) {
    this.weather = null;
    const cfg = {
      petals: { n: 110, color: 0xffb7d5, size: 0.26, vy: -1.1, vx: 0.9, sway: 1.1 },
      rain: { n: 650, color: 0xd6e6ff, vy: -27, vx: -4, sway: 0, lines: true },
      embers: { n: 130, color: 0xffa94d, size: 0.2, vy: 1.7, vx: 0.4, sway: 0.7 },
      snow: { n: 520, color: 0xffffff, size: 0.2, vy: -2.3, vx: 0.6, sway: 0.9 },
    }[kind];
    if (!cfg) return;
    const per = cfg.lines ? 2 : 1;
    const pos = new Float32Array(cfg.n * per * 3);
    const base = [];
    for (let i = 0; i < cfg.n; i++) base.push((Math.random() - 0.5) * 46, Math.random() * 26, (Math.random() - 0.5) * 46);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const obj = cfg.lines
      ? new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.45 }))
      : new THREE.Points(geo, new THREE.PointsMaterial({ color: cfg.color, size: cfg.size, map: M.dotTexture(), transparent: true, depthWrite: false, opacity: 0.95 }));
    obj.frustumCulled = false;
    this.level.add(obj);
    this.weather = { cfg, base, pos, geo, per };
  }

  updateWeather(dt) {
    const w = this.weather;
    if (this.sky) this.sky.position.set(this.cam.target.x, 0, this.cam.target.z);
    if (!w) return;
    const { cfg, base, pos } = w;
    const t = this.clock;
    const c = this.cam.target;
    const wrap = (v, lo, span) => lo + ((((v - lo) % span) + span) % span);
    for (let i = 0; i < cfg.n; i++) {
      const j = i * 3;
      base[j] += (cfg.vx + Math.sin(t * 1.4 + i) * cfg.sway) * dt;
      base[j + 1] += cfg.vy * dt;
      base[j + 2] += Math.cos(t * 1.1 + i * 1.7) * cfg.sway * dt;
      const x = wrap(base[j], c.x - 23, 46);
      const y = wrap(base[j + 1], c.y - 7, 26);
      const z = wrap(base[j + 2], c.z - 23, 46);
      if (w.per === 2) pos.set([x, y, z, x - cfg.vx * 0.03, y - cfg.vy * 0.03, z], i * 6);
      else pos.set([x, y, z], j);
    }
    w.geo.attributes.position.needsUpdate = true;
  }

  addSolid(mesh, cx, cy, cz, w, h, d, extra = {}) {
    const s = {
      mesh,
      min: new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2),
      max: new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2),
      delta: null,
      ...extra,
    };
    if (mesh) {
      mesh.position.set(cx, cy, cz);
      this.level.add(mesh);
    }
    this.solids.push(s);
    return s;
  }

  builder() {
    const theme = this.theme;
    const blockY = (y) => y + 2.8 + 0.6;
    return {
      spawn: (x, y, z) => this.spawnPoint.set(x, y, z),
      island: (x, z, w, d, top, { h = 3 } = {}) => this.addSolid(M.makeIsland(w, h, d, theme), x, top - h / 2, z, w, h, d, { deco: w * d >= 30 }),
      mover: (x, z, w, d, top, { axis = 'x', range = 3, speed = 1, phase = 0 } = {}) => {
        const s = this.addSolid(M.makeMover(w, 0.6, d), x, top - 0.3, z, w, 0.6, d, {
          delta: new THREE.Vector3(), axis, range, speed, phase, origin: new THREE.Vector3(x, top - 0.3, z),
          size: new THREE.Vector3(w, 0.6, d),
        });
        this.movers.push(s);
      },
      mystery: (x, y, z, content) => this.addSolid(M.makeMystery(), x, blockY(y), z, 1.2, 1.2, 1.2, { kind: 'mystery', content, left: content === 'multi' ? 5 : 1 }),
      brick: (x, y, z) => this.addSolid(M.makeBrick(), x, blockY(y), z, 1.2, 1.2, 1.2, { kind: 'brick' }),
      coin: (x, y, z) => this.addCoin(x, y + 0.9, z),
      coinLine: (x1, y1, z1, x2, y2, z2, n) => {
        for (let i = 0; i < n; i++) {
          const k = n === 1 ? 0 : i / (n - 1);
          this.addCoin(x1 + (x2 - x1) * k, y1 + (y2 - y1) * k + 0.9, z1 + (z2 - z1) * k);
        }
      },
      coinRing: (x, y, z, r, n) => {
        for (let i = 0; i < n; i++) this.addCoin(x + Math.cos((i / n) * 6.283) * r, y + 0.9, z + Math.sin((i / n) * 6.283) * r);
      },
      slime: (x, y, z, axis, range) => {
        const mesh = M.makeSlime(theme.slime);
        mesh.position.set(x, y, z);
        this.level.add(mesh);
        this.slimes.push({ mesh, origin: new THREE.Vector3(x, y, z), axis, range, t: Math.random() * 6, alive: true });
      },
      lava: (x, z, w, d, y) => {
        const mesh = M.makeLava(w, d);
        mesh.position.set(x, y + 0.06, z);
        this.level.add(mesh);
        this.lavas.push({ mesh, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, y });
      },
      checkpoint: (x, y, z) => {
        const mesh = M.makeCheckpoint();
        mesh.position.set(x, y, z);
        this.level.add(mesh);
        this.checkpoints.push({ mesh, pos: new THREE.Vector3(x, y, z), active: false });
      },
      tree: (x, y, z) => {
        const mesh = M.makeTree(theme);
        mesh.position.set(x, y, z);
        this.level.add(mesh);
        this.addSolid(null, x, y + 0.8, z, 0.6, 1.6, 0.6);
      },
      flag: (x, y, z) => {
        const mesh = M.makeFlag();
        mesh.position.set(x, y, z);
        this.level.add(mesh);
        this.addSolid(null, x, y + 0.25, z, 1.2, 0.5, 1.2);
        this.flag = { mesh, pos: new THREE.Vector3(x, y, z) };
      },
    };
  }

  addCoin(x, y, z) {
    const mesh = M.makeCoin();
    mesh.position.set(x, y, z);
    this.level.add(mesh);
    this.pickups.push({ type: 'coin', mesh, pos: mesh.position, phase: (x + z) * 0.4, ready: true });
  }

  // ------------------------------------------------------------------
  // Flow
  // ------------------------------------------------------------------
  startGame() {
    this.score = 0;
    this.coins = 0;
    this.lives = START_LIVES;
    this.enterLevel(0);
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) return this.startGame();
    this.enterLevel(this.levelIndex + 1);
  }

  // Load a world and show its story card; play starts on beginLevel().
  enterLevel(index) {
    this.loadLevel(index);
    this.state = 'story';
    const def = LEVELS[index];
    this.ui.screen('story', { world: index + 1, total: LEVELS.length, name: def.name, intro: index === 0 ? INTRO : null, text: def.story });
  }

  beginLevel() {
    if (this.state !== 'story') return;
    this.state = 'playing';
    audio.startMusic(this.levelIndex);
    this.ui.screen(null);
    this.ui.toast(`World ${this.levelIndex + 1} — ${LEVELS[this.levelIndex].name}`);
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      audio.stopMusic();
      this.ui.screen('pause');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      audio.startMusic(this.levelIndex);
      this.ui.screen(null);
    }
  }

  respawn(initial = false) {
    const p = this.p;
    const keep = initial ? {} : { jumpPower: 0, speedPower: 0 };
    Object.assign(p, this.newPlayer(), keep);
    p.pos.copy(this.respawnAt && !initial ? this.respawnAt : this.spawnPoint);
    if (initial) this.respawnAt = null;
    p.pos.y += 0.05;
    p.invuln = initial ? 0 : 2;
  }

  addScore(n) {
    this.score += n;
    if (this.score > this.high) {
      this.high = this.score;
      try {
        localStorage.setItem(HS_KEY, String(this.high));
      } catch {
        /* storage unavailable */
      }
    }
  }

  addCoins(n) {
    this.coins += n;
    this.addScore(100 * n);
    if (this.coins >= 100) {
      this.coins -= 100;
      this.lives++;
      audio.oneUp();
      this.ui.toast('1-UP!');
    }
  }

  loseLife(respawn) {
    if (this.state !== 'playing') return;
    this.lives--;
    audio.hurt();
    this.cam.shake = 0.4;
    if (this.lives <= 0) {
      this.state = 'gameover';
      audio.gameOver();
      this.ui.screen('gameover', { score: this.score, high: this.high });
      return;
    }
    if (respawn) this.respawn();
    else this.p.invuln = 2;
  }

  finishLevel() {
    this.state = 'complete';
    audio.fanfare();
    const bonus = Math.ceil(this.time) * 10;
    const { flag } = this.flag.mesh.userData;
    this.tween(1.2, (k) => (flag.position.y = 1 + k * 5));
    this.burst(this.flag.pos.clone().setY(this.flag.pos.y + 6), 0xffd23f, 30, 7);
    this.p.vel.set(0, 0, 0);
    setTimeout(() => {
      this.addScore(bonus + 1000);
      this.syncHud(true);
      this.ui.screen('complete', {
        name: LEVELS[this.levelIndex].name, bonus, score: this.score, high: this.high,
        last: this.levelIndex + 1 >= LEVELS.length, sparks: this.levelIndex + 1, total: LEVELS.length,
        outro: this.levelIndex + 1 >= LEVELS.length ? OUTRO : null,
      });
    }, 1700);
  }

  // ------------------------------------------------------------------
  // Helpers: tweens and particles
  // ------------------------------------------------------------------
  tween(d, fn, done) {
    this.tweens.push({ t: 0, d, fn, done });
  }

  burst(pos, color, n = 10, speed = 5) {
    if (!this.partMats.has(color)) this.partMats.set(color, new THREE.MeshBasicMaterial({ color }));
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.partGeo, this.partMats.get(color));
      mesh.position.copy(pos);
      mesh.scale.setScalar(0.6 + Math.random() * 1.2);
      this.level.add(mesh);
      const a = Math.random() * 6.283;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.parts.push({ mesh, vel: new THREE.Vector3(Math.cos(a) * s, speed * (0.5 + Math.random() * 0.7), Math.sin(a) * s), life: 0.5 + Math.random() * 0.3 });
    }
  }

  // ------------------------------------------------------------------
  // Main loop
  // ------------------------------------------------------------------
  frame(dt) {
    if (input.mutePressed) this.ui.setMuted(audio.toggleMute());
    if (input.pausePressed) this.togglePause();
    this.clock += dt;

    if (this.state === 'playing') {
      this.time -= dt;
      if (this.time <= 0) {
        this.time = LEVELS[this.levelIndex].time;
        this.ui.toast("Time's up!");
        this.loseLife(true);
      }
      this.updateMovers(dt);
      this.updatePlayer(dt);
      this.updateWorld(dt);
    } else if (this.state !== 'paused') {
      this.updateMovers(dt);
      this.updateWorld(dt, true);
      if (this.state === 'menu') this.cam.yaw += dt * 0.15;
    }
    if (this.state !== 'paused') {
      this.updateFx(dt);
      this.animateHero(dt);
    }
    this.updateCamera(dt);
    if (this.state !== 'paused') this.updateWeather(dt);
    this.syncHud();
    clearEdges();
    this.renderer.render(this.scene, this.camera);
  }

  updateMovers(dt) {
    const p = this.p;
    for (const m of this.movers) {
      const off = Math.sin(this.clock * m.speed + m.phase) * m.range;
      const c = m.origin.clone();
      c[m.axis] += off;
      m.delta.copy(c).sub(m.mesh.position);
      m.mesh.position.copy(c);
      m.min.copy(c).addScaledVector(m.size, -0.5);
      m.max.copy(c).addScaledVector(m.size, 0.5);
      if (this.state !== 'playing') continue;
      if (p.grounded && p.ground === m) {
        p.pos.add(m.delta);
      } else if (this.overlaps(m)) {
        // Shoved by a platform: push out along its travel direction.
        if (m.axis === 'y') p.pos.y = m.delta.y > 0 ? m.max.y : m.min.y - PH;
        else p.pos[m.axis] = m.delta[m.axis] > 0 ? m.max[m.axis] + HW : m.min[m.axis] - HW;
      }
    }
  }

  overlaps(s) {
    const q = this.p.pos;
    return (
      q.x + HW > s.min.x + EPS && q.x - HW < s.max.x - EPS &&
      q.z + HW > s.min.z + EPS && q.z - HW < s.max.z - EPS &&
      q.y + PH > s.min.y + EPS && q.y < s.max.y - EPS
    );
  }

  moveAxis(axis, d) {
    if (d === 0) return;
    const p = this.p;
    p.pos[axis] += d;
    let head = null;
    let headDist = Infinity;
    for (const s of this.solids) {
      if (!this.overlaps(s)) continue;
      if (axis === 'y') {
        if (d < 0) {
          p.pos.y = s.max.y;
          p.landed = s;
        } else {
          p.pos.y = s.min.y - PH;
          const dist = Math.abs((s.min.x + s.max.x) / 2 - p.pos.x) + Math.abs((s.min.z + s.max.z) / 2 - p.pos.z);
          if (dist < headDist) {
            headDist = dist;
            head = s;
          }
        }
      } else {
        // Ledge assist: clipping the lip of a ledge by a small margin
        // lifts the player onto it instead of bouncing them off the side.
        const lip = s.max.y - p.pos.y;
        if (lip > 0 && lip <= LEDGE_HELP && p.vel.y <= 4 && !p.pounding) {
          p.pos.y = s.max.y;
          if (p.vel.y < 0) p.vel.y = 0;
          continue;
        }
        p.pos[axis] = d > 0 ? s.min[axis] - HW : s.max[axis] + HW;
        p.vel[axis] = 0;
      }
    }
    if (head) {
      p.vel.y = Math.min(p.vel.y, -1);
      this.hitBlock(head);
    }
  }

  updatePlayer(dt) {
    const p = this.p;
    p.invuln = Math.max(0, p.invuln - dt);
    p.jumpPower = Math.max(0, p.jumpPower - dt);
    p.speedPower = Math.max(0, p.speedPower - dt);
    p.coyote -= dt;
    p.buffer -= dt;
    if (input.jumpPressed) p.buffer = input.touch ? 0.2 : 0.13;

    // Camera-relative steering with acceleration + damping.
    const yaw = this.cam.yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const speed = RUN_SPEED * (p.speedPower > 0 ? 1.5 : 1);
    let tx = (Math.cos(yaw) * input.x + fx * input.z) * speed;
    let tz = (-Math.sin(yaw) * input.x + fz * input.z) * speed;
    if (p.pounding) tx = tz = 0;
    const moving = Math.hypot(tx, tz) > 0.1;
    // Strong air control: steer freely mid-jump and brake by letting go.
    const accel = p.grounded ? (moving ? 55 : 45) : moving ? 40 : 18;
    const dvx = tx - p.vel.x;
    const dvz = tz - p.vel.z;
    const dv = Math.hypot(dvx, dvz);
    if (dv > 0) {
      const step = Math.min(dv, accel * dt) / dv;
      p.vel.x += dvx * step;
      p.vel.z += dvz * step;
    }
    if (moving) {
      const want = Math.atan2(tx, tz);
      let diff = want - p.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.facing += diff * damp(16, dt);
    }

    // Jump, double jump, variable height.
    if (p.buffer > 0 && !p.pounding) {
      if (p.coyote > 0) {
        p.vel.y = JUMP_V * (p.jumpPower > 0 ? 1.28 : 1);
        p.jumps = 1;
        p.cut = false;
        p.coyote = 0;
        p.buffer = 0;
        p.grounded = false;
        audio.jump();
      } else if (p.jumps < 2) {
        p.vel.y = DOUBLE_V * (p.jumpPower > 0 ? 1.2 : 1);
        p.jumps = 2;
        p.cut = false;
        p.buffer = 0;
        p.flip = 1;
        audio.doubleJump();
        this.burst(p.pos, 0xffffff, 6, 2.5);
      }
    }
    if (!p.cut && !input.jump && p.vel.y > 0) {
      p.vel.y *= 0.45;
      p.cut = true;
    }

    // Ground-pound: hang for a beat, then slam straight down.
    if (input.slamPressed && !p.grounded && !p.pounding) {
      p.pounding = true;
      p.hover = 0.2;
      p.vel.set(0, 0, 0);
      p.flip = 1;
      audio.slamStart();
    }
    if (p.pounding && p.hover > 0) {
      p.hover -= dt;
      p.vel.y = p.hover > 0 ? 0 : -34;
    } else {
      // A little hang time at the top of a held jump gives a moment to aim.
      const hang = input.jump && Math.abs(p.vel.y) < 3.5 ? 0.55 : 1;
      p.vel.y = Math.max(p.vel.y - GRAVITY * hang * dt, -42);
    }

    const fallSpeed = p.vel.y;
    this.moveAxis('x', p.vel.x * dt);
    this.moveAxis('z', p.vel.z * dt);
    const wasGrounded = p.grounded;
    p.grounded = false;
    p.landed = null;
    this.moveAxis('y', p.vel.y * dt);
    if (p.landed) {
      p.grounded = true;
      p.ground = p.landed;
      p.vel.y = 0;
      p.coyote = input.touch ? 0.2 : 0.15;
      p.jumps = 0;
      p.cut = true;
      if (p.pounding) this.poundImpact();
      else if (!wasGrounded && fallSpeed < -8) {
        p.squash = 1;
        this.burst(p.pos, 0xffffff, 4, 2);
      }
    } else {
      p.ground = null;
    }

    // Hazards.
    // Remember the last solid footing well inside a ledge, so a dunk in
    // shallow water can put the player back on the bank.
    const gs = p.ground;
    if (p.grounded && gs && !gs.kind && !gs.delta && gs.mesh &&
      p.pos.x > gs.min.x + 0.8 && p.pos.x < gs.max.x - 0.8 && p.pos.z > gs.min.z + 0.8 && p.pos.z < gs.max.z - 0.8) {
      this.safeAt.copy(p.pos);
    }
    if (p.pos.y < this.waterY + 0.3) {
      this.burst(p.pos, 0xffffff, 14, 6);
      if (this.safeWater) {
        audio.splash();
        this.ui.toast('Splash!');
        const keep = { jumpPower: p.jumpPower, speedPower: p.speedPower, facing: p.facing };
        Object.assign(p, this.newPlayer(), keep);
        p.pos.copy(this.safeAt);
        p.invuln = 1.2;
        return;
      }
      return this.loseLife(true);
    }
    for (const l of this.lavas) {
      if (p.pos.x > l.minX - 0.1 && p.pos.x < l.maxX + 0.1 && p.pos.z > l.minZ - 0.1 && p.pos.z < l.maxZ + 0.1 && p.pos.y < l.y + 0.3 && p.pos.y > l.y - 0.5) {
        this.burst(p.pos, 0xff7b00, 16, 6);
        return this.loseLife(true);
      }
    }

    // Pickups.
    const cy = p.pos.y + PH / 2;
    for (const c of this.pickups) {
      if (!c.ready) continue;
      const dx = c.pos.x - p.pos.x;
      const dz = c.pos.z - p.pos.z;
      const dy = c.pos.y - cy;
      if (dx * dx + dz * dz < 1.1 && Math.abs(dy) < 1.2) this.collect(c);
    }
    this.pickups = this.pickups.filter((c) => !c.gone);

    // Checkpoints.
    for (const c of this.checkpoints) {
      if (!c.active && c.pos.distanceToSquared(p.pos) < 3.2) {
        this.checkpoints.forEach((o) => (o.active = false));
        c.active = true;
        this.respawnAt = c.pos.clone();
        audio.checkpoint();
        this.ui.toast('Checkpoint!');
        this.burst(c.pos.clone().setY(c.pos.y + 1.9), 0x5eead4, 12, 4);
      }
    }

    // Slimes: stomp from above, otherwise take a hit.
    for (const s of this.slimes) {
      if (!s.alive) continue;
      const sp = s.mesh.position;
      const dx = sp.x - p.pos.x;
      const dz = sp.z - p.pos.z;
      if (Math.abs(dx) > 0.9 || Math.abs(dz) > 0.9 || p.pos.y > sp.y + 0.85 || p.pos.y + PH < sp.y) continue;
      if (p.pounding || (fallSpeed < -1 && p.pos.y > sp.y + 0.25)) {
        this.defeat(s);
        if (!p.pounding) {
          p.vel.y = input.jump ? JUMP_V * 1.05 : 9;
          p.cut = true;
          p.jumps = 1;
          p.grounded = false;
        }
      } else if (p.invuln <= 0) {
        const len = Math.hypot(dx, dz) || 1;
        p.vel.x = (-dx / len) * 9;
        p.vel.z = (-dz / len) * 9;
        p.vel.y = 8;
        this.loseLife(false);
      }
    }

    // Goal.
    if (this.flag && this.state === 'playing') {
      const f = this.flag.pos;
      if (Math.hypot(f.x - p.pos.x, f.z - p.pos.z) < 1.25 && p.pos.y > f.y - 0.5 && p.pos.y < f.y + 7) this.finishLevel();
    }
  }

  poundImpact() {
    const p = this.p;
    p.pounding = false;
    p.squash = 1.4;
    this.cam.shake = 0.35;
    audio.pound();
    this.burst(p.pos, 0xffffff, 14, 5);
    const g = p.ground;
    if (g && g.kind) this.hitBlock(g);
    for (const s of this.slimes) {
      if (!s.alive) continue;
      const sp = s.mesh.position;
      if (Math.hypot(sp.x - p.pos.x, sp.z - p.pos.z) < 2.6 && Math.abs(sp.y - p.pos.y) < 1.5) this.defeat(s);
    }
  }

  defeat(s) {
    s.alive = false;
    audio.stomp();
    this.addScore(200);
    const color = s.mesh.children[0].material.color.getHex();
    this.burst(s.mesh.position.clone().setY(s.mesh.position.y + 0.3), color, 12, 4);
    this.tween(0.35, (k) => s.mesh.scale.set(1 + k * 0.6, Math.max(0.05, 1 - k * 1.2), 1 + k * 0.6), () => this.level.remove(s.mesh));
  }

  hitBlock(s) {
    if (s.kind === 'brick') {
      audio.brick();
      this.addScore(50);
      this.burst(s.mesh.position, 0xc8632b, 14, 6);
      this.level.remove(s.mesh);
      this.solids.splice(this.solids.indexOf(s), 1);
      if (this.p.ground === s) this.p.grounded = false;
      return;
    }
    if (s.kind !== 'mystery') return;
    audio.block();
    const baseY = (s.min.y + s.max.y) / 2;
    this.tween(0.18, (k) => (s.mesh.position.y = baseY + Math.sin(k * Math.PI) * 0.3));
    if (s.left <= 0) return;
    s.left--;
    const top = new THREE.Vector3(s.mesh.position.x, s.max.y, s.mesh.position.z);
    if (s.content === 'coin' || s.content === 'multi') {
      const coin = M.makeCoin();
      coin.position.copy(top);
      this.level.add(coin);
      audio.coin();
      this.addCoins(1);
      this.tween(0.45, (k) => {
        coin.position.y = top.y + 0.5 + Math.sin(k * Math.PI * 0.8) * 2;
        coin.rotation.y = k * 12;
      }, () => {
        this.level.remove(coin);
        this.burst(coin.position, 0xffd23f, 5, 2);
      });
    } else {
      const mesh = M.makePowerup(s.content);
      mesh.position.copy(top);
      this.level.add(mesh);
      audio.itemAppear();
      const item = { type: s.content, mesh, pos: mesh.position, phase: 0, ready: false, settled: false, baseY: top.y + 0.75 };
      this.pickups.push(item);
      // Hit from below: the item hops off the block and lands on the
      // ground next to it, on the player's side, so it is easy to grab.
      const land = this.p.pos.y < s.max.y - 0.2 ? this.itemLanding(s) : null;
      this.tween(0.35, (k) => (mesh.position.y = top.y + k * 0.75), () => {
        item.ready = true;
        if (!land) return (item.settled = true);
        const from = mesh.position.clone();
        this.tween(0.6, (k) => {
          mesh.position.x = from.x + (land.x - from.x) * k;
          mesh.position.z = from.z + (land.z - from.z) * k;
          mesh.position.y = from.y + (land.y - from.y) * k + Math.sin(k * Math.PI) * 1.1;
        }, () => {
          item.baseY = land.y;
          item.settled = true;
        });
      });
    }
    if (s.left <= 0) s.mesh.material = M.usedBlockMaterial();
  }

  // Find a safe spot on the ground beside a block for an item to land.
  itemLanding(s) {
    const cx = (s.min.x + s.max.x) / 2;
    const cz = (s.min.z + s.max.z) / 2;
    let dx = this.p.pos.x - cx;
    let dz = this.p.pos.z - cz;
    if (Math.hypot(dx, dz) < 0.3) {
      dx = Math.sin(this.cam.yaw);
      dz = Math.cos(this.cam.yaw);
    }
    const base = Math.atan2(dx, dz);
    for (const turn of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
      const x = cx + Math.sin(base + turn) * 1.8;
      const z = cz + Math.cos(base + turn) * 1.8;
      let floor = -Infinity;
      let blocked = false;
      for (const o of this.solids) {
        if (x < o.min.x + 0.3 || x > o.max.x - 0.3 || z < o.min.z + 0.3 || z > o.max.z - 0.3) continue;
        if (o.kind || o.delta) blocked = true;
        else if (o.max.y <= s.min.y && o.max.y > floor) floor = o.max.y;
      }
      const lava = this.lavas.some((l) => x > l.minX - 0.5 && x < l.maxX + 0.5 && z > l.minZ - 0.5 && z < l.maxZ + 0.5 && Math.abs(l.y - floor) < 0.5);
      if (!blocked && !lava && floor > -Infinity && s.min.y - floor < 6) return new THREE.Vector3(x, floor + 0.75, z);
    }
    return null;
  }

  collect(c) {
    c.gone = true;
    this.level.remove(c.mesh);
    if (c.type === 'coin') {
      audio.coin();
      this.addCoins(1);
      this.burst(c.pos, 0xffd23f, 5, 2.5);
      return;
    }
    audio.powerup();
    this.addScore(500);
    if (c.type === 'jump') {
      this.p.jumpPower = POWER_TIME;
      this.ui.toast('Super Jump!');
      this.burst(c.pos, 0x37e08a, 16, 5);
    } else {
      this.p.speedPower = POWER_TIME;
      this.ui.toast('Turbo Dash!');
      this.burst(c.pos, 0x3aa8ff, 16, 5);
    }
  }

  updateWorld(dt, idle = false) {
    const t = this.clock;
    for (const c of this.pickups) {
      c.mesh.rotation.y = t * 3 + c.phase;
      if (c.type !== 'coin' && c.settled) c.mesh.position.y = c.baseY + Math.sin(t * 3) * 0.12;
    }
    for (const s of this.slimes) {
      if (!s.alive) continue;
      s.t += dt;
      const off = Math.sin(s.t * 0.9) * s.range;
      const dir = Math.cos(s.t * 0.9) >= 0 ? 1 : -1;
      s.mesh.position[s.axis] = s.origin[s.axis] + off;
      const hop = Math.abs(Math.sin(s.t * 5));
      s.mesh.position.y = s.origin.y + hop * 0.12;
      s.mesh.scale.set(1 + (1 - hop) * 0.12, 0.88 + hop * 0.2, 1 + (1 - hop) * 0.12);
      const want = s.axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI;
      let diff = want - s.mesh.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      s.mesh.rotation.y += diff * damp(8, dt);
    }
    for (const l of this.lavas) l.mesh.userData.mat.emissiveIntensity = 0.75 + Math.sin(t * 4 + l.minX) * 0.25;
    for (const c of this.checkpoints) {
      const gem = c.mesh.userData.gem;
      gem.rotation.y = t * 2;
      gem.material.color.setHex(c.active ? 0x2dd4bf : 0x94a3b8);
      gem.material.emissive.setHex(c.active ? 0x0f766e : 0x000000);
    }
    if (this.flag) this.flag.mesh.userData.ball.rotation.y = t * 2;
    for (const c of this.clouds) {
      c.position.x += dt * 0.6;
      if (c.position.x > 95) c.position.x = -95;
    }
    if (idle) return;
  }

  updateFx(dt) {
    for (const tw of this.tweens) {
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.d);
      tw.fn(k);
      if (k >= 1) {
        tw.dead = true;
        if (tw.done) tw.done();
      }
    }
    this.tweens = this.tweens.filter((t) => !t.dead);
    for (const q of this.parts) {
      q.life -= dt;
      q.vel.y -= 18 * dt;
      q.mesh.position.addScaledVector(q.vel, dt);
      q.mesh.rotation.x += dt * 8;
      q.mesh.rotation.z += dt * 6;
      if (q.life <= 0) this.level.remove(q.mesh);
    }
    this.parts = this.parts.filter((q) => q.life > 0);
  }

  animateHero(dt) {
    const p = this.p;
    const h = this.hero;
    const { body, armL, armR, legL, legR, tip, tails, eyes, head } = h.userData.parts;
    h.position.copy(p.pos);
    h.rotation.y = p.facing;
    h.visible = this.state !== 'gameover' && (p.invuln <= 0 || Math.floor(this.clock * 18) % 2 === 0);
    const speed = Math.hypot(p.vel.x, p.vel.z);
    p.squash = Math.max(0, p.squash - dt * 5);
    p.flip = Math.max(0, p.flip - dt * 2.6);
    let sy = 1 - Math.min(0.35, p.squash * 0.3);
    if (!p.grounded) sy = 1 + Math.min(0.18, Math.abs(p.vel.y) * 0.012);
    const sxz = 1 / Math.sqrt(sy);
    body.scale.set(sxz, sy, sxz);
    body.rotation.x = p.flip > 0 ? (1 - p.flip) * Math.PI * 2 : p.grounded ? Math.min(0.22, speed * 0.025) : 0;
    body.position.y = p.flip > 0 ? Math.sin((1 - p.flip) * Math.PI) * 0.2 : 0;
    tip.rotation.y += dt * 4;
    const blink = this.clock % 3.4 < 0.12 ? 0.12 : 1;
    eyes.forEach((e) => (e.scale.y = blink));
    const flutter = Math.min(1, speed / 8) + (p.grounded ? 0 : 0.6);
    tails.forEach((t, i) => {
      t.rotation.x = -0.9 + flutter * 0.75 + Math.sin(this.clock * 9 + i * 1.7) * (0.08 + flutter * 0.18);
      t.rotation.y = Math.sin(this.clock * 6 + i * 2.1) * 0.2;
    });
    head.rotation.x = p.grounded ? Math.sin(this.clock * 2.5) * 0.03 : p.vel.y > 0 ? -0.18 : 0.12;
    if (p.pounding) {
      legL.rotation.x = legR.rotation.x = -1.2;
      armL.rotation.x = armR.rotation.x = Math.PI;
    } else if (!p.grounded) {
      legL.rotation.x = 0.5;
      legR.rotation.x = -0.4;
      armL.rotation.x = armR.rotation.x = p.vel.y > 0 ? -2.6 : -1.2;
    } else if (speed > 0.5) {
      p.runT += dt * (6 + speed * 1.6);
      const s = Math.sin(p.runT);
      legL.rotation.x = s * 0.9;
      legR.rotation.x = -s * 0.9;
      armL.rotation.x = -s * 0.8;
      armR.rotation.x = s * 0.8;
    } else {
      const idle = Math.sin(this.clock * 2.5) * 0.08;
      legL.rotation.x = legR.rotation.x = 0;
      armL.rotation.x = idle;
      armR.rotation.x = -idle;
    }

    // Blob shadow: find the surface directly beneath to aid depth reading.
    let floor = -Infinity;
    for (const s of this.solids) {
      if (p.pos.x > s.min.x && p.pos.x < s.max.x && p.pos.z > s.min.z && p.pos.z < s.max.z && s.max.y <= p.pos.y + 0.05 && s.max.y > floor) floor = s.max.y;
    }
    this.blob.visible = floor > -Infinity && h.visible;
    // In the air, a bright ring and a faint drop line mark exactly where
    // the hero will come down; both vanish when there is nothing below.
    const marking = this.blob.visible && !p.grounded && this.state === 'playing';
    this.ring.visible = this.beam.visible = marking;
    if (marking) {
      const gap = p.pos.y - floor;
      this.ring.position.set(p.pos.x, floor + 0.05, p.pos.z);
      this.ring.scale.setScalar(1 + Math.sin(this.clock * 10) * 0.08);
      this.beam.position.set(p.pos.x, floor + gap / 2, p.pos.z);
      this.beam.scale.y = Math.max(0.01, gap);
    }
    if (this.blob.visible) {
      const gap = p.pos.y - floor;
      this.blob.position.set(p.pos.x, floor + 0.03, p.pos.z);
      this.blob.scale.setScalar(Math.max(0.45, 1.1 - gap * 0.08));
      this.blob.material.opacity = Math.max(0.15, 0.4 - gap * 0.03);
    }
  }

  updateCamera(dt) {
    const p = this.p;
    const c = this.cam;
    if (this.state === 'playing') {
      c.yaw += -input.camDrag * 0.006 - input.camTurn * dt * 2.2;
      // On touch screens the camera swings behind the direction of travel
      // by itself, so one thumb is enough to steer.
      if (input.touch) c.yaw -= input.x * dt * 1.15;
    }
    // Lagged follow: horizontal tracks quickly, vertical eases to avoid
    // bobbing with every jump.
    const k = damp(7, dt);
    c.target.x += (p.pos.x - c.target.x) * k;
    c.target.z += (p.pos.z - c.target.z) * k;
    c.target.y += (p.pos.y - c.target.y) * damp(p.grounded ? 5 : 2.2, dt);
    // Rise for a more top-down view while airborne, so gaps and landing
    // spots are easier to judge.
    c.lift += ((!p.grounded && this.state === 'playing' ? 3.2 : 0) - c.lift) * damp(p.grounded ? 2.5 : 5, dt);
    const dist = this.camera.aspect < 1 ? 13 : 11.5;
    const shake = c.shake > 0 ? c.shake * 0.5 : 0;
    c.shake = Math.max(0, c.shake - dt);
    this.camera.position.set(
      c.target.x + Math.sin(c.yaw) * dist + (Math.random() - 0.5) * shake,
      c.target.y + 6.2 + c.lift + (Math.random() - 0.5) * shake,
      c.target.z + Math.cos(c.yaw) * dist,
    );
    this.camera.lookAt(c.target.x, c.target.y + 1.6 - c.lift * 0.25, c.target.z);
    this.sun.position.set(c.target.x + 10, c.target.y + 24, c.target.z + 8);
    this.sun.target.position.copy(c.target);
  }

  syncHud(force = false) {
    this.hudT = (this.hudT || 0) + 1;
    if (!force && this.hudT % 6) return;
    this.ui.hud({
      coins: this.coins, score: this.score, lives: this.lives, time: Math.max(0, Math.ceil(this.time)),
      high: this.high, world: `${this.levelIndex + 1}/${LEVELS.length}`, jump: this.p.jumpPower / POWER_TIME, speed: this.p.speedPower / POWER_TIME,
    });
  }
}
