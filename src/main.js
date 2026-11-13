import './style.css';
import { Game } from './game.js';
import { audio } from './audio.js';
import { initInput } from './input.js';
import { HEROES } from './heroes.js';

const $ = (id) => document.getElementById(id);
const pad = (n, len) => String(n).padStart(len, '0');
const screens = ['menu', 'select', 'story', 'pause', 'complete', 'gameover'];
const paragraphs = (el, lines) => el.replaceChildren(...(lines || []).map((t) => Object.assign(document.createElement('p'), { textContent: t })));
let toastTimer;

const ui = {
  hud(s) {
    $('h-coins').textContent = pad(s.coins, 2);
    $('h-score').textContent = pad(s.score, 6);
    $('h-lives').textContent = s.lives;
    $('h-time').textContent = pad(s.time, 3);
    $('h-time').classList.toggle('warn', s.time <= 30);
    $('h-high').textContent = pad(s.high, 6);
    $('h-world').textContent = s.world;
    $('h-gems').textContent = s.gems;
    const hero = HEROES[s.hero];
    $('pw-special-name').textContent = s.hero === 'astra' ? '▲ Jetpack' : '» Dash';
    $('pw-special').querySelector('i').style.width = `${Math.round(s.special * 100)}%`;
    $('pw-special').dataset.hero = s.hero;
    if ($('btn-power').textContent !== hero.button) $('btn-power').textContent = hero.button;
    $('menu-high').textContent = s.high;
    for (const k of ['jump', 'speed']) {
      const el = $(`pw-${k}`);
      el.classList.toggle('on', s[k] > 0);
      el.querySelector('i').style.width = `${s[k] * 100}%`;
    }
  },
  screen(name, info = {}) {
    for (const s of screens) $(`screen-${s}`).classList.toggle('hidden', s !== name);
    $('hud').classList.toggle('hidden', name === 'menu' || name === 'select');
    document.body.classList.toggle('in-game', name === null);
    if (name === 'story') {
      $('s-chapter').textContent = `World ${info.world} of ${info.total}`;
      $('s-title').textContent = info.name;
      paragraphs($('s-text'), [...(info.intro || []), ...info.text]);
      $('screen-story').scrollTop = 0;
    }
    if (name === 'complete') {
      $('c-sparks').textContent = `${'★'.repeat(info.sparks)}${'☆'.repeat(info.total - info.sparks)}  Star Spark ${info.sparks} of ${info.total} recovered`;
      paragraphs($('c-outro'), info.outro);
      const other = HEROES[info.hero === 'astra' ? 'dash' : 'astra'];
      $('c-gems').textContent = info.gems >= info.gemsTotal
        ? `◆ All ${info.gemsTotal} gems found!`
        : `◆ Gems ${info.gems} of ${info.gemsTotal} — some suit ${other.name}'s powers better.`;
      $('c-title').textContent = info.last ? 'The Comet flies again!' : `${info.name} clear!`;
      $('c-bonus').textContent = `+${info.bonus}`;
      $('c-score').textContent = info.score;
      $('c-high').textContent = info.high;
      $('c-next').textContent = info.last ? 'PLAY AGAIN' : 'NEXT WORLD';
    }
    if (name === 'gameover') {
      $('g-score').textContent = info.score;
      $('g-high').textContent = info.high;
    }
  },
  toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  },
  setMuted(m) {
    $('btn-mute').classList.toggle('off', m);
  },
};

const canvas = $('game');
initInput(canvas);
const game = new Game(canvas, ui);
if (import.meta.env.DEV) window.game = game;

// Character select: portraits are rendered once from the 3D models.
let portraitsReady = false;
function showSelect() {
  if (!portraitsReady) {
    portraitsReady = true;
    const pics = game.portraits();
    for (const h of Object.values(HEROES)) {
      $(`pic-${h.id}`).src = pics[h.id];
      $(`tag-${h.id}`).textContent = h.tagline;
      $(`pow-${h.id}`).replaceChildren(...h.powers.map(([name, text]) => {
        const li = document.createElement('li');
        li.append(Object.assign(document.createElement('b'), { textContent: name }), ` — ${text}`);
        return li;
      }));
    }
  }
  if (game.state === 'paused' || game.state === 'gameover') game.toMenu();
  ui.screen('select');
  document.querySelectorAll('.hero').forEach((b) => b.classList.toggle('last', b.dataset.hero === game.heroKind));
}

document.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  audio.unlock();
  if (action === 'start') game.startGame();
  if (action === 'choose') showSelect();
  if (action === 'pick') game.startGame(e.target.closest('[data-hero]').dataset.hero);
  if (action === 'resume') game.togglePause();
  if (action === 'next') game.nextLevel();
  if (action === 'begin') game.beginLevel();
});
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Enter' && e.code !== 'Space') return;
  audio.unlock();
  if (game.state === 'menu' && $('screen-select').classList.contains('hidden')) showSelect();
  else if (game.state === 'gameover') game.startGame();
  else if (game.state === 'story') game.beginLevel();
  else if (game.state === 'complete' && !$('screen-complete').classList.contains('hidden')) game.nextLevel();
});
$('btn-pause').addEventListener('click', () => game.togglePause());
$('btn-mute').addEventListener('click', () => ui.setMuted(audio.toggleMute()));
// Browsers only allow sound after a user gesture, and phones suspend it
// again whenever the page is backgrounded, so (re)unlock on every gesture.
for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
  window.addEventListener(type, () => audio.unlock(), { capture: true, passive: true });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.background();
  if (document.hidden && game.state === 'playing') game.togglePause();
});
