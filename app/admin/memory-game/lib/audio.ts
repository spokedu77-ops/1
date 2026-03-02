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
  if (type === 'arrow') return 'high';
  if (type === 'number') return 'blip';
  if (type === 'stroop') return 'chord';
  if (type === 'dual_num' || type === 'dual_action' || type === 'dual_stroop_action') return 'low';
  return 'mid';
}

export function getSignalVoice(
  sig: Record<string, unknown> | null,
  mode: string,
  level: number,
  audioMode: string
): string | null {
  if (!sig || audioMode === 'off') return null;
  if (audioMode === 'beep') return null;
  const type = sig.type as string;
  const content = sig.content as Record<string, unknown> | undefined;
  const voice = sig.voice as string | undefined;

  if (type === 'stroop') return level !== 3 && voice ? voice : null;

  if (audioMode === 'signal') {
    if (type === 'full_color') return (content?.name as string) ?? null;
    if (type === 'arrow') return (content?.voice as string) ?? null;
    if (type === 'number') return (content?.voice as string) ?? null;
    if (type === 'dual_num') {
      const c = content?.color as { name?: string } | undefined;
      const n = content?.number as { voice?: string } | undefined;
      return c?.name && n?.voice ? `${c.name} ${n.voice}` : null;
    }
    if (type === 'dual_action') return (content?.action as { voice?: string })?.voice ?? null;
    if (type === 'dual_stroop_action') return (content?.action as { voice?: string })?.voice ?? null;
  }
  return null;
}
