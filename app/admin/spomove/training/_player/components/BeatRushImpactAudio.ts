import { getAudioCtx } from '../lib/audio';

/** Short, event-driven percussion on the existing gesture-unlocked context. */
export class BeatRushImpactAudio {
  private readonly active = new Set<OscillatorNode>();

  play(tick = false) {
    const context = getAudioCtx();
    if (!context || context.state !== 'running') return;
    const now = context.currentTime;
    const voices = tick
      ? [{ from: 780, to: 420, volume: .075, length: .035 }]
      : [{ from: 155, to: 42, volume: .42, length: .16 },
        { from: 1100, to: 320, volume: .09, length: .045 }];
    for (const voice of voices) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(voice.from, now);
      oscillator.frequency.exponentialRampToValueAtTime(voice.to, now + voice.length);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(voice.volume, now + .004);
      gain.gain.exponentialRampToValueAtTime(.0001, now + voice.length);
      oscillator.connect(gain); gain.connect(context.destination);
      this.active.add(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect(); gain.disconnect(); this.active.delete(oscillator);
      };
      oscillator.start(now); oscillator.stop(now + voice.length + .01);
    }
  }

  stop() {
    for (const oscillator of this.active) {
      try { oscillator.stop(); } catch { /* already ended */ }
      oscillator.disconnect();
    }
    this.active.clear();
  }
}
