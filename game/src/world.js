// The city itself: ground, roads, buildings, palms, beach, sea, pickups, beacons.
// Facades and road markings are canvas textures made at runtime, so no image files load.
import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';
import { Rng } from './random.js';

function facadeTexture(rng, base, lit) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 10 + col * 29;
      const y = 10 + row * 20;
      ctx.fillStyle = rng.chance(0.25) ? lit : '#2a3540';
      ctx.fillRect(x, y, 20, 12);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roadTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#34373d';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#3d4046';
  for (let i = 0; i < 40; i++) {
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  }
  ctx.fillStyle = '#e8e0c8';
  ctx.fillRect(30, 6, 4, 24);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class World {
  constructor(G, seed) {
    this.G = G;
    this.rng = new Rng(seed);
    this.pickups = [];
    this.beacons = [];
  }

  build() {
    const { scene } = this.G;
    scene.background = new THREE.Color(PALETTE.sky);
    scene.fog = new THREE.Fog(PALETTE.fog, 220, 520);

    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(PALETTE.sun, 2.0);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -260;
    sun.shadow.camera.right = 260;
    sun.shadow.camera.top = 260;
    sun.shadow.camera.bottom = -260;
    sun.shadow.camera.far = 600;
    scene.add(sun);

    this._ground();
    this._roads();
    this._blocks();
    this._beach();
    this._palms();
    this._streetlights();
    this._pickups();
  }

  _ground() {
    const geo = new THREE.PlaneGeometry(700, 700);
    const mat = new THREE.MeshLambertMaterial({ color: PALETTE.ground });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, 0);
    ground.receiveShadow = true;
    this.G.scene.add(ground);

    const slab = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY.half * 2, CITY.half * 2),
      new THREE.MeshLambertMaterial({ color: 0x9d968a })
    );
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(0, 0, 0);
    slab.receiveShadow = true;
    this.G.scene.add(slab);
  }

  _roads() {
    const tex = roadTexture();
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const len = CITY.half * 2 + 20;
    for (const line of CITY.roadLines) {
      const h = new THREE.Mesh(new THREE.PlaneGeometry(len, CITY.roadWidth), mat.clone());
      h.material.map = tex.clone();
      h.material.map.needsUpdate = true;
      h.material.map.repeat.set(len / 8, 1);
      h.rotation.x = -Math.PI / 2;
      h.rotation.z = Math.PI / 2;
      h.position.set(line, 0.02, 0);
      h.receiveShadow = true;
      this.G.scene.add(h);

      const v = new THREE.Mesh(new THREE.PlaneGeometry(len, CITY.roadWidth), mat.clone());
      v.material.map = tex.clone();
      v.material.map.needsUpdate = true;
      v.material.map.repeat.set(len / 8, 1);
      v.rotation.x = -Math.PI / 2;
      v.position.set(0, 0.02, line);
      v.receiveShadow = true;
      this.G.scene.add(v);
    }
    // Sidewalk strips around each block.
    const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
    for (const bx of CITY.blockCenters) {
      for (const bz of CITY.blockCenters) {
        const walk = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), walkMat);
        walk.rotation.x = -Math.PI / 2;
        walk.position.set(bx, 0.01, bz);
        walk.receiveShadow = true;
        this.G.scene.add(walk);
      }
    }
  }

  _blocks() {
    const rng = this.rng;
    const facades = [
      facadeTexture(rng, '#e8dcc8', '#ffe9a8'),
      facadeTexture(rng, '#d8e4e8', '#fff2b0'),
      facadeTexture(rng, '#e8c8c0', '#ffe9a8'),
    ];
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x6a6a66 });
    for (const bx of CITY.blockCenters) {
      for (const bz of CITY.blockCenters) {
        const roll = rng.next();
        const downtown = Math.abs(bx) <= 90 && Math.abs(bz) <= 90;
        if (roll < 0.12) {
          this._plaza(bx, bz);
          continue;
        }
        if (roll < 0.22) {
          this._park(bx, bz);
          continue;
        }
        const w = rng.range(18, 34);
        const d = rng.range(18, 34);
        const h = downtown ? rng.range(18, 48) : rng.range(8, 22);
        const tex = rng.pick(facades);
        const side = new THREE.MeshLambertMaterial({ map: tex });
        side.color.setHex(rng.pick(PALETTE.building));
        const mats = [side, side, roofMat, roofMat, side, side];
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
        mesh.position.set(bx + rng.range(-4, 4), h / 2, bz + rng.range(-4, 4));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.G.scene.add(mesh);
        const px = mesh.position.x;
        const pz = mesh.position.z;
        this.G.colliders.push({ minX: px - w / 2, maxX: px + w / 2, minZ: pz - d / 2, maxZ: pz + d / 2 });
        if (downtown && rng.chance(0.5)) {
          const cap = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.4, 3, d * 0.4),
            new THREE.MeshLambertMaterial({ color: 0x8a8a86 })
          );
          cap.position.set(px, h + 1.5, pz);
          cap.castShadow = true;
          this.G.scene.add(cap);
        }
      }
    }
  }

  _plaza(bx, bz) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xc8b890 });
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(bx, 0.03, bz);
    pad.receiveShadow = true;
    this.G.scene.add(pad);
    for (let i = 0; i < 4; i++) {
      this._palm(bx + (i % 2 === 0 ? -14 : 14), bz + (i < 2 ? -14 : 14));
    }
    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4.5, 1.2, 12),
      new THREE.MeshLambertMaterial({ color: 0x7fb8d8 })
    );
    fountain.position.set(bx, 0.6, bz);
    this.G.scene.add(fountain);
    this.G.colliders.push({ minX: bx - 4, maxX: bx + 4, minZ: bz - 4, maxZ: bz + 4 });
  }

  _park(bx, bz) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x6fae5e });
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), mat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(bx, 0.03, bz);
    lawn.receiveShadow = true;
    this.G.scene.add(lawn);
    for (let i = 0; i < 5; i++) {
      this._tree(bx + this.rng.range(-18, 18), bz + this.rng.range(-18, 18));
    }
  }

  _tree(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 3, 6),
      new THREE.MeshLambertMaterial({ color: 0x6a4a2a })
    );
    trunk.position.y = 1.5;
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x3f8a3a })
    );
    top.position.y = 4.2;
    top.castShadow = true;
    g.add(trunk, top);
    g.position.set(x, 0, z);
    this.G.scene.add(g);
  }

  _palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.35, 5, 6),
      new THREE.MeshLambertMaterial({ color: 0x7a5a34 })
    );
    trunk.position.y = 2.5;
    trunk.rotation.z = 0.08;
    g.add(trunk);
    const frondMat = new THREE.MeshLambertMaterial({ color: 0x2f9a4a });
    for (let i = 0; i < 6; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4.2, 4), frondMat);
      const a = (i / 6) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 1.2, 5.4, Math.sin(a) * 1.2);
      frond.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      frond.castShadow = true;
      g.add(frond);
    }
    g.position.set(x, 0, z);
    this.G.scene.add(g);
  }

  _beach() {
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 60),
      new THREE.MeshLambertMaterial({ color: PALETTE.sand })
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0.02, CITY.beachZ + 25);
    sand.receiveShadow = true;
    this.G.scene.add(sand);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 300),
      new THREE.MeshLambertMaterial({ color: PALETTE.sea })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.25, CITY.seaZ + 130);
    this.G.scene.add(sea);
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(8, 1, 46),
      new THREE.MeshLambertMaterial({ color: 0x8a6a4a })
    );
    pier.position.set(-150, 0.4, CITY.beachZ + 40);
    pier.castShadow = true;
    this.G.scene.add(pier);
    this.G.colliders.push({ minX: -154, maxX: -146, minZ: CITY.beachZ + 17, maxZ: CITY.beachZ + 63 });
  }

  _palms() {
    for (let x = -200; x <= 200; x += 25) {
      this._palm(x + this.rng.range(-4, 4), CITY.beachZ + this.rng.range(4, 18));
    }
    for (const bx of CITY.blockCenters) {
      if (this.rng.chance(0.6)) this._palm(bx + 22, -186);
      if (this.rng.chance(0.6)) this._palm(bx - 22, 186);
    }
  }

  _streetlights() {
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
    const lampMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0xaa8830 });
    for (const line of CITY.roadLines) {
      for (let t = -180; t <= 180; t += 60) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), poleMat);
        pole.position.set(line + 8, 3.5, t);
        pole.castShadow = true;
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
        lamp.position.set(line + 8, 7.1, t);
        this.G.scene.add(pole, lamp);
      }
    }
  }

  _pickups() {
    const spots = [];
    for (let i = 0; i < 26; i++) {
      const bx = this.rng.pick(CITY.blockCenters) + this.rng.range(-22, 22);
      const bz = this.rng.pick(CITY.blockCenters) + this.rng.range(-22, 22);
      spots.push({ x: bx, z: bz, kind: i % 3 === 0 ? 'health' : 'cash' });
    }
    for (const s of spots) {
      const mesh = this._pickupMesh(s.kind);
      mesh.position.set(s.x, 1.2, s.z);
      this.G.scene.add(mesh);
      this.pickups.push({ ...s, mesh, taken: false, timer: 0 });
    }
  }

  _pickupMesh(kind) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshLambertMaterial({
        color: kind === 'cash' ? 0x2fd35a : 0xf0f0f0,
        emissive: kind === 'cash' ? 0x0a5a1a : 0x5a0a0a,
      })
    );
    box.castShadow = true;
    g.add(box);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.3, 1.2),
      new THREE.MeshLambertMaterial({ color: kind === 'cash' ? 0xfff2a0 : 0xd83a3a })
    );
    g.add(band);
    return g;
  }

  updatePickups(dt) {
    const p = this.G.player;
    for (const pk of this.pickups) {
      if (pk.taken) {
        pk.timer -= dt;
        if (pk.timer <= 0) {
          pk.taken = false;
          pk.mesh.visible = true;
        }
        continue;
      }
      pk.mesh.rotation.y += dt * 2;
      pk.mesh.position.y = 1.2 + Math.sin(this.G.time * 2 + pk.x) * 0.25;
      if (p && !p.inCar) {
        const dx = p.pos.x - pk.x;
        const dz = p.pos.z - pk.z;
        if (dx * dx + dz * dz < 6.25) {
          pk.taken = true;
          pk.timer = 30;
          pk.mesh.visible = false;
          if (pk.kind === 'cash') {
            this.G.cash += 50;
            this.G.hud.flash('+$50');
          } else {
            this.G.health = Math.min(100, this.G.health + 35);
            this.G.hud.flash('+35 health');
          }
          this.G.audio.pickup();
        }
      }
    }
  }

  makeBeacon(color) {
    const g = new THREE.Group();
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 30, 12, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    cyl.position.y = 15;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.25, 8, 24),
      new THREE.MeshBasicMaterial({ color })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    g.add(cyl, ring);
    this.G.scene.add(g);
    this.beacons.push(g);
    return g;
  }

  removeBeacon(beacon) {
    if (!beacon) return;
    this.G.scene.remove(beacon);
    const i = this.beacons.indexOf(beacon);
    if (i >= 0) this.beacons.splice(i, 1);
  }

  collideCircle(pos, radius) {
    for (const c of this.G.colliders) {
      const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      const dx = pos.x - nx;
      const dz = pos.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          pos.x = nx + (dx / d) * radius;
          pos.z = nz + (dz / d) * radius;
        } else {
          pos.x = c.maxX + radius;
        }
      }
    }
    pos.x = Math.max(-CITY.wall, Math.min(CITY.wall, pos.x));
    pos.z = Math.max(-CITY.wall, Math.min(250, pos.z));
    return pos;
  }

  pointInBuilding(x, z) {
    for (const c of this.G.colliders) {
      if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return true;
    }
    return false;
  }
}
