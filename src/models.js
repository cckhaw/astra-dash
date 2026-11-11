// Low-poly meshes and canvas-generated textures. No external assets.
import * as THREE from 'three';

const texCache = new Map();
function canvasTex(key, size, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

const checkerTex = (a, b) =>
  canvasTex(`chk${a}${b}`, 64, (g, s) => {
    g.fillStyle = a;
    g.fillRect(0, 0, s, s);
    g.fillStyle = b;
    g.fillRect(0, 0, s / 2, s / 2);
    g.fillRect(s / 2, s / 2, s / 2, s / 2);
  });

const sideTex = (a, b) =>
  canvasTex(`side${a}${b}`, 64, (g, s) => {
    g.fillStyle = a;
    g.fillRect(0, 0, s, s);
    g.fillStyle = b;
    for (let y = 0; y < 4; y++) {
      g.fillRect(0, y * 16 + 13, s, 3);
      const off = y % 2 ? 0 : 16;
      g.fillRect(off + 2, y * 16, 3, 13);
      g.fillRect(off + 34, y * 16, 3, 13);
    }
  });

const brickTex = () =>
  canvasTex('brick', 64, (g, s) => {
    g.fillStyle = '#c8632b';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#e58a4a';
    for (let y = 0; y < 4; y++)
      for (let x = -1; x < 2; x++) g.fillRect(x * 32 + (y % 2 ? 16 : 0) + 2, y * 16 + 2, 28, 5);
    g.fillStyle = '#6b2d12';
    for (let y = 0; y < 4; y++) {
      g.fillRect(0, y * 16 + 14, s, 2);
      for (let x = 0; x < 3; x++) g.fillRect(x * 32 + (y % 2 ? 16 : 0) - 1, y * 16, 2, 14);
    }
  });

const mysteryTex = () =>
  canvasTex('mystery', 128, (g, s) => {
    const grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#ffd84a');
    grad.addColorStop(1, '#ff9d1e');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#a04a00';
    g.lineWidth = 10;
    g.strokeRect(5, 5, s - 10, s - 10);
    g.fillStyle = '#fff6c9';
    for (const [x, y] of [[18, 18], [s - 18, 18], [18, s - 18], [s - 18, s - 18]]) {
      g.beginPath();
      g.arc(x, y, 5, 0, 7);
      g.fill();
    }
    g.font = '900 86px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#a04a00';
    g.fillText('?', s / 2 + 4, s / 2 + 8);
    g.fillStyle = '#ffffff';
    g.fillText('?', s / 2, s / 2 + 4);
  });

// Box whose UVs tile in world units so textures never stretch.
function tiledBox(w, h, d, tile = 2) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, (uv.getX(k) * dims[f][0]) / tile, (uv.getY(k) * dims[f][1]) / tile);
    }
  return geo;
}

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const matCache = new Map();
function cached(key, make) {
  if (!matCache.has(key)) matCache.set(key, make());
  return matCache.get(key);
}

