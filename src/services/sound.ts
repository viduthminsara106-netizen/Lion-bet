/**
 * Web Audio API synthesizer for procedural sound effects:
 * - Balloon hot air burner blast (low rumble + filtered noise)
 * - Parachute opening / coin cashout chime
 * - Balloon explosion pop (sub-bass boom + distortion)
 * - Countdown beeps & victory fanfare
 */

class SoundService {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private burnerGain: GainNode | null = null;
  private burnerSource: AudioNode | null = null;

  constructor() {
    // Check localStorage for muted state
    const saved = localStorage.getItem('balloon_sound_muted');
    if (saved !== null) {
      this.muted = saved === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    localStorage.setItem('balloon_sound_muted', muted.toString());
    if (muted) {
      this.stopBurner();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // Play countdown beep (pitch changes for final go)
  public playBeep(isFinal: boolean = false) {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isFinal ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isFinal ? 880 : 440, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isFinal ? 0.35 : 0.15));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + (isFinal ? 0.35 : 0.15));
    } catch {
      // AudioContext might require user gesture
    }
  }

  // Balloon burner sound loop (flame blast while climbing)
  public startBurner() {
    if (this.muted || this.burnerGain) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      // Create pink noise buffer
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11;
        b6 = white * 0.115926;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Low pass filter to simulate roaring gas flame
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      // Low frequency oscillator for burner puffing variation
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(4, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(100, this.ctx.currentTime);
      lfo.connect(filter.frequency);

      this.burnerGain = this.ctx.createGain();
      this.burnerGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(this.burnerGain);
      this.burnerGain.connect(this.ctx.destination);

      whiteNoise.start();
      lfo.start();
      this.burnerSource = whiteNoise;
    } catch {
      // Audio context blocked
    }
  }

  public stopBurner() {
    if (this.burnerGain && this.ctx) {
      try {
        this.burnerGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.2);
        setTimeout(() => {
          this.burnerGain = null;
          this.burnerSource = null;
        }, 200);
      } catch {
        this.burnerGain = null;
      }
    }
  }

  // Parachute deploy / Cashout coin bell
  public playCashout(isBigWin: boolean = false) {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // High bright metallic chime + swoop
      const notes = isBigWin ? [523.25, 659.25, 783.99, 1046.50] : [587.33, 880];

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch {
      // Audio context blocked
    }
  }

  // Balloon burst explosion (Boom / Pop)
  public playPop() {
    if (this.muted) return;
    this.stopBurner();
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. Sub boom oscillator
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.45);

      oscGain.gain.setValueAtTime(0.4, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);

      // 2. White noise pop snap
      const bufferSize = this.ctx.sampleRate * 0.25;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch {
      // Ignore
    }
  }
}

export const soundService = new SoundService();
