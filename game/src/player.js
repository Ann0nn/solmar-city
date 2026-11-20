// Milo Reyes: on-foot movement, the third-person camera, and getting in and out of cars.
import * as THREE from 'three';
import { TUNING } from './config.js';
import { nearestCar } from './vehicles.js';

function makePlayerMesh() {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.9, 0.36),
    new THREE.MeshLambertMaterial({ color: 0x1f8a8a })
  );
  torso.position.y = 1.15;
  torso.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xc88a5a })
  );
  head.position.y = 1.88;
  head.castShadow = true;
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x1a120c })
  );
  hair.position.y = 1.94;
  const legMat = new THREE.MeshLambertMaterial({ color: 0x24303c });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.72, 0.3), legMat);
  legL.position.set(-0.17, 0.36, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.72, 0.3), legMat);
  legR.position.set(0.17, 0.36, 0);
  const armMat = new THREE.MeshLambertMaterial({ color: 0x1f8a8a });
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.24), armMat);
  armL.position.set(-0.45, 1.15, 0);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.24), armMat);
  armR.position.set(0.45, 1.15, 0);
  g.add(torso, head, hair, legL, legR, armL, armR);
  g.userData.limbs = { legL, legR, armL, armR };
  return g;
}

export class Player {
  constructor(G) {
    this.G = G;
    this.mesh = makePlayerMesh();
    this.pos = this.mesh.position;
    this.pos.set(0, 0, 30);
    this.heading = Math.PI;
    this.camYaw = Math.PI;
    this.camPitch = 0.32;
    this.camYawOffset = 0;
    this.inCar = false;
    this.car = null;
    this.walkPhase = 0;
    this.vy = 0;
    this.grounded = true;
    this.speed = 0;
    G.scene.add(this.mesh);
  }

  get speedMph() {
    if (this.inCar && this.car) return Math.abs(this.car.speed) * 2.24;
    return this.speed * 2.24;
  }

  enterCar(car) {
    const G = this.G;
    this.inCar = true;
    this.car = car;
    this.mesh.visible = false;
    this.pos.copy(car.pos);
    if (car.traffic) {
      G.traffic.removeDriver(car);
      car.stolen = true;
      G.police.addWanted(1, 'stole a car');
      G.pedestrians.scare(car.pos.x, car.pos.z, 20);
      G.hud.flash('Car stolen! The law noticed.');
    } else if (car.isPolice) {
      car.stolen = true;
      G.police.addWanted(2, 'stole a police car');
      G.hud.flash('You stole a police car!');
    }
    G.audio.setEngine(true, 0);
    G.missions.onCarEntered(car);
  }

  exitCar() {
    const G = this.G;
    if (!this.car) return;
    const f = this.car.forward();
    this.pos.set(this.car.pos.x - f.z * 3, 0, this.car.pos.z + f.x * 3);
    G.world.collideCircle(this.pos, 0.8);
    this.inCar = false;
    this.car = null;
    this.mesh.visible = true;
    this.heading = this.camYaw;
    G.audio.setEngine(false, 0);
  }

  takeDamage(amount) {
    if (this.G.mode !== 'playing') return;
    this.G.health = Math.max(0, this.G.health - amount);
    this.G.hud.damageFlash();
    if (this.G.health <= 0) this.G.police.wasted();
  }

  heal(amount) {
    this.G.health = Math.min(100, this.G.health + amount);
  }

  update(dt) {
    const G = this.G;
    const input = G.input;
    this.camYaw -= input.mouseDX * 0.0022;
    this.camPitch = Math.max(-0.15, Math.min(0.9, this.camPitch + input.mouseDY * 0.0022));

    if (input.wasPressed('KeyE')) {
      if (this.inCar) this.exitCar();
      else {
        const car = nearestCar(G, this.pos.x, this.pos.z, 4.5);
        if (car) this.enterCar(car);
      }
    }

    if (this.inCar && this.car) {
      this.car.playerDrive(dt, input);
      this.pos.copy(this.car.pos);
      this.heading = this.car.heading;
      G.audio.setEngine(true, Math.abs(this.car.speed) / TUNING.carMaxSpeed);
      this._driveCamera(dt);
      return;
    }

    const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const maxSpeed = sprint ? TUNING.sprintSpeed : TUNING.walkSpeed;
    const ax = input.axis();
    const moving = ax.x !== 0 || ax.z !== 0;
    const sin = Math.sin(this.camYaw);
    const cos = Math.cos(this.camYaw);
    let mx = 0;
    let mz = 0;
    if (moving) {
      // Camera-relative movement: forward is where the camera looks.
      mx = (sin * -ax.z + cos * ax.x) * maxSpeed;
      mz = (cos * -ax.z - sin * ax.x) * maxSpeed;
      const len = Math.hypot(mx, mz);
      mx = (mx / len) * maxSpeed;
      mz = (mz / len) * maxSpeed;
      const want = Math.atan2(mx, mz);
      let diff = want - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, dt * 12);
      this.walkPhase += dt * maxSpeed * 1.4;
      this.speed = maxSpeed;
    } else {
      this.speed = 0;
    }
    this.pos.x += mx * dt;
    this.pos.z += mz * dt;

    if (input.wasPressed('Space') && this.grounded) {
      this.vy = 6.5;
      this.grounded = false;
    }
    if (!this.grounded) {
      this.vy -= 18 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= 0) {
        this.pos.y = 0;
        this.vy = 0;
        this.grounded = true;
      }
    }

    G.world.collideCircle(this.pos, 0.8);
    this.mesh.rotation.y = this.heading;
    const swing = moving ? Math.sin(this.walkPhase) * 0.55 : 0;
    const limbs = this.mesh.userData.limbs;
    limbs.legL.rotation.x = swing;
    limbs.legR.rotation.x = -swing;
    limbs.armL.rotation.x = -swing * 0.8;
    limbs.armR.rotation.x = swing * 0.8;
    this._footCamera(dt);
  }

  _footCamera(dt) {
    const cam = this.G.camera;
    const dist = 7;
    const cx = this.pos.x - Math.sin(this.camYaw) * Math.cos(this.camPitch) * dist;
    const cz = this.pos.z - Math.cos(this.camYaw) * Math.cos(this.camPitch) * dist;
    const cy = this.pos.y + 2.2 + Math.sin(this.camPitch) * dist;
    cam.position.lerp(new THREE.Vector3(cx, Math.max(1.2, cy), cz), Math.min(1, dt * 10));
    cam.lookAt(this.pos.x, this.pos.y + 1.6, this.pos.z);
  }

  _driveCamera(dt) {
    const cam = this.G.camera;
    const car = this.car;
    const back = car.heading + Math.PI + this.camYawOffset;
    const dist = 12;
    const cx = car.pos.x + Math.sin(back) * dist;
    const cz = car.pos.z + Math.cos(back) * dist;
    const target = new THREE.Vector3(cx, 5.5, cz);
    cam.position.lerp(target, Math.min(1, dt * 5));
    cam.lookAt(car.pos.x, 1.6, car.pos.z);
    this.camYawOffset *= Math.max(0, 1 - dt * 0.8);
  }
}
