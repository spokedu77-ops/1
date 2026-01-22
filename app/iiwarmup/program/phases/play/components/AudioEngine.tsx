'use client';

import { useEffect, useRef } from 'react';

interface AudioEngineProps {
  bpm?: number;
  onReady?: () => void;
}

export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicTimer: NodeJS.Timeout | null = null;
  private musicStartTime: number = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private isInitialized: boolean = false;

  async init() {
    if (this.isInitialized) return;

    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.audioCtx.destination);

      // 노이즈 버퍼 생성
      const bufferSize = this.audioCtx.sampleRate * 1;
      this.noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.6;
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('AudioEngine 초기화 실패:', error);
    }
  }

  async resume() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  startMusic(bpm: number = 150) {
    if (!this.audioCtx || !this.masterGain) return;
    
    this.stopMusic();

    const beat = 60 / bpm;
    const step = beat / 2;
    let stepIndex = 0;

    this.musicStartTime = this.audioCtx.currentTime + 0.05;

    this.musicTimer = setInterval(() => {
      if (!this.audioCtx) return;
      
      const now = this.audioCtx.currentTime;
      while (this.musicStartTime + stepIndex * step < now + 0.25) {
        const t = this.musicStartTime + stepIndex * step;
        const barStep = stepIndex % 8;

        if (barStep === 0 || barStep === 4) this.playKick(t);
        if (barStep === 2 || barStep === 6) this.playSnare(t);
        this.playHat(t);

        stepIndex++;
      }
    }, 25);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  playKick(t: number) {
    if (!this.audioCtx || !this.masterGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.08);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.65, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playHat(t: number) {
    if (!this.audioCtx || !this.masterGain || !this.noiseBuffer) return;

    const src = this.audioCtx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, t);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(t);
    src.stop(t + 0.06);
  }

  playSnare(t: number) {
    if (!this.audioCtx || !this.masterGain || !this.noiseBuffer) return;

    const src = this.audioCtx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, t);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(t);
    src.stop(t + 0.13);
  }

  playEffect(type: 'jump' | 'punch' | 'turn' | 'duck' | 'point' | 'push' | 'pull') {
    if (!this.audioCtx || !this.masterGain) return;
    
    const t = this.audioCtx.currentTime;

    switch (type) {
      case 'jump':
        this.playJumpSound(t);
        break;
      case 'punch':
        this.playPunchSound(t);
        break;
      case 'turn':
        this.playTurnSound(t);
        break;
      case 'duck':
        this.playDuckSound(t);
        break;
      case 'point':
        this.playPointSound(t);
        break;
      case 'push':
        this.playPushSound(t);
        break;
      case 'pull':
        this.playPullSound(t);
        break;
    }
  }

  private playJumpSound(t: number) {
    if (!this.audioCtx || !this.masterGain) return;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(330, t + 0.08);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  private playPunchSound(t: number) {
    if (!this.audioCtx || !this.masterGain || !this.noiseBuffer) return;

    const src = this.audioCtx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(t);
    src.stop(t + 0.10);
  }

  private playTurnSound(t: number) {
    if (!this.audioCtx || !this.masterGain) return;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.1, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  private playDuckSound(t: number) {
    if (!this.audioCtx || !this.masterGain) return;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  private playPointSound(t: number) {
    if (!this.audioCtx || !this.masterGain) return;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  private playPushSound(t: number) {
    if (!this.audioCtx || !this.masterGain || !this.noiseBuffer) return;

    const src = this.audioCtx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(t);
    src.stop(t + 0.16);
  }

  private playPullSound(t: number) {
    if (!this.audioCtx || !this.masterGain) return;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  dispose() {
    this.stopMusic();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.masterGain = null;
    this.noiseBuffer = null;
    this.isInitialized = false;
  }
}

interface AudioEngineComponentProps extends AudioEngineProps {
  onEngineReady?: (engine: AudioEngine) => void;
}

export function AudioEngineComponent({ bpm = 150, onReady, onEngineReady }: AudioEngineComponentProps) {
  const engineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;

    engine.init().then(() => {
      engine.resume().then(() => {
        engine.startMusic(bpm);
        onReady?.();
        onEngineReady?.(engine);
      });
    });

    return () => {
      engine.dispose();
    };
  }, [bpm, onReady, onEngineReady]);

  return null;
}
