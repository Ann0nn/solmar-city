// Story missions: Sunset Getaway for Vera Solano, then the timed Harbor Run for Tess Marlowe.
import { MISSION_REWARDS } from './config.js';
import { Car } from './vehicles.js';

const GETAWAY_START = { x: 30, z: 60 };
const GETAWAY_CAR = { x: 150, z: -60 };
const PACKAGE = { x: 90, z: -90 };
const MARINA = { x: -150, z: 120 };
const HARBOR_START = { x: 150, z: 90 };
const CRATES = [
  { x: 180, z: 30 },
  { x: 120, z: 150 },
  { x: 180, z: 180 },
];

export class Missions {
  constructor(G, rng) {
    this.G = G;
    this.rng = rng;
    this.done = [];
    this.current = null;
    this.stage = 0;
    this.timer = 0;
    this.beacon = null;
    this.startBeacon = null;
    this.getawayCar = null;
    this.crateIndex = 0;
  }

  init() {
    // The getaway car waits at Coral Plaza, cherry red, engine warm.
    this.getawayCar = new Car(this.G, 0xc23b2e, false);
    this.getawayCar.setPosition(GETAWAY_CAR.x, GETAWAY_CAR.z, Math.PI / 2);
    this.G.cars.push(this.getawayCar);
    this._showStartBeacon();
  }

  nextMissionId() {
    if (!this.done.includes('getaway')) return 'getaway';
    if (!this.done.includes('harbor')) return 'harbor';
    return null;
  }

  _showStartBeacon() {
    const G = this.G;
    if (this.startBeacon) G.world.removeBeacon(this.startBeacon);
    const next = this.nextMissionId();
    if (!next) {
      this.startBeacon = null;
      G.missionObjective = 'All missions complete. Solmar City is yours, Milo.';
      G.missionTarget = null;
      return;
    }
    const at = next === 'getaway' ? GETAWAY_START : HARBOR_START;
    this.startBeacon = G.world.makeBeacon(0xffd23a);
    this.startBeacon.position.set(at.x, 0, at.z);
    G.missionTarget = { x: at.x, z: at.z, color: '#ffd23a' };
    G.missionObjective =
      next === 'getaway'
        ? 'Mission: Sunset Getaway. Reach the yellow marker to meet Vera Solano\'s contact.'
        : 'Mission: Harbor Run. Reach the yellow marker to start work for Tess Marlowe.';
  }

  _setBeacon(at, color) {
    const G = this.G;
    if (this.beacon) G.world.removeBeacon(this.beacon);
    this.beacon = G.world.makeBeacon(color);
    this.beacon.position.set(at.x, 0, at.z);
    G.missionTarget = { x: at.x, z: at.z, color };
  }

  _clearBeacon() {
    if (this.beacon) {
      this.G.world.removeBeacon(this.beacon);
      this.beacon = null;
    }
  }

  startMission(id) {
    const G = this.G;
    this.current = id;
    this.stage = 0;
    if (this.startBeacon) {
      G.world.removeBeacon(this.startBeacon);
      this.startBeacon = null;
    }
    if (id === 'getaway') {
      G.hud.say('Vera Solano', 'Milo, you are back. I need a driver tonight, no questions, good pay.');
      G.hud.say('Vera Solano', 'There is a red coupe waiting at Coral Plaza. Take it, then grab my package.');
      G.missionObjective = 'Steal the red getaway car at Coral Plaza.';
      this._setBeacon(GETAWAY_CAR, 0xffd23a);
    } else {
      this.timer = 150;
      this.crateIndex = 0;
      G.hud.say('Tess Marlowe', 'Three crates, three drops, two and a half minutes. The harbor pays for speed.');
      G.missionObjective = 'Harbor Run: deliver crate 1 of 3 to the dock.';
      this._setBeacon(CRATES[0], 0x3ad2ff);
    }
    G.audio.jingle();
  }

  onCarEntered(car) {
    const G = this.G;
    if (this.current === 'getaway' && this.stage === 0 && car === this.getawayCar) {
      this.stage = 1;
      G.police.addWanted(2, 'the getaway car had an alarm');
      G.hud.say('Vera Solano', 'That alarm will bring the whole precinct. Get my package and shake them.');
      G.missionObjective = 'Pick up Vera\'s package at Coral Plaza, then lose the cops.';
      this._setBeacon(PACKAGE, 0xffd23a);
    }
  }

  _near(x, z, r) {
    const p = this.G.player.pos;
    const dx = p.x - x;
    const dz = p.z - z;
    return dx * dx + dz * dz < r * r;
  }

  _complete(id) {
    const G = this.G;
    const reward = MISSION_REWARDS[id];
    G.cash += reward;
    G.reserveAmmo += 24;
    this.done.push(id);
    this.current = null;
    this.stage = 0;
    G.missionTimer = null;
    this._clearBeacon();
    G.audio.jingle();
    if (id === 'getaway') {
      G.hud.say('Vera Solano', 'Clean work, Milo. The package is safe and the cops are guessing.');
      G.hud.flash(`Mission complete: Sunset Getaway. +$${reward}`);
    } else {
      G.hud.say('Tess Marlowe', 'Every crate on time. You drive like the harbor owns you now.');
      G.hud.flash(`Mission complete: Harbor Run. +$${reward}`);
    }
    G.saveGame();
    this._showStartBeacon();
  }

  _fail(reason) {
    const G = this.G;
    G.hud.say('Milo Reyes', reason);
    G.hud.flash('Mission failed. The marker is still there when you are ready.');
    G.audio.fail();
    this.current = null;
    this.stage = 0;
    G.missionTimer = null;
    this._clearBeacon();
    this._showStartBeacon();
  }

  update(dt) {
    const G = this.G;
    if (!this.current) {
      const next = this.nextMissionId();
      if (!next) return;
      const at = next === 'getaway' ? GETAWAY_START : HARBOR_START;
      if (this._near(at.x, at.z, 7)) this.startMission(next);
      return;
    }
    if (this.current === 'getaway') {
      if (this.stage === 1 && this._near(PACKAGE.x, PACKAGE.z, 7)) {
        this.stage = 2;
        G.hud.say('Vera Solano', 'Package secured. Now lose the heat and meet me at the Marina.');
        G.missionObjective = 'Lose the cops, then reach the Marina.';
        this._setBeacon(MARINA, 0x3ad2ff);
      } else if (this.stage === 2 && G.wanted === 0 && this._near(MARINA.x, MARINA.z, 10)) {
        this._complete('getaway');
      }
      return;
    }
    if (this.current === 'harbor') {
      this.timer -= dt;
      G.missionTimer = Math.max(0, Math.ceil(this.timer));
      if (this.timer <= 0) {
        this._fail('Too slow. Tess found another driver for the last crate.');
        return;
      }
      const target = CRATES[this.crateIndex];
      if (this._near(target.x, target.z, 8)) {
        this.crateIndex += 1;
        G.audio.pickup();
        if (this.crateIndex >= CRATES.length) {
          this._complete('harbor');
        } else {
          G.missionObjective = `Harbor Run: deliver crate ${this.crateIndex + 1} of 3 to the dock.`;
          this._setBeacon(CRATES[this.crateIndex], 0x3ad2ff);
        }
      }
    }
  }
}
