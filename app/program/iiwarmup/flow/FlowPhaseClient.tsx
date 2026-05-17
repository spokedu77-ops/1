'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FlowEngine, type FlowDomRefs, type FlowTimingOverrides } from './engine/FlowEngine';
import type { FlowPhaseDetail } from './engine/FlowTypes';
import { useFlowBGM } from '@/app/lib/admin/hooks/useFlowBGM';
import { useFlowPano } from '@/app/lib/admin/hooks/useFlowPano';
import {
  FLOW_START_CONTENT,
  FLOW_END_CONTENT,
  FLOW_LEVEL_CONTENT,
  getRestContent,
  buildEndSummary,
} from './engine/content/flowContent';

// ── Overlay state ─────────────────────────────────────────────────────────────
type OverlayState =
  | null
  | { type: 'start' }
  | { type: 'level-intro'; levelNum: number }
  | { type: 'rest'; restIndex: number; remainingSec: number }
  | { type: 'complete'; playedLevels: number[] };

// ── Start screen ──────────────────────────────────────────────────────────────
function StartOverlay() {
  const c = FLOW_START_CONTENT;
  return (
    <div className="absolute inset-0 z-[1100] flex flex-col items-center justify-center bg-black/92 text-center px-6">
      <p className="mb-2 text-xs tracking-[0.3em] text-blue-400 uppercase">{c.subtitle}</p>
      <h1
        className="mb-3 text-5xl font-black text-white"
        style={{ fontFamily: "'Black Han Sans', sans-serif" }}
      >
        {c.title}
      </h1>
      <p className="mb-8 max-w-xs text-sm text-white/50">{c.body}</p>

      <div className="flex flex-col gap-2 w-full max-w-sm">
        {[1, 2, 3, 4, 5].map((lv) => {
          const lc = FLOW_LEVEL_CONTENT[lv]!;
          return (
            <div
              key={lv}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5"
              style={{ background: lc.colorBg, border: `1px solid ${lc.colorBorder}` }}
            >
              <span
                className="w-16 shrink-0 text-xs font-bold tracking-wider"
                style={{ color: lc.color }}
              >
                {lc.tag}
              </span>
              <span className="text-sm text-white/80">
                {lc.label} — {lc.cueWord}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Level intro ───────────────────────────────────────────────────────────────
function LevelIntroOverlay({ levelNum }: { levelNum: number }) {
  const lc = FLOW_LEVEL_CONTENT[levelNum];
  if (!lc) return null;
  return (
    <div className="absolute inset-0 z-[1100] flex flex-col items-center justify-center bg-black/88 text-center px-6">
      <div
        className="mb-2 text-xs font-bold tracking-[0.3em] uppercase"
        style={{ color: lc.color }}
      >
        {lc.tag}
      </div>
      <h2
        className="mb-4 text-6xl font-black text-white"
        style={{ fontFamily: "'Black Han Sans', sans-serif" }}
      >
        {lc.label.toUpperCase()}
      </h2>
      <p className="mb-3 max-w-xs text-lg text-white/80">{lc.instruction}</p>
      <p className="max-w-xs text-sm text-white/40">{lc.why}</p>
      <div
        className="mt-6 rounded-full border px-4 py-1.5 text-sm font-medium"
        style={{ borderColor: lc.colorBorder, color: lc.color, background: lc.colorBg }}
      >
        {lc.muscle}
      </div>
    </div>
  );
}

// ── Rest screen ───────────────────────────────────────────────────────────────
function RestOverlay({
  restIndex,
  remainingSec,
}: {
  restIndex: number;
  remainingSec: number;
}) {
  const rc = getRestContent(restIndex);
  return (
    <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/92 px-5">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center text-xs font-bold tracking-[0.3em] text-white/30 uppercase">
          BREAK TIME
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
            <div className="mb-2 text-[10px] font-bold tracking-widest text-white/30 uppercase">
              {rc.prev.heading}
            </div>
            <div className="mb-1.5 text-sm font-bold text-white">{rc.prev.summary}</div>
            <div className="text-xs text-emerald-400">{rc.prev.benefit}</div>
          </div>

          <div className="rounded-2xl bg-blue-950/50 border border-blue-500/25 p-4">
            <div className="mb-1 text-[10px] font-bold tracking-widest text-blue-400/60 uppercase">
              {rc.next.heading}
            </div>
            <div className="mb-0.5 text-[10px] font-bold tracking-widest text-blue-300">
              {rc.next.levelTag}
            </div>
            <div className="mb-1.5 text-sm font-bold text-white">{rc.next.label}</div>
            <div className="text-xs text-white/55 leading-snug">{rc.next.preview}</div>
            <div className="mt-2 text-xs text-cyan-400">{rc.next.benefit}</div>
          </div>
        </div>

        <div className="mb-5 text-center text-sm text-white/35 italic">{rc.breatheText}</div>

        <div className="text-center">
          <span
            className="text-6xl font-black text-white"
            style={{ fontFamily: "'Black Han Sans', sans-serif" }}
          >
            {remainingSec}
          </span>
          <span className="ml-2 text-sm text-white/30">초</span>
        </div>
      </div>
    </div>
  );
}

// ── Complete screen ───────────────────────────────────────────────────────────
function CompleteOverlay({
  playedLevels,
  onRestart,
  onClose,
}: {
  playedLevels: number[];
  onRestart: () => void;
  onClose: () => void;
}) {
  const c = FLOW_END_CONTENT;
  const summary = buildEndSummary(playedLevels);
  return (
    <div className="absolute inset-0 z-[1100] flex flex-col items-center justify-center bg-black/95 text-center px-6">
      <h2
        className="mb-3 text-4xl font-black text-emerald-400"
        style={{ fontFamily: "'Black Han Sans', sans-serif" }}
      >
        {c.title}
      </h2>
      <p className="mb-8 max-w-xs text-white/55">{c.closing}</p>

      {summary.length > 0 && (
        <div className="mb-8 w-full max-w-xs text-left">
          <div className="mb-3 text-[10px] font-bold tracking-widest text-white/25 uppercase">
            {c.summaryHeading}
          </div>
          <div className="flex flex-col gap-2">
            {summary.map(({ label, muscle }) => (
              <div
                key={label}
                className="flex items-start gap-2.5 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5"
              >
                <span className="mt-0.5 text-emerald-400 text-sm">✓</span>
                <div>
                  <div className="text-sm font-bold text-white">{label}</div>
                  <div className="text-xs text-white/35">{muscle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-500 transition-colors"
        >
          {c.replayLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-white/10 px-8 py-3 text-sm font-bold text-white/60 hover:bg-white/20 transition-colors"
        >
          {c.closeLabel}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function FlowPhaseContent() {
  const searchParams = useSearchParams();
  const monthParam = searchParams.get('month');
  const n = monthParam != null ? Number(monthParam) : NaN;
  const previewMonth = Number.isFinite(n) && n >= 1 && n <= 12 ? n : new Date().getMonth() + 1;
  const { selected: adminBgm, loading: adminBgmLoading } = useFlowBGM(previewMonth);
  const { selected: adminPano, loading: adminPanoLoading } = useFlowPano(previewMonth);

  const bgmPath = adminBgm || undefined;
  const panoPath = adminPano || undefined;
  const flowAssetsReady = !adminBgmLoading && !adminPanoLoading;

  const isAdminMode = searchParams.get('admin') === 'true';
  const showLevelSelector = searchParams.get('showLevelSelector') === '1';
  const autoStart = searchParams.get('autoStart') === '1' || searchParams.get('autoStart') === 'true';
  const memoryPreset = searchParams.get('memoryPreset');
  const kidsSafe = searchParams.get('kidsSafe') === '1' || searchParams.get('kidsSafe') === 'true';
  const skipRestParam = searchParams.get('skipRest') === '1';
  const durationsRaw = searchParams.get('durations');
  const customDurations = durationsRaw
    ? durationsRaw.split(',').map(Number).filter((x) => Number.isFinite(x) && x > 0)
    : null;

  const shortFlow5Timing: FlowTimingOverrides = {
    welcomeDurationMs: 5000,
    lv1GuideDurationMs: 5000,
    durations: [10, 15, 10, 30, 10, 30, 30, 15],
    introCountdownSec: 5,
    introCountdownDelayMs: 0,
    startAfterCountdownDelayMs: 0,
    interLevelCountdownSec: 10,
    restResumeDelayMs: 0,
    endingAutoCloseSec: 15,
    skipRestPhases: true,
  };

  const timingOverrides: FlowTimingOverrides | undefined = (() => {
    if (memoryPreset === 'shortFlow5') {
      return { ...shortFlow5Timing, ...(kidsSafe ? { motionTimeScale: 0.5 } : {}) };
    }
    const base: FlowTimingOverrides = {};
    if (kidsSafe) base.motionTimeScale = 0.5;
    if (customDurations && customDurations.length === 8) base.durations = customDurations;
    if (skipRestParam) base.skipRestPhases = true;
    return Object.keys(base).length > 0 ? base : undefined;
  })();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FlowEngine | null>(null);
  const domRefsRef = useRef<FlowDomRefs | null>(null);

  const [selectedLevel, setSelectedLevel] = useState(1);
  const [engineReady, setEngineReady] = useState(false);
  const [showTapForAudio, setShowTapForAudio] = useState(false);
  const [overlay, setOverlay] = useState<OverlayState>(null);

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

  // Build domRefs object once (refs themselves are stable)
  if (domRefsRef.current === null) {
    domRefsRef.current = {
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
  }

  // flow-phase CustomEvent → overlay state
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<FlowPhaseDetail>).detail;

      if (detail.type === 'rest-tick') {
        setOverlay((prev) =>
          prev?.type === 'rest' ? { ...prev, remainingSec: detail.remainingSec } : prev
        );
        return;
      }
      if (detail.type === 'level-intro' && detail.levelNum === 0) {
        setOverlay(null);
        return;
      }
      if (detail.type === 'start') { setOverlay({ type: 'start' }); return; }
      if (detail.type === 'level-intro') { setOverlay({ type: 'level-intro', levelNum: detail.levelNum }); return; }
      if (detail.type === 'rest') { setOverlay({ type: 'rest', restIndex: detail.restIndex, remainingSec: detail.remainingSec }); return; }
      if (detail.type === 'complete') { setOverlay({ type: 'complete', playedLevels: detail.playedLevels }); return; }
    };
    window.addEventListener('flow-phase', handler);
    return () => window.removeEventListener('flow-phase', handler);
  }, []);

  // Engine lifecycle
  useEffect(() => {
    if (!canvasRef.current || !domRefsRef.current) return;
    const engine = new FlowEngine(canvasRef.current, { current: domRefsRef.current });
    engineRef.current = engine;
    setEngineReady(true);

    const onResize = () => engine.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      engine.dispose();
      engineRef.current = null;
      setEngineReady(false);
    };
  }, []);

  // Auto-start
  useEffect(() => {
    if (!autoStart || !engineReady || !engineRef.current || !flowAssetsReady) return;
    const t = setTimeout(() => {
      void engineRef.current?.startGame(bgmPath, panoPath, {
        deferAudio: false,
        onAudioBlocked: () => setShowTapForAudio(true),
        timingOverrides,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [autoStart, engineReady, flowAssetsReady, bgmPath, panoPath, timingOverrides]);

  const handleStart = useCallback(() => {
    void engineRef.current?.startGame(bgmPath, panoPath, { timingOverrides });
  }, [bgmPath, panoPath, timingOverrides]);

  const handleLevelChange = useCallback((level: number) => {
    setSelectedLevel(level);
    if (level >= 1 && level <= 5) {
      engineRef.current?.setStartLevel(level as 1 | 2 | 3 | 4 | 5);
    }
  }, []);

  const handleRestart = useCallback(() => {
    setOverlay(null);
    if (!canvasRef.current || !domRefsRef.current) return;
    engineRef.current?.dispose();
    const newEngine = new FlowEngine(canvasRef.current, { current: domRefsRef.current });
    engineRef.current = newEngine;
    void newEngine.startGame(bgmPath, panoPath, {
      deferAudio: false,
      onAudioBlocked: () => setShowTapForAudio(true),
      timingOverrides,
    });
  }, [bgmPath, panoPath, timingOverrides]);

  const handleClose = useCallback(() => {
    setOverlay(null);
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({ type: 'flow-close' }, window.location.origin);
    }
  }, []);

  return (
    <main
      className="relative w-full h-screen bg-black overflow-hidden text-white select-none"
      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {isAdminMode && (
        <div
          ref={panoDebugHudRef}
          className="fixed top-2 left-2 z-[3000] rounded bg-black/60 px-2 py-1 font-mono text-xs text-white/90"
          aria-live="polite"
        />
      )}

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
        <span className="text-4xl md:text-5xl font-black tracking-[0.3em] text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]">
          FLOW COMPLETE
        </span>
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

      {/* Pre-start screen (engine hides this on startGame) */}
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
            {FLOW_START_CONTENT.buttonLabel}
          </button>
        )}
      </div>

      {/* Engine countdown (shown above phase overlays) */}
      <div
        ref={countdownOverlayRef}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[6rem] text-white pointer-events-none z-[1200] hidden"
        style={{
          fontFamily: "'Black Han Sans', sans-serif",
          textShadow: '0 0 50px #3b82f6',
        }}
      />

      {/* Phase overlays */}
      {overlay?.type === 'start' && <StartOverlay />}
      {overlay?.type === 'level-intro' && overlay.levelNum > 0 && (
        <LevelIntroOverlay levelNum={overlay.levelNum} />
      )}
      {overlay?.type === 'rest' && (
        <RestOverlay restIndex={overlay.restIndex} remainingSec={overlay.remainingSec} />
      )}
      {overlay?.type === 'complete' && (
        <CompleteOverlay
          playedLevels={overlay.playedLevels}
          onRestart={handleRestart}
          onClose={handleClose}
        />
      )}

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

export default function FlowPhaseClient() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-black" />}>
      <FlowPhaseContent />
    </Suspense>
  );
}
