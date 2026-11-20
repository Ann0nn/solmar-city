// Pedestrians: sidewalk strollers who run when shots ring out or a car bears down.
import * as THREE from 'three';
import { CITY, PALETTE, TUNING } from './config.js';

const SKIN = [0xe8b890, 0xc88a5a, 0x8a5a34, 0xf0c8a0, 0x6a4530];

function makePedMesh(rng) {
  const g = new THREE.Group();
  const shirt = rng.pick(PALETTE.shirt);
  const skin = rng.pick(SKIN);
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.85, 0.34),
    new THREE.MeshLambertMaterial({ color: shirt })
  );
  torso.position.y = 1.15;
  torso.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshLambertMaterial({ color: skin })
  );
  head.position.y = 1.85;
  head.castShadow = true;
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2f3a });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.28), legMat);
  legL.position.set(-0.16, 0.35, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.28), legMat);
  legR.position.set(0.16, 0.35, 0);
  g.add(torso, head, legL, legR);
  g.userData.legs = { legL, legR };
  return g;
}

export class Pedestrians {
  constructor(G, rng) {
    this.G = G;
    this.rng = rng;
    this.list = [];
  }

  spawn(count) {
    for (let i = 0; i < count; i++) {
      const mesh = makePedMesh(this.rng);
      const horizontal = this.rng.chance(0.5);
      const line = this.rng.pick(CITY.roadLines);
      const side = this.rng.chance(0.5) ? 1 : -1;
      const along = this.rng.range(-190, 190);
      const ped = {
        mesh,
        horizontal,
        line: line + side * 9.5,
        along,
        dir: this.rng.chance(0.5) ? 1 : -1,
        speed: TUNING.pedSpeed * this.rng.range(0.8, 1.3),
        phase: this.rng.range(0, Math.PI * 2),
        state: 'walk',
        fleeTimer: 0,
        fleeX: 0,
        fleeZ: 0,
        down: false,
        downTimer: 0,
      };
      mesh.position.set(horizontal ? along : ped.line, 0, horizontal ? ped.line : along);
      mesh.userData.isPed = true;
      mesh.userData.ped = ped;
      this.G.scene.add(mesh);
      this.list.push(ped);
    }
  }

  scare(x, z, radius) {
    for (const ped of this.list) {
      if (ped.down) continue;
      const dx = ped.mesh.position.x - x;
      const dz = ped.mesh.position.z - z;
      if (dx * dx + dz * dz < radius * radius) {
        ped.state = 'flee';
        ped.fleeTimer = 3;
        ped.fleeX = dx;
        ped.fleeZ = dz;
      }
    }
  }

  knockDown(ped) {
    if (ped.down) return;
    ped.down = true;
    ped.downTimer = 4;
    ped.mesh.rotation.x = Math.PI / 2;
    ped.mesh.position.y = 0.4;
    this.G.police.addWanted(1, 'pedestrian down');
    this.scare(ped.mesh.position.x, ped.mesh.position.z, 25);
    this.G.audio.crash();
  }

  update(dt) {
    const player = this.G.player;
    const playerCar = player && player.inCar ? player.car : null;
    for (const ped of this.list) {
      const m = ped.mesh;
      if (ped.down) {
        ped.downTimer -= dt;
        if (ped.downTimer <= 0) {
          ped.down = false;
          m.rotation.x = 0;
          m.position.y = 0;
          m.position.x = this.rng.range(-180, 180);
          m.position.z = this.rng.range(-180, 180);
          ped.state = 'walk';
        }
        continue;
      }
      let vx = 0;
      let vz = 0;
      let speed = ped.speed;
      if (ped.state === 'flee') {
        ped.fleeTimer -= dt;
        const len = Math.hypot(ped.fleeX, ped.fleeZ) || 1;
        vx = (ped.fleeX / len) * TUNING.pedFleeSpeed;
        vz = (ped.fleeZ / len) * TUNING.pedFleeSpeed;
        speed = TUNING.pedFleeSpeed;
        if (ped.fleeTimer <= 0) ped.state = 'walk';
      } else {
        if (ped.horizontal) vx = ped.dir * speed;
        else vz = ped.dir * speed;
      }
      m.position.x += vx * dt;
      m.position.z += vz * dt;
      if (ped.state === 'walk') {
        ped.along = ped.horizontal ? m.position.x : m.position.z;
        if (Math.abs(ped.along) > 195) ped.dir *= -1;
        // At an intersection, sometimes turn onto the crossing sidewalk.
        const nearLine = CITY.roadLines.find((l) => Math.abs(ped.along - l) < 1.5);
        if (nearLine !== undefined && this.rng.chance(0.006)) {
          const side = this.rng.chance(0.5) ? 1 : -1;
          ped.horizontal = !ped.horizontal;
          ped.line = nearLine + side * 9.5;
          ped.along = ped.horizontal ? m.position.x : m.position.z;
          ped.dir = this.rng.chance(0.5) ? 1 : -1;
          if (ped.horizontal) m.position.z = ped.line;
          else m.position.x = ped.line;
        }
      }
      m.position.x = Math.max(-235, Math.min(235, m.position.x));
      m.position.z = Math.max(-235, Math.min(245, m.position.z));
      if (vx !== 0 || vz !== 0) {
        m.rotation.y = Math.atan2(vx, vz);
        ped.phase += dt * speed * 2.2;
        const swing = Math.sin(ped.phase) * 0.5;
        m.userData.legs.legL.rotation.x = swing;
        m.userData.legs.legR.rotation.x = -swing;
      }
      // Run over by the player's car.
      if (playerCar && Math.abs(playerCar.speed) > 5) {
        const dx = m.position.x - playerCar.pos.x;
        const dz = m.position.z - playerCar.pos.z;
        if (dx * dx + dz * dz < 5.5) this.knockDown(ped);
      }
    }
  }
}
