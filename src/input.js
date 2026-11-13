// Unified keyboard + touch input. Edge-triggered actions are queued and
// consumed once per frame by the game.
export const input = {
  x: 0, // strafe  (-1..1)
  z: 0, // forward (-1..1)
  jump: false, // held
  jumpPressed: false,
  slamPressed: false,
  specialPressed: false,
  camTurn: 0, // keyboard camera turn (-1..1)
  camDrag: 0, // accumulated pointer drag (pixels)
  pausePressed: false,
  mutePressed: false,
  touch: false,
};

const keys = new Set();
const stick = { x: 0, z: 0 };

function refreshAxes() {
  let x = 0;
  let z = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) z += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) z -= 1;
  x += stick.x;
  z += stick.z;
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  input.x = x;
  input.z = z;
  input.camTurn = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
}

export function initInput(canvas) {
  const gameKeys = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', (e) => {
    if (gameKeys.includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space') {
      input.jump = true;
      input.jumpPressed = true;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.slamPressed = true;
    if (e.code === 'KeyF' || e.code === 'KeyJ') input.specialPressed = true;
    if (e.code === 'KeyP' || e.code === 'Escape') input.pausePressed = true;
    if (e.code === 'KeyM') input.mutePressed = true;
    refreshAxes();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'Space') input.jump = false;
    refreshAxes();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    input.jump = false;
    refreshAxes();
  });

  // Drag on the scene (mouse or finger) to orbit the camera.
  let dragId = null;
  let lastX = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragId = e.pointerId;
    lastX = e.clientX;
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dragId) return;
    input.camDrag += e.clientX - lastX;
    lastX = e.clientX;
  });
  const endDrag = (e) => {
    if (e.pointerId === dragId) dragId = null;
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Floating thumb-stick: touch anywhere on the left half of the screen
  // and the pad appears under the thumb. It follows the thumb if dragged
  // past its rim, so it never has to be found by feel.
  const zone = document.getElementById('stick-zone');
  const pad = document.getElementById('dpad');
  const nub = document.getElementById('dpad-nub');
  let padId = null;
  let cx = 0;
  let cy = 0;
  const placePad = () => {
    const half = pad.offsetWidth / 2;
    pad.style.left = `${cx - half}px`;
    pad.style.top = `${cy - half}px`;
    pad.style.bottom = 'auto';
  };
  const padMove = (e) => {
    const reach = pad.offsetWidth * 0.36;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > reach) {
      cx += (dx / len) * (len - reach);
      cy += (dy / len) * (len - reach);
      dx = (dx / len) * reach;
      dy = (dy / len) * reach;
      placePad();
    }
    const dead = len < reach * 0.16;
    stick.x = dead ? 0 : dx / reach;
    stick.z = dead ? 0 : -dy / reach;
    nub.style.transform = `translate(${dx}px, ${dy}px)`;
    refreshAxes();
  };
  zone.addEventListener('pointerdown', (e) => {
    if (padId !== null) return;
    e.preventDefault();
    padId = e.pointerId;
    zone.setPointerCapture(padId);
    cx = e.clientX;
    cy = e.clientY;
    placePad();
    pad.classList.add('active');
    padMove(e);
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId === padId) padMove(e);
  });
  const padEnd = (e) => {
    if (e.pointerId !== padId) return;
    padId = null;
    stick.x = 0;
    stick.z = 0;
    nub.style.transform = '';
    pad.style.left = pad.style.top = pad.style.bottom = '';
    pad.classList.remove('active');
    refreshAxes();
  };
  zone.addEventListener('pointerup', padEnd);
  zone.addEventListener('pointercancel', padEnd);

  const jumpBtn = document.getElementById('btn-jump');
  jumpBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    jumpBtn.setPointerCapture(e.pointerId);
    input.jump = true;
    input.jumpPressed = true;
  });
  const jumpEnd = () => {
    input.jump = false;
  };
  jumpBtn.addEventListener('pointerup', jumpEnd);
  jumpBtn.addEventListener('pointercancel', jumpEnd);

  document.getElementById('btn-slam').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input.slamPressed = true;
  });

  document.getElementById('btn-power').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input.specialPressed = true;
  });

  const enableTouch = () => {
    input.touch = true;
    document.body.classList.add('touch');
  };
  if (window.matchMedia('(pointer: coarse)').matches) enableTouch();
  window.addEventListener('touchstart', enableTouch, { once: true, passive: true });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function clearEdges() {
  input.jumpPressed = false;
  input.slamPressed = false;
  input.specialPressed = false;
  input.pausePressed = false;
  input.mutePressed = false;
  input.camDrag = 0;
}
