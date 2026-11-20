// Traffic: AI cars that follow the road grid on the right-hand side, brake for
// trouble ahead and turn at intersections.
import { CITY, TUNING } from './config.js';
import { Car } from './vehicles.js';

function laneOffset(dirX, dirZ) {
  // Right-hand side of the direction of travel.
  if (dirX > 0) return { x: 0, z: 3.5 };
  if (dirX < 0) return { x: 0, z: -3.5 };
  if (dirZ > 0) return { x: -3.5, z: 0 };
  return { x: 3.5, z: 0 };
}

export class Traffic {
  constructor(G, rng) {
    this.G = G;
    this.rng = rng;
    this.drivers = [];
  }

  spawn(count) {
    for (let i = 0; i < count; i++) this._addDriver();
  }

  _randomJunction() {
    const x = this.rng.pick(CITY.roadLines);
    const z = this.rng.pick(CITY.roadLines);
    return { x, z };
  }

  _nextJunction(from, prev) {
    const options = [];
    for (const line of CITY.roadLines) {
      if (line !== from.x) options.push({ x: line, z: from.z });
      if (line !== from.z) options.push({ x: from.x, z: line });
    }
    const forward = options.filter((o) => !(prev && o.x === prev.x && o.z === prev.z));
    return this.rng.pick(forward.length ? forward : options);
  }

  _addDriver() {
    const G = this.G;
    const color = this.rng.pick([0xc23b2e, 0x2e6fc2, 0xe8c832, 0x3aa655, 0x8a5fc2, 0xe8e8e8, 0x22262c, 0xe8822e]);
    const car = new Car(G, color, false);
    car.traffic = true;
    const at = this._randomJunction();
    const next = this._nextJunction(at, null);
    const dx = Math.sign(next.x - at.x);
    const dz = Math.sign(next.z - at.z);
    const off = laneOffset(dx, dz);
    car.setPosition(at.x + off.x, at.z + off.z, Math.atan2(dx, dz));
    G.cars.push(car);
    this.drivers.push({ car, target: next, prev: at, speed: 0, cruise: TUNING.trafficSpeed * this.rng.range(0.8, 1.15) });
  }

  removeDriver(car) {
    car.traffic = false;
    this.drivers = this.drivers.filter((d) => d.car !== car);
  }

  _obstacleAhead(driver) {
    const car = driver.car;
    const f = car.forward();
    const check = (x, z) => {
      const dx = x - car.pos.x;
      const dz = z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 10 || dist < 0.1) return false;
      return (dx * f.x + dz * f.z) / dist > 0.7;
    };
    for (const other of this.G.cars) {
      if (other !== car && check(other.pos.x, other.pos.z)) return true;
    }
    const p = this.G.player;
    if (p && !p.inCar && check(p.pos.x, p.pos.z)) return true;
    for (const ped of this.G.pedestrians.list) {
      if (!ped.down && check(ped.mesh.position.x, ped.mesh.position.z)) return true;
    }
    return false;
  }

  update(dt) {
    for (const d of this.drivers) {
      const car = d.car;
      const dx = Math.sign(d.target.x - d.prev.x);
      const dz = Math.sign(d.target.z - d.prev.z);
      const off = laneOffset(dx, dz);
      const tx = d.target.x + off.x;
      const tz = d.target.z + off.z;
      const toX = tx - car.pos.x;
      const toZ = tz - car.pos.z;
      const dist = Math.hypot(toX, toZ);
      if (dist < 4) {
        const next = this._nextJunction(d.target, d.prev);
        d.prev = d.target;
        d.target = next;
        continue;
      }
      const wantHeading = Math.atan2(toX, toZ);
      let diff = wantHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
      const blocked = this._obstacleAhead(d);
      const nearTarget = dist < 12;
      const targetSpeed = blocked ? 0 : nearTarget ? d.cruise * 0.6 : d.cruise;
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2.2);
      car.integrate(dt);
    }
    // Top the traffic back up if cars were stolen or wrecked away.
    if (this.drivers.length < 12 && this.G.mode === 'playing') {
      this._addDriver();
    }
  }
}
