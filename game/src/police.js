// The law: wanted stars, chasing police cars, foot officers, arrests, heat decay.
import * as THREE from 'three';
import { CITY, TUNING } from './config.js';
import { Car } from './vehicles.js';

function makeCopMesh() {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.9, 0.36),
    new THREE.MeshLambertMaterial({ color: 0x1c2f55 })
  );
  torso.position.y = 1.15;
  torso.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8b890 })
  );
  head.position.y = 1.88;
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.32, 0.18, 10),
    new THREE.MeshLambertMaterial({ color: 0x14203a })
  );
  cap.position.y = 2.05;
  const legMat = new THREE.MeshLambertMaterial({ color: 0x14203a });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.72, 0.3), legMat);
  legL.position.set(-0.17, 0.36, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.72, 0.3), legMat);
  legR.position.set(0.17, 0.36, 0);
  g.add(torso, head, cap, legL, legR);
  g.userData.legs = { legL, legR };
  return g;
}

export class Police {
  constructor(G, rng) {
    this.G = G;
    this.rng = rng;
    this.copCars = [];
    this.footCops = [];
    this.unseenTimer = 0;
    this.spawnTimer = 0;
  }

  addWanted(n, reason) {
    const G = this.G;
    if (G.mode !== 'playing') return;
    const before = G.wanted;
    G.wanted = Math.max(0, Math.min(5, G.wanted + n));
    if (G.wanted > before) {
      G.hud.flash(`Wanted level ${G.wanted} star${G.wanted > 1 ? 's' : ''}${reason ? ': ' + reason : ''}`);
      G.audio.setSiren(true);
      this.unseenTimer = 0;
    }
  }

  _nearestRoadCoord(v) {
    let best = CITY.roadLines[0];
    for (const line of CITY.roadLines) {
      if (Math.abs(line - v) < Math.abs(best - v)) best = line;
    }
    return best;
  }

  _spawnCopCar() {
    const G = this.G;
    const p = G.player.pos;
    const angle = this.rng.range(0, Math.PI * 2);
    const dist = this.rng.range(40, 60);
    let x = p.x + Math.cos(angle) * dist;
    let z = p.z + Math.sin(angle) * dist;
    x = Math.max(-195, Math.min(195, x));
    z = Math.max(-195, Math.min(195, z));
    if (this.rng.chance(0.5)) x = this._nearestRoadCoord(x);
    else z = this._nearestRoadCoord(z);
    const car = new Car(G, 0xf0f0f0, true);
    car.setPosition(x, z, Math.atan2(p.x - x, p.z - z));
    G.cars.push(car);
    this.copCars.push(car);
  }

  _spawnFootCop() {
    const G = this.G;
    const p = G.player.pos;
    const angle = this.rng.range(0, Math.PI * 2);
    const dist = this.rng.range(18, 30);
    const mesh = makeCopMesh();
    mesh.position.set(p.x + Math.cos(angle) * dist, 0, p.z + Math.sin(angle) * dist);
    G.world.collideCircle(mesh.position, 0.8);
    mesh.userData.cop = true;
    G.scene.add(mesh);
    const cop = { mesh, arrestTimer: 0, phase: 0, shootTimer: this.rng.range(0.5, 1.5) };
    mesh.userData.entity = cop;
    this.footCops.push(cop);
  }

  _removeCopCar(car) {
    this.G.scene.remove(car.mesh);
    this.copCars = this.copCars.filter((c) => c !== car);
    this.G.cars = this.G.cars.filter((c) => c !== car);
  }

  _removeFootCop(cop) {
    this.G.scene.remove(cop.mesh);
    this.footCops = this.footCops.filter((c) => c !== cop);
  }

  clearAll() {
    for (const car of this.copCars.slice()) this._removeCopCar(car);
    for (const cop of this.footCops.slice()) this._removeFootCop(cop);
  }

  update(dt) {
    const G = this.G;
    const wanted = G.wanted;
    if (wanted === 0) {
      if (this.copCars.length || this.footCops.length) {
        this.clearAll();
        G.audio.setSiren(false);
      }
      return;
    }
    G.audio.setSiren(true);
    this.spawnTimer -= dt;
    const wantCars = Math.min(wanted, 3);
    const wantFoot = wanted >= 1 ? Math.min(2 + wanted, 6) : 0;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.5;
      if (this.copCars.length < wantCars) this._spawnCopCar();
      else if (this.footCops.length < wantFoot) this._spawnFootCop();
    }

