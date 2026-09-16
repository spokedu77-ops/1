'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SportsArenaSessionConfig = {
  stageDuration: number;
  side: boolean;
  jump: boolean;
  duck: boolean;
  bonus: boolean;
};

type Props = { config: SportsArenaSessionConfig; durationSec: number; onComplete: () => void; onExit: () => void };
type SessionPhase = 'loading' | 'countdown' | 'running';
type Stage = { name: string; durationSec: number };

const UNITY_SESSION_URL = '/spomove/dive/unity/theme2/index.html';
const COUNTDOWN_SECONDS = 3;
const GO_DISPLAY_MS = 450;

export default function UnityDiveThemeClient({ config, durationSec, onComplete, onExit }: Props) {
  const { stageDuration, side, jump, duck, bonus } = config;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameRef = useRef<number | null>(null);
  const goTimerRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const startedRef = useRef(false);
  const callbacksRef = useRef({ onComplete, onExit });
  callbacksRef.current = { onComplete, onExit };

  const [active, setActive] = useState(true);
  const [phase, setPhase] = useState<SessionPhase>('loading');
  const [countdownLabel, setCountdownLabel] = useState('3');
  const [stageIndex, setStageIndex] = useState(0);
  const [stageRemaining, setStageRemaining] = useState(stageDuration);
  const [progress, setProgress] = useState(0);

  const stages = useMemo<Stage[]>(() => {
    const next: Stage[] = [{ name: 'RUN / FASTER', durationSec: stageDuration }];
    if (side) next.push({ name: 'SIDE MOVE', durationSec: stageDuration });
    if (jump) next.push({ name: 'JUMP', durationSec: stageDuration });
    if (duck) next.push({ name: 'DUCK', durationSec: stageDuration });
    if (bonus) next.push({ name: 'BONUS', durationSec: 60 });
    return next;
  }, [bonus, duck, jump, side, stageDuration]);

  const configPayload = useMemo<SportsArenaSessionConfig>(
    () => ({ stageDuration, side, jump, duck, bonus }),
    [bonus, duck, jump, side, stageDuration],
  );

  const totalDuration = useMemo(() => stages.reduce((sum, stage) => sum + stage.durationSec, 0), [stages]);
  const currentStage = stages[stageIndex] ?? stages[0]!;

  const postToUnity = useCallback((type: 'SPOMOVE_SESSION_CONFIG' | 'SPOMOVE_SESSION_START' | 'SPOMOVE_SESSION_STOP', extra?: object) => {
    iframeRef.current?.contentWindow?.postMessage({ type, ...extra }, window.location.origin);
  }, []);

  const finish = useCallback((kind: 'complete' | 'exit') => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (goTimerRef.current !== null) window.clearTimeout(goTimerRef.current);
    postToUnity('SPOMOVE_SESSION_STOP');
    setActive(false);
    if (kind === 'complete') callbacksRef.current.onComplete();
    else callbacksRef.current.onExit();
  }, [postToUnity]);

  const startSessionTimer = useCallback(() => {
    const startedAt = performance.now();
    setPhase('running');
    postToUnity('SPOMOVE_SESSION_CONFIG', { config: configPayload });
    postToUnity('SPOMOVE_SESSION_START');

    const tick = (now: number) => {
      if (finishedRef.current) return;
      const elapsedSec = Math.max(0, (now - startedAt) / 1000);
      if (elapsedSec >= totalDuration) {
        setProgress(1);
        finish('complete');
        return;
      }

      let elapsedBeforeStage = 0;
      let nextStageIndex = 0;
      for (let index = 0; index < stages.length; index += 1) {
        const stage = stages[index]!;
        if (elapsedSec < elapsedBeforeStage + stage.durationSec) {
          nextStageIndex = index;
          break;
        }
        elapsedBeforeStage += stage.durationSec;
      }
      const stage = stages[nextStageIndex]!;
      setStageIndex(nextStageIndex);
      setStageRemaining(Math.max(0, Math.ceil(stage.durationSec - (elapsedSec - elapsedBeforeStage))));
      setProgress(Math.min(1, elapsedSec / Math.max(1, durationSec)));
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [configPayload, durationSec, finish, postToUnity, stages, totalDuration]);

  const startCountdown = useCallback(() => {
    const countdownStartedAt = performance.now();
    setPhase('countdown');
    setCountdownLabel('3');

    const tick = (now: number) => {
      if (finishedRef.current) return;
      const elapsedMs = now - countdownStartedAt;
      const remaining = COUNTDOWN_SECONDS - Math.floor(elapsedMs / 1000);
      if (remaining > 0) {
        setCountdownLabel(String(remaining));
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      setCountdownLabel('GO!');
      goTimerRef.current = window.setTimeout(startSessionTimer, GO_DISPLAY_MS);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [startSessionTimer]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow || event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'SPOMOVE_UNITY_READY' || finishedRef.current || startedRef.current) return;
      startedRef.current = true;
      startCountdown();
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (goTimerRef.current !== null) window.clearTimeout(goTimerRef.current);
      if (!finishedRef.current) postToUnity('SPOMOVE_SESSION_STOP');
    };
  }, [postToUnity, startCountdown]);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
      {active ? <iframe ref={iframeRef} src={UNITY_SESSION_URL} title="SPORTS ARENA" allowFullScreen style={{ width: '100%', height: '100%', border: 0, background: '#000', display: 'block' }} /> : null}

      {active && phase === 'loading' ? <div role="status" aria-live="polite" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#020617', color: '#fff', zIndex: 20 }}><div style={{ textAlign: 'center', fontWeight: 900 }}><div style={{ width: 42, height: 42, margin: '0 auto 14px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'sportsArenaSpin 0.8s linear infinite' }} />SPORTS ARENA 로딩 중</div></div> : null}

      {active && phase === 'countdown' ? <div aria-live="assertive" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.72)', color: '#fff', zIndex: 25 }}><div style={{ fontSize: countdownLabel === 'GO!' ? 'clamp(64px,16vw,140px)' : 'clamp(100px,26vw,220px)', fontWeight: 900, lineHeight: 1 }}>{countdownLabel}</div></div> : null}

      {active && phase === 'running' ? <>
        <div style={{ position: 'absolute', top: 14, left: 16, right: 112, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
          <span style={{ border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, background: 'rgba(2,6,23,0.78)', padding: '6px 10px', fontSize: 12, fontWeight: 900 }}>STAGE {stageIndex + 1} / {stages.length}</span>
          <strong style={{ borderRadius: 10, background: 'rgba(2,6,23,0.78)', padding: '7px 10px', fontSize: 14 }}>{currentStage.name}</strong>
          <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900 }}>{stageRemaining}s</span>
        </div>
        <div style={{ position: 'absolute', inset: 'auto 0 0', zIndex: 20, height: 6, background: 'rgba(255,255,255,0.18)' }}><div style={{ width: `${progress * 100}%`, height: '100%', background: '#38BDF8' }} /></div>
      </> : null}

      {active ? <button type="button" onClick={() => finish('exit')} style={{ position: 'absolute', top: 10, right: 14, zIndex: 40, minWidth: 82, padding: '0.5rem 0.75rem', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '0.7rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}>✕ 나가기</button> : null}
      <style>{`@keyframes sportsArenaSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}