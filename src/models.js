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

// The two playable star-scouts. Both share one rig (so they animate the
// same way) and differ in colours, hair, outfit and gear.
//   astra — orange ponytail, blue-and-white flight suit, jetpack
//   dash  — spiky brown hair, blue-and-orange jacket, cargo shorts, sneakers
// Models face +Z; origin is at the feet.
export function makeHero(kind = 'astra') {
  const astra = kind !== 'dash';
  const root = new THREE.Group();
  const body = new THREE.Group(); // squash/stretch + flips happen here
  root.add(body);
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  const C = astra
    ? { skin: 0xffd9bd, hair: 0xff8a1f, eye: 0x2f9be0, torso: 0x2f6fe0, sleeve: 0xf4f7fb, cuff: 0xf5b82e, hand: 0xffd9bd, thigh: 0x2f6fe0, shin: 0x2f6fe0, shoe: 0xffffff, sole: 0xc7d0dc, mouth: 0xc2414f }
    : { skin: 0xf7c9a3, hair: 0x6b3f22, eye: 0x7a4a21, torso: 0x2f7fe0, sleeve: 0x2f7fe0, cuff: 0xff8a1f, hand: 0x2b2f3a, thigh: 0x6e5b3c, shin: 0xf7c9a3, shoe: 0x7c4dff, sole: 0x37e08a, mouth: 0xa8323f };
  const skin = std(C.skin, { roughness: 0.75 });
  const hair = std(C.hair, { roughness: 0.5 });
  const white = std(0xffffff, { roughness: 0.4 });
  const gold = std(0xf5b82e, { emissive: 0x5a3c00, roughness: 0.4 });
  const orange = std(0xff8a1f, { roughness: 0.5 });
  const dark = std(0x23203a);
  const part = (geo, mat, x, y, z, parent = body) => {
    const m = shadowed(new THREE.Mesh(geo, mat), true, false);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const ball = (r, mat, x, y, z, parent = body, sx = 1, sy = 1, sz = 1) => {
    const m = part(new THREE.SphereGeometry(r, 18, 14), mat, x, y, z, parent);
    m.scale.set(sx, sy, sz);
    return m;
  };
  const ring = (r, tube, mat, x, y, z, parent = body) => part(new THREE.TorusGeometry(r, tube, 8, 20).rotateX(Math.PI / 2), mat, x, y, z, parent);

  // ---- torso and outfit ----
  ball(0.27, std(C.torso), 0, 0.52, 0, body, 1, 1.1, 0.9);
  let flame = new THREE.Group();
  if (astra) {
    ball(0.2, white, 0, 0.55, 0.1, body, 0.62, 1.15, 0.8); // white front panel
    ring(0.245, 0.04, gold, 0, 0.4, 0);
    ring(0.17, 0.05, gold, 0, 0.77, 0);
    part(new THREE.OctahedronGeometry(0.06, 0), gold, 0.11, 0.66, 0.2).scale.z = 0.4;
    // jetpack
    const metal = std(0xdfe6ee, { roughness: 0.3, metalness: 0.4 });
    part(new THREE.BoxGeometry(0.36, 0.34, 0.18), metal, 0, 0.56, -0.31);
    part(new THREE.BoxGeometry(0.1, 0.36, 0.2), std(0x2f6fe0), 0, 0.56, -0.31);
    flame.position.set(0, 0.34, -0.31);
    body.add(flame);
    const fire = new THREE.MeshBasicMaterial({ color: 0xffb02e });
    const core = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
    for (const s of [-1, 1]) {
      part(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 10), metal, s * 0.11, 0.35, -0.31);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.42, 8), fire);
      f.rotation.x = Math.PI;
      f.position.set(s * 0.11, -0.26, 0);
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.26, 8), core);
      c.rotation.x = Math.PI;
      c.position.set(s * 0.11, -0.2, 0);
      flame.add(f, c);
    }
    flame.visible = false;
  } else {
    // jacket: white chevron, orange collar and hem; cargo shorts
    for (const s of [-1, 1]) {
      const stripe = part(new THREE.BoxGeometry(0.2, 0.055, 0.04), white, s * 0.075, 0.56, 0.235);
      stripe.rotation.z = s * 0.6;
    }
    ring(0.2, 0.075, orange, 0, 0.77, 0);
    ring(0.26, 0.045, orange, 0, 0.42, 0);
    ball(0.265, std(C.thigh), 0, 0.34, 0, body, 1, 0.5, 0.92);
    for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.09, 0.09, 0.05), std(0x5a4a30), s * 0.24, 0.3, 0.04);
  }

  // ---- head ----
  const head = new THREE.Group();
  head.position.y = 1.02;
  body.add(head);
  ball(0.36, skin, 0, 0, 0, head);
  for (const s of [-1, 1]) ball(0.075, skin, s * 0.35, -0.03, 0, head);
  const cap = part(new THREE.SphereGeometry(0.385, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hair, 0, 0, 0, head);
  cap.rotation.x = -0.62;
  const spike = (r, h, x, y, z, rx, rz) => {
    const c = part(new THREE.ConeGeometry(r, h, 7), hair, x, y, z, head);
    c.rotation.set(rx, 0, rz);
  };
  const tails = [];
  let tip = new THREE.Object3D();
  if (astra) {
    // side-swept fringe, star clip and a big bouncy ponytail
    ball(0.17, hair, -0.17, 0.25, 0.22, head, 1.25, 0.7, 0.8).rotation.z = 0.5;
    ball(0.15, hair, 0.13, 0.29, 0.22, head, 1.3, 0.55, 0.8).rotation.z = -0.4;
    ball(0.1, hair, 0.31, 0.04, 0.16, head, 0.7, 1.5, 0.9);
    ball(0.1, hair, -0.31, 0.04, 0.16, head, 0.7, 1.5, 0.9);
    tip = part(new THREE.OctahedronGeometry(0.075, 0), std(0x8fe3ff, { emissive: 0x2a8fc0, roughness: 0.3 }), 0.3, 0.2, 0.2, head);
    const pony = new THREE.Group();
    pony.position.set(0, 0.26, -0.27);
    head.add(pony);
    ring(0.09, 0.04, std(0x35b8c9), 0, 0, -0.03, pony).rotation.x = Math.PI / 2;
    [[0.17, -0.16, 0], [0.2, -0.36, 0.02], [0.18, -0.56, 0.0], [0.14, -0.73, -0.04], [0.1, -0.86, -0.1], [0.06, -0.95, -0.17]].forEach(([r, z, y]) => ball(r, hair, 0, y, z, pony));
    tails.push(pony);
  } else {
    // messy spikes
    spike(0.15, 0.34, 0, 0.42, 0.02, -0.2, 0);
    spike(0.13, 0.3, -0.19, 0.36, 0.0, -0.3, 0.6);
    spike(0.13, 0.3, 0.19, 0.36, 0.0, -0.3, -0.6);
    spike(0.13, 0.3, -0.1, 0.4, -0.16, -0.9, 0.3);
    spike(0.13, 0.3, 0.12, 0.4, -0.16, -0.9, -0.3);
    spike(0.15, 0.36, 0, 0.16, -0.37, -1.7, 0);
    spike(0.13, 0.3, -0.22, 0.1, -0.3, -1.6, 0.6);
    spike(0.13, 0.3, 0.22, 0.1, -0.3, -1.6, -0.6);
    spike(0.11, 0.26, 0.12, 0.3, 0.26, 1.7, -0.5);
    spike(0.1, 0.24, -0.06, 0.33, 0.27, 1.6, 0.3);
    spike(0.09, 0.2, -0.22, 0.27, 0.2, 1.5, 0.8);
    for (const s of [-1, 1]) {
      const brow = part(new THREE.BoxGeometry(0.13, 0.035, 0.03), hair, s * 0.135, 0.14, 0.325, head);
      brow.rotation.z = -s * 0.18;
      for (const [fx, fy] of [[0.2, -0.07], [0.25, -0.1], [0.21, -0.13]]) ball(0.012, std(0xb9774f), s * fx, fy, 0.3 - (fx - 0.2) * 0.5, head);
    }
  }

  // face: big eyes with highlights, cheeks, smile
  const glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [-1, 1].map((s) => {
    const eye = new THREE.Group();
    eye.position.set(s * 0.135, 0.0, 0.305);
    eye.rotation.y = s * 0.3;
    head.add(eye);
    ball(0.1, white, 0, 0, 0, eye, 0.9, 1.1, 0.45);
    ball(0.07, std(C.eye, { roughness: 0.3 }), 0, -0.005, 0.03, eye, 1, 1.15, 0.45);
    ball(0.04, dark, 0, -0.005, 0.048, eye, 1, 1.15, 0.4);
    part(new THREE.SphereGeometry(0.024, 8, 6), glint, 0.024, 0.036, 0.066, eye);
    return eye;
  });
  const blush = std(0xff8fa3, { roughness: 0.9 });
  for (const s of [-1, 1]) ball(0.055, blush, s * 0.235, -0.115, 0.255, head, 1, 0.7, 0.3);
  const smile = part(new THREE.TorusGeometry(astra ? 0.055 : 0.07, 0.017, 6, 12, Math.PI), std(C.mouth), 0, -0.125, 0.335, head);
  smile.rotation.z = Math.PI;

  // ---- limbs ----
  const arm = (s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.31, 0.7, 0);
    body.add(pivot);
    part(new THREE.CapsuleGeometry(0.065, 0.14, 4, 8), std(C.sleeve), 0, -0.11, 0, pivot);
    part(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 10), std(C.cuff), 0, -0.2, 0, pivot);
    ball(0.095, std(C.hand), 0, -0.28, 0, pivot);
    if (!astra) for (let i = -1; i <= 1; i++) ball(0.03, skin, i * 0.045, -0.36, 0.02, pivot); // fingerless gloves
    pivot.rotation.z = s * 0.28;
    return pivot;
  };
  const leg = (s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.13, 0.3, 0);
    body.add(pivot);
    part(new THREE.CapsuleGeometry(0.075, 0.08, 4, 8), std(C.shin), 0, -0.09, 0, pivot);
    if (astra) ball(0.07, white, 0, -0.07, 0.06, pivot, 1, 1, 0.6); // knee pad
    else part(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 10), white, 0, -0.15, 0, pivot); // sock
    ball(0.13, std(C.shoe, { roughness: 0.4 }), 0, -0.21, 0.04, pivot, 1, 0.78, 1.4);
    if (!astra) ball(0.07, orange, 0, -0.2, 0.17, pivot, 1.2, 0.8, 1);
    part(new THREE.BoxGeometry(0.2, 0.04, 0.32), std(C.sole), 0, -0.29, 0.04, pivot);
    return pivot;
  };
  root.scale.setScalar(1.15);
  root.userData.parts = { body, tip, tails, eyes, head, flame, armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) };
  return root;
}

