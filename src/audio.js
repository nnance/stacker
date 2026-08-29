/** Tiny WebAudio bleeper: no assets, everything is synthesised on the fly. */
export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  resume() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone({ freq, to = freq, type = 'triangle', duration = 0.12, gain = 0.16 }) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), now + duration);

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(amp).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  place(streak = 0) {
    const freq = 220 * Math.pow(2, Math.min(streak, 12) / 12);
    this.tone({ freq, to: freq * 0.75, type: 'triangle', duration: 0.14 });
  }

  perfect(streak = 1) {
    const freq = 520 * Math.pow(2, Math.min(streak, 10) / 14);
    this.tone({ freq, to: freq * 1.5, type: 'square', duration: 0.1, gain: 0.1 });
    this.tone({ freq: freq * 1.5, to: freq * 2, type: 'sine', duration: 0.18, gain: 0.08 });
  }

  fail() {
    this.tone({ freq: 240, to: 55, type: 'sawtooth', duration: 0.7, gain: 0.14 });
  }
}
