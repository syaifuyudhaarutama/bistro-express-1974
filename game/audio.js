(function () {
  "use strict";

  class BistroAudio {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.failed = false;
      this.noiseBuffer = null;
    }

    init() {
      if (this.ctx || this.failed) {
        return !this.failed;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        this.failed = true;
        return false;
      }
      try {
        this.ctx = new AudioCtx();
        this.noiseBuffer = this._createNoiseBuffer();
        return true;
      } catch (_err) {
        this.failed = true;
        return false;
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
    }

    _canPlay() {
      if (this.muted || this.failed) return false;
      if (!this.ctx) {
        if (!this.init()) return false;
      }
      this.resume();
      return Boolean(this.ctx);
    }

    _createNoiseBuffer() {
      const length = this.ctx.sampleRate * 1.0;
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }

    playSizzle() {
      if (!this._canPlay() || !this.noiseBuffer) return;
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(3400, now);
      filter.Q.setValueAtTime(1.4, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
      src.stop(now + 0.38);
    }

    playChop() {
      if (!this._canPlay()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.07);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }

    playTicketClip() {
      if (!this._canPlay() || !this.noiseBuffer) return;
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(2600, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
      src.stop(now + 0.07);
    }

    playBoil() {
      if (!this._canPlay()) return;
      const now = this.ctx.currentTime;
      const freqs = [280, 390, 510];
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.055;
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, start);
        osc.frequency.exponentialRampToValueAtTime(f * 1.45, start + 0.08);
        gain.gain.setValueAtTime(0.05, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.1);
      });
    }

    playTrainClack() {
      if (!this._canPlay()) return;
      const now = this.ctx.currentTime;
      [0, 0.14].forEach((offset, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(idx === 0 ? 82 : 70, now + offset);
        osc.frequency.exponentialRampToValueAtTime(34, now + offset + 0.07);
        gain.gain.setValueAtTime(0.06, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.09);
      });
    }

    playBell() {
      if (!this._canPlay()) return;
      const now = this.ctx.currentTime;
      const partials = [
        { freq: 1174.66, amp: 0.16, dur: 0.75 },
        { freq: 2349.32, amp: 0.07, dur: 0.5 },
        { freq: 3520.0, amp: 0.04, dur: 0.35 }
      ];
      partials.forEach((p) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(p.freq, now);
        gain.gain.setValueAtTime(p.amp, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + p.dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + p.dur + 0.02);
      });
    }

    playWhistle() {
      if (!this._canPlay()) return;
      const now = this.ctx.currentTime;
      const freqs = [587.33, 739.99];
      freqs.forEach((f) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.linearRampToValueAtTime(f * 0.985, now + 0.42);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      });
    }

    playBrace() {
      if (!this._canPlay()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(196, now);
      osc.frequency.exponentialRampToValueAtTime(392, now + 0.14);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    playError() {
      if (!this._canPlay()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(175, now);
      osc.frequency.linearRampToValueAtTime(125, now + 0.18);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  }

  window.BistroAudio = BistroAudio;
})();
