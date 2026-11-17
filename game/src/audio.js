// Synthesised sound for Coral Bay Heist: no audio files, everything is
// built with WebAudio oscillators and filtered noise. All calls are safe
// before the first user gesture; the context starts on the first key press.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenOn = false;
    this.enabled = true;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 420;
      this.engineOsc.connect(filt);
      filt.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'square';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
      this.sirenTimer = 0;
    } catch {
      this.ctx = null;
    }
  }

  // speed01: 0..1. Call every frame while driving.
  engine(speed01, on) {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(on ? 0.02 + speed01 * 0.035 : 0, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, t, 0.1);
  }

  // Two-tone police siren, toggled by wanted level.
  siren(on, dt) {
    if (!this.ctx || !this.sirenGain) return;
    if (on !== this.sirenOn) {
      this.sirenOn = on;
      this.sirenGain.gain.setTargetAtTime(on ? 0.016 : 0, this.ctx.currentTime, 0.2);
    }
    if (on) {
      this.sirenTimer += dt;
      const f = Math.sin(this.sirenTimer * 4.4) > 0 ? 740 : 560;
      this.sirenOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
    }
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      o.type = type || 'sine';
      o.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch { /* sound is decoration, never fatal */ }
  }

  noise(dur, vol, freq) {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = freq || 1200;
      const g = this.ctx.createGain();
      g.gain.value = vol || 0.15;
      src.connect(filt);
      filt.connect(g);
      g.connect(this.ctx.destination);
      src.start(t);
    } catch { /* sound is decoration, never fatal */ }
  }

  shot() { this.noise(0.12, 0.22, 2400); this.blip(160, 0.08, 'square', 0.06); }
  enemyShot() { this.noise(0.1, 0.1, 1800); }
  pickup() { this.blip(660, 0.09, 'sine', 0.09); setTimeout(() => this.blip(990, 0.14, 'sine', 0.09), 90); }
  cash() {
    this.blip(880, 0.1, 'sine', 0.09);
    setTimeout(() => this.blip(1174, 0.16, 'sine', 0.09), 100);
  }
  crash() { this.noise(0.25, 0.25, 500); }
  steal() { this.blip(220, 0.12, 'square', 0.07); setTimeout(() => this.blip(330, 0.12, 'square', 0.07), 110); }
  busted() {
    this.blip(392, 0.25, 'triangle', 0.12);
    setTimeout(() => this.blip(311, 0.35, 'triangle', 0.12), 240);
  }
  wasted() {
    this.blip(220, 0.4, 'sawtooth', 0.1);
    setTimeout(() => this.blip(147, 0.6, 'sawtooth', 0.1), 380);
  }
}
