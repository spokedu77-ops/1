'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FlowEngine, type FlowDomRefs } from './engine/FlowEngine';
import { useFlowBGM } from '@/app/lib/admin/hooks/useFlowBGM';
import { useFlowPano } from '@/app/lib/admin/hooks/useFlowPano';

function FlowPhaseContent() {
  const searchParams = useSearchParams();
  const isAdminMode = searchParams.get('admin') === 'true';
  const showLevelSelector = searchParams.get('showLevelSelector') === '1';
  const autoStart = searchParams.get('autoStart') === '1' || searchParams.get('autoStart') === 'true';
  const { selected: bgmPath } = useFlowBGM();
  const { selected: panoPath } = useFlowPano();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FlowEngine | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [engineReady, setEngineReady] = useState(false);
  const [showTapForAudio, setShowTapForAudio] = useState(false);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const levelNumRef = useRef<HTMLSpanElement>(null);
  const levelTagRef = useRef<HTMLDivElement>(null);
  const instructionRef = useRef<HTMLDivElement>(null);
  const introScreenRef = useRef<HTMLDivElement>(null);
  const introTitleRef = useRef<HTMLHeadingElement>(null);
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const countdownOverlayRef = useRef<HTMLDivElement>(null);
  const flashOverlayRef = useRef<HTMLDivElement>(null);
  const speedLinesOverlayRef = useRef<HTMLDivElement>(null);
  const panoDebugHudRef = useRef<HTMLDivElement>(null);
  const duckWarningLineRef = useRef<HTMLDivElement>(null);
  const stampOverlayRef = useRef<HTMLDivElement>(null);
  const badgeToastRef = useRef<HTMLDivElement>(null);

  const domRefs: FlowDomRefs = {
    progressBar: progressBarRef,
    levelNum: levelNumRef,
    levelTag: levelTagRef,
    instruction: instructionRef,
    introScreen: introScreenRef,
    introTitle: introTitleRef,
    startBtn: startBtnRef,
    hud: hudRef,
    countdownOverlay: countdownOverlayRef,
    flashOverlay: flashOverlayRef,
    speedLinesOverlay: speedLinesOverlayRef,
    panoDebugHud: panoDebugHudRef,
    duckWarningLine: duckWarningLineRef,
    stampOverlay: stampOverlayRef,
    badgeToast: badgeToastRef,
  };

  const domRefsRef = useRef<FlowDomRefs>(domRefs);
  domRefsRef.current = domRefs;

  const handleStart = useCallback(async () => {
    await engineRef.current?.startGame(bgmPath || undefined, panoPath || undefined);
  }, [bgmPath, panoPath]);

  const handleLevelChange = useCallback((level: number) => {
    setSelectedLevel(level);
    if (level >= 1 && level <= 5) {
      engineRef.current?.setStartLevel(level as 1 | 2 | 3 | 4 | 5);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new FlowEngine(canvasRef.current, domRefsRef);
    engineRef.current = engine;
    setEngineReady(true);

    const onResize = () =>
      engine.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      engine.dispose();
      engineRef.current = null;
      setEngineReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only init; domRefs intentionally excluded to avoid re-init on refs change
  }, []);

  useEffect(() => {
    if (!autoStart || !engineReady || !engineRef.current) return;
    const t = setTimeout(() => {
      engineRef.current?.startGame(bgmPath || undefined, panoPath || undefined, {
        deferAudio: false,
        onAudioBlocked: () => setShowTapForAudio(true),
      });
    }, 400);
    return () => clearTimeout(t);
  }, [autoStart, engineReady, bgmPath, panoPath]);

  return (
    <main
      className="relative w-full h-screen bg-black overflow-hidden text-white select-none"
      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      <div
        ref={panoDebugHudRef}
        className="fixed top-2 left-2 z-[3000] rounded bg-black/60 px-2 py-1 font-mono text-xs text-white/90"
        aria-live="polite"
      />
      <div
        ref={duckWarningLineRef}
        className="fixed top-0 left-0 right-0 z-[2810] h-1 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)] pointer-events-none hidden"
        aria-hidden
      />
      <div
        ref={stampOverlayRef}
        className="fixed inset-0 z-[3010] flex items-center justify-center pointer-events-none hidden"
        aria-hidden
      >
        <span className="text-4xl md:text-5xl font-black tracking-[0.3em] text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]">FLOW COMPLETE</span>
      </div>
      <div
        ref={badgeToastRef}
        className="fixed top-1/2 left-1/2 z-[3005] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/90 border-2 border-white/30 px-10 py-5 text-3xl font-bold text-white shadow-lg hidden"
        aria-hidden
      />

      {showTapForAudio && (
        <button
          type="button"
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => {
            engineRef.current?.enableAudio();
            setShowTapForAudio(false);
          }}
          aria-label="탭하면 소리 재생"
        >
          <span className="rounded-2xl bg-white/10 px-8 py-4 text-center text-lg font-medium text-white backdrop-blur-sm">
            화면을 탭하면 소리가 켜져요
          </span>
        </button>
      )}

      {(isAdminMode || showLevelSelector) && (
        <div className="absolute top-6 left-6 z-[1500] bg-black/90 backdrop-blur-md rounded-2xl p-5 border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] min-w-[200px]">
          <div className="text-base text-blue-200 mb-3 font-bold">Admin: 레벨 선택</div>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => handleLevelChange(level)}
                className={`px-5 py-2.5 rounded-lg font-bold text-lg transition-all ${
                  selectedLevel === level
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                LV{level}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={selectedLevel}
              onChange={(e) => handleLevelChange(Number(e.target.value))}
              className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: '#3b82f6' }}
            />
          </div>
        </div>
      )}

      <div
        ref={flashOverlayRef}
        className="absolute inset-0 pointer-events-none z-[200] bg-white opacity-0 transition-opacity duration-75"
      />

      <div
        ref={speedLinesOverlayRef}
        className="absolute inset-0 pointer-events-none z-[40] overflow-hidden"
      />

      <div
        ref={introScreenRef}
        className="absolute inset-0 flex flex-col items-center justify-center bg-black z-[1000] text-center"
      >
        <h1
          ref={introTitleRef}
          className="text-6xl font-bold text-blue-400 mb-6"
          style={{ fontFamily: "'Black Han Sans', sans-serif" }}
        >
          SPOKEDU
        </h1>
        {!autoStart && (
          <button
            ref={startBtnRef}
            onClick={handleStart}
            className="px-20 py-5 bg-blue-600 rounded-xl text-2xl font-bold text-white shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:bg-blue-500 transition-colors"
            style={{ fontFamily: "'Black Han Sans', sans-serif" }}
          >
            시작하기
          </button>
        )}
      </div>

      <div
        ref={countdownOverlayRef}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[6rem] text-white pointer-events-none z-[500] hidden"
        style={{
          fontFamily: "'Black Han Sans', sans-serif",
          textShadow: '0 0 50px #3b82f6',
        }}
      />

      <div
        ref={hudRef}
        className="absolute inset-0 pointer-events-none z-[100] hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-slate-800/40">
          <div
            ref={progressBarRef}
            className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 w-0 transition-[width]"
          />
        </div>
        <div
          className="absolute top-6 right-6 flex items-center gap-2.5 rounded-xl border-2 border-blue-500 bg-black/60 px-4 py-2 text-lg"
          style={{ fontFamily: "'Black Han Sans', sans-serif" }}
        >
          <div>
            LV <span ref={levelNumRef}>1</span>
          </div>
          <div
            ref={levelTagRef}
            className="rounded-full border px-2.5 py-0.5 text-sm tracking-wider"
            style={{
              borderColor: 'rgba(147,197,253,0.6)',
              color: '#93c5fd',
              background: 'rgba(59,130,246,0.15)',
            }}
          >
            JUMP
          </div>
        </div>
        <div
          ref={instructionRef}
          className="absolute top-[10%] left-0 w-full text-center text-4xl text-yellow-400 hidden"
          style={{
            fontFamily: "'Black Han Sans', sans-serif",
            textShadow: '0 0 30px #3b82f6',
          }}
        />
      </div>
    </main>
  );
}

export default function FlowPhasePage() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-black" />}>
      <FlowPhaseContent />
    </Suspense>
  );
}
