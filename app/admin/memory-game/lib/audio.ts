/**
 * Web Audio 비프음 + 신호별 음성 텍스트
 */

import { COLORS } from '../constants';

let _audioCtx: AudioContext | null = null;

export function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume().catch(() => {});
  return _audioCtx;
}

type BeepType = 'high' | 'low' | 'mid' | 'chord' | 'blip';

export function playBeep(type: BeepType = 'mid', durationMs = 120) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const freqMap: Record<string, number> = { high: 880, mid: 520, low: 260, blip: 1200, chord: 440 };
  const freq = freqMap[type] ?? 520;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type === 'chord' ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (type === 'high') osc.frequency.linearRampToValueAtTime(freq * 1.2, t + durationMs / 2000);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.25, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, t + durationMs / 1000);

  osc.start(t);
  osc.stop(t + durationMs / 1000 + 0.02);
  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {}
  };
}

export function getBeepForSignal(sig: { type?: string } | null): BeepType | null {
  if (!sig) return null;
  const { type } = sig;
  if (type === 'full_color') return 'mid';
  if (type === 'basic_variant_color') return 'mid';
  if (type === 'arrow') return 'high';
  if (type === 'number') return 'blip';
  if (type === 'stroop') return 'chord';
  if (type === 'dual_num' || type === 'dual_color_arrow') return 'low';
  return 'mid';
}

/** 스트룹 모드 단계 2·3에서만 정답 색 이름을 읽어줌(역 스트룹 1단계는 힌트 없음). 그 외는 null. */
export function getSignalVoice(
  sig: Record<string, unknown> | null,
  mode: string,
  level: number,
  audioMode: string
): string | null {
  if (!sig || audioMode === 'off' || audioMode === 'beep') return null;
  if (mode !== 'stroop') return null;
  if (level === 1) return null;
  const type = sig.type as string;
  const voice = sig.voice as string | undefined;
  if (type === 'stroop') return voice ?? null;
  return null;
}
