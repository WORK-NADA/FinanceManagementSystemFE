/**
 * Enterprise Audio Engine for 'व्यापार'
 *
 * Implements:
 * 1. Gentle, soft typing key-press sound (calm, natural, gentle individual key strokes)
 * 2. Premium opening & reveal sound (subtle anticipation -> rising tone -> smooth reveal whoosh -> soft satisfying impact)
 * 
 * 100% self-contained Web Audio API synthesis:
 * - Zero external assets, zero network latency, zero 404 risk
 * - Master dynamic compressor preventing any harshness or clipping
 * - Graceful fallback if audio is restricted
 */

class EnterpriseAudioService {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    try {
      const saved = localStorage.getItem('vyapar_welcome_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    } catch {
      this.isMuted = false;
    }
  }

  public prime(): void {
    try {
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {
      // Ignore
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
        this.compressor.connect(this.ctx.destination);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private getDestination(): AudioNode | null {
    if (this.compressor) return this.compressor;
    if (this.ctx) return this.ctx.destination;
    return null;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('vyapar_welcome_muted', String(this.isMuted));
    } catch {
      // Ignore
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem('vyapar_welcome_muted', String(muted));
    } catch {
      // Ignore
    }
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays one soft, gentle key-press sound for an individual character.
   * Feels like someone gently typing a single letter at a time:
   * - Soft, subtle, natural, and pleasant
   * - Clearly separated from the next keystroke
   * - Zero harsh mechanical clicks, zero aggressive clatter
   */
  public playSoftKeyStroke(isFinalKey: boolean = false): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      if (!ctx || !dest || ctx.state !== 'running') return;

      const now = ctx.currentTime;

      // 1. Soft felt-dampened impact noise (16ms)
      const noiseLength = Math.floor(ctx.sampleRate * 0.018);
      const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseLength; i++) {
        const decay = Math.exp(-i / (noiseLength * 0.25));
        noiseData[i] = (Math.random() * 2 - 1) * decay;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Warm, gentle bandpass filter (soft acoustic wood/felt tap)
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const baseFreq = isFinalKey ? 920 : 1050 + (Math.random() - 0.5) * 60;
      filter.frequency.setValueAtTime(baseFreq, now);
      filter.Q.setValueAtTime(2.4, now);

      const noiseGain = ctx.createGain();
      // Soft, subtle volume (0.11 max) - pleasant and unobtrusive
      noiseGain.gain.setValueAtTime(0.105, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(dest);

      // 2. Subtle low-frequency tactile warmth (gentle body thud, 24ms)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';

      const oscFreq = isFinalKey ? 145 : 165 + (Math.random() - 0.5) * 15;
      osc.frequency.setValueAtTime(oscFreq, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.024);

      oscGain.gain.setValueAtTime(0.08, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.024);

      osc.connect(oscGain);
      oscGain.connect(dest);

      // Play short single keypress
      noiseSource.start(now);
      noiseSource.stop(now + 0.02);
      osc.start(now);
      osc.stop(now + 0.026);
    } catch {
      // Ignore
    }
  }

  /**
   * Plays a premium opening & reveal sound.
   * Evokes: "Something exciting and important is finally opening after everyone has been waiting for it."
   * 
   * Progression (~1.35s):
   * 1. Very subtle anticipation (whisper of gathering power: 65Hz -> 160Hz smooth sub-drone)
   * 2. Gentle rising tone (warm 5th chord shimmer at 330Hz & 495Hz)
   * 3. Smooth opening / reveal sound (aerodynamic airy whoosh of an executive curtain opening)
   * 4. Soft but satisfying final impact (prestigious C5 harmonic chime at 523Hz that settles cleanly)
   */
  public playOpeningReveal(): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      if (!ctx || !dest || ctx.state !== 'running') return;

      const now = ctx.currentTime;
      const totalDuration = 1.35;

      // ── 1. Subtle Low-Frequency Anticipation (0.0s - 0.85s) ──
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      const subFilter = ctx.createBiquadFilter();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(68, now);
      subOsc.frequency.exponentialRampToValueAtTime(175, now + 0.82);

      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(130, now);
      subFilter.frequency.exponentialRampToValueAtTime(520, now + 0.82);
      subFilter.Q.setValueAtTime(2.0, now);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.exponentialRampToValueAtTime(0.18, now + 0.72);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);

      subOsc.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(dest);

      subOsc.start(now);
      subOsc.stop(now + 1.1);

      // ── 2. Gentle Rising Tone / Harmonic Swell (0.12s - 0.88s) ──
      [330, 495].forEach((freq, i) => {
        const chordOsc = ctx.createOscillator();
        const chordGain = ctx.createGain();
        chordOsc.type = 'triangle';
        chordOsc.frequency.setValueAtTime(freq, now + 0.12);
        chordOsc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.82);

        chordGain.gain.setValueAtTime(0.0001, now + 0.12);
        chordGain.gain.exponentialRampToValueAtTime(i === 0 ? 0.075 : 0.055, now + 0.72);
        chordGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.98);

        chordOsc.connect(chordGain);
        chordGain.connect(dest);

        chordOsc.start(now + 0.12);
        chordOsc.stop(now + 1.02);
      });

      // ── 3. Smooth Opening / Reveal Sound (Airy Whoosh: 0.40s - 1.15s) ──
      const noiseBufferLength = Math.floor(ctx.sampleRate * 0.8);
      const whooshBuffer = ctx.createBuffer(1, noiseBufferLength, ctx.sampleRate);
      const whooshData = whooshBuffer.getChannelData(0);
      for (let i = 0; i < noiseBufferLength; i++) {
        whooshData[i] = (Math.random() * 2 - 1) * 0.65;
      }

      const whooshSource = ctx.createBufferSource();
      whooshSource.buffer = whooshBuffer;

      const whooshFilter = ctx.createBiquadFilter();
      whooshFilter.type = 'bandpass';
      whooshFilter.frequency.setValueAtTime(360, now + 0.38);
      whooshFilter.frequency.exponentialRampToValueAtTime(2900, now + 0.82);
      whooshFilter.frequency.exponentialRampToValueAtTime(900, now + 1.15);
      whooshFilter.Q.setValueAtTime(2.4, now);

      const whooshGain = ctx.createGain();
      whooshGain.gain.setValueAtTime(0.0001, now + 0.38);
      whooshGain.gain.exponentialRampToValueAtTime(0.17, now + 0.80);
      whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.18);

      whooshSource.connect(whooshFilter);
      whooshFilter.connect(whooshGain);
      whooshGain.connect(dest);

      whooshSource.start(now + 0.38);
      whooshSource.stop(now + 1.22);

      // ── 4. Soft but Satisfying Final Impact / Reveal Chime (0.80s - 1.35s) ──
      const chimeFreq = 523.25; // C5
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(chimeFreq, now + 0.80);
      chimeOsc.frequency.setValueAtTime(chimeFreq * 1.002, now + 0.92);

      chimeGain.gain.setValueAtTime(0.0001, now + 0.80);
      chimeGain.gain.linearRampToValueAtTime(0.135, now + 0.84);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(dest);

      chimeOsc.start(now + 0.80);
      chimeOsc.stop(now + totalDuration + 0.05);
    } catch {
      // Ignore
    }
  }
}

export const typewriterAudio = new EnterpriseAudioService();
