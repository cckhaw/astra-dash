import './style.css';
import { Game } from './game.js';
import { audio } from './audio.js';
import { initInput } from './input.js';

const $ = (id) => document.getElementById(id);
const pad = (n, len) => String(n).padStart(len, '0');
const screens = ['menu', 'pause', 'complete', 'gameover'];
let toastTimer;

const ui = {
  hud(s) {
    $('h-coins').textContent = pad(s.coins, 2);
    $('h-score').textContent = pad(s.score, 6);
    $('h-lives').textContent = s.lives;
    $('h-time').textContent = pad(s.time, 3);
    $('h-time').classList.toggle('warn', s.time <= 30);
    $('h-high').textContent = pad(s.high, 6);
    $('menu-high').textContent = s.high;
    for (const k of ['jump', 'speed']) {
      const el = $(`pw-${k}`);
      el.classList.toggle('on', s[k] > 0);
      el.querySelector('i').style.width = `${s[k] * 100}%`;
    }
  },
  screen(name, info = {}) {
    for (const s of screens) $(`screen-${s}`).classList.toggle('hidden', s !== name);
    $('hud').classList.toggle('hidden', name === 'menu');
    document.body.classList.toggle('in-game', name === null);
    if (name === 'complete') {
      $('c-title').textContent = info.last ? 'You cleared every world!' : `${info.name} clear!`;
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

document.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  audio.unlock();
  if (action === 'start') game.startGame();
  if (action === 'resume') game.togglePause();
  if (action === 'next') game.nextLevel();
});
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Enter' && e.code !== 'Space') return;
  audio.unlock();
  if (game.state === 'menu' || game.state === 'gameover') game.startGame();
  else if (game.state === 'complete' && !$('screen-complete').classList.contains('hidden')) game.nextLevel();
});
$('btn-pause').addEventListener('click', () => game.togglePause());
$('btn-mute').addEventListener('click', () => ui.setMuted(audio.toggleMute()));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') game.togglePause();
});
