'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { setupCanvas } from '../lib/canvasUtils';

/** 인덱스 순서: 빨 → 파 → 초 → 노 (다른 reactTrain 레벨과 동일) */
const CAMO_COLORS = [
  { main: '#FF1744', name: 'RED' },
  { main: '#2979FF', name: 'BLUE' },
  { main: '#00E676', name: 'GREEN' },
  { main: '#FFD600', name: 'YELLOW' },
] as const;

const SPD_NAMES = ['매우 느림', '느림', '약간 느림', '보통', '약간 빠름', '빠름', '매우 빠름'];

/** 정답 사물이 완전히 드러난 뒤 다음 라운드로 넘어가기 전 유지하는 시간 — 속도 설정과 무관하게 확인할 시간을 충분히 준다 */
const HOLD_MS = 2000;

type Phase = 'NOISE' | 'REVEAL' | 'HOLD';

type CamoGame = {
  running: boolean;
  timeLeft: number;
  phase: Phase;
  phaseStartMs: number;
  targetColorIdx: number;
  targetItemName: string;
  shapePath: Path2D | null;
  rounds: number;
  laneCount: [number, number, number, number];
  W: number;
  H: number;
  blockSize: number;
  raf: number | null;
  timer: ReturnType<typeof setInterval> | null;
};

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

function createApplePath(cx: number, cy: number, size: number): Path2D {
  const r = size * 0.42;
  // 몸통(잎·꼭지 제외) 세로 범위가 cy보다 아래로 치우치므로 위로 살짝 보정해 화면 중앙에 맞춘다
  const cyA = cy - r * 0.2;
  const path = new Path2D();
  // 몸통: 위쪽 가운데가 살짝 파인 두 갈래 어깨 + 아래로 갈수록 둥글게 퍼지는 형태
  path.moveTo(cx, cyA - r * 0.5);
  path.bezierCurveTo(cx + r * 0.1, cyA - r * 0.85, cx + r * 0.5, cyA - r * 0.95, cx + r * 0.82, cyA - r * 0.58);
  path.bezierCurveTo(cx + r * 1.28, cyA - r * 0.02, cx + r * 1.12, cyA + r * 0.82, cx + r * 0.5, cyA + r * 1.18);
  path.bezierCurveTo(cx + r * 0.22, cyA + r * 1.34, cx - r * 0.22, cyA + r * 1.34, cx - r * 0.5, cyA + r * 1.18);
  path.bezierCurveTo(cx - r * 1.12, cyA + r * 0.82, cx - r * 1.28, cyA - r * 0.02, cx - r * 0.82, cyA - r * 0.58);
  path.bezierCurveTo(cx - r * 0.5, cyA - r * 0.95, cx - r * 0.1, cyA - r * 0.85, cx, cyA - r * 0.5);
  path.closePath();
  // 꼭지 — 격자 블록에 묻히지 않도록 두껍게
  path.moveTo(cx - r * 0.13, cyA - r * 0.5);
  path.lineTo(cx + r * 0.13, cyA - r * 0.5);
  path.lineTo(cx + r * 0.18, cyA - r * 0.95);
  path.lineTo(cx - r * 0.08, cyA - r * 0.95);
  path.closePath();
  // 잎
  path.moveTo(cx + r * 0.1, cyA - r * 0.8);
  path.quadraticCurveTo(cx + r * 0.75, cyA - r * 1.1, cx + r * 0.6, cyA - r * 0.5);
  path.quadraticCurveTo(cx + r * 0.3, cyA - r * 0.5, cx + r * 0.1, cyA - r * 0.8);
  path.closePath();
  return path;
}

function createStrawberryPath(cx: number, cy: number, size: number): Path2D {
  const r = size * 0.45;
  const top = cy - r * 0.65;
  const path = new Path2D();
  path.moveTo(cx - r * 0.95, top);
  path.bezierCurveTo(cx - r * 1.05, cy + r * 0.15, cx - r * 0.55, cy + r * 1.15, cx, cy + r * 1.25);
  path.bezierCurveTo(cx + r * 0.55, cy + r * 1.15, cx + r * 1.05, cy + r * 0.15, cx + r * 0.95, top);
  path.bezierCurveTo(cx + r * 0.55, cy - r * 0.85, cx - r * 0.55, cy - r * 0.85, cx - r * 0.95, top);
  path.closePath();
  [-0.5, 0, 0.5].forEach((dx) => {
    path.moveTo(cx + dx * r, top);
    path.lineTo(cx + (dx - 0.22) * r, top - r * 0.35);
    path.lineTo(cx + (dx + 0.22) * r, top - r * 0.35);
    path.closePath();
  });
  return path;
}