// A breakable crate with a gem inside; only a dash can smash it.
export function makeCrate() {
  const tex = canvasTex('crate', 64, (g, s) => {
    g.fillStyle = '#b9853f';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#6f4a1c';
    g.lineWidth = 7;
    g.strokeRect(3, 3, s - 6, s - 6);
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(6, 6);
    g.lineTo(s - 6, s - 6);
    g.moveTo(s - 6, 6);
    g.lineTo(6, s - 6);
    g.stroke();
    g.fillStyle = '#ff8a1f';
    g.beginPath();
    g.moveTo(22, 24);
    g.lineTo(36, 32);
    g.lineTo(22, 40);
    g.moveTo(34, 24);
    g.lineTo(48, 32);
    g.lineTo(34, 40);
    g.fill();
  });
  return shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), cached('crate', () => lam(0xffffff, { map: tex }))));
}

export function makeGem() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42, 0),
    cached('gem', () => new THREE.MeshStandardMaterial({ color: 0x4de8ff, emissive: 0x1493b8, emissiveIntensity: 0.9, flatShading: true, roughness: 0.15, metalness: 0.2 })),
  );
  m.scale.set(0.8, 1.15, 0.8);
  m.castShadow = true;
  g.add(m);
  return g;
}

// Faint column of light that marks a gem floating high overhead.
export function makeGemBeam(height) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.3, height, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x8ff3ff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  );
  m.position.y = height / 2;
  return m;
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

