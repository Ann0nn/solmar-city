// All sound is synthesized with WebAudio: no audio files, no network.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenPhase = 0;
    this.muted = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (err) {
      this.ctx = null;
    }
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  _noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    let node = src;
    if (lowpass) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      src.connect(filter);
      node = filter;
    }
    node.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  click() {
    this._tone(660, 0.08, 'square', 0.08);
  }

  shot() {
    this._noise(0.16, 0.5, 3000);
    this._tone(160, 0.12, 'sawtooth', 0.25, 40);
  }

  punch() {
    this._tone(120, 0.1, 'sine', 0.4, 50);
    this._noise(0.06, 0.2, 800);
  }

  crash() {
    this._noise(0.35, 0.5, 1200);
    this._tone(90, 0.3, 'sawtooth', 0.3, 35);
  }

  pickup() {
    this._tone(880, 0.1, 'sine', 0.2);
    setTimeout(() => this._tone(1320, 0.14, 'sine', 0.2), 90);
  }

  jingle() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => this._tone(n, 0.22, 'triangle', 0.22), i * 130));
  }

  fail() {
    this._tone(330, 0.25, 'sawtooth', 0.18, 220);
    setTimeout(() => this._tone(220, 0.35, 'sawtooth', 0.18, 140), 200);
  }

  reload() {
    this._tone(500, 0.06, 'square', 0.1);
    setTimeout(() => this._tone(700, 0.06, 'square', 0.1), 120);
  }

  setEngine(running, speedNorm) {
    if (!this.ctx || this.muted) return;
    if (running && !this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    if (!running && this.engineOsc) {
      try {
        this.engineOsc.stop();
      } catch (err) { /* already stopped */ }
      this.engineOsc = null;
      this.engineGain = null;
      return;
    }
    if (this.engineOsc) {
      this.engineOsc.frequency.value = 55 + speedNorm * 140;
      this.engineGain.gain.value = 0.05 + speedNorm * 0.06;
    }
  }

  setSiren(on) {
    if (!this.ctx || this.muted) {
      if (!on && this.sirenOsc) this._stopSiren();
      return;
    }
    if (on && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.05;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
    }
    if (!on && this.sirenOsc) this._stopSiren();
  }

  _stopSiren() {
    try {
      this.sirenOsc.stop();
    } catch (err) { /* already stopped */ }
    this.sirenOsc = null;
    this.sirenGain = null;
  }

  update(dt) {
    if (this.sirenOsc) {
      this.sirenPhase += dt;
      const hi = Math.floor(this.sirenPhase / 0.45) % 2 === 0;
      this.sirenOsc.frequency.value = hi ? 920 : 660;
    }
  }
}
