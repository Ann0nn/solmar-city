// The one shared game object. main.js fills it in; every system reads it lazily
// through this module so the modules never import each other in a circle.
export const G = {
  mode: 'menu',
  time: 0,
  seed: 1,
  scene: null,
  camera: null,
  renderer: null,
  input: null,
  audio: null,
  world: null,
  traffic: null,
  pedestrians: null,
  player: null,
  police: null,
  combat: null,
  missions: null,
  hud: null,
  save: null,
  shots: null,
  colliders: [],
  cars: [],
  wanted: 0,
  cash: 120,
  health: 100,
  ammo: 12,
  reserveAmmo: 48,
  armed: false,
  missionTarget: null,
  missionObjective: '',
  missionTimer: null,
  paused: false,
  bustedOrWasted: null,
  vistaMode: false,
  debug: false,
};

export function resetRunState() {
  G.wanted = 0;
  G.cash = 120;
  G.health = 100;
  G.ammo = 12;
  G.reserveAmmo = 48;
  G.armed = false;
  G.missionTarget = null;
  G.missionObjective = 'Explore Solmar City. Find the yellow marker to start a mission.';
  G.missionTimer = null;
  G.bustedOrWasted = null;
  G.vistaMode = false;
}
