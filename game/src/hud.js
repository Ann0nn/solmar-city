// The HUD: health, cash, wanted stars, speed, ammo, objective, dialogue, the
// live minimap, and the start, pause and busted/wasted screens.
import { CITY, districtAt } from './config.js';

function el(id) {
  return document.getElementById(id);
}

export class HUD {
  constructor() {
    this.healthFill = el('health-fill');
    this.healthText = el('health-text');
    this.cashEl = el('cash');
    this.starsEl = el('stars');
    this.speedEl = el('speed');
    this.ammoEl = el('ammo');
    this.objectiveEl = el('objective');
    this.timerEl = el('timer');
    this.dialogueEl = el('dialogue');
    this.dialogueSpeaker = el('dialogue-speaker');
    this.dialogueText = el('dialogue-text');
    this.districtEl = el('district');
    this.flashEl = el('flash');
    this.arrestEl = el('arrest');
    this.arrestFill = el('arrest-fill');
    this.damageEl = el('damage');
    this.minimap = el('minimap');
    this.mapCtx = this.minimap ? this.minimap.getContext('2d') : null;
    this.startScreen = el('start-screen');
    this.pauseMenu = el('pause-menu');
    this.endCard = el('end-card');
    this.endTitle = el('end-title');
    this.endText = el('end-text');
    this.dialogueQueue = [];
    this.dialogueTimer = 0;
    this.flashTimer = 0;
    this.districtTimer = 0;
    this.lastDistrict = '';
    this.onNewGame = null;
    this.onContinue = null;
    this.onResume = null;
    this.onSave = null;
    this.onRestart = null;
    this.onEndContinue = null;
    this._wireButtons();
  }

  _wireButtons() {
    const btnNew = el('btn-new');
    const btnContinue = el('btn-continue');
    const btnResume = el('btn-resume');
    const btnSave = el('btn-save');
    const btnRestart = el('btn-restart');
    const btnEnd = el('btn-end');
    if (btnNew) btnNew.addEventListener('click', () => this.onNewGame && this.onNewGame());
    if (btnContinue) btnContinue.addEventListener('click', () => this.onContinue && this.onContinue());
    if (btnResume) btnResume.addEventListener('click', () => this.onResume && this.onResume());
    if (btnSave) btnSave.addEventListener('click', () => this.onSave && this.onSave());
    if (btnRestart) btnRestart.addEventListener('click', () => this.onRestart && this.onRestart());
    if (btnEnd) btnEnd.addEventListener('click', () => this.onEndContinue && this.onEndContinue());
  }

  showStart(hasSave) {
    this.startScreen.classList.remove('hidden');
    const btnContinue = el('btn-continue');
    if (btnContinue) btnContinue.classList.toggle('hidden', !hasSave);
  }

  hideStart() {
    this.startScreen.classList.add('hidden');
  }

  showPause() {
    this.pauseMenu.classList.remove('hidden');
  }

  hidePause() {
    this.pauseMenu.classList.add('hidden');
  }

  showEndCard(title, text, button) {
    this.endTitle.textContent = title;
    this.endText.textContent = text;
    el('btn-end').textContent = button;
    this.endCard.classList.remove('hidden');
  }

  hideEndCard() {
    this.endCard.classList.add('hidden');
  }

  say(speaker, text) {
    this.dialogueQueue.push({ speaker, text });
  }

  flash(text) {
    this.flashEl.textContent = text;
    this.flashEl.classList.remove('hidden');
    this.flashTimer = 2.4;
  }

  damageFlash() {
    this.damageEl.classList.add('show');
    setTimeout(() => this.damageEl.classList.remove('show'), 250);
  }

  showArrest(p) {
    if (p <= 0) {
      this.arrestEl.classList.add('hidden');
      return;
    }
    this.arrestEl.classList.remove('hidden');
    this.arrestFill.style.width = `${Math.min(100, p * 100)}%`;
  }

  update(G, dt) {
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.dialogueEl.classList.add('hidden');
    } else if (this.dialogueQueue.length > 0) {
      const line = this.dialogueQueue.shift();
      this.dialogueSpeaker.textContent = line.speaker;
      this.dialogueText.textContent = line.text;
      this.dialogueEl.classList.remove('hidden');
      this.dialogueTimer = 4.5;
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flashEl.classList.add('hidden');
    }
    if (this.districtTimer > 0) {
      this.districtTimer -= dt;
      if (this.districtTimer <= 0) this.districtEl.classList.add('hidden');
    }