function shadowed(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function makeIsland(w, h, d, theme) {
  const g = new THREE.Group();
  const side = cached(`side${theme.name}`, () => lam(0xffffff, { map: sideTex(theme.sideA, theme.sideB) }));
  const top = cached(`top${theme.name}`, () => lam(0xffffff, { map: checkerTex(theme.topA, theme.topB) }));
  const rim = cached(`rim${theme.name}`, () => lam(theme.rim));
  const capH = Math.min(0.4, h * 0.5);
  const body = shadowed(new THREE.Mesh(tiledBox(w, h - capH, d), side));
  body.position.y = -capH / 2;
  const cap = shadowed(new THREE.Mesh(tiledBox(w + 0.24, capH, d + 0.24), [rim, rim, top, rim, rim, rim]));
  cap.position.y = h / 2 - capH / 2;
  g.add(body, cap);
  return g;
}

export function makeMover(w, h, d) {
  const g = new THREE.Group();
  const top = cached('moverTop', () => lam(0xffffff, { map: checkerTex('#ff7eb6', '#ffd1e6') }));
  const edge = cached('moverEdge', () => lam(0xd9437f));
  const under = cached('moverUnder', () => lam(0x8a2a5a));
  g.add(shadowed(new THREE.Mesh(tiledBox(w, h, d, 1.5), [edge, edge, top, under, edge, edge])));
  const cone = shadowed(new THREE.Mesh(new THREE.ConeGeometry(Math.min(w, d) * 0.35, 0.8, 6), under), true, false);
  cone.rotation.x = Math.PI;
  cone.position.y = -h / 2 - 0.4;
  g.add(cone);
  return g;
}

const cube = new THREE.BoxGeometry(1.2, 1.2, 1.2);
export function makeMystery() {
  return shadowed(new THREE.Mesh(cube, cached('mystery', () => lam(0xffffff, { map: mysteryTex(), emissive: 0x332200 }))));
}
export const usedBlockMaterial = () => cached('used', () => lam(0x9a8468));
export function makeBrick() {
  return shadowed(new THREE.Mesh(cube, cached('brick', () => lam(0xffffff, { map: brickTex() }))));
}

const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 18).rotateX(Math.PI / 2);
const coinInner = new THREE.CylinderGeometry(0.26, 0.26, 0.13, 5).rotateX(Math.PI / 2);
export function makeCoin() {
  const g = new THREE.Group();
  const gold = cached('gold', () => new THREE.MeshStandardMaterial({ color: 0xffc81e, metalness: 0.6, roughness: 0.3, emissive: 0x7a4a00 }));
  const dark = cached('gold2', () => new THREE.MeshStandardMaterial({ color: 0xffe680, metalness: 0.5, roughness: 0.3, emissive: 0x8a6a10 }));
  const c = new THREE.Mesh(coinGeo, gold);
  c.castShadow = true;
  g.add(c, new THREE.Mesh(coinInner, dark));
  return g;
}

export function makePowerup(type) {
  const g = new THREE.Group();
  const color = type === 'jump' ? 0x37e08a : 0x3aa8ff;
  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 0),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, flatShading: true, roughness: 0.3 }),
  );
  orb.castShadow = true;
  g.add(orb);
  const white = lam(0xffffff, { emissive: 0x888888 });
  if (type === 'jump') {
    // up arrow
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.26, 4), white);
    head.position.y = 0.62;
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.12), white);
    stem.position.y = 0.46;
    g.add(head, stem);
  } else {
    // lightning-ish fins
    for (const s of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.16), white);
      fin.position.set(s * 0.5, 0, 0);
      fin.rotation.z = s * 0.5;
      g.add(fin);
    }
  }
  return g;
}

export function makeSlime(color = 0x58d64a) {
  const g = new THREE.Group();
  const body = shadowed(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.35 }),
    ),
    true,
    false,
  );
  body.scale.y = 1.15;
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.62, 10).rotateX(Math.PI / 2), lam(color));
  base.position.y = 0.01;
  g.add(body, base);
  const white = lam(0xffffff);
  const black = lam(0x1a1a2a);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), white);
    eye.position.set(s * 0.22, 0.42, 0.44);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), black);
    pupil.position.set(s * 0.22, 0.42, 0.57);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.06), black);
    brow.position.set(s * 0.22, 0.6, 0.5);
    brow.rotation.z = -s * 0.45;
    g.add(eye, pupil, brow);
  }
  return g;
}

