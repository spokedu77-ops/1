'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { setupCanvas } from '../lib/canvasUtils';
import {
  camoShapeSize,
  resolveCamouflagePosition,
  type CamouflagePlacementMode,
} from '../lib/camouflagePlacement';
import { pickCamoShapePath } from '../lib/camouflageShapes';

/** 인덱스 순서: 빨 → 파 → 초 → 노 (다른 reactTrain 레벨과 동일) */
const CAMO_COLORS = [
  { main: '#FF1744', name: 'RED' },
  { main: '#2979FF', name: 'BLUE' },
  { main: '#00E676', name: 'GREEN' },
  { main: '#FFD600', name: 'YELLOW' },
] as const;

const SPD_NAMES = ['매우 느림', '느림', '약간 느림', '보통', '약간 빠름', '빠름', '매우 빠름'];

/** 정답 도형이 완전히 드러난 뒤 다음 라운드로 넘어가기 전 유지하는 시간 — 속도 설정과 무관하게 확인할 시간을 충분히 준다 */
const HOLD_MS = 2000;

type Phase = 'NOISE' | 'REVEAL' | 'HOLD';

type CamoGame = {
  running: boolean;
  timeLeft: number;
  phase: Phase;
  phaseStartMs: number;
  targetColorIdx: number;
  shapePath: Path2D | null;
  rounds: number;
  laneCount: [number, number, number, number];
  W: number;
  H: number;
  blockSize: number;
  edgeIdx: number;
  raf: number | null;
  timer: ReturnType<typeof setInterval> | null;
};

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  placementMode?: CamouflagePlacementMode;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

const css = `
.camo{position:fixed;inset:0;height:100dvh;max-height:100dvh;background:#111;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.camo,.camo *{box-sizing:border-box}
.camo-hud{height:72px;display:flex;align-items:stretch;background:rgba(10,10,14,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:30;flex-shrink:0}
.camo-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.camo-hc.grow{flex:1;align-items:center;border-right:none}
.camo-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.28);text-transform:uppercase}
.camo-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.camo-hv.warn{animation:camow .5s ease-in-out infinite}
@keyframes camow{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.camo-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
.camo-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.camo-play{position:relative;flex:1;min-height:0}
.camo-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.camo-msg{position:absolute;left:50%;top:9%;transform:translateX(-50%);z-index:20;font-size:clamp(18px,3.4vw,32px);font-weight:900;color:#fff;text-shadow:0 0 20px rgba(0,0,0,.8);background:rgba(0,0,0,.5);padding:10px 28px;border-radius:999px;pointer-events:none;opacity:0;transition:opacity .3s ease;white-space:nowrap}
.camo-msg.show{opacity:1}
${REACT_TRAIN_VIEWPORT_CSS}
`;

