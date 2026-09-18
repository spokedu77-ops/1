'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SportsArenaSessionConfig = {
  themeId: 'sports-arena';
  stageDuration: number;
  side: boolean;
  jump: boolean;
  duck: boolean;
  bonus: boolean;
};

type Props = {
  config: SportsArenaSessionConfig;
  durationSec: number;
  onComplete: () => void;
  onExit: () => void;
  onSessionStart: () => void;
  onSessionStop: () => void;
};
type SessionPhase = 'loading' | 'theme-loading' | 'countdown' | 'waiting' | 'preparing' | 'running' | 'error';
type StageEventType = 'STAGE_PREPARE' | 'STAGE_START' | 'STAGE_COMPLETE';
type StageEventPayload = {
  type: StageEventType;
  stageIndex: number;
  stageId: string;
  stageName: string;
  duration: number;
  actionSequence: string;
  introTitle: string;
  introDescription: string;
  introBadge: string;
  introDuration: number;
};
type ActiveStage = { index: number; name: string; duration: number };
type PrepareCard = Pick<StageEventPayload, 'stageName' | 'introTitle' | 'introDescription' | 'introBadge' | 'introDuration'>;

const UNITY_SESSION_URL = '/spomove/dive/unity/player_release_test/index.html';
const COUNTDOWN_SECONDS = 3;
const GO_DISPLAY_MS = 450;
const THEME_READY_TIMEOUT_MS = 30_000;