// Astra, the star-scout: a big-headed kid pilot with coral hair, flight
// goggles, a violet suit, a long yellow scarf and a little star-pack.
// Model faces +Z; origin is at the feet.
export function makeHero() {
  const root = new THREE.Group();
  const body = new THREE.Group(); // squash/stretch + flips happen here
  root.add(body);
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  const suit = std(0x7c4dff);
  const suitDark = std(0x5b2fd6);
  const white = std(0xffffff, { roughness: 0.4 });
  const skin = std(0xffd7b5, { roughness: 0.75 });
  const hair = std(0xff5d8f, { roughness: 0.5 });
  const yellow = std(0xffd23f, { emissive: 0x6b4a00, roughness: 0.4 });
  const teal = std(0x19c8b9, { roughness: 0.4 });
  const dark = std(0x2a1a5e);
  const part = (geo, mat, x, y, z, parent = body) => {
    const m = shadowed(new THREE.Mesh(geo, mat), true, false);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const ball = (r, mat, x, y, z, parent, sx = 1, sy = 1, sz = 1) => {
    const m = part(new THREE.SphereGeometry(r, 18, 14), mat, x, y, z, parent);
    m.scale.set(sx, sy, sz);
    return m;
  };

  // torso, belt, chest star
  ball(0.27, suit, 0, 0.52, 0, body, 1, 1.1, 0.9);
  part(new THREE.TorusGeometry(0.245, 0.04, 8, 20).rotateX(Math.PI / 2), yellow, 0, 0.4, 0);
  part(new THREE.OctahedronGeometry(0.085, 0), yellow, 0, 0.6, 0.23).scale.z = 0.4;

  // scarf with two fluttering tails
  part(new THREE.TorusGeometry(0.19, 0.08, 8, 18).rotateX(Math.PI / 2), yellow, 0, 0.77, 0);
  const tails = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.07, 0.78, -0.2);
    body.add(pivot);
    part(new THREE.BoxGeometry(0.13, 0.05, 0.46), yellow, 0, 0, -0.23, pivot);
    return pivot;
  });

  // star-pack with antenna
  part(new THREE.BoxGeometry(0.3, 0.3, 0.16), teal, 0, 0.54, -0.3);
  part(new THREE.OctahedronGeometry(0.09, 0), yellow, 0, 0.54, -0.39).scale.z = 0.35;
  for (const s of [-1, 1]) part(new THREE.CylinderGeometry(0.05, 0.065, 0.1, 8), white, s * 0.09, 0.36, -0.3);
  part(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 5), dark, 0.12, 0.82, -0.32);
  const tip = part(new THREE.OctahedronGeometry(0.07, 0), yellow, 0.12, 1.0, -0.32);

  // head
  const head = new THREE.Group();
  head.position.y = 1.02;
  body.add(head);
  ball(0.36, skin, 0, 0, 0, head);
  for (const s of [-1, 1]) ball(0.075, skin, s * 0.35, -0.03, 0, head);
  const cap = part(new THREE.SphereGeometry(0.385, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hair, 0, 0, 0, head);
  cap.rotation.x = -0.42;
  const spike = (r, h, x, y, z, rx, rz) => {
    const c = part(new THREE.ConeGeometry(r, h, 7), hair, x, y, z, head);
    c.rotation.set(rx, 0, rz);
  };
  spike(0.13, 0.3, 0, 0.4, -0.06, -0.5, 0);
  spike(0.11, 0.26, -0.17, 0.33, -0.12, -0.6, 0.5);
  spike(0.11, 0.26, 0.17, 0.33, -0.12, -0.6, -0.5);
  spike(0.15, 0.4, 0, 0.14, -0.38, -1.75, 0);
  spike(0.13, 0.34, -0.21, 0.06, -0.32, -1.75, 0.6);
  spike(0.13, 0.34, 0.21, 0.06, -0.32, -1.75, -0.6);
  spike(0.09, 0.22, 0.1, 0.27, 0.27, 1.9, -0.35); // fringe
  spike(0.07, 0.18, -0.1, 0.29, 0.26, 1.8, 0.4);

  // face: big eyes with highlights, cheeks, smile
  const glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [-1, 1].map((s) => {
    const eye = new THREE.Group();
    eye.position.set(s * 0.135, 0.0, 0.305);
    eye.rotation.y = s * 0.3;
    head.add(eye);
    ball(0.1, white, 0, 0, 0, eye, 0.9, 1.1, 0.45);
    ball(0.066, dark, 0, -0.005, 0.03, eye, 1, 1.15, 0.45);
    part(new THREE.SphereGeometry(0.024, 8, 6), glint, 0.022, 0.035, 0.058, eye);
    return eye;
  });
  const blush = std(0xff8fa3, { roughness: 0.9 });
  for (const s of [-1, 1]) ball(0.055, blush, s * 0.235, -0.115, 0.255, head, 1, 0.7, 0.3);
  const smile = part(new THREE.TorusGeometry(0.055, 0.016, 6, 12, Math.PI), std(0xb23a48), 0, -0.125, 0.335, head);
  smile.rotation.z = Math.PI;

  // flight goggles pushed up on the forehead
  const strap = part(new THREE.TorusGeometry(0.368, 0.03, 6, 24).rotateX(Math.PI / 2), dark, 0, 0.17, 0, head);
  strap.rotation.x = -0.12;
  for (const s of [-1, 1]) {
    part(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 14).rotateX(Math.PI / 2), white, s * 0.125, 0.215, 0.325, head);
    part(new THREE.CylinderGeometry(0.072, 0.072, 0.08, 14).rotateX(Math.PI / 2), std(0x6ff3ff, { emissive: 0x1a8fa0, roughness: 0.15 }), s * 0.125, 0.215, 0.332, head);
  }

  const arm = (s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.31, 0.7, 0);
    body.add(pivot);
    part(new THREE.CapsuleGeometry(0.065, 0.14, 4, 8), suit, 0, -0.11, 0, pivot);
    part(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 10), yellow, 0, -0.2, 0, pivot);
    ball(0.095, white, 0, -0.28, 0, pivot);
    pivot.rotation.z = s * 0.28;
    return pivot;
  };
  const leg = (s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.13, 0.3, 0);
    body.add(pivot);
    part(new THREE.CapsuleGeometry(0.075, 0.08, 4, 8), suitDark, 0, -0.09, 0, pivot);
    ball(0.13, white, 0, -0.21, 0.04, pivot, 1, 0.78, 1.4);
    part(new THREE.BoxGeometry(0.2, 0.04, 0.32), teal, 0, -0.29, 0.04, pivot);
    return pivot;
  };
  root.scale.setScalar(1.15);
  root.userData.parts = { body, tip, tails, eyes, head, armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) };
  return root;
}