export function CamouflageReactionTraining({
  durationSec,
  speedLevel,
  speedSec,
  placementMode = 'center',
  onExit,
  onComplete,
}: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudRoundsRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const [warn, setWarn] = useState(false);
  const gRef = useRef<CamoGame | null>(null);
  const placementModeRef = useRef(placementMode);
  useEffect(() => {
    placementModeRef.current = placementMode;
  }, [placementMode]);
  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  /** 위장 해제(REVEAL) 소요 시간: speedSec(1~6초)을 그대로 사용 — 다른 reactTrain 레벨과 동일한 의미 */
  const fallTimeSec = Math.max(1, Math.min(6, Number.isFinite(speedSec) ? speedSec : 4));
  const revealMs = fallTimeSec * 1000;
  const lv = Math.max(1, Math.min(7, Math.round(7 - ((fallTimeSec - 1) * 6) / 5)));
  const spName = SPD_NAMES[lv - 1] ?? '보통';
  /** 노이즈 대기 시간: speedLevel(난이도 단계)이 높을수록 짧게 */
  const lvClamped = Math.max(1, Math.min(7, Math.round(Number.isFinite(speedLevel) ? speedLevel : lv)));
  const noiseMs = Math.max(700, 1700 - (lvClamped - 1) * 140);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    onExitRef.current();
  }, []);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    onCompleteRef.current({
      stims: g.rounds,
      maxCombo: g.rounds,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, []);

  useEffect(() => {
    const cv = cvRef.current;
    const play = playRef.current;
    if (!cv || !play) return;

    const g: CamoGame = {
      running: true,
      timeLeft: durationSec,
      phase: 'NOISE',
      phaseStartMs: 0,
      targetColorIdx: 0,
      shapePath: null,
      rounds: 0,
      laneCount: [0, 0, 0, 0],
      W: 0,
      H: 0,
      blockSize: 20,
      edgeIdx: 0,
      raf: null,
      timer: null,
    };
    gRef.current = g;

    const calcLayout = () => {
      const w = play.clientWidth;
      const h = play.clientHeight;
      if (w <= 0 || h <= 0) return;
      const r = setupCanvas(cv, w, h);
      g.W = r.cssW;
      g.H = r.cssH;
      // 도형 실루엣이 격자에 묻히지 않도록 항상 고운 블록을 쓴다.
      // navigator.hardwareConcurrency 기반 저사양 판정은 브라우저별 편차가 커서 신뢰하지 않는다.
      g.blockSize = g.W < 600 ? 9 : g.W > 1200 ? 15 : 12;
    };

    const updateHudTime = () => {
      const m = String(Math.floor(g.timeLeft / 60)).padStart(2, '0');
      const s = String(g.timeLeft % 60).padStart(2, '0');
      if (hudTimeRef.current) hudTimeRef.current.textContent = `${m}:${s}`;
      setWarn(g.timeLeft <= 10);
    };
    updateHudTime();
    if (hudRoundsRef.current) hudRoundsRef.current.textContent = '0';

    const newShapePath = () => {
      const size = camoShapeSize(g.W, g.H);
      const { cx, cy } = resolveCamouflagePosition(
        placementModeRef.current,
        g.W,
        g.H,
        g.edgeIdx,
        size,
      );
      g.shapePath = pickCamoShapePath(cx, cy, size);
      g.targetColorIdx = Math.floor(Math.random() * 4);
      if (placementModeRef.current === 'variant') {
        g.edgeIdx = (g.edgeIdx + 1) % 4;
      }
    };

    const startRound = () => {
      calcLayout();
      newShapePath();
      g.phase = 'NOISE';
      g.phaseStartMs = performance.now();
      if (msgRef.current) {
        msgRef.current.textContent = '어떤 색깔이 숨어있을까요?';
        msgRef.current.classList.add('show');
      }
    };

    const loop = (now: number) => {
      if (!gRef.current?.running) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      const elapsed = now - g.phaseStartMs;
      if (g.phase === 'NOISE' && elapsed >= noiseMs) {
        g.phase = 'REVEAL';
        g.phaseStartMs = now;
      } else if (g.phase === 'REVEAL' && elapsed >= revealMs) {
        g.phase = 'HOLD';
        g.phaseStartMs = now;
        g.rounds++;
        g.laneCount[g.targetColorIdx]++;
        if (hudRoundsRef.current) hudRoundsRef.current.textContent = String(g.rounds);
        if (msgRef.current) msgRef.current.textContent = '정답 확인!';
      } else if (g.phase === 'HOLD' && elapsed >= HOLD_MS) {
        startRound();
      }

      let progress = 0;
      if (g.phase === 'REVEAL') progress = Math.min(elapsed / revealMs, 1);
      else if (g.phase === 'HOLD') progress = 1;

      const bs = g.blockSize;
      const cols = Math.ceil(g.W / bs);
      const rows = Math.ceil(g.H / bs);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * bs;
          const y = row * bs;
          const cx = x + bs / 2;
          const cy = y + bs / 2;
          let isInside = false;
          if (g.shapePath && g.phase !== 'NOISE') {
            isInside = ctx.isPointInPath(g.shapePath, cx, cy);
          }
          let cellColor: string = CAMO_COLORS[Math.floor(Math.random() * 4)].main;
          if (isInside && Math.random() < progress) cellColor = CAMO_COLORS[g.targetColorIdx].main;
          ctx.fillStyle = cellColor;
          ctx.fillRect(x, y, bs, bs);
        }
      }

      g.raf = requestAnimationFrame(loop);
    };

    const startId = window.setTimeout(() => {
      calcLayout();
      startRound();
      const endsAtMs = performance.now() + durationSec * 1000;
      g.timer = setInterval(() => {
        const newLeft = Math.max(0, Math.ceil((endsAtMs - performance.now()) / 1000));
        if (g.timeLeft !== newLeft) {
          g.timeLeft = newLeft;
          updateHudTime();
        }
        if (g.timeLeft <= 0) {
          if (g.timer) clearInterval(g.timer);
          g.timer = null;
          endGame();
        }
      }, 250);
      g.raf = requestAnimationFrame(loop);
    }, 60);

    const onWinResize = () => calcLayout();
    window.addEventListener('resize', onWinResize);

    return () => {
      clearTimeout(startId);
      window.removeEventListener('resize', onWinResize);
      g.running = false;
      if (g.timer) clearInterval(g.timer);
      if (g.raf != null) cancelAnimationFrame(g.raf);
    };
  }, [durationSec, endGame, noiseMs, revealMs]);

  return (
    <div className="camo">
      <style>{css}</style>
      <div className="camo-hud">
        <div className="camo-hc">
          <div className="camo-hk">Time</div>
          <div className={`camo-hv${warn ? ' warn' : ''}`} ref={hudTimeRef} />
        </div>
        <div className="camo-hc">
          <div className="camo-hk">Rounds</div>
          <div className="camo-hv" ref={hudRoundsRef} />
        </div>
        <div className="camo-hc grow">
          <div className="camo-hv" style={{ fontSize: 'clamp(12px,2vw,19px)' }}>
            CAMOUFLAGE · {spName}{placementMode === 'variant' ? ' · 변형' : ''}
          </div>
        </div>
        <div className="camo-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="camo-stop" onClick={stopGame}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-hidden>
              <rect x="6" y="6" width="4" height="12" rx="1" />
              <rect x="14" y="6" width="4" height="12" rx="1" />
            </svg>
            STOP
          </button>
        </div>
      </div>
      <div ref={playRef} className="camo-play">
        <canvas className="camo-canvas" ref={cvRef} />
        <div className="camo-msg" ref={msgRef} />
      </div>
    </div>
  );
}
