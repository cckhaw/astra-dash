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

export const INTRO = [
  'You are Astra, a young star-scout charting the night sky in your little ship, the Comet.',
  'A swarm of grumpy slimes bumped the Comet off course and shook all five Star Sparks out of its engine. They tumbled down across the land below.',
  'Without them the Comet cannot fly home. Follow each Spark\u2019s glow and raise the beacon flag at the end of every world to call it back.',
];

export const OUTRO = [
  'The fifth Spark clicks into place and the Comet\u2019s engine hums back to life.',
  'The slimes watch from the summit as you lift off, scarf streaming, and one of them even waves.',
  'Home is a long way off, but the sky is clear and every Spark is shining. Well flown, star-scout!',
];

export const LEVELS = [
  {
    // World 1: solid ground all the way, with two small rivers to hop.
    // Falling in the water only costs a splash, not a life.
    name: 'Green Valley',
    theme: THEMES.meadow,
    time: 360,
    story: [
      'The Comet has come down in a quiet green valley. The first Spark fell somewhere past the rivers and the old log bridge.',
      'The slimes here are slow and the water is shallow, so it is a good place to find your feet. Hop the rivers, climb the terraces and raise the beacon.',
    ],
    route: [[0, -10], [0, -19], [0, -25], [0, -38], [0, -43], [0, -47], [0, -49.75], [0, -54], [0, -69.5], [0, -80], [0, -86], [0, -105.5], [0, -113], [0, -120], [0, -126], [0, -131]],
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
      b.coinLine(-4, 0, -66, 4, 0, -66, 5);

      // the old log bridge over the pond
      b.island(0, -77.5, 4, 12, 0);
      b.coinLine(0, 0, -73.5, 0, 0, -81.5, 5);

      b.island(0, -95.5, 22, 24, 0);
      b.checkpoint(-3, 0, -85.5);
      b.tree(-8.5, 0, -87);
      b.tree(8.5, 0, -99);
      b.island(6, -93, 6, 6, 1, { h: 1 });
      b.island(6, -93, 3, 3, 2, { h: 1 });
      b.coinRing(6, 1, -93, 2.3, 6);
      b.coin(6, 2, -93);
      b.mystery(-5.6, 0, -92, 'multi');
      b.brick(-4.4, 0, -92);
      b.mystery(-3.2, 0, -92, 'speed');
      b.slime(-4, 0, -97, 'x', 4);
      b.slime(2, 0, -102, 'x', 5);
      b.coinLine(-2, 0, -105, 2, 0, -105, 3);

      // third river
      b.coinLine(0, 1.3, -108, 0, 1.3, -110, 3);
      b.island(0, -122.5, 22, 24, 0);
      b.checkpoint(-3, 0, -112.5);
      b.tree(-8.5, 0, -113);
      b.tree(8.5, 0, -114);
      b.slime(3, 0, -114.5, 'x', 4);
      b.island(0, -120, 22, 6, 1, { h: 1 });
      b.slime(-3, 1, -120, 'x', 4);
      b.coinLine(-6, 1, -121, 6, 1, -121, 5);
      b.island(0, -128.75, 22, 11.5, 2, { h: 2 });
      b.mystery(-4, 2, -126, 'jump');
      b.tree(-8.5, 2, -132);
      b.tree(8.5, 2, -132);
      b.coinRing(0, 2, -131, 2.6, 8);
      b.flag(0, 2, -131);
    },
  },
  {
    // World 2: still on land, but with stepping stones, a raft, a lava
    // puddle and some climbing.
    name: 'Riverbend Hills',
    theme: THEMES.meadow,
    time: 380,
    story: [
      'One Spark is back in the engine, and its glow points upriver, where the water runs wide and the hills smoulder.',
      'The valley folk left stepping stones and rafts for travellers. Mind the lava puddles, ride the rafts and climb to the hilltop beacon.',
    ],
    route: [[0, -12.5], [-2, -16.5], [1.5, -20], [1, -24], [0, -36.5], 'm0', [0, -48], [0, -54.2], [0, -57], [0, -63.5], [-2.5, -68.5], [1, -72], [1, -77.5], [0, -98.5], 'm1', 'm2', [0, -112], [0, -118], [0, -122], [0, -128]],
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
      b.coinLine(-3, 1.5, -62, 3, 1.5, -62, 4);

      // more stepping stones
      b.island(-2.5, -68.5, 3, 3, 0.3, { h: 2 });
      b.coin(-2.5, 0.3, -68.5);
      b.island(1, -72, 3, 3, 0.3, { h: 2 });
      b.coin(1, 0.3, -72);

      b.island(0, -88, 20, 24, 0);
      b.checkpoint(3, 0, -78);
      b.tree(-8, 0, -78);
      b.tree(8, 0, -82);
      b.mystery(-0.6, 0, -82, 'jump');
      b.mystery(0.6, 0, -82, 'coin');
      b.lava(-6, -86.5, 7, 3, 0);
      b.lava(6, -91, 7, 3, 0);
      b.slime(5, 0, -86, 'x', 3);
      b.slime(-5, 0, -91, 'x', 3);
      b.slime(0, 0, -96, 'x', 5);
      b.island(-6.5, -96, 5, 5, 1.2, { h: 1.2 });
      b.coinRing(-6.5, 1.2, -96, 1.6, 5);
      b.coinLine(0, 0, -85, 0, 0, -93, 4);

      // two rafts drifting side to side
      b.mover(-2, -103, 3.5, 3.5, 0, { axis: 'x', range: 2.5, speed: 0.8 });
      b.mover(2, -107, 3.5, 3.5, 0, { axis: 'x', range: 2.5, speed: 0.8, phase: Math.PI });

      b.island(0, -121, 20, 22, 0);
      b.checkpoint(-3, 0, -112);
      b.tree(-8, 0, -113);
      b.tree(8, 0, -113);
      b.slime(5, 0, -114, 'x', 3);
      b.island(0, -118, 8, 4, 1, { h: 1 });
      b.island(0, -122, 8, 4, 2.2, { h: 2.2 });
      b.coinLine(-2.5, 2.2, -122, 2.5, 2.2, -122, 3);
      b.island(0, -127.5, 12, 7, 3.4, { h: 3.4 });
      b.coinRing(0, 3.4, -128, 2.4, 8);
      b.flag(0, 3.4, -128);
    },
  },
  {
    name: 'Sunny Isles',
    theme: THEMES.meadow,
    time: 400,
    story: [
      'Two Sparks give the Comet just enough lift to hover, but the third has drifted up among the floating isles.',
      'There is no riverbank to catch you up here, so watch your shadow when you jump. Checkpoint crystals will remember how far you got.',
    ],
    route: [[0, -13.5], 'm0', [0, -30], [4.5, -33], [8, -33], [13, -33], [13, -38], [11, -43], [13, -48], 'm1', [13, -57], [13, -63], [13, -70], [8, -76], [13, -82], 'm2', [13, -98], [13, -106.5], 'm3', 'm4', [13, -124], [13, -127]],
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
      b.coinRing(13, 7, -60, 2.6, 8);
      b.tree(9.5, 7, -63.5);
      b.checkpoint(16.5, 7, -57);

      b.island(13, -70, 4, 4, 7);
      b.coin(13, 7, -70);
      b.island(8, -76, 4, 4, 7.8);
      b.coin(8, 7.8, -76);
      b.island(13, -82, 4, 4, 8.6);
      b.coin(13, 8.6, -82);
      b.mover(13, -90, 3.5, 3.5, 8.6, { axis: 'z', range: 2.5, speed: 1 });
      b.coinLine(13, 10, -87, 13, 10, -93, 4);

      b.island(13, -102, 12, 12, 8.6);
      b.checkpoint(9, 8.6, -97.5);
      b.tree(17.5, 8.6, -97.5);
      b.brick(10.6, 8.6, -102);
      b.mystery(11.8, 8.6, -102, 'jump');
      b.brick(13, 8.6, -102);
      b.mystery(14.2, 8.6, -102, 'multi');
      b.brick(15.4, 8.6, -102);
      b.slime(13, 8.6, -99.5, 'x', 4);
      b.slime(13, 8.6, -105, 'x', 4);

      b.mover(13, -112.5, 3, 3, 8.6, { axis: 'x', range: 3, speed: 1 });
      b.mover(13, -118, 3, 3, 10, { axis: 'y', range: 1.8, speed: 0.9 });
      b.island(13, -126, 10, 10, 11.5);
      b.tree(9.5, 11.5, -129.5);
      b.tree(16.5, 11.5, -129.5);
      b.coinRing(13, 11.5, -127, 2.6, 8);
      b.flag(13, 11.5, -127);
    },
  },
  {
    name: 'Sunset Mesa',
    theme: THEMES.mesa,
    time: 420,
    story: [
      'The slimes have carried the fourth Spark off to their favourite sunbathing spot: a scorched mesa above a sea of magma.',
      'The stone here is cracked with lava and the platforms never sit still. Time your jumps, and use a ground-pound to clear a crowd.',
    ],
    route: [[0, -10], [-5, -15], [0, -21], [0, -28], [0, -30.5], [0, -36], [0, -39], 'm0', 'm1', [0, -57], [3, -59], [6, -59], [11, -59], [11, -64], [11, -71], [11, -77], [11, -83], [11, -88.5], [11, -99.5], 'm2', 'm3', [11, -121], [5, -121], [0, -121], [0, -127], [0, -130]],
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
      b.coinLine(9.5, 6.2, -70, 12.5, 6.2, -70, 3);
      b.checkpoint(14, 6.2, -71);

      b.island(11, -77, 3, 3, 6.2);
      b.coin(11, 6.2, -77);
      b.island(11, -83, 3, 3, 6.2);
      b.coin(11, 6.2, -83);

      b.island(11, -94, 12, 14, 6.2);
      b.checkpoint(15.5, 6.2, -88.2);
      b.lava(7.3, -91, 4.6, 3, 6.2);
      b.lava(14.7, -95, 4.6, 3, 6.2);
      b.lava(7.3, -99, 4.6, 3, 6.2);
      b.slime(14, 6.2, -91, 'x', 2.2);
      b.slime(8, 6.2, -95, 'x', 2.2);
      b.mystery(15.2, 6.2, -99, 'speed');
      b.brick(14, 6.2, -99);
      b.coinLine(11, 6.2, -90, 11, 6.2, -98, 5);

      b.mover(11, -106, 3, 3, 6.2, { axis: 'z', range: 2.5, speed: 1 });
      b.mover(11, -114, 3, 3, 6.2, { axis: 'x', range: 3.5, speed: 1.1 });
      b.island(11, -121, 6, 6, 7);
      b.checkpoint(13, 7, -119.5);
      b.island(5, -121, 3, 3, 8.4);
      b.coin(5, 8.4, -121);
      b.island(0, -121, 3, 3, 9.8);
      b.coin(0, 9.8, -121);

      b.island(0, -129, 9, 9, 9.8);
      b.lava(-3.1, -131.5, 2.8, 4, 9.8);
      b.lava(3.1, -131.5, 2.8, 4, 9.8);
      b.slime(0, 9.8, -126.5, 'x', 3);
      b.tree(-3.3, 9.8, -126);
      b.coinRing(0, 9.8, -130.5, 1.4, 6);
      b.flag(0, 9.8, -130.5);
    },
  },
  {
    name: 'Starlight Summit',
    theme: THEMES.summit,
    time: 440,
    story: [
      'Only one Spark is missing. It landed at the very top of the frozen summit, where the sky is the colour of dusk and the whole slime swarm is waiting.',
      'Everything you have learned comes together here: lifts, drifting platforms, lava and long jumps. Reach the last beacon and the Comet can fly again.',
    ],
    route: ['m0', [0, -15], 'm1', [0, -32.5], [-5, -33.5], [-5, -36], [-8, -36], [-13, -36], 'm2', [-13, -53.5], [-10.5, -56], [-13, -59], 'm3', [-13, -68], [-13, -73.5], 'm4', [-13, -86], 'm5', [-13, -98], [-9.5, -98], [-9.5, -101], [-6, -101], [-1, -101], 'm6', [-1, -118], [-1, -122]],
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
      b.coinRing(-13, 10, -71, 2.6, 8);
      b.checkpoint(-10, 10, -68.5);

      b.mover(-13, -79.5, 3, 3, 10, { axis: 'x', range: 4, speed: 1 });
      b.island(-13, -86, 4, 4, 10);
      b.coin(-13, 10, -86);
      b.mover(-13, -92.5, 3, 3, 11.5, { axis: 'y', range: 1.5, speed: 0.9 });

      b.island(-13, -101, 10, 10, 13);
      b.checkpoint(-9.5, 13, -97);
      b.lava(-14.5, -101, 7, 2.5, 13);
      b.slime(-14, 13, -98, 'x', 3);
      b.slime(-14, 13, -104, 'x', 3);
      b.mystery(-16.5, 13, -104.5, 'jump');
      b.mystery(-11, 13, -104.5, 'multi');
      b.tree(-16.8, 13, -96.8);
      b.island(-6, -101, 3, 3, 14.4);
      b.coin(-6, 14.4, -101);
      b.island(-1, -101, 3, 3, 15.8);
      b.coin(-1, 15.8, -101);

      b.mover(-1, -109, 3, 3, 15.8, { axis: 'z', range: 3, speed: 1.1 });
      b.coinLine(-1, 17.2, -106, -1, 17.2, -112, 4);
      b.island(-1, -121, 10, 10, 15.8);
      b.lava(-4.2, -123, 2.6, 4, 15.8);
      b.lava(2.2, -123, 2.6, 4, 15.8);
      b.slime(-1, 15.8, -118.5, 'x', 3.5);
      b.tree(-4.5, 15.8, -125);
      b.tree(2.5, 15.8, -125);
      b.coinRing(-1, 15.8, -122, 1.3, 6);
      b.flag(-1, 15.8, -122);
    },
  },
];
