// Solmar City: entry point. Builds the world, owns the game loop and the
// menu, pause and save flow, and wires every system together.
import * as THREE from 'three';
import { G, resetRunState } from './state.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { World } from './world.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Player } from './player.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { SaveGame, snapshotOf, applySnapshot } from './save.js';
import { spawnParkedCars, resolveCarCollisions } from './vehicles.js';
import { Rng } from './random.js';
import { parseShotQuery, applyShot, shotKey } from './shots.js';

const query = parseShotQuery();
G.seed = query.seed;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 60, 140);
G.scene = scene;
G.camera = camera;
G.renderer = renderer;

G.input = new Input();
G.input.attach(renderer.domElement);
G.audio = new AudioSys();
G.world = new World(G, G.seed);
G.world.build();
G.traffic = new Traffic(G, new Rng(G.seed + 7));
G.traffic.spawn(12);
G.pedestrians = new Pedestrians(G, new Rng(G.seed + 13));
G.pedestrians.spawn(26);
G.cars = spawnParkedCars(G, new Rng(G.seed + 21), 18);
G.player = new Player(G);
G.police = new Police(G, new Rng(G.seed + 29));
G.combat = new Combat(G);
G.missions = new Missions(G, new Rng(G.seed + 31));
G.missions.init();
G.hud = new HUD();
G.save = new SaveGame();
G.saveGame = () => G.save.write(snapshotOf(G));
resetRunState();

window.__game = G;

function startGame(fromSave) {
  resetRunState();
  if (fromSave) {
    applySnapshot(G, G.save.read());
  }
  G.mode = 'playing';
  G.paused = false;
  G.hud.hideStart();
  G.hud.hidePause();
  G.input.wantLock = true;
  G.audio.init();
  if (!fromSave) {
    G.hud.say('Milo Reyes', 'Five years away, and Solmar still smells like salt and trouble.');
    G.hud.say('Vera Solano', 'Milo? I heard you were back. Come see me, I have work for you.');
  } else {
    G.hud.flash('Welcome back, Milo. Progress restored.');
  }
}

function togglePause() {
  if (G.mode !== 'playing') return;
  G.paused = !G.paused;
  if (G.paused) {
    G.saveGame();
    G.hud.showPause();
    G.input.releaseLock();
    G.audio.setEngine(false, 0);
    G.audio.setSiren(false);
  } else {
    G.hud.hidePause();
    G.input.wantLock = true;
    if (G.wanted > 0) G.audio.setSiren(true);
  }
}

G.input.onPauseKey = togglePause;
G.hud.onNewGame = () => startGame(false);
G.hud.onContinue = () => startGame(true);
G.hud.onResume = () => togglePause();
G.hud.onSave = () => {
  G.saveGame();
  G.hud.flash('Progress saved.');
};
G.hud.onRestart = () => {
  G.save.clear();
  window.location.reload();
};
G.hud.onEndContinue = () => {
  G.police.respawn();
};

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('beforeunload', () => {
  if (G.mode === 'playing') G.saveGame();
});

const clock = new THREE.Clock();
let menuAngle = 0;

function menuCamera(dt) {
  menuAngle += dt * 0.05;
  camera.position.set(Math.sin(menuAngle) * 130, 65, Math.cos(menuAngle) * 130);
  camera.lookAt(0, 0, 20);
}

function vistaCamera() {
  camera.position.set(0, 115, -175);
  camera.lookAt(0, 0, 80);
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  G.time += dt;

  if (G.mode === 'menu') {
    menuCamera(dt);
    renderer.render(scene, camera);
    G.input.endFrame();
    return;
  }

  if (G.mode === 'playing' && !G.paused) {
    const shot = shotKeyForFrame();
    if (shot) applyShot(G, shot);
    G.player.update(dt);
    G.traffic.update(dt);
    G.pedestrians.update(dt);
    G.police.update(dt);
    if (G.mode === 'playing') {
      G.combat.update(dt);
      G.missions.update(dt);
    }
    G.world.updatePickups(dt);
    resolveCarCollisions(G.cars, G.audio);
    G.audio.update(dt);
    if (G.vistaMode) vistaCamera();
  }
  G.hud.update(G, dt);
  renderer.render(scene, camera);
  G.input.endFrame();
}

function shotKeyForFrame() {
  for (const code of ['Digit5', 'Digit6', 'Digit7', 'Digit8']) {
    if (G.input.wasPressed(code)) return shotKey(code);
  }
  return null;
}

G.hud.showStart(G.save.hasSave());
if (query.autostart) {
  startGame(false);
  if (query.shot) applyShot(G, query.shot);
}
frame();