// Trees differ per world: spring pine, autumn broadleaf, palm, cactus,
// snow-capped pine.
export function makeTree(theme) {
  const g = new THREE.Group();
  const kind = theme.tree;
  const bark = cached('bark', () => lam(0x8a5a2b));
  const add = (geo, mat, x, y, z, cast = true) => {
    const m = shadowed(new THREE.Mesh(geo, mat), cast, false);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  if (kind === 'palm') {
    const leaf = cached('palmLeaf', () => new THREE.MeshLambertMaterial({ color: 0x2fb344, flatShading: true, side: THREE.DoubleSide }));
    let x = 0;
    for (let i = 0; i < 5; i++) {
      add(new THREE.CylinderGeometry(0.2 - i * 0.015, 0.25 - i * 0.015, 0.75, 7), bark, x, 0.37 + i * 0.7, 0).rotation.z = -i * 0.07;
      x += 0.05 * i;
    }
    for (let i = 0; i < 7; i++) {
      const frond = new THREE.Group();
      frond.position.set(x, 3.45, 0);
      frond.rotation.y = (i / 7) * Math.PI * 2;
      const blade = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 4), leaf), true, false);
      blade.scale.z = 0.25;
      blade.rotation.z = -Math.PI / 2 - 0.5;
      blade.position.set(0.95, -0.3, 0);
      frond.add(blade);
      g.add(frond);
    }
    const nut = cached('coconut', () => lam(0x5c3b1e));
    add(new THREE.SphereGeometry(0.17, 8, 6), nut, x + 0.18, 3.25, 0.1);
    add(new THREE.SphereGeometry(0.17, 8, 6), nut, x - 0.15, 3.22, -0.12);
  } else if (kind === 'cactus') {
    const green = cached('cactus', () => new THREE.MeshLambertMaterial({ color: 0x4c9a3f, flatShading: true }));
    add(new THREE.CapsuleGeometry(0.32, 1.7, 3, 8), green, 0, 1.15, 0);
    for (const s of [-1, 1]) {
      const y = s > 0 ? 1.5 : 1.1;
      add(new THREE.CapsuleGeometry(0.16, 0.4, 3, 6), green, s * 0.5, y, 0).rotation.z = Math.PI / 2;
      add(new THREE.CapsuleGeometry(0.16, 0.5, 3, 6), green, s * 0.75, y + 0.4, 0);
    }
    add(new THREE.IcosahedronGeometry(0.16, 0), cached('cactusFlower', () => lam(0xff5d8f)), 0, 2.4, 0);
  } else if (kind === 'autumn') {
    add(new THREE.CylinderGeometry(0.24, 0.34, 2, 7), bark, 0, 1, 0);
    const cols = [0xe8590c, 0xf59f00, 0xc92a2a, 0xfab005];
    [[1.3, 0, 2.7, 0], [1.0, 0.85, 2.3, 0.3], [0.95, -0.75, 2.4, -0.4], [0.85, 0.1, 3.6, 0.1]].forEach(([r, x, y, z], i) => {
      add(new THREE.IcosahedronGeometry(r, 0), cached(`fall${i}`, () => new THREE.MeshLambertMaterial({ color: cols[i], flatShading: true })), x, y, z);
    });
  } else {
    const snowy = kind === 'snowpine';
    add(new THREE.CylinderGeometry(0.28, 0.36, 1.6, 7), bark, 0, 0.8, 0);
    const leaf = cached(`pine${snowy}`, () => new THREE.MeshLambertMaterial({ color: snowy ? 0x1f6f5c : 0x2f9e44, flatShading: true }));
    const snow = cached('snowcap', () => new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
    [[1.5, 1.9, 1.5], [1.15, 2.9, 1.3], [0.75, 3.8, 1.1]].forEach(([r, y, h]) => {
      add(new THREE.ConeGeometry(r, h, 7), leaf, 0, y, 0);
      if (snowy) add(new THREE.ConeGeometry(r * 0.66, h * 0.62, 7), snow, 0, y + h * 0.21, 0, false);
    });
  }
  return g;
}

