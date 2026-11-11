// Level definitions. Each course runs away from the camera (towards -Z).
// `b` is the builder exposed by the game; y values are the surface the
// object stands on.
const THEMES = {
  meadow: {
    name: 'meadow', skyTop: '#2f7df6', skyBottom: '#bfe6ff', fog: 0xbfe6ff, water: 0x1fa8e0,
    topA: '#6fd44b', topB: '#58c23a', rim: 0x4caf32, sideA: '#b9793f', sideB: '#8f5a2c',
    tree: 0x2f9e44, sun: 0xfff4d6, ambient: 1.0, rainbow: true,
  },
  mesa: {
    name: 'mesa', skyTop: '#ff8a3d', skyBottom: '#ffe3b0', fog: 0xffdcae, water: 0xe8743b,
    topA: '#f6d27a', topB: '#ecc260', rim: 0xd9a441, sideA: '#c9703d', sideB: '#9c4f28',
    tree: 0x7cb342, sun: 0xffe2b8, ambient: 0.95, rainbow: false,
  },
  summit: {
    name: 'summit', skyTop: '#3b2a8c', skyBottom: '#f3a6d0', fog: 0xd9a6d6, water: 0x5b5bd6,
    topA: '#ffffff', topB: '#dbeafe', rim: 0xbcd3f5, sideA: '#7c8fc4', sideB: '#56659a',
    tree: 0x2c7a7b, sun: 0xffe0f0, ambient: 0.9, rainbow: true,
  },
};

