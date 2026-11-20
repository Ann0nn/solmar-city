// Save and load through localStorage: cash, health, position, missions, ammo.
import { SAVE_KEY } from './config.js';

export class SaveGame {
  hasSave() {
    try {
      return window.localStorage.getItem(SAVE_KEY) !== null;
    } catch (err) {
      return false;
    }
  }

  write(data) {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      return false;
    }
  }

  read() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (typeof data !== 'object' || data === null) return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  clear() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch (err) { /* storage unavailable */ }
  }
}

export function snapshotOf(G) {
  const p = G.player;
  return {
    version: 1,
    cash: G.cash,
    health: G.health,
    ammo: G.ammo,
    reserveAmmo: G.reserveAmmo,
    pos: p ? [p.pos.x, p.pos.z] : [0, 0],
    heading: p ? p.heading : 0,
    missionsDone: G.missions ? G.missions.done.slice() : [],
    wanted: 0,
    savedAt: Date.now(),
  };
}

export function applySnapshot(G, data) {
  if (!data) return false;
  G.cash = typeof data.cash === 'number' ? data.cash : G.cash;
  G.health = typeof data.health === 'number' ? data.health : G.health;
  G.ammo = typeof data.ammo === 'number' ? data.ammo : G.ammo;
  G.reserveAmmo = typeof data.reserveAmmo === 'number' ? data.reserveAmmo : G.reserveAmmo;
  if (G.missions && Array.isArray(data.missionsDone)) {
    G.missions.done = data.missionsDone.slice();
  }
  if (G.player && Array.isArray(data.pos) && data.pos.length === 2) {
    G.player.pos.set(data.pos[0], 0, data.pos[1]);
    G.player.heading = typeof data.heading === 'number' ? data.heading : 0;
  }
  return true;
}