// Small non-colliding ground decorations scattered over each world.
export function makeProp(kind, theme) {
  const g = new THREE.Group();
  const flat = (color, extra = {}) => cached(`prop${color}${JSON.stringify(extra)}`, () => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra }));
  const add = (geo, mat, x, y, z) => {
    const m = shadowed(new THREE.Mesh(geo, mat), true, false);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  switch (kind) {
    case 'flower':
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 5), flat(0x2f9e44), 0, 0.17, 0);
      add(new THREE.IcosahedronGeometry(0.15, 0), flat(pick([0xff5d8f, 0xffffff, 0xffd23f, 0xb197fc, 0xff8787])), 0, 0.4, 0).scale.y = 0.55;
      add(new THREE.SphereGeometry(0.06, 6, 5), flat(0xffb703), 0, 0.45, 0);
      break;
    case 'bush':
      add(new THREE.IcosahedronGeometry(0.45, 0), flat(theme.bush), 0, 0.25, 0).scale.y = 0.7;
      add(new THREE.IcosahedronGeometry(0.3, 0), flat(theme.bush), 0.35, 0.18, 0.1).scale.y = 0.7;
      break;
    case 'mushroom':
      add(new THREE.CylinderGeometry(0.07, 0.09, 0.24, 6), flat(0xfff3e0), 0, 0.12, 0);
      add(new THREE.SphereGeometry(0.2, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), flat(pick([0x9b5de5, 0x4dabf7, 0xf59f00])), 0, 0.22, 0).scale.y = 0.8;
      break;
    case 'pumpkin':
      add(new THREE.SphereGeometry(0.28, 8, 6), flat(0xf76707), 0, 0.2, 0).scale.y = 0.75;
      add(new THREE.CylinderGeometry(0.03, 0.05, 0.12, 5), flat(0x5c940d), 0, 0.44, 0);
      break;
    case 'leafpile':
      add(new THREE.IcosahedronGeometry(0.5, 0), flat(pick([0xe8590c, 0xc92a2a, 0xf59f00])), 0, 0.06, 0).scale.y = 0.28;
      break;
    case 'starfish': {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.12 : 0.3;
        const a = (i / 10) * Math.PI * 2;
        shape[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      add(new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false }).rotateX(-Math.PI / 2), flat(pick([0xff6b6b, 0xff922b])), 0, 0.01, 0);
      break;
    }
    case 'shell':
      add(new THREE.ConeGeometry(0.16, 0.34, 7), flat(pick([0xffc9de, 0xfff0f6, 0xffe8cc])), 0, 0.12, 0).rotation.z = 1.2;
      break;
    case 'rock':
      add(new THREE.DodecahedronGeometry(0.34, 0), flat(theme.rock), 0, 0.2, 0).scale.set(1 + Math.random() * 0.5, 0.7 + Math.random() * 0.5, 1);
      break;
    case 'drybush':
      add(new THREE.IcosahedronGeometry(0.32, 0), flat(0xa9713c, { wireframe: true }), 0, 0.3, 0);
      add(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 4), flat(0x7a4f2a), 0, 0.08, 0);
      break;
    case 'smallcactus':
      add(new THREE.CapsuleGeometry(0.14, 0.3, 3, 6), flat(0x4c9a3f), 0, 0.28, 0);
      add(new THREE.IcosahedronGeometry(0.07, 0), flat(0xffd23f), 0, 0.6, 0);
      break;
    case 'snowman': {
      const white = flat(0xffffff);
      add(new THREE.SphereGeometry(0.3, 10, 8), white, 0, 0.26, 0);
      add(new THREE.SphereGeometry(0.21, 10, 8), white, 0, 0.68, 0);
      add(new THREE.ConeGeometry(0.04, 0.18, 5), flat(0xff922b), 0, 0.68, 0.26).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.03, 5, 4), flat(0x1a1a2a), s * 0.08, 0.75, 0.18);
      add(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 8), flat(0xe03131), 0, 0.5, 0);
      break;
    }
    case 'crystal':
      add(new THREE.OctahedronGeometry(0.26, 0), cached('ice', () => new THREE.MeshStandardMaterial({ color: 0x9be7ff, emissive: 0x2a7fb8, flatShading: true, transparent: true, opacity: 0.85, roughness: 0.2 })), 0, 0.36, 0).scale.y = 1.7;
      break;
    case 'snowmound':
      add(new THREE.SphereGeometry(0.55, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), flat(0xffffff), 0, 0, 0).scale.y = 0.5;
      break;
    default:
  }
  g.rotation.y = Math.random() * Math.PI * 2;
  g.scale.setScalar(0.85 + Math.random() * 0.4);
  return g;
}

