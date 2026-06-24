/**
 * Flow 2.0 — 오디오 시스템
 * Web Audio API 기반. BGM(Supabase) + 프로시저럴 드럼 + SFX
 */

const BEAT_STEP_SEC = 0.25; // 120BPM 기준 1/4 박자

function getStorageUrl(path: string): string {
  if (typeof window === 'undefined') return '';
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base
    ? `${base}/storage/v1/object/public/iiwarmup-files/${path}`
    : '';
}

export class FlowAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private bgmBuffer: AudioBuffer | null = null;
  private bgmSource: AudioBufferSourceNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStartTime = 0;

  async init(): Promise<void> {
    if (this.ctx) return;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.54;
    this.masterGain.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 1.0;
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.55;
    this.sfxGain.connect(this.masterGain);

    // 1초 분량 화이트 노이즈 버퍼 (SFX 재료)
    const sz = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, sz, this.ctx.sampleRate);
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
  }

  async loadBgm(storagePath: string): Promise<boolean> {
    if (!this.ctx || !storagePath) return false;
    const url = getStorageUrl(storagePath);
    if (!url) return false;
    try {
      const res = await fetch(url);
      if (!res.ok) return false;
      this.bgmBuffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
      return true;
    } catch {
      return false;
    }
  }

  resume(): Promise<void> {
    return this.ctx?.resume() ?? Promise.resolve();
  }

  isSuspended(): boolean {
    return this.ctx?.state === 'suspended';
  }

  setMasterVolume(v: number): void {
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  startMusic(): void {
    if (!this.ctx) return;
    this.stopMusic();
    this.musicStartTime = this.ctx.currentTime + 0.05;

    if (this.bgmBuffer && this.bgmGain) {
      this.bgmSource = this.ctx.createBufferSource();
      this.bgmSource.buffer = this.bgmBuffer;
      this.bgmSource.loop = true;
      this.bgmSource.connect(this.bgmGain);
      this.bgmSource.start();
      return;
    }

    // 프로시저럴 드럼 폴백
    let step = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      while (this.musicStartTime + step * BEAT_STEP_SEC < now + 0.25) {
        const t = this.musicStartTime + step * BEAT_STEP_SEC;
        const bar = step % 8;
        if (bar === 0 || bar === 4) this.playKick(t);
        if (bar === 2 || bar === 6) this.playSnare(t);
        this.playHat(t);
        step++;
      }
    }, 25);
  }

  stopMusic(): void {
    this.musicStartTime = 0;
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch { /* already stopped */ }
      this.bgmSource.disconnect();
      this.bgmSource = null;
    }
  }

  getBeatInfo(): { beatIndex: number; phase: number; timeToNext: number } | null {
    if (!this.ctx || this.musicStartTime <= 0) return null;
    const elapsed = this.ctx.currentTime - this.musicStartTime;
    if (elapsed < 0) return null;
    const beatIndex = Math.floor(elapsed / BEAT_STEP_SEC);
    const phase = (elapsed % BEAT_STEP_SEC) / BEAT_STEP_SEC;
    const timeToNext = BEAT_STEP_SEC - (elapsed % BEAT_STEP_SEC);
    return { beatIndex, phase, timeToNext };
  }

  // ── SFX ────────────────────────────────────────────────────────────────────

  sfxJump(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(330, t + 0.08);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.12);
  }

  sfxLand(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.08);
  }

  sfxPunch(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    // sub thud
    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine'; sub.frequency.setValueAtTime(60, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 0.06);
    subG.gain.setValueAtTime(0.0001, t);
    subG.gain.exponentialRampToValueAtTime(0.55, t + 0.005);
    subG.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    sub.connect(subG); subG.connect(this.sfxGain);
    sub.start(t); sub.stop(t + 0.08);
    // noise crack
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 1400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.09);
  }

  sfxCoin(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(720, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.26);
  }

  sfxSprint(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.3);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.18, t + 0.04);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(og); og.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.38);
  }

  sfxFreeze(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.46);
  }

  sfxStageUp(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    [440, 550, 660, 880].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = t + i * 0.08;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      osc.connect(g); g.connect(this.sfxGain!);
      osc.start(start); osc.stop(start + 0.14);
    });
  }

  sfxComplete(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = t + i * 0.1;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(g); g.connect(this.sfxGain!);
      osc.start(start); osc.stop(start + 0.32);
    });
  }

  // ── 내부 드럼 ───────────────────────────────────────────────────────────────

  private playKick(t: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.08);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.65, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(g); g.connect(this.bgmGain);
    osc.start(t); osc.stop(t + 0.15);
  }

  private playSnare(t: number): void {
    if (!this.ctx || !this.bgmGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 2000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(filt); filt.connect(g); g.connect(this.bgmGain);
    src.start(t); src.stop(t + 0.13);
  }

  private playHat(t: number): void {
    if (!this.ctx || !this.bgmGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'highpass'; filt.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(filt); filt.connect(g); g.connect(this.bgmGain);
    src.start(t); src.stop(t + 0.06);
  }

  dispose(): void {
    this.stopMusic();
    this.ctx?.close();
    this.ctx = null;
  }
}
