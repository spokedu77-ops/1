'use client';

import { useEffect, useRef, useState } from 'react';
import { useEngineStopRequest } from '../lib/engineStopRequest';
import { ReactTrainStartCountdownOverlay, runReactTrainStartCountdown } from '../lib/reactTrainStartCountdown';
import { spomoveRequestAnimationFrame as requestAnimationFrame, spomoveCancelAnimationFrame as cancelAnimationFrame, spomovePerformance as performance } from '../lib/runtimeClock';
import { emptyColorStimulusCounts, type ColorStimulusCounts } from '../lib/trainingResultSummary';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { BeatRushImpactAudio } from './BeatRushImpactAudio';

type Props = { variant: 'fencing' | 'kendo'; speedSec: number; targetReps: number; effectsEnabled: boolean;
  onProgress: (count: number, counts: ColorStimulusCounts) => void; onComplete: (stats: ReactTrainCompleteStats) => void };

/** Isolate the supplied canvas renderer; the host owns clock, audio and results. */
export function SportsThemeTraining({ variant, speedSec, targetReps, effectsEnabled, onProgress, onComplete }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const callbacks = useRef({ onProgress, onComplete, effectsEnabled });
  useEffect(() => { callbacks.current = { onProgress, onComplete, effectsEnabled }; }, [onProgress, onComplete, effectsEnabled]);
  const [ready, setReady] = useState(false), [countdown, setCountdown] = useState(3), [count, setCount] = useState(0);
  const total = Math.min(30, Math.max(1, Math.round(targetReps || 20)));
  const seconds = Math.min(6, Math.max(1, Number(speedSec) || 3));
  const title = variant === 'fencing' ? '펜싱 · 런지' : '검도 · 일도양단';
  useEngineStopRequest(() => stopRef.current());

  useEffect(() => {
    let ended = false, started = false, passed = 0, raf = 0, last = 0, lastArrival = 0;
    let counts = emptyColorStimulusCounts();
    let cancelCountdown = () => {};
    const sound = new BeatRushImpactAudio();
    const send = (message: object) => frameRef.current?.contentWindow?.postMessage(message, '*');
    const finish = (reason: ReactTrainCompleteStats['completionReason']) => {
      if (ended) return;
      ended = true; cancelCountdown(); cancelAnimationFrame(raf); sound.stop(); send({ type: 'spomove-sport-stop' });
      callbacks.current.onComplete({ stims: passed, maxCombo: 0, laneCount: [counts.red, counts.blue, counts.green, counts.yellow], completionReason: reason });
    };
    stopRef.current = () => finish(passed > 0 ? 'stopped_early' : 'cancelled');
    const tick = (now: number) => {
      if (ended) return;
      if (now - lastArrival > (seconds + 5) * 1000) { finish('failed'); return; }
      send({ type: 'spomove-sport-tick', delta: Math.max(0, (now - last) / 1000) }); last = now;
      raf = requestAnimationFrame(tick);
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || ended) return;
      const data = event.data;
      if (!data || typeof data.type !== 'string') return;
      if (data.type === 'spomove-sport-ready' && !started) {
        started = true; setReady(true);
        send({ type: 'spomove-sport-config', seconds, rounds: total, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches });
        cancelCountdown = runReactTrainStartCountdown({ onTick: setCountdown, onDone: () => {
          if (ended) return; send({ type: 'spomove-sport-start' }); last = lastArrival = performance.now(); raf = requestAnimationFrame(tick);
        } });
      } else if (data.type === 'spomove-sport-hit') {
        if (!Number.isInteger(data.index) || data.index < 0 || data.index > 3 || passed >= total) { finish('failed'); return; }
        passed++; lastArrival = performance.now(); const color = (['red', 'yellow', 'green', 'blue'] as const)[data.index]!;
        counts = { ...counts, [color]: counts[color] + 1 }; setCount(passed);
        callbacks.current.onProgress(passed, counts);
        if (callbacks.current.effectsEnabled) sound.play();
      } else if (data.type === 'spomove-sport-complete') finish(passed === total ? 'natural_complete' : 'failed');
      else if (data.type === 'spomove-sport-failed') finish('failed');
    };
    window.addEventListener('message', receive);
    const timeout = window.setTimeout(() => { if (!started) finish('failed'); }, 15000);
    send({ type: 'spomove-sport-hello' });
    return () => { ended = true; window.clearTimeout(timeout); cancelCountdown(); cancelAnimationFrame(raf); sound.stop(); send({ type: 'spomove-sport-stop' }); window.removeEventListener('message', receive); stopRef.current = () => {}; };
  }, [variant, seconds, total]);

  return <section className="sports-training" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: '#020617', color: 'white', fontFamily: 'var(--spm-font-body)' }}>
    <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', minHeight: 68 }}><strong>{title}</strong><span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{count} / {total}</span><button type="button" onClick={() => stopRef.current()} style={{ minHeight: 44, borderRadius: 10, padding: '8px 14px', border: '1px solid #64748b', background: 'transparent', color: 'white' }}>STOP</button></header>
    <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      <iframe ref={frameRef} title={`${title} 실행 화면`} sandbox="allow-scripts" src={`/spomove/sports/${variant}.html`} onLoad={() => frameRef.current?.contentWindow?.postMessage({ type: 'spomove-sport-hello' }, '*')} style={{ display: 'block', width: '100%', height: '100%', border: 0, pointerEvents: 'none' }} />
      {ready ? <ReactTrainStartCountdownOverlay countdown={countdown} /> : <div role="status" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#020617' }}>실행 화면 준비 중…</div>}
    </div>
    <progress value={count} max={total} aria-label="제시 진행" style={{ height: 5, width: '100%', accentColor: '#38bdf8', flexShrink: 0 }} />
  </section>;
}
