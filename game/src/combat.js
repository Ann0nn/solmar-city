// Combat: fists up close, a pistol at range, reloads, and police return fire.
import * as THREE from 'three';
import { TUNING } from './config.js';

export class Combat {
  constructor(G) {
    this.G = G;
    this.raycaster = new THREE.Raycaster();
    this.fireTimer = 0;
    this.reloadTimer = 0;
    this.shake = 0;
    this.flashLight = new THREE.PointLight(0xffcc66, 0, 12);
    G.scene.add(this.flashLight);
  }

  toggleWeapon() {
    const G = this.G;
    G.armed = !G.armed;
    G.hud.flash(G.armed ? 'Pistol drawn.' : 'Fists up.');
    G.audio.click();
  }

  startReload() {
    const G = this.G;
    if (this.reloadTimer > 0 || G.ammo >= TUNING.pistolMag || G.reserveAmmo <= 0) return;
    this.reloadTimer = 1.0;
    G.audio.reload();
    G.hud.flash('Reloading...');
  }

  _shootTargets() {
    const G = this.G;
    const list = [];
    for (const ped of G.pedestrians.list) {
      if (!ped.down) list.push(ped.mesh);
    }
    for (const cop of G.police.footCops) list.push(cop.mesh);
    for (const car of G.cars) list.push(car.mesh);
    return list;
  }

  shoot() {
    const G = this.G;
    if (this.reloadTimer > 0) return;
    if (G.ammo <= 0) {
      this.startReload();
      return;
    }
    G.ammo -= 1;
    this.fireTimer = 0.25;
    this.shake = 0.35;
    G.audio.shot();
    const p = G.player;
    this.flashLight.position.copy(p.pos).add(new THREE.Vector3(0, 1.6, 0));
    this.flashLight.intensity = 60;
    setTimeout(() => {
      this.flashLight.intensity = 0;
    }, 60);
    G.pedestrians.scare(p.pos.x, p.pos.z, 30);
    const cam = G.camera;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), cam);
    this.raycaster.far = TUNING.pistolRange;
    const hits = this.raycaster.intersectObjects(this._shootTargets(), true);
    if (hits.length === 0) return;
    let obj = hits[0].object;
    while (obj && !obj.userData.entity && !obj.userData.car && !obj.userData.isPed) obj = obj.parent;
    if (!obj) return;
    if (obj.userData.isPed) {
      G.pedestrians.knockDown(obj.userData.ped);
    } else if (obj.userData.entity) {
      const ent = obj.userData.entity;
      if (G.police.footCops.includes(ent)) {
        G.police._removeFootCop(ent);
        G.police.addWanted(1, 'officer down');
        G.hud.flash('Officer down. The heat just went up.');
      }
    } else if (obj.userData.car) {
      obj.userData.car.speed *= 0.7;
    }
  }

  punch() {
    const G = this.G;
    const p = G.player;
    this.fireTimer = 0.4;
    G.audio.punch();
    const fx = Math.sin(p.heading);
    const fz = Math.cos(p.heading);
    const reach = (x, z) => {
      const dx = x - p.pos.x;
      const dz = z - p.pos.z;
      const d = Math.hypot(dx, dz);
      return d < 2.4 && (dx * fx + dz * fz) / Math.max(d, 0.01) > 0.3;
    };
    for (const ped of G.pedestrians.list) {
      if (!ped.down && reach(ped.mesh.position.x, ped.mesh.position.z)) {
        G.pedestrians.knockDown(ped);
        return;
      }
    }
    for (const cop of G.police.footCops.slice()) {
      if (reach(cop.mesh.position.x, cop.mesh.position.z)) {
        G.police._removeFootCop(cop);
        G.police.addWanted(1, 'assaulted an officer');
        return;
      }
    }
  }

  _policeFire(dt) {
    const G = this.G;
    if (G.wanted < 2) return;
    const p = G.player;
    for (const cop of G.police.footCops) {
      cop.shootTimer -= dt;
      if (cop.shootTimer > 0) continue;
      cop.shootTimer = 0.9 + Math.random() * 0.8;
      const dx = p.pos.x - cop.mesh.position.x;
      const dz = p.pos.z - cop.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 30) continue;
      G.audio.shot();
      const hitChance = Math.max(0.1, 0.45 - dist * 0.01);
      if (Math.random() < hitChance) {
        p.takeDamage(6 + Math.floor(Math.random() * 5));
      }
    }
  }

  update(dt) {
    const G = this.G;
    const input = G.input;
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    this.shake = Math.max(0, this.shake - dt * 2);
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const need = TUNING.pistolMag - G.ammo;
        const take = Math.min(need, G.reserveAmmo);
        G.ammo += take;
        G.reserveAmmo -= take;
      }
    }
    if (input.wasPressed('KeyQ') || input.wasPressed('Digit1') || input.wasPressed('Digit2')) {
      this.toggleWeapon();
    }
    if (input.wasPressed('KeyR')) this.startReload();
    if (G.player.inCar) return;
    if (input.wasPressed('KeyF')) {
      if (this.fireTimer <= 0) this.punch();
    }
    if (G.armed && input.mouseDown && this.fireTimer <= 0) {
      this.shoot();
    } else if (!G.armed && input.mousePressed && this.fireTimer <= 0) {
      this.punch();
    }
    this._policeFire(dt);
    if (this.shake > 0) {
      const cam = G.camera;
      cam.position.x += (Math.random() - 0.5) * this.shake * 0.3;
      cam.position.y += (Math.random() - 0.5) * this.shake * 0.3;
    }
  }
}
