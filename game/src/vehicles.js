// Cars: the mesh factory, arcade driving physics and parked-car spawning.
import * as THREE from 'three';
import { CITY, PALETTE, TUNING } from './config.js';

export function makeCarMesh(color, police) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: police ? 0xf0f0f0 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 4.3), bodyMat);
  body.position.y = 0.62;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2.1),
    new THREE.MeshLambertMaterial({ color: police ? 0x1a2a44 : 0x1c2833 })
  );
  cabin.position.set(0, 1.2, -0.2);
  cabin.castShadow = true;
  g.add(cabin);
  if (police) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.92, 0.2, 4.32),
      new THREE.MeshLambertMaterial({ color: 0x14203a })
    );
    stripe.position.y = 0.72;
    g.add(stripe);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.18, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    bar.position.set(0, 1.58, -0.2);
    g.add(bar);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.18, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff2020, emissive: 0x880000 })
    );
    red.position.set(-0.4, 1.7, -0.2);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.18, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x2040ff, emissive: 0x000088 })
    );
    blue.position.set(0.4, 1.7, -0.2);
    g.add(red, blue);
    g.userData.lights = { red, blue };
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  for (const [wx, wz] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  }
  g.userData.wheels = wheels;
  return g;
}

export class Car {
  constructor(G, color, police) {
    this.G = G;
    this.mesh = makeCarMesh(color, police);
    this.mesh.userData.car = this;
    this.isPolice = !!police;
    this.traffic = false;
    this.heading = 0;
    this.speed = 0;
    this.steer = 0;
    this.flash = 0;
    this.stolen = false;
    G.scene.add(this.mesh);
  }

  get pos() {
    return this.mesh.position;
  }

  setPosition(x, z, heading) {
    this.mesh.position.set(x, 0, z);
    this.heading = heading;
    this.mesh.rotation.y = heading;
  }

  forward() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  // Arcade driving for the player: throttle, brake/reverse, steering.
  playerDrive(dt, input) {
    const fwd = input.isDown('KeyW') || input.isDown('ArrowUp');
    const back = input.isDown('KeyS') || input.isDown('ArrowDown');
    const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
    const right = input.isDown('KeyD') || input.isDown('ArrowRight');
    if (fwd) this.speed += TUNING.carAccel * dt;
    else if (back) {
      if (this.speed > 0.5) this.speed -= TUNING.carBrake * dt;
      else this.speed -= TUNING.carAccel * 0.6 * dt;
    } else {
      this.speed -= this.speed * 0.6 * dt;
      if (Math.abs(this.speed) < 0.1) this.speed = 0;
    }
    this.speed = Math.max(-TUNING.carMaxReverse, Math.min(TUNING.carMaxSpeed, this.speed));
    const steerTarget = (left ? 1 : 0) - (right ? 1 : 0);
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    const dir = this.speed >= 0 ? 1 : -1;
    this.heading += this.steer * TUNING.carTurn * Math.min(1, Math.abs(this.speed) / 8) * dir * dt;
    this.integrate(dt);
  }

  // Move along the current heading and speed, then resolve collisions.
  integrate(dt) {
    const f = this.forward();
    this.pos.x += f.x * this.speed * dt;
    this.pos.z += f.z * this.speed * dt;
    this.mesh.rotation.y = this.heading;
    this.G.world.collideCircle(this.pos, 2.1);
    const wheels = this.mesh.userData.wheels;
    if (wheels) {
      const spin = (this.speed / 0.36) * dt;
      for (const w of wheels) w.rotation.x += spin;
      wheels[0].rotation.y = this.steer * 0.35;
      wheels[1].rotation.y = this.steer * 0.35;
    }
    if (this.isPolice) {
      this.flash += dt;
      const on = Math.floor(this.flash / 0.25) % 2 === 0;
      const lights = this.mesh.userData.lights;
      if (lights) {
        lights.red.material.emissiveIntensity = on ? 2.5 : 0.4;
        lights.blue.material.emissiveIntensity = on ? 0.4 : 2.5;
      }
    }
  }
}

export function resolveCarCollisions(cars, audio) {
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.pos.x - a.pos.x;
      const dz = b.pos.z - a.pos.z;
      const d2 = dx * dx + dz * dz;
      const min = 4.4;
      if (d2 < min * min && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        const nx = dx / d;
        const nz = dz / d;
        a.pos.x -= nx * push;
        a.pos.z -= nz * push;
        b.pos.x += nx * push;
        b.pos.z += nz * push;
        const rel = Math.abs(a.speed - b.speed);
        if (rel > 6 && audio) audio.crash();
        a.speed *= 0.55;
        b.speed *= 0.55;
      }
    }
  }
}

export function spawnParkedCars(G, rng, count) {
  const cars = [];
  for (let n = 0; n < count; n++) {
    const horizontal = rng.chance(0.5);
    const line = rng.pick(CITY.roadLines);
    const along = rng.range(-180, 180);
    const side = rng.chance(0.5) ? 1 : -1;
    const car = new Car(G, rng.pick(PALETTE.car), false);
    if (horizontal) {
      car.setPosition(along, line + side * 5.2, side > 0 ? Math.PI : 0);
    } else {
      car.setPosition(line + side * 5.2, along, side > 0 ? -Math.PI / 2 : Math.PI / 2);
    }
    cars.push(car);
  }
  return cars;
}

export function nearestCar(G, x, z, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const car of G.cars) {
    const dx = car.pos.x - x;
    const dz = car.pos.z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD) {
      bestD = d2;
      best = car;
    }
  }
  return best;
}
