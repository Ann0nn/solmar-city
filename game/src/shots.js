// Screenshot staging: ?shot=drive|chase|mission|city (plus ?autostart=1) drops
// Milo into a composed scene with the HUD live. Keys 5 to 8 do the same while playing.
import { Car } from './vehicles.js';

export function parseShotQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    shot: params.get('shot') || null,
    autostart: params.get('autostart') === '1',
    seed: Number(params.get('seed')) || 1,
  };
}

function putPlayerInCar(G, x, z, heading, speed) {
  const car = new Car(G, 0x2e6fc2, false);
  car.setPosition(x, z, heading);
  car.speed = speed || 0;
  G.cars.push(car);
  G.player.enterCar(car);
  return car;
}

function stageDrive(G) {
  G.vistaMode = false;
  G.missions.startMission('getaway');
  G.missions.stage = 1;
  G.missions._setBeacon({ x: 90, z: -90 }, 0xffd23a);
  G.missionObjective = 'Pick up Vera\'s package at Coral Plaza, then lose the cops.';
  putPlayerInCar(G, 0, 120, Math.PI, 18);
  G.hud.say('Vera Solano', 'Package is waiting at Coral Plaza. Drive like you mean it, Milo.');
}

function stageChase(G) {
  G.vistaMode = false;
  G.missions.startMission('getaway');
  G.missions.stage = 2;
  G.missions._setBeacon({ x: -150, z: 120 }, 0x3ad2ff);
  G.missionObjective = 'Lose the cops, then reach the Marina.';
  const car = putPlayerInCar(G, 0, 60, Math.PI, 24);
  G.wanted = 3;
  G.audio.setSiren(true);
  for (let i = 0; i < 2; i++) {
    const cop = new Car(G, 0xf0f0f0, true);
    cop.setPosition(-4 + i * 8, 60 + 22 + i * 10, Math.PI);
    cop.speed = 22;
    G.cars.push(cop);
    G.police.copCars.push(cop);
  }
  G.hud.say('Vera Solano', 'Three stars and climbing. Lose them before the Marina, Milo.');
  return car;
}

function stageMission(G) {
  G.vistaMode = false;
  G.missions.startMission('getaway');
  G.missions.stage = 1;
  G.missions._setBeacon({ x: 90, z: -90 }, 0xffd23a);
  G.missionObjective = 'Pick up Vera\'s package at Coral Plaza, then lose the cops.';
  G.player.pos.set(90, 0, -70);
  G.player.heading = Math.PI;
  G.player.camYaw = Math.PI;
  G.armed = true;
  G.pedestrians.scare(90, -80, 15);
  G.hud.say('Vera Solano', 'The package is right there. Grab it and go, the clock is ticking.');
}

function stageCity(G) {
  G.vistaMode = true;
  G.missions.startMission('getaway');
  G.player.pos.set(30, 0, 60);
  G.player.heading = 0;
  G.hud.say('Milo Reyes', 'Solmar City. Same sun, same trouble. Time to get to work.');
}

const STAGES = {
  drive: stageDrive,
  chase: stageChase,
  mission: stageMission,
  city: stageCity,
};

export function applyShot(G, name) {
  const fn = STAGES[name];
  if (!fn) return false;
  fn(G);
  return true;
}

export function shotKey(code) {
  if (code === 'Digit5') return 'drive';
  if (code === 'Digit6') return 'chase';
  if (code === 'Digit7') return 'mission';
  if (code === 'Digit8') return 'city';
  return null;
}