export function makeLava(w, d) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff3b00, emissiveIntensity: 0.9, roughness: 0.6 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), mat);
  m.userData.mat = mat;
  return m;
}

export function makeCloud({ color = 0xffffff, emissive = 0x9aa7b8 } = {}) {
  const g = new THREE.Group();
  const mat = cached(`cloud${color}`, () => new THREE.MeshLambertMaterial({ color, emissive, flatShading: true, fog: false }));
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + Math.random() * 1.6, 1), mat);
    s.position.set(i * 2.3 - n, Math.random() * 0.8, Math.random() * 1.5);
    s.scale.y = 0.65;
    g.add(s);
  }
  return g;
}

// Arched bands in the sky: a rainbow by default, an aurora with other colours.
export function makeArc(colors = ['#ff4d6d', '#ff9f1c', '#ffe14d', '#5fe36a', '#4dabf7', '#9b6bff'], { radius = 60, width = 1.1, opacity = 0.55 } = {}) {
  const g = new THREE.Group();
  colors.forEach((c, i) => {
    g.add(new THREE.Mesh(
      new THREE.TorusGeometry(radius - i * width * 2, width, 4, 40, Math.PI),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity, fog: false, depthWrite: false }),
    ));
  });
  return g;
}

export function makeDisc(color, radius, glow = 0.25) {
  const g = new THREE.Group();
  const disc = (r, opacity) => new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, fog: false, depthWrite: false }));
  g.add(disc(radius * 1.7, glow * 0.5), disc(radius * 1.3, glow), disc(radius, 1));
  g.children.forEach((c, i) => (c.position.z = i * 0.1));
  return g;
}

export function makeStars(count = 420) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = 0.08 + Math.random() * 1.4;
    pos.set([Math.cos(a) * Math.cos(e) * 300, Math.sin(e) * 300, Math.sin(a) * Math.cos(e) * 300], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9, depthWrite: false }));
}

export function makePeak(radius, height, color) {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 6), new THREE.MeshLambertMaterial({ color, flatShading: true }));
  rock.position.y = height / 2;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.42, height * 0.42, 6), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
  cap.position.y = height * 0.795;
  g.add(rock, cap);
  return g;
}

export function dotTexture() {
  return canvasTex('dot', 32, (g) => {
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
  });
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

export function makeLandingRing() {
  // Bright ring on a dark backing so it reads on grass, sand and snow alike.
  const g = new THREE.Group();
  const ring = (inner, outer, color, opacity, y) => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
    );
    m.position.y = y;
    m.renderOrder = 3;
    g.add(m);
  };
  ring(0.36, 0.68, 0x1b1f3b, 0.75, 0);
  ring(0.43, 0.61, 0xfff27a, 1, 0.01);
  return g;
}

export function makeDropLine() {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  m.renderOrder = 3;
  return m;
}