export default function UnityDiveThemeClient({ config, durationSec, onComplete, onExit, onSessionStart, onSessionStop }: Props) {
  const { stageDuration, side, jump, duck, bonus } = config;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameRef = useRef<number | null>(null);
  const goTimerRef = useRef<number | null>(null);
  const themeReadyTimerRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const readyRef = useRef(false);
  const sessionAudioStartedRef = useRef(false);
  const stageStartedAtRef = useRef(0);
  const activeStageRef = useRef<ActiveStage | null>(null);
  const completedExerciseSecRef = useRef(0);
  const handledEventsRef = useRef(new Set<string>());
  const callbacksRef = useRef({ onComplete, onExit, onSessionStart, onSessionStop });

  useEffect(() => {
    callbacksRef.current = { onComplete, onExit, onSessionStart, onSessionStop };
  }, [onComplete, onExit, onSessionStart, onSessionStop]);

  const [active, setActive] = useState(true);
  const [phase, setPhase] = useState<SessionPhase>('loading');
  const [countdownLabel, setCountdownLabel] = useState('3');
  const [activeStage, setActiveStage] = useState<ActiveStage | null>(null);
  const [prepareCard, setPrepareCard] = useState<PrepareCard | null>(null);
  const [stageRemaining, setStageRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState('');

  const stageCount = 1 + Number(side) + Number(jump) + Number(duck) + Number(bonus);
  const configPayload = useMemo<SportsArenaSessionConfig>(
    () => ({ themeId: 'sports-arena', stageDuration, side, jump, duck, bonus }),
    [bonus, duck, jump, side, stageDuration],
  );

  const postToUnity = useCallback((type: 'SPOMOVE_SESSION_CONFIG' | 'SPOMOVE_SESSION_START' | 'SPOMOVE_SESSION_STOP', extra?: object) => {
    console.info(`[SPORTS_ARENA] send ${type}`, extra ?? '');
    iframeRef.current?.contentWindow?.postMessage({ type, ...extra }, window.location.origin);
  }, []);

  const clearThemeReadyTimer = useCallback(() => {
    if (themeReadyTimerRef.current !== null) window.clearTimeout(themeReadyTimerRef.current);
    themeReadyTimerRef.current = null;
  }, []);

  const stopStageClock = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const finish = useCallback((kind: 'complete' | 'exit') => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopStageClock();
    clearThemeReadyTimer();
    if (goTimerRef.current !== null) window.clearTimeout(goTimerRef.current);
    postToUnity('SPOMOVE_SESSION_STOP');
    if (sessionAudioStartedRef.current) {
      sessionAudioStartedRef.current = false;
      callbacksRef.current.onSessionStop();
    }
    setActive(false);
    if (kind === 'complete') callbacksRef.current.onComplete();
    else callbacksRef.current.onExit();
  }, [clearThemeReadyTimer, postToUnity, stopStageClock]);

  const startStageClock = useCallback((stage: ActiveStage) => {
    stopStageClock();
    stageStartedAtRef.current = performance.now();
    activeStageRef.current = stage;
    setStageRemaining(Math.ceil(stage.duration));

    const tick = (now: number) => {
      if (finishedRef.current || activeStageRef.current?.index !== stage.index) return;
      const elapsedSec = Math.max(0, (now - stageStartedAtRef.current) / 1000);
      setStageRemaining(Math.max(0, Math.ceil(stage.duration - elapsedSec)));
      setProgress(Math.min(1, (completedExerciseSecRef.current + Math.min(stage.duration, elapsedSec)) / Math.max(1, durationSec)));
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [durationSec, stopStageClock]);

  const startUnitySession = useCallback(() => {
    setPhase('waiting');
    postToUnity('SPOMOVE_SESSION_START');
    sessionAudioStartedRef.current = true;
    callbacksRef.current.onSessionStart();
  }, [postToUnity]);

  const startCountdown = useCallback(() => {
    const countdownStartedAt = performance.now();
    setPhase('countdown');
    setCountdownLabel('3');

    const tick = (now: number) => {
      if (finishedRef.current) return;
      const remaining = COUNTDOWN_SECONDS - Math.floor((now - countdownStartedAt) / 1000);
      if (remaining > 0) {
        setCountdownLabel(String(remaining));
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      setCountdownLabel('GO!');
      goTimerRef.current = window.setTimeout(startUnitySession, GO_DISPLAY_MS);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [startUnitySession]);

  const handleStageEvent = useCallback((payload: StageEventPayload) => {
    const eventKey = `${payload.type}:${payload.stageIndex}`;
    if (handledEventsRef.current.has(eventKey)) return;
    handledEventsRef.current.add(eventKey);

    if (payload.type === 'STAGE_PREPARE') {
      stopStageClock();
      activeStageRef.current = null;
      setActiveStage(null);
      setPrepareCard({
        stageName: payload.stageName,
        introTitle: payload.introTitle,
        introDescription: payload.introDescription,
        introBadge: payload.introBadge,
        introDuration: payload.introDuration,
      });
      setPhase('preparing');
      return;
    }

    if (payload.type === 'STAGE_START') {
      const stage = { index: payload.stageIndex, name: payload.stageName, duration: payload.duration };
      setPrepareCard(null);
      setActiveStage(stage);
      setPhase('running');
      startStageClock(stage);
      return;
    }

    const current = activeStageRef.current;
    if (current?.index === payload.stageIndex) {
      completedExerciseSecRef.current = Math.min(durationSec, completedExerciseSecRef.current + current.duration);
      setProgress(Math.min(1, completedExerciseSecRef.current / Math.max(1, durationSec)));
    }
    stopStageClock();
    activeStageRef.current = null;
    setActiveStage(null);
    setStageRemaining(0);
    setPhase('waiting');
  }, [durationSec, startStageClock, stopStageClock]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow || event.origin !== window.location.origin) {
        if ((event.data as { type?: string } | null)?.type?.includes('THEME')) console.warn('[SPORTS_ARENA] ignored message', { type: event.data.type, origin: event.origin, sourceMatches: event.source === iframeWindow });
        return;
      }
      const data = event.data as { type?: string } | null;
      if (!data?.type || finishedRef.current) return;

      if (data.type === 'SPOMOVE_UNITY_READY') {
        if (readyRef.current) return;
        console.info('[SPORTS_ARENA] receive SPOMOVE_UNITY_READY');
        readyRef.current = true;
        setPhase('theme-loading');
        postToUnity('SPOMOVE_SESSION_CONFIG', { config: configPayload });
        clearThemeReadyTimer();
        themeReadyTimerRef.current = window.setTimeout(() => {
          console.error('[SPORTS_ARENA] THEME_READY timeout', { timeoutMs: THEME_READY_TIMEOUT_MS, config: configPayload });
          setLoadError('SPORTS ARENA 테마를 불러오지 못했습니다. 콘솔의 THEME_READY 로그를 확인해 주세요.');
          setPhase('error');
        }, THEME_READY_TIMEOUT_MS);
        return;
      }
      if (data.type === 'THEME_READY') {
        console.info('[SPORTS_ARENA] receive THEME_READY');
        clearThemeReadyTimer();
        startCountdown();
        return;
      }
      if (data.type === 'THEME_ERROR') {
        clearThemeReadyTimer();
        const message = (event.data as { message?: string }).message || 'SPORTS ARENA 테마를 불러오지 못했습니다.';
        console.error('[SPORTS_ARENA] receive THEME_ERROR', message);
        setLoadError(message);
        setPhase('error');
        return;
      }
      if (data.type === 'STAGE_PREPARE' || data.type === 'STAGE_START' || data.type === 'STAGE_COMPLETE') {
        handleStageEvent(data as StageEventPayload);
        return;
      }
      if (data.type === 'SPOMOVE_UNITY_SESSION_COMPLETE' || data.type === 'SESSION_COMPLETE') finish('complete');
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      stopStageClock();
      clearThemeReadyTimer();
      if (goTimerRef.current !== null) window.clearTimeout(goTimerRef.current);
      if (!finishedRef.current && readyRef.current) postToUnity('SPOMOVE_SESSION_STOP');
      if (sessionAudioStartedRef.current) {
        sessionAudioStartedRef.current = false;
        callbacksRef.current.onSessionStop();
      }
    };
  }, [clearThemeReadyTimer, configPayload, finish, handleStageEvent, postToUnity, startCountdown, stopStageClock]);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
      {active ? <iframe ref={iframeRef} src={UNITY_SESSION_URL} title="SPORTS ARENA" allowFullScreen style={{ width: '100%', height: '100%', border: 0, background: '#000', display: 'block', visibility: phase === 'loading' || phase === 'theme-loading' ? 'hidden' : 'visible', opacity: phase === 'loading' || phase === 'theme-loading' ? 0 : 1 }} /> : null}

      {active && (phase === 'loading' || phase === 'theme-loading') ? <div role="status" aria-live="polite" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#020617', color: '#fff', zIndex: 20 }}><div style={{ textAlign: 'center', fontWeight: 900 }}><div style={{ width: 42, height: 42, margin: '0 auto 14px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'sportsArenaSpin 0.8s linear infinite' }} />SPORTS ARENA 로딩 중</div></div> : null}

      {active && phase === 'countdown' ? <div aria-live="assertive" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.72)', color: '#fff', zIndex: 25 }}><div style={{ fontSize: countdownLabel === 'GO!' ? 'clamp(64px,16vw,140px)' : 'clamp(100px,26vw,220px)', fontWeight: 900, lineHeight: 1 }}>{countdownLabel}</div></div> : null}

      {active && phase === 'preparing' && prepareCard ? <div aria-live="polite" style={{ position: 'absolute', inset: 0, zIndex: 25, display: 'grid', placeItems: 'center', background: 'rgba(2,6,23,0.76)', color: '#fff', padding: 24 }}><div style={{ width: 'min(560px,92vw)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 24, background: 'rgba(15,23,42,0.94)', padding: '28px 30px', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}><span style={{ display: 'inline-block', borderRadius: 999, background: '#38BDF8', color: '#082F49', padding: '6px 12px', fontSize: 12, fontWeight: 950 }}>{prepareCard.introBadge || prepareCard.stageName}</span><h2 style={{ margin: '16px 0 10px', fontSize: 'clamp(30px,6vw,54px)', lineHeight: 1.05 }}>{prepareCard.introTitle || prepareCard.stageName}</h2><p style={{ margin: 0, color: '#CBD5E1', fontSize: 'clamp(15px,2.5vw,20px)', lineHeight: 1.5 }}>{prepareCard.introDescription}</p><small style={{ display: 'block', marginTop: 18, color: '#94A3B8', fontWeight: 800 }}>NEXT · {prepareCard.introDuration.toFixed(1)}s</small></div></div> : null}

      {active && phase === 'running' && activeStage ? <>
        <div style={{ position: 'absolute', top: 14, left: 16, right: 112, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
          <span style={{ border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, background: 'rgba(2,6,23,0.78)', padding: '6px 10px', fontSize: 12, fontWeight: 900 }}>STAGE {activeStage.index + 1} / {stageCount}</span>
          <strong style={{ borderRadius: 10, background: 'rgba(2,6,23,0.78)', padding: '7px 10px', fontSize: 14 }}>{activeStage.name}</strong>
          <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900 }}>{stageRemaining}s</span>
        </div>
        <div style={{ position: 'absolute', inset: 'auto 0 0', zIndex: 20, height: 6, background: 'rgba(255,255,255,0.18)' }}><div style={{ width: `${progress * 100}%`, height: '100%', background: '#38BDF8' }} /></div>
      </> : null}

      {active ? <button type="button" onClick={() => finish('exit')} style={{ position: 'absolute', top: 10, right: 14, zIndex: 40, minWidth: 82, padding: '0.5rem 0.75rem', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '0.7rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}>✕ 나가기</button> : null}
      {active && phase === 'error' ? <div role={'alert'} style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center', background: '#020617', color: '#fff', padding: 24 }}><div style={{ maxWidth: 560, textAlign: 'center' }}><strong style={{ display: 'block', marginBottom: 12, fontSize: 24 }}>SPORTS ARENA 로딩 오류</strong><p style={{ margin: 0, color: '#CBD5E1', lineHeight: 1.6 }}>{loadError}</p></div></div> : null}
      <style>{`iframe[title='SPORTS ARENA'] { visibility: visible !important; } @keyframes sportsArenaSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