function createTomatoPath(cx: number, cy: number, size: number): Path2D {
  const r = size * 0.45;
  const path = new Path2D();
  path.moveTo(cx + r, cy + r * 0.08);
  path.arc(cx, cy + r * 0.08, r, 0, Math.PI * 2);
  path.closePath();

  const spikes = 5;
  const outerR = r * 0.32;
  const innerR = r * 0.12;
  const topCy = cy - r * 0.85;
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  path.moveTo(cx, topCy - outerR);
  for (let i = 0; i < spikes; i++) {
    let px = cx + Math.cos(rot) * outerR;
    let py = topCy + Math.sin(rot) * outerR;
    path.lineTo(px, py);
    rot += step;
    px = cx + Math.cos(rot) * innerR;
    py = topCy + Math.sin(rot) * innerR;
    path.lineTo(px, py);
    rot += step;
  }
  path.closePath();
  return path;
}

function createBananaPath(cx: number, cy: number, size: number): Path2D {
  const halfLen = size * 0.62;
  const w = size * 0.26;
  const bow = size * 0.62;
  // 초승달 곡선이 위쪽으로 치우치므로 아래로 보정해 화면 중앙에 맞춘다
  const cyA = cy + size * 0.25;
  const leftX = cx - halfLen;
  const rightX = cx + halfLen;
  const path = new Path2D();
  path.moveTo(leftX, cyA + w * 0.25);
  // 바깥쪽(위) 곡선: 왼쪽 끝 → 크게 휘어 오른쪽 끝
  path.bezierCurveTo(cx - halfLen * 0.25, cyA - bow, cx + halfLen * 0.7, cyA - bow * 0.75, rightX, cyA - w * 0.1);
  // 오른쪽 끝 캡
  path.quadraticCurveTo(rightX + w * 0.3, cyA + w * 0.1, rightX - w * 0.05, cyA + w * 0.45);
  // 안쪽(아래) 곡선: 오른쪽 끝 → 왼쪽 끝 (바깥 곡선과 두께만큼 안쪽으로 평행)
  path.bezierCurveTo(cx + halfLen * 0.55, cyA - bow * 0.3 + w, cx - halfLen * 0.2, cyA - bow * 0.55 + w, leftX + w * 0.05, cyA + w * 0.55);
  // 왼쪽 끝 캡
  path.quadraticCurveTo(leftX - w * 0.25, cyA + w * 0.4, leftX, cyA + w * 0.25);
  path.closePath();
  return path;
}

function createLemonPath(cx: number, cy: number, size: number): Path2D {
  const rx = size * 0.55;
  const ry = size * 0.38;
  const path = new Path2D();
  path.moveTo(cx + rx, cy);
  path.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  path.closePath();
  path.moveTo(cx - rx, cy);
  path.lineTo(cx - rx - ry * 0.35, cy);
  path.lineTo(cx - rx, cy - ry * 0.25);
  path.closePath();
  path.moveTo(cx + rx, cy);
  path.lineTo(cx + rx + ry * 0.35, cy);
  path.lineTo(cx + rx, cy - ry * 0.25);
  path.closePath();
  return path;
}

function createPineapplePath(cx: number, cy: number, size: number): Path2D {
  const rx = size * 0.4;
  const ry = size * 0.55;
  // 잎 왕관이 위쪽 무게를 더하므로 몸통을 아래로 보정해 화면 중앙에 맞춘다
  const bodyCy = cy + size * 0.08 + size * 0.145;
  const path = new Path2D();
  path.moveTo(cx + rx, bodyCy);
  path.ellipse(cx, bodyCy, rx, ry, 0, 0, Math.PI * 2);
  path.closePath();

  const crownY = bodyCy - ry - size * 0.05;
  const leafCount = 5;
  for (let i = 0; i < leafCount; i++) {
    const t = (i - (leafCount - 1) / 2) / leafCount;
    const bx = cx + t * rx * 1.6;
    path.moveTo(bx - size * 0.05, crownY + size * 0.05);
    path.lineTo(bx, crownY - size * 0.3 - Math.abs(t) * size * 0.1);
    path.lineTo(bx + size * 0.05, crownY + size * 0.05);
    path.closePath();
  }
  return path;
}

function createGrapePath(cx: number, cy: number, size: number): Path2D {
  const r = size * 0.15;
  const spacing = r * 1.9;
  const path = new Path2D();
  const offsets: [number, number][] = [
    [0, -0.9],
    [-0.6, -0.55],
    [0.6, -0.55],
    [-1.05, -0.1],
    [0, -0.15],
    [1.05, -0.1],
    [-0.6, 0.35],
    [0.6, 0.35],
    [0, 0.75],
  ];
  offsets.forEach(([ox, oy]) => {
    const gx = cx + ox * spacing;
    const gy = cy + oy * spacing;
    path.moveTo(gx + r, gy);
    path.arc(gx, gy, r, 0, Math.PI * 2);
    path.closePath();
  });
  // 줄기 — 격자 블록에 묻히지 않도록 두껍게
  const stemTopY = cy - 0.9 * spacing - r * 1.8;
  const stemBotY = cy - 0.9 * spacing - r * 0.75;
  path.moveTo(cx - size * 0.05, stemTopY);
  path.lineTo(cx + size * 0.06, stemTopY);
  path.lineTo(cx + size * 0.08, stemBotY);
  path.lineTo(cx - size * 0.03, stemBotY);
  path.closePath();
  return path;
}

