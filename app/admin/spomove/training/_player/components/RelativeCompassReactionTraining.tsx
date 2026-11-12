'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { spomoveCancelAnimationFrame as cancelAnimationFrame, spomoveClearTimeout as clearTimeout, spomovePerformance as performance, spomoveRequestAnimationFrame as requestAnimationFrame, spomoveSetTimeout as setTimeout } from '../lib/runtimeClock';
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
  relativeCompassCuesPerRound,
  type RelativeCompassDifficulty,
  type RelativeCompassPosition,
  type RelativeCompassSeconds,
  type RelativeCompassJourney,
} from '../lib/relativeCompass';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { SignalDisplay } from './SignalDisplay';
import { createDirectionPresentationCollector } from '../lib/directionPresentation';
import { compassPool } from '../lib/relativeCompass';

export type { RelativeCompassDifficulty, RelativeCompassSeconds } from '../lib/relativeCompass';

type Phase = 'COUNTDOWN' | 'START_POSITION' | 'RESPONSE' | 'WAIT_ANSWER' | 'ANSWER';

type Props = {
  targetRounds: number;
  difficulty: RelativeCompassDifficulty;
  startSeconds: RelativeCompassSeconds;
  responseSeconds: RelativeCompassSeconds;
  effectsEnabled?: boolean;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

function wait(ms: number, token: number, tokenRef: { current: number }, timers: Set<number>) {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
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
  effectsEnabled = true,
  onExit,
  onComplete,
}: Props) {
  useViewportScrollLock(true);
  const totalRounds = Math.max(1, Math.round(targetRounds));
  const cuesPerRound = relativeCompassCuesPerRound(difficulty);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>('COUNTDOWN');
  const [signal, setSignal] = useState<Record<string, unknown> | null>(null);
  const [signalKey, setSignalKey] = useState(0);
  const [repsLeft, setRepsLeft] = useState(totalRounds);
  const [progress, setProgress] = useState(1);
  const [startCountdown, setStartCountdown] = useState(REACT_TRAIN_START_COUNTDOWN_SEC);
  const stageRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef(0);
  const answerGateRef = useRef<((reveal: boolean) => void) | null>(null);
  const timersRef = useRef(new Set<number>());
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(0);
  const executionMsRef = useRef(0);
  const cueStartedRef = useRef<number | null>(null);
  const journeyRef = useRef<RelativeCompassJourney | undefined>(undefined);
  const journeysRef = useRef<RelativeCompassJourney[]>([]);
  const pendingStepRef = useRef<RelativeCompassJourney['steps'][number] | null>(null);
  const presentedKeysRef = useRef(new Set<number>());
  const directionCollector = useRef(createDirectionPresentationCollector(compassPool(difficulty)));
  const onPresented = useCallback((next: Record<string, unknown>, key: number) => {
    directionCollector.current.present(next, key);
    if (next.type === 'arrow' && pendingStepRef.current && !presentedKeysRef.current.has(key)) {
      presentedKeysRef.current.add(key);
      journeyRef.current?.steps.push(pendingStepRef.current);
    }
  }, []);
  const completeRef = useRef(onComplete);
  const exitRef = useRef(onExit);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  useEffect(() => { exitRef.current = onExit; }, [onExit]);

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    answerGateRef.current?.(false);
    answerGateRef.current = null;
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);
  const finish = useCallback((stoppedEarly = false) => {
    cancel();
    const directionRecord = directionCollector.current.snapshot();
    if (journeyRef.current) directionRecord.journey = { start: { ...journeyRef.current.start }, steps: journeyRef.current.steps.map(step => ({ ...step, destination: { ...step.destination } })) };
    directionRecord.journeys = journeysRef.current.map(journey => ({ start: { ...journey.start }, steps: journey.steps.map(step => ({ ...step, destination: { ...step.destination } })) }));
    directionRecord.completedRounds = completedRef.current;
    const partialMs = cueStartedRef.current === null ? 0 : Math.min(responseSeconds * 1000, Math.max(0, performance.now() - cueStartedRef.current));
    directionRecord.executionMs = executionMsRef.current + partialMs;
    cueStartedRef.current = null;
    completeRef.current({ stoppedEarly, stims: directionRecord.signals, maxCombo: 0, laneCount: [0, 0, 0, 0], directionRecord });
  }, [cancel, responseSeconds]);
  const stop = useCallback(() => {
    finish(true);
  }, [finish]);

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
      setRepsLeft(cuesPerRound - cueRound + 1);
      setPhase('RESPONSE');
      pendingStepRef.current = { direction, destination: target, completed: false };
      cueStartedRef.current = performance.now();
      show(buildArrowSignal(direction, difficulty));
      if (effectsEnabled) playBeep('high');
      animateProgress(responseSeconds * 1000, token);
      if (!(await wait(responseSeconds * 1000, token, tokenRef, timersRef.current))) return;
      executionMsRef.current += responseSeconds * 1000;
      cueStartedRef.current = null;
      if (pendingStepRef.current) pendingStepRef.current.completed = true;
      if (cueRound >= cuesPerRound) {
        setPhase('WAIT_ANSWER');
        setSignal(null);
        setRepsLeft(0);
        setProgress(0);
        const reveal = await new Promise<boolean>((resolve) => { answerGateRef.current = resolve; });
        answerGateRef.current = null;
        if (!reveal || tokenRef.current !== token) return;
        setPhase('ANSWER');
        show(buildStartSignal(target));
        animateProgress(startSeconds * 1000, token);
        if (await wait(startSeconds * 1000, token, tokenRef, timersRef.current)) {
          completedRef.current += 1;
          if (completedRef.current >= totalRounds) finish();
          else void begin();
        }
      }
      else void runCue(cueRound + 1, target);
    };
    const begin = async () => {
      const token = ++tokenRef.current;
      const start = randomStartPosition();
      journeyRef.current = { start, steps: [] };
      journeysRef.current.push(journeyRef.current);
      setRound(completedRef.current + 1);
      cueStartedRef.current = null;
      presentedKeysRef.current.clear();
      setRepsLeft(cuesPerRound);
      setPhase('START_POSITION');
      show(buildStartSignal(start));
      if (effectsEnabled) playBeep('mid');
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
  }, [cancel, cuesPerRound, difficulty, effectsEnabled, finish, responseSeconds, startSeconds, totalRounds]);

  const bg = (signal?.bg as string | undefined) ?? '#0F172A';
  const dark = bg === '#0F172A' || bg.startsWith('#0') || bg.startsWith('#1') || bg === '#000000';

  return (
    <div ref={stageRef} style={{ ...EMBED_FIXED_VIEWPORT, background: bg, overflow: 'hidden', zIndex: 320, transition: 'background 0.06s' }}>
      <div style={{ position: 'absolute', top: EMBED_SAFE_TOP, left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
        <div style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '0.6rem 1.2rem', color: '#fff', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#86EFAC' }}>ROUND</span> {round} / {totalRounds}
          <span style={{ fontSize: '0.85rem', marginLeft: 8 }}>신호 {phase === 'COUNTDOWN' || phase === 'START_POSITION' ? 0 : cuesPerRound - repsLeft + (phase === 'RESPONSE' ? 1 : 0)} / {cuesPerRound}</span>
        </div>
        <button type="button" onClick={stop} style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '1rem', cursor: 'pointer', fontWeight: 800, letterSpacing: '0.08em' }}>STOP</button>
      </div>
      <div style={{ position: 'absolute', inset: 0 }}>
        {phase === 'COUNTDOWN' ? null : <SignalDisplay signal={signal} animKey={signalKey} onPresented={onPresented} />}
      </div>
      {phase === 'WAIT_ANSWER' ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, zIndex: 10, padding: 24, color: '#fff', textAlign: 'center' }}>
          <p style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700 }}>마지막으로 도착한 색을 생각해 보세요.</p>
          <button type="button" onClick={() => { const reveal = answerGateRef.current; answerGateRef.current = null; reveal?.(true); }} style={{ minHeight: 56, padding: '16px 32px', borderRadius: 16, background: '#fff', color: '#0F172A', fontSize: 24, fontWeight: 800, cursor: 'pointer' }}>정답 확인</button>
        </div>
      ) : null}
      {phase === 'ANSWER' ? (
        <div style={{ position: 'absolute', bottom: '12%', left: 0, right: 0, textAlign: 'center', zIndex: 20, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.8)', fontSize: 'clamp(24px, 5vw, 48px)', fontWeight: 800 }}>
          마지막 정답 · {String((signal?.content as { name?: string } | undefined)?.name ?? '')}
        </div>
      ) : null}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'rgba(255,255,255,0.1)', zIndex: 20 }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: dark ? '#F97316' : 'rgba(0,0,0,0.3)', transition: 'width 0.05s linear', borderRadius: '0 2px 2px 0' }} />
      </div>
      <ReactTrainStartCountdownOverlay countdown={startCountdown} />
    </div>
  );
}