export function makeFlag() {
  const g = new THREE.Group();
  const base = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.5, 8), lam(0x8d99ae)));
  base.position.y = 0.25;
  const pole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6.5, 8), lam(0xf1f5f9)), true, false);
  pole.position.y = 3.6;
  const ball = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), lam(0xffd23f, { emissive: 0x7a5a00 }));
  ball.position.y = 7.05;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(1.7, 0.45);
  shape.lineTo(0, 0.9);
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshLambertMaterial({ color: 0xff3d7f, side: THREE.DoubleSide }));
  flag.position.set(0.08, 1.0, 0);
  flag.castShadow = true;
  g.add(base, pole, ball, flag);
  g.userData = { flag, ball };
  return g;
}

export function makeCheckpoint() {
  const g = new THREE.Group();
  const post = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 6), lam(0xe2e8f0)), true, false);
  post.position.y = 0.8;
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.3, 0),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, flatShading: true, emissive: 0x000000 }),
  );
  gem.position.y = 1.9;
  g.add(post, gem);
  g.userData.gem = gem;
  return g;
}

export function makeTree(theme) {
  const g = new THREE.Group();
  const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.6, 7), lam(0x8a5a2b)));
  trunk.position.y = 0.8;
  g.add(trunk);
  const leaf = new THREE.MeshLambertMaterial({ color: theme.tree, flatShading: true });
  [[1.5, 1.9, 1.5], [1.15, 2.9, 1.3], [0.75, 3.8, 1.1]].forEach(([r, y, h]) => {
    const c = shadowed(new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), leaf), true, false);
    c.position.y = y;
    g.add(c);
  });
  return g;
}

export function makeLava(w, d) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff3b00, emissiveIntensity: 0.9, roughness: 0.6 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), mat);
  m.userData.mat = mat;
  return m;
}

export function makeCloud() {
  const g = new THREE.Group();
  const mat = cached('cloud', () => new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9aa7b8, flatShading: true, fog: false }));
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + Math.random() * 1.6, 1), mat);
    s.position.set(i * 2.3 - n, Math.random() * 0.8, Math.random() * 1.5);
    s.scale.y = 0.65;
    g.add(s);
  }
  return g;
}

export function makeRainbow() {
  const g = new THREE.Group();
  ['#ff4d6d', '#ff9f1c', '#ffe14d', '#5fe36a', '#4dabf7', '#9b6bff'].forEach((c, i) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(60 - i * 2.2, 1.1, 4, 40, Math.PI),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, fog: false, depthWrite: false }),
    );
    g.add(m);
  });
  return g;
}

export function makeSky(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(0.75, bottom);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeBlobShadow() {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  m.renderOrder = 2;
  return m;
}
