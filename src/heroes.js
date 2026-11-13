// The playable characters. Both run, jump, double-jump (with a flip) and
// ground-pound; each adds powers of their own on the POWER button.
export const HEROES = {
  astra: {
    id: 'astra',
    name: 'Astra',
    tagline: 'Jetpack pilot',
    button: 'JET',
    powers: [
      ['Jet Boost', 'Press POWER for a rocket burst straight up, once per jump.'],
      ['Hover', 'Hold JUMP while falling to glide down slowly.'],
    ],
    hint: 'Best at reaching gems floating high overhead.',
  },
  dash: {
    id: 'dash',
    name: 'Dash',
    tagline: 'Speed runner',
    button: 'DASH',
    powers: [
      ['Turbo Dash', 'Press POWER to blast forward, on the ground or in mid-air.'],
      ['Smash', 'A dash breaks gem crates and bowls over slimes. Dash also runs a little faster.'],
    ],
    hint: 'Best at smashing gem crates and clearing long gaps.',
  },
};