    const hp = Math.max(0, Math.round(G.health));
    this.healthFill.style.width = `${hp}%`;
    this.healthFill.style.background = hp > 50 ? '#37c85a' : hp > 25 ? '#e8a83a' : '#d83a3a';
    this.healthText.textContent = `${hp}`;
    this.cashEl.textContent = `$${G.cash}`;
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < G.wanted ? '★' : '☆';
    this.starsEl.textContent = stars;
    this.starsEl.classList.toggle('hot', G.wanted > 0);
    const mph = G.player ? Math.round(G.player.speedMph) : 0;
    this.speedEl.textContent = `${mph} mph`;
    this.ammoEl.textContent = G.armed ? `PISTOL ${G.ammo} / ${G.reserveAmmo}` : 'FISTS';
    this.objectiveEl.textContent = G.missionObjective || '';
    if (G.missionTimer !== null && G.missionTimer !== undefined) {
      const t = G.missionTimer;
      this.timerEl.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
      this.timerEl.classList.remove('hidden');
      this.timerEl.classList.toggle('urgent', t < 30);
    } else {
      this.timerEl.classList.add('hidden');
    }

    if (G.player) {
      const d = districtAt(G.player.pos.x, G.player.pos.z);
      if (d !== this.lastDistrict) {
        this.lastDistrict = d;
        this.districtEl.textContent = d;
        this.districtEl.classList.remove('hidden');
        this.districtTimer = 2.5;
      }
    }
    this._drawMinimap(G);
  }

  _drawMinimap(G) {
    const ctx = this.mapCtx;
    if (!ctx) return;
    const S = 190;
    const scale = S / 520;
    const mx = (x) => (x + 250) * scale;
    const mz = (z) => (z + 250) * scale;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#1d2733';
    ctx.fillRect(0, 0, S, S);
    // Sea and beach along the south edge.
    ctx.fillStyle = '#1f8fc4';
    ctx.fillRect(0, mz(CITY.seaZ), S, S - mz(CITY.seaZ));
    ctx.fillStyle = '#e9d8a0';
    ctx.fillRect(0, mz(CITY.beachZ), S, mz(CITY.seaZ) - mz(CITY.beachZ));
    // Blocks.
    ctx.fillStyle = '#33414f';
    for (const bx of CITY.blockCenters) {
      for (const bz of CITY.blockCenters) {
        ctx.fillRect(mx(bx - 25), mz(bz - 25), 50 * scale, 50 * scale);
      }
    }
    // Roads.
    ctx.strokeStyle = '#5a6a7a';
    ctx.lineWidth = CITY.roadWidth * scale;
    for (const line of CITY.roadLines) {
      ctx.beginPath();
      ctx.moveTo(mx(-210), mz(line));
      ctx.lineTo(mx(210), mz(line));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx(line), mz(-210));
      ctx.lineTo(mx(line), mz(210));
      ctx.stroke();
    }
    // Pickups.
    ctx.fillStyle = '#37e85a';
    for (const pk of G.world.pickups) {
      if (!pk.taken) ctx.fillRect(mx(pk.x) - 1, mz(pk.z) - 1, 2, 2);
    }
    // Traffic.
    ctx.fillStyle = '#e8e8e8';
    for (const d of G.traffic.drivers) {
      ctx.fillRect(mx(d.car.pos.x) - 2, mz(d.car.pos.z) - 2, 4, 4);
    }
    // Police, flashing.
    const blink = Math.floor(G.time * 3) % 2 === 0;
    ctx.fillStyle = blink ? '#ff4040' : '#4080ff';
    for (const car of G.police.copCars) {
      ctx.beginPath();
      ctx.arc(mx(car.pos.x), mz(car.pos.z), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const cop of G.police.footCops) {
      ctx.fillRect(mx(cop.mesh.position.x) - 2, mz(cop.mesh.position.z) - 2, 4, 4);
    }
    // Mission target.
    if (G.missionTarget) {
      const t = G.missionTarget;
      const pulse = 5 + Math.sin(G.time * 4) * 2;
      ctx.fillStyle = t.color || '#ffd23a';
      ctx.beginPath();
      ctx.moveTo(mx(t.x), mz(t.z) - pulse);
      ctx.lineTo(mx(t.x) + pulse, mz(t.z));
      ctx.lineTo(mx(t.x), mz(t.z) + pulse);
      ctx.lineTo(mx(t.x) - pulse, mz(t.z));
      ctx.closePath();
      ctx.fill();
    }
    // The player, an arrow pointing where Milo faces.
    if (G.player) {
      const p = G.player;
      const heading = p.inCar && p.car ? p.car.heading : p.heading;
      ctx.save();
      ctx.translate(mx(p.pos.x), mz(p.pos.z));
      ctx.rotate(heading + Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 6);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('N', 8, 14);
  }
}
