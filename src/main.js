import * as THREE from 'three';
import { createWorld, resize } from './world.js';
import { createTextures } from './textures.js';
import { Game } from './game.js';
import { Hud } from './hud.js';
import { Sound } from './audio.js';

const canvas = document.getElementById('scene');
const world = createWorld(canvas);
const textures = createTextures(world.renderer.capabilities.getMaxAnisotropy());
const sound = new Sound();
const hud = new Hud();
const game = new Game({ world, textures, sound, hud });

if (import.meta.env.DEV) {
  window.__game = game; // handy for poking at the sim while developing
}

resize(world);
window.addEventListener('resize', () => resize(world));

// ------------------------------------------------------------------- input

const RESTART_DELAY = 700; // stops the fatal tap from instantly restarting
let gameOverAt = 0;

function press() {
  sound.resume();

  if (game.state === 'ready') {
    game.start();
  } else if (game.state === 'playing') {
    game.drop();
    if (game.state === 'over') gameOverAt = performance.now();
  } else if (performance.now() - gameOverAt > RESTART_DELAY) {
    hud.clearOverlays();
    game.reset();
    game.start();
  }
}

window.addEventListener('pointerdown', (event) => {
  if (event.target.closest('#sound')) return;
  press();
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'Enter' || event.code === 'ArrowDown') {
    event.preventDefault();
    press();
  }
});

const soundButton = document.getElementById('sound');
soundButton.addEventListener('click', () => {
  sound.enabled = !sound.enabled;
  soundButton.textContent = sound.enabled ? 'SOUND ON' : 'SOUND OFF';
});

// -------------------------------------------------------------------- loop

const clock = new THREE.Clock();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05); // survive tab switches
  game.update(dt, clock.elapsedTime);
  world.renderer.render(world.scene, world.camera);
}

frame();
