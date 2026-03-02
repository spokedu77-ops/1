/**
 * SPOKEDU 카메라 앱 — Web Audio API 효과음
 */

let audioCtx: AudioContext | null = null;
let on = true;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      // ignore
    }
  }
  return audioCtx;
}

function tone(
  freq: number,
  type: OscillatorType | 'sine' = 'sine',
  dur: number = 0.1,
  vol: number = 0.25
): void {
  if (!on) return;
  const ctx = getContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

export const SFX = {
  setOn(v: boolean): void {
    on = v;
  },

  hit(): void {
    tone(880, 'sine', 0.06, 0.22);
  },

  miss(): void {
    tone(200, 'sawtooth', 0.12, 0.18);
  },

  combo(): void {
    tone(1047, 'sine', 0.1, 0.28);
    setTimeout(() => tone(1319, 'sine', 0.1, 0.28), 80);
  },

  tick(n: number): void {
    tone(n === 0 ? 1047 : 660, 'sine', 0.15, 0.38);
  },

  end(): void {
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => tone(f, 'sine', 0.2, 0.32), i * 100);
    });
  },
};
