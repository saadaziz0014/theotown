export class DriveSoundEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenInterval: any = null;
  public isSirenActive = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public startEngine() {
    try {
      this.initContext();
      if (!this.ctx) return;

      // Stop existing if running
      this.stopEngine();

      // Master engine gain
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      // Lowpass filter for deep muffled car rumble
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(260, this.ctx.currentTime);

      // Primary low-frequency piston rumble
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

      // Secondary engine harmonic
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
      this.engineOsc2.start();
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  public updateEngine(speedRatio: number, isAccelerating: boolean, isBoost: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;

    const baseFreq = 48 + (speedRatio * 135) + (isAccelerating ? 25 : 0) + (isBoost ? 60 : 0);
    const filterFreq = 260 + (speedRatio * 650) + (isAccelerating ? 150 : 0) + (isBoost ? 400 : 0);
    const gainVal = 0.07 + (speedRatio * 0.08) + (isAccelerating ? 0.04 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.06);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(gainVal, now, 0.08);
  }

  public stopEngine() {
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
        this.engineOsc = null;
      }
      if (this.engineOsc2) {
        this.engineOsc2.stop();
        this.engineOsc2.disconnect();
        this.engineOsc2 = null;
      }
      if (this.engineGain) {
        this.engineGain.disconnect();
        this.engineGain = null;
      }
      this.stopSiren();
    } catch (e) {}
  }

  public playHorn() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(392, now); // G4
      osc2.frequency.setValueAtTime(493.88, now); // B4

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch (e) {}
  }

  public playBoost() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.45);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.45);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.46);
    } catch (e) {}
  }

  public playCrash() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch (e) {}
  }

  public toggleSiren(enable?: boolean) {
    this.isSirenActive = (enable !== undefined) ? enable : !this.isSirenActive;

    if (!this.isSirenActive) {
      this.stopSiren();
      return;
    }

    try {
      this.initContext();
      if (!this.ctx) return;

      this.stopSiren();
      const now = this.ctx.currentTime;

      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();
      this.sirenOsc.type = 'sine';

      this.sirenGain.gain.setValueAtTime(0.12, now);
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();

      let toggle = false;
      this.sirenInterval = setInterval(() => {
        if (!this.ctx || !this.sirenOsc) return;
        toggle = !toggle;
        const targetFreq = toggle ? 780 : 540;
        this.sirenOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.12);
      }, 400);
    } catch (e) {}
  }

  private stopSiren() {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
      } catch (e) {}
      this.sirenOsc = null;
    }
    if (this.sirenGain) {
      try {
        this.sirenGain.disconnect();
      } catch (e) {}
      this.sirenGain = null;
    }
  }
}