export const LEVELS = [
  {
    // World 1: solid ground all the way, with two small rivers to hop.
    // Falling in the water only costs a splash, not a life.
    name: 'Green Valley',
    theme: THEMES.meadow,
    time: 240,
    land: true,
    waterY: -1,
    safeWater: true,
    build(b) {
      b.spawn(0, 0, 5);
      b.island(0, -6, 22, 28, 0);
      b.tree(-8.5, 0, 5);
      b.tree(8.5, 0, 2);
      b.tree(-8.5, 0, -6);
      b.tree(8.5, 0, -13);
      b.coinLine(0, 0, 1, 0, 0, -5, 4);
      b.island(-5, -9, 5, 5, 1, { h: 1 });
      b.coinLine(-6, 1, -9, -4, 1, -9, 3);
      b.mystery(3, 0, -9, 'coin');
      b.mystery(4.2, 0, -9, 'coin');
      b.slime(2, 0, -15, 'x', 3);

      // first river: a short hop
      b.coinLine(0, 1.2, -20.4, 0, 1.2, -22.1, 3);
      b.island(0, -35.25, 22, 25.5, 0);
      b.checkpoint(-3, 0, -24.5);
      b.tree(-8.5, 0, -26);
      b.tree(8.5, 0, -31);
      b.brick(-1.2, 0, -30);
      b.mystery(0, 0, -30, 'speed');
      b.brick(1.2, 0, -30);
      b.slime(-4, 0, -34, 'x', 3);
      b.coinLine(-6, 0, -36, 6, 0, -36, 5);
      b.island(0, -44, 22, 8, 1, { h: 1 });
      b.slime(4, 1, -44, 'x', 3);
      b.coinLine(-3, 1, -46, 3, 1, -46, 3);

      // second river: a little wider, with a stepping stone
      b.island(0, -49.75, 2.6, 2, 0.4, { h: 2 });
      b.coin(0, 0.4, -49.75);
      b.island(0, -61.5, 22, 20, 0);
      b.checkpoint(-3, 0, -53.5);
      b.tree(-8.5, 0, -55);
      b.tree(8.5, 0, -58);
      b.mystery(4, 0, -57, 'jump');
      b.slime(-3, 0, -59, 'x', 3);
      b.coinRing(0, 0, -66, 2.6, 8);
      b.flag(0, 0, -66);
    },
  },
  {
    // World 2: still on land, but with stepping stones, a raft, a lava
    // puddle and some climbing.
    name: 'Riverbend Hills',
    theme: THEMES.meadow,
    time: 240,
    land: true,
    waterY: -1,
    safeWater: true,
    build(b) {
      b.spawn(0, 0, 4);
      b.island(0, -4, 20, 20, 0);
      b.tree(-7.5, 0, 3);
      b.tree(7.5, 0, -2);
      b.coinLine(-3, 0, 0, 3, 0, 0, 4);
      b.mystery(-0.6, 0, -5, 'coin');
      b.mystery(0.6, 0, -5, 'multi');
      b.slime(0, 0, -9, 'x', 4);

      // stepping stones across the river
      b.island(-2, -16.5, 3, 3, 0.3, { h: 2 });
      b.coin(-2, 0.3, -16.5);
      b.island(1.5, -20, 3, 3, 0.3, { h: 2 });
      b.coin(1.5, 0.3, -20);

      b.island(0, -30, 20, 16, 0);
      b.checkpoint(2, 0, -24);
      b.island(-5, -30, 6, 6, 1.2, { h: 1.2 });
      b.island(-5, -30, 3, 3, 2.4, { h: 1.2 });
      b.mystery(-5, 2.4, -30, 'jump');
      b.coinLine(-7, 1.2, -32.2, -3, 1.2, -32.2, 3);
      b.lava(5, -31, 4, 3, 0);
      b.slime(4, 0, -27, 'x', 3);
      b.slime(0, 0, -35, 'x', 5);
      b.brick(4.4, 0, -35.5);
      b.mystery(5.6, 0, -35.5, 'speed');
      b.tree(8, 0, -36);

      // a raft ferries across the second river
      b.mover(0, -42, 4, 3.5, 0, { axis: 'z', range: 2, speed: 0.8 });
      b.coinLine(0, 1.2, -40, 0, 1.2, -44, 3);

      b.island(0, -56, 20, 20, 0);
      b.checkpoint(-3, 0, -48);
      b.tree(-8, 0, -50);
      b.tree(8, 0, -50);
      b.slime(5, 0, -51, 'x', 3);
      b.island(0, -54.2, 4, 1.6, 0.75, { h: 0.75 });
      b.island(0, -60, 12, 10, 1.5, { h: 1.5 });
      b.slime(0, 1.5, -57.5, 'x', 4);
      b.coinRing(0, 1.5, -61.5, 2.6, 8);
      b.flag(0, 1.5, -61.5);
    },
  },
  {
    name: 'Sunny Isles',
    theme: THEMES.meadow,
    time: 200,
    build(b) {
      b.spawn(0, 0, 4);
      b.island(0, 0, 14, 14, 0);
      b.tree(-5, 0, 4.5);
      b.tree(5.2, 0, -5.2);
      b.coinLine(-3, 0, 1, 3, 0, 1, 4);
      b.mystery(-1.2, 0, -3, 'coin');
      b.brick(0, 0, -3);
      b.mystery(1.2, 0, -3, 'speed');
      b.slime(-3, 0, -5, 'x', 2.5);

      b.coinLine(0, 1.8, -7.5, 0, 2.2, -9.5, 3);
      b.island(0, -13.5, 8, 7, 1);
      b.slime(0, 1, -14, 'x', 2.6);
      b.coinLine(-3, 1, -12, 3, 1, -12, 3);

      b.mover(0, -22, 3.5, 3.5, 1, { axis: 'z', range: 2.5, speed: 1.1 });
      b.coinLine(0, 2.4, -19, 0, 2.4, -25, 4);

      b.island(0, -33, 12, 10, 1.5);
      b.checkpoint(-3.5, 1.5, -29.5);
      b.brick(-2.4, 1.5, -33);
      b.mystery(-1.2, 1.5, -33, 'multi');
      b.brick(0, 1.5, -33);
      b.mystery(1.2, 1.5, -33, 'jump');
      b.brick(2.4, 1.5, -33);
      b.slime(-2, 1.5, -35.5, 'x', 3);
      b.slime(2, 1.5, -31, 'x', 3);
      b.tree(-5, 1.5, -37);

      b.island(8, -33, 4, 4, 3);
      b.coin(8, 3, -33);
      b.island(13, -33, 4, 4, 4.5);
      b.coin(13, 4.5, -33);

      b.island(13, -43, 10, 12, 4.5);
      b.lava(13, -43, 10, 6, 4.5);
      b.island(11, -43, 1.8, 1.8, 5.2, { h: 0.9 });
      b.island(15, -43, 1.8, 1.8, 5.2, { h: 0.9 });
      b.coin(11, 5.9, -43);
      b.coin(15, 5.9, -43);
      b.checkpoint(16.5, 4.5, -47.5);

      b.mover(13, -52, 3, 3, 4.5, { axis: 'y', range: 2.5, speed: 0.9 });
      b.island(13, -60, 10, 10, 7);
      b.coinRing(13, 7, -61, 2.6, 8);
      b.tree(9.5, 7, -63.5);
      b.flag(13, 7, -61);
    },
  },
  {
    name: 'Sunset Mesa',
    theme: THEMES.mesa,
    time: 220,
    build(b) {
      b.spawn(0, 0, 3);
      b.island(0, 0, 10, 10, 0);
      b.mystery(-0.6, 0, -1.5, 'coin');
      b.mystery(0.6, 0, -1.5, 'speed');
      b.slime(0, 0, -3.5, 'x', 3.5);
      b.tree(-3.6, 0, 3.4);

      b.island(0, -10, 4, 4, 0.8);
      b.coin(0, 0.8, -10);
      b.island(-5, -15, 4, 4, 1.6);
      b.coin(-5, 1.6, -15);
      b.island(0, -21, 4, 4, 2.4);
      b.coin(0, 2.4, -21);

      b.island(0, -33, 14, 14, 2.4);
      b.checkpoint(-5, 2.4, -27.2);
      b.lava(0, -33, 14, 3, 2.4);
      b.lava(-4.5, -37.5, 4, 3, 2.4);
      b.slime(3, 2.4, -29, 'x', 3);
      b.slime(2, 2.4, -37.5, 'x', 3.5);
      b.slime(-3, 2.4, -29.5, 'z', 1.2);
      b.brick(3, 2.4, -36);
      b.mystery(4.2, 2.4, -36, 'jump');
      b.brick(5.4, 2.4, -36);
      b.coinLine(-2, 4.2, -33, 2, 4.2, -33, 3);
      b.tree(5.5, 2.4, -38.5);

      b.mover(0, -44.5, 3, 3, 2.4, { axis: 'x', range: 3.5, speed: 1 });
      b.mover(0, -50.5, 3, 3, 2.4, { axis: 'x', range: 3.5, speed: 1, phase: Math.PI / 2 });
      b.coinLine(-3, 3.6, -48, 3, 3.6, -48, 4);

      b.island(0, -59, 8, 8, 3);
      b.checkpoint(-2.8, 3, -56);
      b.mystery(0, 3, -59, 'multi');
      b.slime(0, 3, -61.5, 'x', 2.8);
      b.island(6, -59, 3, 3, 4.6);
      b.coin(6, 4.6, -59);
      b.island(11, -59, 3, 3, 6.2);
      b.coin(11, 6.2, -59);

      b.island(11, -67.5, 9, 10, 6.2);
      b.lava(8.2, -66, 3.4, 4, 6.2);
      b.lava(13.8, -66, 3.4, 4, 6.2);
      b.slime(11, 6.2, -64.5, 'z', 1.2);
      b.coinRing(11, 6.2, -69.5, 2.4, 8);
      b.flag(11, 6.2, -69.5);
    },
  },
  {
    name: 'Starlight Summit',
    theme: THEMES.summit,
    time: 240,
    build(b) {
      b.spawn(0, 0, 2.5);
      b.island(0, 0, 9, 9, 0);
      b.mystery(-0.6, 0, -1, 'jump');
      b.mystery(0.6, 0, -1, 'coin');
      b.tree(-3.2, 0, 3);
      b.tree(3.2, 0, 3);

      b.mover(0, -8, 3, 3, 1.5, { axis: 'y', range: 1.5, speed: 0.9 });
      b.island(0, -15, 6, 6, 3);
      b.slime(0, 3, -15.5, 'x', 2);
      b.coinLine(-2, 3, -13, 2, 3, -13, 3);

      b.mover(0, -24, 3, 3, 3, { axis: 'z', range: 3, speed: 1 });
      b.coinLine(0, 4.4, -20, 0, 4.4, -28, 5);

      b.island(0, -36, 12, 10, 3);
      b.checkpoint(-4.5, 3, -32);
      b.lava(-3, -36, 3, 3, 3);
      b.lava(3, -36, 3, 3, 3);
      b.slime(0, 3, -33.5, 'x', 4);
      b.slime(0, 3, -39, 'x', 4);
      b.slime(0, 3, -36, 'z', 1.5);
      b.brick(3.6, 3, -39.5);
      b.mystery(4.8, 3, -39.5, 'speed');
      b.mystery(-4.8, 3, -39.5, 'multi');

      b.island(-8, -36, 3, 3, 4.5);
      b.coin(-8, 4.5, -36);
      b.island(-13, -36, 3, 3, 6);
      b.coin(-13, 6, -36);
      b.mover(-13, -45, 3, 3, 6, { axis: 'z', range: 3, speed: 1.1 });
      b.coinLine(-13, 7.4, -42, -13, 7.4, -48, 4);

      b.island(-13, -56, 8, 8, 6);
      b.checkpoint(-10.2, 6, -53);
      b.lava(-13, -56, 3, 3, 6);
      b.slime(-13, 6, -53.5, 'x', 2.6);
      b.slime(-13, 6, -58.6, 'x', 2.6);
      b.mystery(-15.8, 6, -58.5, 'jump');

      b.mover(-13, -63, 3, 3, 8, { axis: 'y', range: 2, speed: 0.8 });
      b.island(-13, -71, 9, 9, 10);
      b.tree(-16.2, 10, -74);
      b.tree(-9.8, 10, -74);
      b.coinRing(-13, 10, -71.5, 2.6, 10);
      b.flag(-13, 10, -71.5);
    },
  },
];
