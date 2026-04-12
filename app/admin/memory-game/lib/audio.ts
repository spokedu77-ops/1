/**
 * Web Audio 비프음. 신호 동기 TTS는 사용하지 않음(SPOMOVE는 Asset Hub BGM 풀).
 */

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
  if (type === 'think_quad') return 'mid';
  if (type === 'basic_variant_color') return 'mid';
  if (type === 'arrow') return 'high';
  if (type === 'number') return 'blip';
  if (type === 'stroop' || type === 'stroop_arrow') return 'chord';
  if (type === 'dual_num' || type === 'dual_color_arrow') return 'low';
  if (type === 'simon_shape') return 'mid';
  if (type === 'simon_arrow') return 'high';
  if (type === 'flanker_row') return 'mid';
  if (type === 'gonogo_color') return 'mid';
  if (type === 'gonogo_shape' || type === 'gonogo_dual') return 'mid';
  if (type === 'gonogo_action') return 'high';
  return 'mid';
}

/** 훅 호환용. 신호마다 읽어 주는 음성은 쓰지 않음. */
export function getSignalVoice(
  _sig: Record<string, unknown> | null,
  _mode: string,
  _level: number,
  _audioMode: string
): string | null {
  return null;
}