    const p = G.player;
    const pPos = p.pos;
    let seen = false;

    for (const car of this.copCars.slice()) {
      const dx = pPos.x - car.pos.x;
      const dz = pPos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 55) seen = true;
      if (dist > 220) {
        this._removeCopCar(car);
        continue;
      }
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const ram = dist < 12 ? 1.15 : 1;
      const targetSpeed = Math.min(TUNING.copCarSpeed * ram, 6 + dist * 0.5);
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.6);
      car.integrate(dt);
      // A cop car that catches an on-foot player lets an officer out.
      if (!p.inCar && dist < 8 && this.footCops.length < wantFoot && this.rng.chance(dt * 0.8)) {
        this._spawnFootCop();
      }
    }

    for (const cop of this.footCops.slice()) {
      const m = cop.mesh;
      const dx = pPos.x - m.position.x;
      const dz = pPos.z - m.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 55) seen = true;
      if (dist > 160) {
        this._removeFootCop(cop);
        continue;
      }
      const speed = TUNING.copFootSpeed;
      if (dist > 2) {
        m.position.x += (dx / dist) * speed * dt;
        m.position.z += (dz / dist) * speed * dt;
        m.rotation.y = Math.atan2(dx, dz);
        cop.phase += dt * speed * 2;
        const swing = Math.sin(cop.phase) * 0.5;
        m.userData.legs.legL.rotation.x = swing;
        m.userData.legs.legR.rotation.x = -swing;
      }
      G.world.collideCircle(m.position, 0.8);
      // Arrest: close to a slow on-foot player for long enough.
      if (!p.inCar && dist < 2.4 && p.speed < 3) {
        cop.arrestTimer += dt;
        G.hud.showArrest(cop.arrestTimer / TUNING.arrestTime);
        if (cop.arrestTimer >= TUNING.arrestTime) {
          this.busted();
          return;
        }
      } else {
        cop.arrestTimer = Math.max(0, cop.arrestTimer - dt);
      }
    }
    if (this.footCops.every((c) => c.arrestTimer <= 0)) G.hud.showArrest(0);

    // Heat fades when nobody has seen Milo for a while.
    if (!seen) {
      this.unseenTimer += dt;
      if (this.unseenTimer >= TUNING.unseenFadeTime) {
        this.unseenTimer = 0;
        G.wanted = Math.max(0, G.wanted - 1);
        if (G.wanted === 0) G.hud.flash('You lost the cops.');
        else G.hud.flash(`Heat cooling: ${G.wanted} star${G.wanted > 1 ? 's' : ''} left.`);
      }
    } else {
      this.unseenTimer = 0;
    }
  }

  busted() {
    const G = this.G;
    if (G.mode !== 'playing') return;
    const fine = Math.min(G.cash, TUNING.bustedFine);
    G.cash -= fine;
    G.mode = 'busted';
    G.bustedOrWasted = { kind: 'busted', fine };
    G.wanted = 0;
    this.clearAll();
    G.audio.setSiren(false);
    G.audio.setEngine(false, 0);
    G.audio.fail();
    G.hud.showEndCard('BUSTED', `The Solmar police caught up with Milo. Fine paid: $${fine}.`, 'Wake up at the station');
  }

  wasted() {
    const G = this.G;
    if (G.mode !== 'playing') return;
    const fine = Math.min(G.cash, TUNING.wastedFine);
    G.cash -= fine;
    G.mode = 'wasted';
    G.bustedOrWasted = { kind: 'wasted', fine };
    G.wanted = 0;
    this.clearAll();
    G.audio.setSiren(false);
    G.audio.setEngine(false, 0);
    G.audio.fail();
    G.hud.showEndCard('WASTED', `Milo went down. Hospital bill: $${fine}.`, 'Wake up at the hospital');
  }

  respawn() {
    const G = this.G;
    const kind = G.bustedOrWasted ? G.bustedOrWasted.kind : 'busted';
    if (G.player.inCar) {
      G.player.car = null;
      G.player.inCar = false;
      G.player.mesh.visible = true;
    }
    if (kind === 'busted') G.player.pos.set(-150, 0, -120);
    else G.player.pos.set(150, 0, -120);
    G.player.pos.y = 0;
    G.health = 100;
    G.wanted = 0;
    G.bustedOrWasted = null;
    G.mode = 'playing';
    G.hud.hideEndCard();
  }
}
