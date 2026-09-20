'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { bindViewportResize } from '../lib/bindViewportResize';
import { EMBED_FIXED_VIEWPORT, EMBED_SAFE_TOP } from '../lib/embedViewport';
import { playBeep } from '../lib/audio';
import { useViewportScrollLock } from '../lib/lockViewportScroll';
import {
  ReactTrainStartCountdownOverlay,
  REACT_TRAIN_START_COUNTDOWN_SEC,
  runReactTrainStartCountdown,
} from '../lib/reactTrainStartCountdown';
import {
  applyDirection,
  buildArrowSignal,
  buildStartSignal,
  pickDirection,
  randomStartPosition,
  type RelativeCompassDifficulty,
  type RelativeCompassPosition,
  type RelativeCompassSeconds,
} from '../lib/relativeCompass';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { SignalDisplay } from './SignalDisplay';

export type { RelativeCompassDifficulty, RelativeCompassSeconds } from '../lib/relativeCompass';

type Phase = 'COUNTDOWN' | 'START_POSITION' | 'RESPONSE';

type Props = {
  targetRounds: number;
  difficulty: RelativeCompassDifficulty;
  startSeconds: RelativeCompassSeconds;
  responseSeconds: RelativeCompassSeconds;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

function wait(ms: number, token: number, tokenRef: { current: number }, timers: Set<number>) {
  return new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      resolve(tokenRef.current === token);
    }, ms);
    timers.add(timer);
  });
}

export function RelativeCompassReactionTraining({
  targetRounds,
  difficulty,
  startSeconds,
  responseSeconds,
  onExit,
  onComplete,
}: Props) {
  useViewportScrollLock(true);
  const totalRounds = Math.max(1, Math.round(targetRounds));
  const [phase, setPhase] = useState<Phase>('COUNTDOWN');
  const [signal, setSignal] = useState<Record<string, unknown> | null>(null);
  const [signalKey, setSignalKey] = useState(0);
  const [repsLeft, setRepsLeft] = useState(totalRounds);
  const [progress, setProgress] = useState(1);
  const [startCountdown, setStartCountdown] = useState(REACT_TRAIN_START_COUNTDOWN_SEC);
  const stageRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef(0);
  const timersRef = useRef(new Set<number>());
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(0);
  const completeRef = useRef(onComplete);
  const exitRef = useRef(onExit);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  useEffect(() => { exitRef.current = onExit; }, [onExit]);

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current.clear();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);
  const finish = useCallback(() => {
    cancel();
    completeRef.current({ stims: completedRef.current, maxCombo: 0, laneCount: [0, 0, 0, 0] });
  }, [cancel]);
  const stop = useCallback(() => finish(), [finish]);

  useEffect(() => {
    let mounted = true;
    const show = (next: Record<string, unknown>) => {
      setSignal(next);
      setSignalKey((key) => key + 1);
    };
    const animateProgress = (duration: number, token: number) => {
      const started = performance.now();
      const tick = (now: number) => {
        if (tokenRef.current !== token) return;
        setProgress(Math.max(0, 1 - (now - started) / duration));
        if (now - started < duration) rafRef.current = requestAnimationFrame(tick);
      };
      setProgress(1);
      rafRef.current = requestAnimationFrame(tick);
    };
    const runCue = async (cueRound: number, origin: RelativeCompassPosition) => {
      const token = ++tokenRef.current;
      const direction = pickDirection(origin, difficulty);
      const target = applyDirection(origin, direction);
      if (!target) return;
      setRepsLeft(totalRounds - cueRound + 1);
      setPhase('RESPONSE');
      show(buildArrowSignal(direction, difficulty));
      playBeep('high');
      animateProgress(responseSeconds * 1000, token);
      if (!(await wait(responseSeconds * 1000, token, tokenRef, timersRef.current))) return;
      completedRef.current = cueRound;
      if (cueRound >= totalRounds) finish();
      else void runCue(cueRound + 1, target);
    };
    const begin = async () => {
      const token = ++tokenRef.current;
      const start = randomStartPosition();
      setRepsLeft(totalRounds);
      setPhase('START_POSITION');
      show(buildStartSignal(start));
      playBeep('mid');
      animateProgress(startSeconds * 1000, token);
      if (await wait(startSeconds * 1000, token, tokenRef, timersRef.current)) void runCue(1, start);
    };
    const stopCountdown = runReactTrainStartCountdown({
      onTick: (value) => mounted && setStartCountdown(value),
      onDone: () => { if (mounted) void begin(); },
    });
    const unbindResize = bindViewportResize(stageRef.current, () => undefined);
    return () => {
      mounted = false;
      stopCountdown();
      unbindResize();
      cancel();
    };
  }, [cancel, difficulty, finish, responseSeconds, startSeconds, totalRounds]);

  const bg = (signal?.bg as string | undefined) ?? '#0F172A';
  const dark = bg === '#0F172A' || bg.startsWith('#0') || bg.startsWith('#1') || bg === '#000000';

  return (
    <div ref={stageRef} style={{ ...EMBED_FIXED_VIEWPORT, background: bg, overflow: 'hidden', zIndex: 320, transition: 'background 0.06s' }}>
      <div style={{ position: 'absolute', top: EMBED_SAFE_TOP, left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
        <div style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '0.6rem 1.2rem', color: '#fff', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#86EFAC' }}>REPS</span> {phase === 'COUNTDOWN' ? totalRounds : repsLeft}
        </div>
        <button type="button" onClick={stop} style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '1rem', cursor: 'pointer', fontWeight: 800, letterSpacing: '0.08em' }}>STOP</button>
      </div>
      <div style={{ position: 'absolute', inset: 0 }}>
        {phase === 'COUNTDOWN' ? null : <SignalDisplay signal={signal} animKey={signalKey} />}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'rgba(255,255,255,0.1)', zIndex: 20 }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: dark ? '#F97316' : 'rgba(0,0,0,0.3)', transition: 'width 0.05s linear', borderRadius: '0 2px 2px 0' }} />
      </div>
      <ReactTrainStartCountdownOverlay countdown={startCountdown} />
    </div>
  );
}