function createBlueberryPath(cx: number, cy: number, size: number): Path2D {
  const r = size * 0.22;
  const spacing = r * 2.1;
  const path = new Path2D();
  const offsets: [number, number][] = [
    [-0.55, 0.25],
    [0.55, 0.25],
    [0, -0.4],
  ];
  offsets.forEach(([ox, oy]) => {
    const bx = cx + ox * spacing;
    const by = cy + oy * spacing;
    path.moveTo(bx + r, by);
    path.arc(bx, by, r, 0, Math.PI * 2);
    path.closePath();
  });
  return path;
}

function createWatermelonWedgePath(cx: number, cy: number, size: number): Path2D {
  // 이전 버전은 쐐기 전체가 cx 오른쪽으로 치우쳐 있었다 — 꼭짓점을 아래에 두고
  // 둥근 테두리가 위로 향하는 대칭 쐐기(피자 조각) 모양으로 다시 그려 중앙에 맞춘다
  const r = size * 0.62;
  const arcCy = cy - r * 0.25;
  const apexY = cy + r * 0.7;
  const half = Math.PI * 0.32;
  const path = new Path2D();
  path.moveTo(cx, apexY);
  path.arc(cx, arcCy, r, -Math.PI / 2 - half, -Math.PI / 2 + half);
  path.closePath();
  return path;
}

function createLeafPath(cx: number, cy: number, size: number): Path2D {
  const r = size * 0.5;
  const path = new Path2D();
  path.moveTo(cx, cy - r * 1.1);
  path.bezierCurveTo(cx + r * 0.95, cy - r * 0.7, cx + r * 0.75, cy + r * 0.85, cx, cy + r * 1.1);
  path.bezierCurveTo(cx - r * 0.75, cy + r * 0.85, cx - r * 0.95, cy - r * 0.7, cx, cy - r * 1.1);
  path.closePath();
  return path;
}

type CamoItem = {
  colorIdx: number;
  name: string;
  makePath: (cx: number, cy: number, size: number) => Path2D;
};

/** 색(빨·파·초·노) — 사물 고정 짝. 실루엣만으로 색을 유추할 수 있는 과일·사물 10종 */
const CAMO_ITEMS: CamoItem[] = [
  { colorIdx: 0, name: '사과', makePath: createApplePath },
  { colorIdx: 0, name: '딸기', makePath: createStrawberryPath },
  { colorIdx: 0, name: '토마토', makePath: createTomatoPath },
  { colorIdx: 3, name: '바나나', makePath: createBananaPath },
  { colorIdx: 3, name: '레몬', makePath: createLemonPath },
  { colorIdx: 3, name: '파인애플', makePath: createPineapplePath },
  { colorIdx: 1, name: '포도', makePath: createGrapePath },
  { colorIdx: 1, name: '블루베리', makePath: createBlueberryPath },
  { colorIdx: 2, name: '수박', makePath: createWatermelonWedgePath },
  { colorIdx: 2, name: '나뭇잎', makePath: createLeafPath },
];

const css = `
.camo{position:fixed;inset:0;background:#111;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.camo,.camo *{box-sizing:border-box}
.camo-hud{height:72px;display:flex;align-items:stretch;background:rgba(10,10,14,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:0 clamp(12px,2.5vw,30px);z-index:30;flex-shrink:0}
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
`;

export function CamouflageReactionTraining({ durationSec, speedLevel, speedSec, onExit, onComplete }: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudRoundsRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const [warn, setWarn] = useState(false);
  const gRef = useRef<CamoGame | null>(null);
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
      targetItemName: '',
      shapePath: null,
      rounds: 0,
      laneCount: [0, 0, 0, 0],
      W: 0,
      H: 0,
      blockSize: 20,
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
      // 실루엣 디테일(꼭지·잎 등)이 격자에 묻히지 않도록 항상 고운 블록을 쓴다.
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
      const cx = g.W / 2;
      const cy = g.H / 2;
      const size = Math.min(g.W, g.H) * 0.35 * 1.3;
      const item = CAMO_ITEMS[Math.floor(Math.random() * CAMO_ITEMS.length)]!;
      g.shapePath = item.makePath(cx, cy, size);
      g.targetColorIdx = item.colorIdx;
      g.targetItemName = item.name;
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
        if (msgRef.current) msgRef.current.textContent = `${g.targetItemName} 확인!`;
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
            CAMOUFLAGE · {spName}
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
