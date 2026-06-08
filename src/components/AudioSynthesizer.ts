// Traditional Botswana-inspired Web Audio Instrument Synthesizer
class SetswanaSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  // Play metallic, bell-like thumb-piano "Setinkane" note (for letter connect)
  public playLetterConnect(index: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    // Scale frequencies (pentatonic scale for pure harmony)
    const baseFreqs = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];
    const freq = baseFreqs[index % baseFreqs.length];

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    // Warm wooden-metallic timbre: mix of sine and triangle harmonics
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    // Subharmonic for thumb key depth
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = "triangle";
    subOsc.frequency.setValueAtTime(freq / 2, this.ctx.currentTime);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    // Envelope trigger
    gainNode.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    subGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.start();
    subOsc.start();

    osc.stop(this.ctx.currentTime + 0.45);
    subOsc.stop(this.ctx.currentTime + 0.45);
  }

  // Success chord - joyful rising arpeggio (magical)
  public playSuccessWord() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [329.63, 392.00, 523.25, 659.25]; // E, G, C, E harmonics
    notes.forEach((freq, idx) => {
      const timeOffset = idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gainNode = this.ctx!.createGain();

      osc.connect(gainNode);
      gainNode.connect(this.ctx!.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + timeOffset);

      gainNode.gain.setValueAtTime(0.2, this.ctx!.currentTime + timeOffset);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + timeOffset + 0.5);

      osc.start(this.ctx!.currentTime + timeOffset);
      osc.stop(this.ctx!.currentTime + timeOffset + 0.6);
    });
  }

  // Kalahari Dust Wind sweep (for shuffles)
  public playShuffle() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.25);

    gainNode.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.12);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  // Traditional percussion sound mimicking a gourd rattle / Hosho (for error or swipe fail)
  public playError() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Grand celebration fanfare (Level Completed!)
  public playLevelSuccess() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const baseChords = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C major triad components
    baseChords.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gainNode = this.ctx!.createGain();

      osc.connect(gainNode);
      gainNode.connect(this.ctx!.destination);

      // Mix sine & triangle for warm cattle-bell ring
      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
      // Subtle vibrato
      osc.frequency.linearRampToValueAtTime(freq + 5, this.ctx!.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(freq - 5, this.ctx!.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.15, this.ctx!.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.25, this.ctx!.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 1.25);

      osc.start();
      osc.stop(this.ctx!.currentTime + 1.3);
    });
  }
}

export const soundEngine = new SetswanaSoundEngine();
